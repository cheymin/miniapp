// Copyright (C) 2025 Langning Chen
//
// This file is part of miniapp.
//
// miniapp is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// miniapp is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with miniapp.  If not, see <https://www.gnu.org/licenses/>.

#include "ConversationManager.hpp"
#include "strUtils.hpp"
#include <chrono>
#include <algorithm>
#include <stdexcept>
#include <cstdio>

ConversationManager::ConversationManager(const std::string &dbPath) : database(dbPath), dbPath(dbPath)
{
    try
    {
        createTables();
    }
    catch (...)
    {
        // 建表失败通常意味着库损坏：备份坏库 + 重开 + 重建表
        recover();
    }
}

void ConversationManager::createTables()
{
    database.table("conversations")
        .column("id", TABLE::TEXT, TABLE::PRIMARY_KEY)
        .column("title", TABLE::TEXT, TABLE::NOT_NULL)
        .column("created_at", TABLE::INTEGER, TABLE::NOT_NULL)
        .column("updated_at", TABLE::INTEGER, TABLE::NOT_NULL)
        .execute();
    database.table("conversation_nodes")
        .column("id", TABLE::TEXT, TABLE::PRIMARY_KEY)
        .column("conversation_id", TABLE::TEXT, TABLE::NOT_NULL)
        .column("parent_id", TABLE::TEXT)
        .column("role", TABLE::INTEGER, TABLE::NOT_NULL)
        .column("content", TABLE::TEXT, TABLE::NOT_NULL)
        .column("reasoning_content", TABLE::TEXT)
        .column("stop_reason", TABLE::INTEGER, TABLE::NOT_NULL)
        .column("created_at", TABLE::INTEGER, TABLE::NOT_NULL)
        .execute();
    database.table("api_settings")
        .column("id", TABLE::TEXT, TABLE::PRIMARY_KEY)
        .column("api_key", TABLE::TEXT, TABLE::NOT_NULL)
        .column("base_url", TABLE::TEXT, TABLE::NOT_NULL)
        .column("model", TABLE::TEXT)
        .column("max_tokens", TABLE::INTEGER, TABLE::NOT_NULL)
        .column("temperature", TABLE::REAL, TABLE::NOT_NULL)
        .column("top_p", TABLE::REAL, TABLE::NOT_NULL)
        .column("system_prompt", TABLE::TEXT, TABLE::NOT_NULL)
        .execute();

    // CREATE TABLE IF NOT EXISTS 不会给旧表补列，此处显式迁移旧库 schema
    migrateSchema();
}

void ConversationManager::migrateSchema()
{
    // 用 try/catch 执行 ALTER TABLE ADD COLUMN，列已存在时 SQLite 报错被忽略
    auto tryAddColumn = [&](const std::string &table, const std::string &column, const std::string &definition)
    {
        try
        {
            database.exec("ALTER TABLE " + table + " ADD COLUMN " + column + " " + definition);
        }
        catch (...)
        {
            // 列已存在或表不存在：忽略
        }
    };
    // 旧版 conversation_nodes 缺少 reasoning_content（报错根因），stop_reason/parent_id 预防性补
    tryAddColumn("conversation_nodes", "reasoning_content", "TEXT");
    tryAddColumn("conversation_nodes", "stop_reason", "INTEGER DEFAULT 6");
    tryAddColumn("conversation_nodes", "parent_id", "TEXT");
    tryAddColumn("api_settings", "model", "TEXT");
}

void ConversationManager::recover()
{
    std::lock_guard<std::mutex> lock(dbMutex);
    // 备份坏库（含 -wal/-shm 旁路文件），保留现场同时让新库能正常打开
    auto backupSuffix = std::to_string(std::chrono::duration_cast<std::chrono::seconds>(
                                           std::chrono::system_clock::now().time_since_epoch())
                                           .count());
    std::rename((dbPath).c_str(), (dbPath + ".corrupt." + backupSuffix).c_str());
    std::rename((dbPath + "-wal").c_str(), (dbPath + "-wal.corrupt." + backupSuffix).c_str());
    std::rename((dbPath + "-shm").c_str(), (dbPath + "-shm.corrupt." + backupSuffix).c_str());
    // 重新打开 + 重建空表
    database.reopen(dbPath);
    createTables();
}

std::vector<ConversationInfo> ConversationManager::getConversationList()
{
    std::lock_guard<std::mutex> lock(dbMutex);
    std::vector<ConversationInfo> conversations;
    auto results = database.select("conversations")
                       .select("id")
                       .select("title")
                       .select("created_at")
                       .select("updated_at")
                       .order("updated_at", false)
                       .execute();
    for (const auto &row : results)
        conversations.push_back(ConversationInfo(
            row.at("id"),
            row.at("title"),
            std::stoll(row.at("created_at")),
            std::stoll(row.at("updated_at"))));
    return conversations;
}

void ConversationManager::createConversation(const std::string &title, std::string &outConversationId)
{
    std::lock_guard<std::mutex> lock(dbMutex);
    outConversationId = strUtils::randomId();
    auto currentTime = std::chrono::duration_cast<std::chrono::seconds>(
                           std::chrono::system_clock::now().time_since_epoch())
                           .count();
    database.insert("conversations")
        .value("id", outConversationId)
        .value("title", title)
        .value("created_at", currentTime)
        .value("updated_at", currentTime)
        .execute();
}
void ConversationManager::deleteConversation(const std::string &conversationId)
{
    std::lock_guard<std::mutex> lock(dbMutex);
    database.remove("conversation_nodes")
        .where("conversation_id", conversationId)
        .execute();
    database.remove("conversations")
        .where("id", conversationId)
        .execute();
}
void ConversationManager::updateConversationTitle(const std::string &conversationId, const std::string &title)
{
    std::lock_guard<std::mutex> lock(dbMutex);
    database.update("conversations")
        .set("title", title)
        .where("id", conversationId)
        .execute();
}

void ConversationManager::saveConversation(const std::string &conversationId,
                                           const std::unordered_map<std::string, std::unique_ptr<ConversationNode>> &nodeMap)
{
    std::lock_guard<std::mutex> lock(dbMutex);
    auto currentTime = std::chrono::duration_cast<std::chrono::seconds>(
                           std::chrono::system_clock::now().time_since_epoch())
                           .count();

    database.update("conversations")
        .set("updated_at", currentTime)
        .where("id", conversationId)
        .execute();

    database.remove("conversation_nodes")
        .where("conversation_id", conversationId)
        .execute();

    for (const auto &pair : nodeMap)
    {
        const auto &node = pair.second;
        if (!node)
            continue;

        database.insert("conversation_nodes")
            .value("id", node->id)
            .value("conversation_id", conversationId)
            .value("parent_id", node->parentId)
            .value("role", (int)node->role)
            .value("content", node->content)
            .value("reasoning_content", node->reasoningContent)
            .value("stop_reason", (int)node->stopReason)
            .value("created_at", currentTime)
            .execute();
    }
}
void ConversationManager::loadConversation(const std::string &conversationId,
                                           std::unordered_map<std::string, std::unique_ptr<ConversationNode>> &nodeMap,
                                           std::string &rootNodeId, std::string &leafNodeId)
{
    std::lock_guard<std::mutex> lock(dbMutex);
    nodeMap.clear();
    rootNodeId.clear();

    auto nodeResults = database.select("conversation_nodes")
                           .where("conversation_id", conversationId)
                           .execute();

    std::unordered_map<std::string, std::vector<std::string>> parentToChildren;

    for (const auto &row : nodeResults)
    {
        std::string nodeId = row.at("id");
        std::string parentId = row.at("parent_id");
        int role = std::stoi(row.at("role"));
        std::string content = row.at("content");
        std::string reasoningContent = row.count("reasoning_content") ? row.at("reasoning_content") : "";
        int stopReason = row.count("stop_reason") ? std::stoi(row.at("stop_reason")) : 6;

        auto node = std::make_unique<ConversationNode>(
            nodeId, static_cast<ConversationNode::ROLE>(role), content, parentId, static_cast<ConversationNode::STOP_REASON>(stopReason));
        node->reasoningContent = reasoningContent;
        nodeMap[nodeId] = std::move(node);

        if (!parentId.empty())
            parentToChildren[parentId].push_back(nodeId);
        else
            rootNodeId = nodeId;
    }

    for (const auto &pair : parentToChildren)
        if (nodeMap.find(pair.first) != nodeMap.end())
            nodeMap[pair.first]->childIds = pair.second;

    leafNodeId = rootNodeId;
    while (!nodeMap[leafNodeId]->childIds.empty())
        leafNodeId = nodeMap[leafNodeId]->childIds.back();
}

void ConversationManager::saveApiSettings(const std::string &apiKey, const std::string &baseUrl,
                                          const std::string &model, int maxTokens,
                                          double temperature, double topP, const std::string &systemPrompt)
{
    std::lock_guard<std::mutex> lock(dbMutex);
    database.remove("api_settings").execute();
    database.insert("api_settings")
        .value("id", "default")
        .value("api_key", apiKey)
        .value("base_url", baseUrl)
        .value("model", model)
        .value("max_tokens", maxTokens)
        .value("temperature", temperature)
        .value("top_p", topP)
        .value("system_prompt", systemPrompt)
        .execute();
}

void ConversationManager::loadApiSettings(std::string &apiKey, std::string &baseUrl,
                                          std::string &model, int &maxTokens,
                                          double &temperature, double &topP, std::string &systemPrompt)
{
    std::lock_guard<std::mutex> lock(dbMutex);
    auto results = database.select("api_settings")
                       .where("id", "default")
                       .execute();

    if (!results.empty())
    {
        const auto &row = results[0];
        // 防御性读取：旧库某列缺失/NULL 时用默认值，避免抛异常触发上层 recover() 丢数据
        apiKey = row.count("api_key") ? row.at("api_key") : "";
        baseUrl = row.count("base_url") ? row.at("base_url") : "";
        model = row.count("model") ? row.at("model") : "";
        try
        {
            maxTokens = row.count("max_tokens") ? std::stoi(row.at("max_tokens")) : 4096;
            temperature = row.count("temperature") ? std::stod(row.at("temperature")) : 0.7;
            topP = row.count("top_p") ? std::stod(row.at("top_p")) : 0.9;
        }
        catch (...)
        {
            // 数值列内容异常：保留默认值
        }
        systemPrompt = row.count("system_prompt") ? row.at("system_prompt") : "";
    }
}

void ConversationManager::updateNodeContent(const std::string &conversationId, const std::string &nodeId,
                                            const std::string &content, const std::string &reasoningContent)
{
    std::lock_guard<std::mutex> lock(dbMutex);
    database.update("conversation_nodes")
        .set("content", content)
        .set("reasoning_content", reasoningContent)
        .where("conversation_id", conversationId)
        .where("id", nodeId)
        .execute();
}

void ConversationManager::updateNodeStopReason(const std::string &conversationId, const std::string &nodeId, int stopReason)
{
    std::lock_guard<std::mutex> lock(dbMutex);
    database.update("conversation_nodes")
        .set("stop_reason", stopReason)
        .where("conversation_id", conversationId)
        .where("id", nodeId)
        .execute();
}
