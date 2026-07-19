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

ConversationManager::ConversationManager()
{
    database = std::make_unique<DATABASE>("/userdisk/database/langningchen-ai.db");
    initializeTables();
    migrateToMultiConfig();

    activeConfigId = getActiveConfigId();
    if (activeConfigId.empty())
    {
        auto configs = getConfigList();
        if (!configs.empty())
            setActiveConfigId(configs[0].id);
        activeConfigId = getActiveConfigId();
    }
}

void ConversationManager::initializeTables()
{
    database->table("conversations")
        .column("id", TABLE::TEXT, TABLE::PRIMARY_KEY)
        .column("title", TABLE::TEXT, TABLE::NOT_NULL)
        .column("created_at", TABLE::INTEGER, TABLE::NOT_NULL)
        .column("updated_at", TABLE::INTEGER, TABLE::NOT_NULL)
        .execute();
    database->table("conversation_nodes")
        .column("id", TABLE::TEXT, TABLE::PRIMARY_KEY)
        .column("conversation_id", TABLE::TEXT, TABLE::NOT_NULL)
        .column("parent_id", TABLE::TEXT)
        .column("role", TABLE::INTEGER, TABLE::NOT_NULL)
        .column("content", TABLE::TEXT, TABLE::NOT_NULL)
        .column("stop_reason", TABLE::INTEGER, TABLE::NOT_NULL)
        .column("created_at", TABLE::INTEGER, TABLE::NOT_NULL)
        .execute();
    ensureReasoningContentColumn();
    database->table("api_settings")
        .column("id", TABLE::TEXT, TABLE::PRIMARY_KEY)
        .column("api_key", TABLE::TEXT, TABLE::NOT_NULL)
        .column("base_url", TABLE::TEXT, TABLE::NOT_NULL)
        .column("model", TABLE::TEXT)
        .column("max_tokens", TABLE::INTEGER, TABLE::NOT_NULL)
        .column("temperature", TABLE::REAL, TABLE::NOT_NULL)
        .column("top_p", TABLE::REAL, TABLE::NOT_NULL)
        .column("system_prompt", TABLE::TEXT, TABLE::NOT_NULL)
        .column("access_token", TABLE::TEXT)
        .column("user_id", TABLE::TEXT)
        .execute();
    database->table("ai_configs")
        .column("id", TABLE::TEXT, TABLE::PRIMARY_KEY)
        .column("name", TABLE::TEXT, TABLE::NOT_NULL)
        .column("api_key", TABLE::TEXT, TABLE::NOT_NULL)
        .column("base_url", TABLE::TEXT, TABLE::NOT_NULL)
        .column("model", TABLE::TEXT)
        .column("max_tokens", TABLE::INTEGER, TABLE::NOT_NULL)
        .column("temperature", TABLE::REAL, TABLE::NOT_NULL)
        .column("top_p", TABLE::REAL, TABLE::NOT_NULL)
        .column("system_prompt", TABLE::TEXT, TABLE::NOT_NULL)
        .column("access_token", TABLE::TEXT)
        .column("user_id", TABLE::TEXT)
        .column("created_at", TABLE::INTEGER, TABLE::NOT_NULL)
        .execute();
    database->table("ai_meta")
        .column("key", TABLE::TEXT, TABLE::PRIMARY_KEY)
        .column("value", TABLE::TEXT, TABLE::NOT_NULL)
        .execute();
}

void ConversationManager::ensureReasoningContentColumn()
{
    try
    {
        auto results = database->select("conversation_nodes").select("reasoning_content").limit(1).execute();
    }
    catch (...)
    {
        try
        {
            database->exec("ALTER TABLE conversation_nodes ADD COLUMN reasoning_content TEXT DEFAULT ''");
        }
        catch (...)
        {
        }
    }
}

void ConversationManager::setDatabasePath(const std::string &path)
{
    std::lock_guard<std::mutex> lock(dbMutex);
    database = std::make_unique<DATABASE>(path);
    initializeTables();
    migrateToMultiConfig();

    activeConfigId = getActiveConfigId();
    if (activeConfigId.empty())
    {
        auto configs = getConfigList();
        if (!configs.empty())
            setActiveConfigId(configs[0].id);
        activeConfigId = getActiveConfigId();
    }
}

void ConversationManager::migrateToMultiConfig()
{
    auto existingConfigs = database->select("ai_configs").execute();
    if (!existingConfigs.empty())
        return;

    auto oldSettings = database->select("api_settings").where("id", "default").execute();
    if (oldSettings.empty())
    {
        auto currentTime = std::chrono::duration_cast<std::chrono::seconds>(
                               std::chrono::system_clock::now().time_since_epoch())
                               .count();
        database->insert("ai_configs")
            .value("id", "default")
            .value("name", "默认配置")
            .value("api_key", "")
            .value("base_url", "")
            .value("model", "")
            .value("max_tokens", 1000)
            .value("temperature", 0.7)
            .value("top_p", 1.0)
            .value("system_prompt", "你是一个有用的助手。请尽力回答问题。请不要使用任何 Markdown 语法或者表情符号等特殊字符来格式化回答。")
            .value("access_token", "")
            .value("user_id", "")
            .value("created_at", currentTime)
            .execute();
    }
    else
    {
        const auto &row = oldSettings[0];
        auto currentTime = std::chrono::duration_cast<std::chrono::seconds>(
                               std::chrono::system_clock::now().time_since_epoch())
                               .count();
        database->insert("ai_configs")
            .value("id", "default")
            .value("name", "默认配置")
            .value("api_key", row.count("api_key") ? row.at("api_key") : "")
            .value("base_url", row.count("base_url") ? row.at("base_url") : "")
            .value("model", row.count("model") ? row.at("model") : "")
            .value("max_tokens", row.count("max_tokens") ? std::stoi(row.at("max_tokens")) : 1000)
            .value("temperature", row.count("temperature") ? std::stod(row.at("temperature")) : 0.7)
            .value("top_p", row.count("top_p") ? std::stod(row.at("top_p")) : 1.0)
            .value("system_prompt", row.count("system_prompt") ? row.at("system_prompt") : "")
            .value("access_token", row.count("access_token") ? row.at("access_token") : "")
            .value("user_id", row.count("user_id") ? row.at("user_id") : "")
            .value("created_at", currentTime)
            .execute();
    }
    database->insert("ai_meta")
        .value("key", "active_config_id")
        .value("value", "default")
        .execute();
}

std::vector<ConversationInfo> ConversationManager::getConversationList()
{
    std::lock_guard<std::mutex> lock(dbMutex);
    std::vector<ConversationInfo> conversations;
    auto results = database->select("conversations")
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
    database->insert("conversations")
        .value("id", outConversationId)
        .value("title", title)
        .value("created_at", currentTime)
        .value("updated_at", currentTime)
        .execute();
}
void ConversationManager::deleteConversation(const std::string &conversationId)
{
    std::lock_guard<std::mutex> lock(dbMutex);
    database->remove("conversation_nodes")
        .where("conversation_id", conversationId)
        .execute();
    database->remove("conversations")
        .where("id", conversationId)
        .execute();
}
void ConversationManager::updateConversationTitle(const std::string &conversationId, const std::string &title)
{
    std::lock_guard<std::mutex> lock(dbMutex);
    database->update("conversations")
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

    database->update("conversations")
        .set("updated_at", currentTime)
        .where("id", conversationId)
        .execute();

    database->remove("conversation_nodes")
        .where("conversation_id", conversationId)
        .execute();

    for (const auto &pair : nodeMap)
    {
        const auto &node = pair.second;
        if (!node)
            continue;

        database->insert("conversation_nodes")
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

    auto nodeResults = database->select("conversation_nodes")
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

void ConversationManager::updateNodeContent(const std::string &conversationId, const std::string &nodeId,
                                            const std::string &content, const std::string &reasoningContent)
{
    std::lock_guard<std::mutex> lock(dbMutex);
    ensureReasoningContentColumn();
    database->update("conversation_nodes")
        .set("content", content)
        .set("reasoning_content", reasoningContent)
        .where("conversation_id", conversationId)
        .where("id", nodeId)
        .execute();
}

void ConversationManager::updateNodeStopReason(const std::string &conversationId, const std::string &nodeId, int stopReason)
{
    std::lock_guard<std::mutex> lock(dbMutex);
    database->update("conversation_nodes")
        .set("stop_reason", stopReason)
        .where("conversation_id", conversationId)
        .where("id", nodeId)
        .execute();
}

void ConversationManager::updateConversationUpdatedAt(const std::string &conversationId)
{
    std::lock_guard<std::mutex> lock(dbMutex);
    auto currentTime = std::chrono::duration_cast<std::chrono::seconds>(
                           std::chrono::system_clock::now().time_since_epoch())
                           .count();
    database->update("conversations")
        .set("updated_at", currentTime)
        .where("id", conversationId)
        .execute();
}

void ConversationManager::addNodeToConversation(const std::string &conversationId, const ConversationNode &node)
{
    std::lock_guard<std::mutex> lock(dbMutex);
    ensureReasoningContentColumn();
    auto currentTime = std::chrono::duration_cast<std::chrono::seconds>(
                           std::chrono::system_clock::now().time_since_epoch())
                           .count();
    database->insert("conversation_nodes")
        .value("id", node.id)
        .value("conversation_id", conversationId)
        .value("parent_id", node.parentId)
        .value("role", (int)node.role)
        .value("content", node.content)
        .value("reasoning_content", node.reasoningContent)
        .value("stop_reason", (int)node.stopReason)
        .value("created_at", currentTime)
        .execute();
}

void ConversationManager::saveApiSettings(const std::string &apiKey, const std::string &baseUrl,
                                          const std::string &model, int maxTokens,
                                          double temperature, double topP, const std::string &systemPrompt,
                                          const std::string &accessToken, const std::string &userId)
{
    std::lock_guard<std::mutex> lock(dbMutex);
    std::string targetId = activeConfigId.empty() ? "default" : activeConfigId;
    database->update("ai_configs")
        .set("api_key", apiKey)
        .set("base_url", baseUrl)
        .set("model", model)
        .set("max_tokens", maxTokens)
        .set("temperature", temperature)
        .set("top_p", topP)
        .set("system_prompt", systemPrompt)
        .set("access_token", accessToken)
        .set("user_id", userId)
        .where("id", targetId)
        .execute();
}

void ConversationManager::loadApiSettings(std::string &apiKey, std::string &baseUrl,
                                          std::string &model, int &maxTokens,
                                          double &temperature, double &topP, std::string &systemPrompt,
                                          std::string &accessToken, std::string &userId)
{
    std::lock_guard<std::mutex> lock(dbMutex);
    std::string targetId = activeConfigId.empty() ? "default" : activeConfigId;
    auto results = database->select("ai_configs")
                       .where("id", targetId)
                       .execute();

    if (results.empty())
    {
        auto allConfigs = database->select("ai_configs")
                              .select("id")
                              .order("created_at", true)
                              .execute();
        if (!allConfigs.empty())
        {
            targetId = allConfigs[0].at("id");
            results = database->select("ai_configs")
                          .where("id", targetId)
                          .execute();
            activeConfigId = targetId;
        }
    }

    if (!results.empty())
    {
        const auto &row = results[0];
        apiKey = row.count("api_key") ? row.at("api_key") : "";
        baseUrl = row.count("base_url") ? row.at("base_url") : "";
        model = row.count("model") ? row.at("model") : "";
        maxTokens = row.count("max_tokens") ? std::stoi(row.at("max_tokens")) : 1000;
        temperature = row.count("temperature") ? std::stod(row.at("temperature")) : 0.7;
        topP = row.count("top_p") ? std::stod(row.at("top_p")) : 1.0;
        systemPrompt = row.count("system_prompt") ? row.at("system_prompt") : "";
        accessToken = row.count("access_token") ? row.at("access_token") : "";
        userId = row.count("user_id") ? row.at("user_id") : "";
    }
}

std::vector<ConfigInfo> ConversationManager::getConfigList()
{
    std::lock_guard<std::mutex> lock(dbMutex);
    std::vector<ConfigInfo> configs;
    auto results = database->select("ai_configs")
                       .select("id")
                       .select("name")
                       .select("created_at")
                       .order("created_at", true)
                       .execute();
    for (const auto &row : results)
        configs.push_back(ConfigInfo(
            row.at("id"),
            row.at("name"),
            std::stoll(row.at("created_at"))));
    return configs;
}

std::string ConversationManager::createConfig(const std::string &name)
{
    std::lock_guard<std::mutex> lock(dbMutex);
    std::string newId = strUtils::randomId();
    auto currentTime = std::chrono::duration_cast<std::chrono::seconds>(
                           std::chrono::system_clock::now().time_since_epoch())
                           .count();
    database->insert("ai_configs")
        .value("id", newId)
        .value("name", name.empty() ? "新配置" : name)
        .value("api_key", "")
        .value("base_url", "")
        .value("model", "")
        .value("max_tokens", 1000)
        .value("temperature", 0.7)
        .value("top_p", 1.0)
        .value("system_prompt", "你是一个有用的助手。请尽力回答问题。请不要使用任何 Markdown 语法或者表情符号等特殊字符来格式化回答。")
        .value("access_token", "")
        .value("user_id", "")
        .value("created_at", currentTime)
        .execute();
    return newId;
}

void ConversationManager::deleteConfig(const std::string &configId)
{
    std::lock_guard<std::mutex> lock(dbMutex);
    database->remove("ai_configs").where("id", configId).execute();

    if (activeConfigId == configId)
    {
        auto remaining = database->select("ai_configs")
                             .select("id")
                             .order("created_at", true)
                             .execute();
        std::string newActiveId = remaining.empty() ? "" : remaining[0].at("id");
        activeConfigId = newActiveId;

        auto metaResults = database->select("ai_meta").where("key", "active_config_id").execute();
        if (metaResults.empty())
        {
            if (!newActiveId.empty())
                database->insert("ai_meta")
                    .value("key", "active_config_id")
                    .value("value", newActiveId)
                    .execute();
        }
        else
        {
            if (newActiveId.empty())
                database->remove("ai_meta").where("key", "active_config_id").execute();
            else
                database->update("ai_meta")
                    .set("value", newActiveId)
                    .where("key", "active_config_id")
                    .execute();
        }
    }
}

std::string ConversationManager::getActiveConfigId()
{
    std::lock_guard<std::mutex> lock(dbMutex);
    auto results = database->select("ai_meta").where("key", "active_config_id").execute();
    if (results.empty())
        return "";
    return results[0].at("value");
}

void ConversationManager::setActiveConfigId(const std::string &configId)
{
    std::lock_guard<std::mutex> lock(dbMutex);
    auto metaResults = database->select("ai_meta").where("key", "active_config_id").execute();
    if (metaResults.empty())
    {
        if (!configId.empty())
            database->insert("ai_meta")
                .value("key", "active_config_id")
                .value("value", configId)
                .execute();
    }
    else
    {
        if (configId.empty())
            database->remove("ai_meta").where("key", "active_config_id").execute();
        else
            database->update("ai_meta")
                .set("value", configId)
                .where("key", "active_config_id")
                .execute();
    }
    activeConfigId = configId;
}

void ConversationManager::updateConfigName(const std::string &configId, const std::string &name)
{
    std::lock_guard<std::mutex> lock(dbMutex);
    database->update("ai_configs")
        .set("name", name.empty() ? "未命名配置" : name)
        .where("id", configId)
        .execute();
}
