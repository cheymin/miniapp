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

#include "AI.hpp"
#include "strUtils.hpp"
#include <Exceptions/NetworkError.hpp>
#include <iostream>
#include <sstream>
#include <regex>
#include <chrono>

// ============================================================
// 构造 / 析构
// ============================================================
AI::AI()
{
    std::lock_guard<std::mutex> settingsLock(settingsMutex);
    std::lock_guard<std::mutex> conversationLock(conversationMutex);

    conversationManager.loadApiSettings(apiKey, baseUrl, model,
                                        maxTokens, temperature, topP, systemPrompt);

    auto conversations = conversationManager.getConversationList();
    if (conversations.empty())
    {
        conversationManager.createConversation("默认对话", conversationId);

        std::unique_lock<std::shared_mutex> stateLock(stateMutex);
        currentNodeId = rootNodeId = strUtils::randomId();
        nodeMap[currentNodeId] = std::make_unique<ConversationNode>(
            currentNodeId, ConversationNode::ROLE_SYSTEM, systemPrompt, "");
        stateLock.unlock();
        saveConversation();
    }
    else
    {
        conversationId = conversations[0].id;
        std::unique_lock<std::shared_mutex> stateLock(stateMutex);
        conversationManager.loadConversation(conversationId, nodeMap, rootNodeId, currentNodeId);
    }
}

// ============================================================
// 对话树内部工具
// ============================================================
ConversationNode *AI::findNode(const std::string &nodeId)
{
    auto it = nodeMap.find(nodeId);
    return (it != nodeMap.end()) ? it->second.get() : nullptr;
}

std::vector<ConversationNode> AI::getPathFromRoot(const std::string &nodeId) const
{
    std::vector<ConversationNode> path;
    std::string currentId = nodeId;
    while (!currentId.empty())
    {
        auto it = nodeMap.find(currentId);
        if (it == nodeMap.end())
            break;
        path.push_back(*(it->second));
        currentId = it->second->parentId;
    }
    std::reverse(path.begin(), path.end());
    return path;
}

void AI::saveConversation()
{
    std::shared_lock<std::shared_mutex> stateLock(stateMutex);
    if (!conversationId.empty())
        conversationManager.saveConversation(conversationId, nodeMap);
}

// ============================================================
// 节点操作（公共）
// ============================================================
void AI::addNode(ConversationNode::ROLE role, std::string content)
{
    std::unique_lock<std::shared_mutex> stateLock(stateMutex);
    std::string nodeId = strUtils::randomId();
    ConversationNode *parent = findNode(currentNodeId);
    if (parent)
        parent->childIds.push_back(nodeId);
    nodeMap[nodeId] = std::make_unique<ConversationNode>(nodeId, role, std::move(content), currentNodeId);
    currentNodeId = nodeId;
    stateLock.unlock();
    saveConversation();
}

bool AI::deleteNode(const std::string &nodeId)
{
    std::unique_lock<std::shared_mutex> stateLock(stateMutex);
    ConversationNode *node = findNode(nodeId);
    if (!node)
        return false;
    ConversationNode *parent = findNode(node->parentId);
    if (parent)
    {
        auto it = std::find(parent->childIds.begin(), parent->childIds.end(), nodeId);
        if (it != parent->childIds.end())
            parent->childIds.erase(it);
    }
    nodeMap.erase(nodeId);
    if (currentNodeId == nodeId)
        currentNodeId = node->parentId;
    stateLock.unlock();
    saveConversation();
    return true;
}

bool AI::switchNode(const std::string &nodeId)
{
    std::unique_lock<std::shared_mutex> stateLock(stateMutex);
    if (findNode(nodeId))
    {
        currentNodeId = nodeId;
        return true;
    }
    return false;
}

std::vector<std::string> AI::getChildren(const std::string &nodeId)
{
    std::shared_lock<std::shared_mutex> stateLock(stateMutex);
    ConversationNode *node = findNode(nodeId);
    if (node)
        return node->childIds;
    return {};
}

std::vector<ConversationNode> AI::getCurrentPath()
{
    std::shared_lock<std::shared_mutex> stateLock(stateMutex);
    return getPathFromRoot(currentNodeId);
}

std::string AI::getCurrentNodeId() const
{
    std::shared_lock<std::shared_mutex> stateLock(stateMutex);
    return currentNodeId;
}

std::string AI::getRootNodeId() const
{
    std::shared_lock<std::shared_mutex> stateLock(stateMutex);
    return rootNodeId;
}

std::string AI::getConversationId() const
{
    std::shared_lock<std::shared_mutex> stateLock(stateMutex);
    return conversationId;
}

// ============================================================
// 对话生命周期
// ============================================================
std::vector<ConversationInfo> AI::getConversationList()
{
    std::lock_guard<std::mutex> conversationLock(conversationMutex);
    return conversationManager.getConversationList();
}

void AI::createConversation(const std::string &title)
{
    std::lock_guard<std::mutex> conversationLock(conversationMutex);
    std::string newConversationId;
    conversationManager.createConversation(title, newConversationId);

    {
        std::unique_lock<std::shared_mutex> stateLock(stateMutex);
        conversationId = newConversationId;
        nodeMap.clear();

        std::lock_guard<std::mutex> settingsLock(settingsMutex);
        currentNodeId = rootNodeId = strUtils::randomId();
        nodeMap[currentNodeId] = std::make_unique<ConversationNode>(
            currentNodeId, ConversationNode::ROLE_SYSTEM, systemPrompt, "");
    }
    saveConversation();
}

void AI::loadConversation(const std::string &conversationId)
{
    std::lock_guard<std::mutex> conversationLock(conversationMutex);
    std::unique_lock<std::shared_mutex> stateLock(stateMutex);
    this->conversationId = conversationId;
    conversationManager.loadConversation(conversationId, nodeMap, rootNodeId, currentNodeId);
}

void AI::deleteConversation(const std::string &conversationId)
{
    if (conversationId.empty())
        return;

    std::unique_lock<std::mutex> conversationLock(conversationMutex);
    conversationManager.deleteConversation(conversationId);

    std::unique_lock<std::shared_mutex> stateLock(stateMutex);
    if (this->conversationId == conversationId)
    {
        auto conversations = conversationManager.getConversationList();
        if (!conversations.empty())
        {
            this->conversationId = conversations[0].id;
            conversationManager.loadConversation(this->conversationId, nodeMap, rootNodeId, currentNodeId);
        }
        else
        {
            this->conversationId.clear();
            nodeMap.clear();
            conversationLock.unlock();
            stateLock.unlock();
            createConversation("默认对话");
        }
    }
}

void AI::updateConversationTitle(const std::string &conversationId, const std::string &title)
{
    std::lock_guard<std::mutex> conversationLock(conversationMutex);
    conversationManager.updateConversationTitle(conversationId, title);
}

// ============================================================
// 设置
// ============================================================
void AI::setSettings(const std::string &apiKey, const std::string &baseUrl,
                     const std::string &model, int maxTokens,
                     double temperature, double topP, std::string systemPrompt)
{
    std::lock_guard<std::mutex> settingsLock(settingsMutex);
    this->apiKey = apiKey;
    this->baseUrl = baseUrl;
    this->model = model;
    this->maxTokens = maxTokens;
    this->temperature = temperature;
    this->topP = topP;
    this->systemPrompt = std::move(systemPrompt);
    conversationManager.saveApiSettings(apiKey, baseUrl, model, maxTokens, temperature, topP, this->systemPrompt);
}

SettingsResponse AI::getSettings() const
{
    std::lock_guard<std::mutex> settingsLock(settingsMutex);
    return SettingsResponse(apiKey, baseUrl, model, maxTokens, temperature, topP, systemPrompt);
}

// ============================================================
// OpenAI 适配：请求构造
// ============================================================
nlohmann::json AI::buildChatRequestJson() const
{
    nlohmann::json requestJson;
    {
        std::lock_guard<std::mutex> settingsLock(settingsMutex);
        requestJson["model"] = model;
        requestJson["max_tokens"] = maxTokens;
        requestJson["temperature"] = temperature;
        requestJson["top_p"] = topP;
    }
    requestJson["stream"] = true;

    static const std::string_view roleString[3] = {"user", "assistant", "system"};
    nlohmann::json messagesArray = nlohmann::json::array();

    {
        std::shared_lock<std::shared_mutex> stateLock(stateMutex);
        for (const auto &msg : getPathFromRoot(currentNodeId))
        {
            nlohmann::json msgJson;
            msgJson["role"] = roleString[msg.role];
            msgJson["content"] = msg.content;
            messagesArray.push_back(std::move(msgJson));
        }
    }

    requestJson["messages"] = std::move(messagesArray);
    return requestJson;
}

// ============================================================
// OpenAI 适配：SSE Chunk 解析
// ============================================================
AI::StreamDelta AI::parseStreamDelta(const std::string &sseData) const
{
    StreamDelta delta;
    if (sseData.empty() || sseData == "[DONE]")
        return delta;

    try
    {
        nlohmann::json chunkJson = nlohmann::json::parse(sseData);

        // 某些提供商在错误时返回非 choices 结构，直接忽略
        if (!chunkJson.contains("choices") || !chunkJson["choices"].is_array() || chunkJson["choices"].empty())
            return delta;

        const auto &choice = chunkJson["choices"][0];

        if (choice.contains("finish_reason") && choice["finish_reason"].is_string())
            delta.finishReason = choice["finish_reason"].get<std::string>();

        if (!choice.contains("delta") || !choice["delta"].is_object())
            return delta;

        const auto &deltaObj = choice["delta"];

        if (deltaObj.contains("content") && deltaObj["content"].is_string())
            delta.content = deltaObj["content"].get<std::string>();

        if (deltaObj.contains("reasoning_content") && deltaObj["reasoning_content"].is_string())
            delta.reasoningContent = deltaObj["reasoning_content"].get<std::string>();

        delta.isValid = true;
    }
    catch (const nlohmann::json::exception &e)
    {
        // SSE 行解析失败时不中断流，仅静默丢弃
        std::cerr << "[AI] SSE JSON parse error: " << e.what() << " | raw: " << sseData << std::endl;
    }
    return delta;
}

// ============================================================
// OpenAI 适配：网络请求封装
// ============================================================
Response AI::performChatCompletion(const nlohmann::json &requestJson,
                                   StreamCallback streamCallback,
                                   std::shared_ptr<std::atomic<bool>> cancellationToken) const
{
    std::string currentApiKey, currentBaseUrl;
    {
        std::lock_guard<std::mutex> settingsLock(settingsMutex);
        currentApiKey = apiKey;
        currentBaseUrl = baseUrl;
    }

    // 确保 baseUrl 以斜杠结尾，便于拼接 endpoint
    std::string url = currentBaseUrl;
    if (!url.empty() && url.back() != '/')
        url.push_back('/');
    url += "chat/completions";

    return Fetch::fetch(url,
                        FetchOptions("POST",
                                     {{"Content-Type", "application/json"},
                                      {"Authorization", "Bearer " + currentApiKey},
                                      {"Accept", "text/event-stream"}},
                                     requestJson.dump(),
                                     true,
                                     streamCallback,
                                     0,
                                     cancellationToken));
}

// ============================================================
// OpenAI 适配：流式生成核心
// ============================================================
std::string AI::generateResponse(AIStreamCallback streamCallback)
{
    nlohmann::json requestJson = buildChatRequestJson();

    // 生成状态
    std::string fullContent;
    std::string fullReasoning;
    std::mutex responseMutex;
    bool wasCancelled = false;
    bool responseStarted = false;
    std::string assistantNodeId;
    ConversationNode::STOP_REASON finalStopReason = ConversationNode::STOP_REASON_NONE;

    std::shared_ptr<std::atomic<bool>> cancellationToken;
    {
        std::lock_guard<std::mutex> cancelLock(requestCancelMutex);
        currentRequestCancelled = std::make_shared<std::atomic<bool>>(false);
        cancellationToken = currentRequestCancelled;
    }

    // 包装用户回调，负责解析 SSE、维护节点树、转发文本片段
    StreamCallback packedStreamCallback = [&](const std::string &sseData)
    {
        if (cancellationToken->load())
        {
            wasCancelled = true;
            finalStopReason = ConversationNode::STOP_REASON_USER_STOPPED;
            return;
        }

        StreamDelta delta = parseStreamDelta(sseData);
        if (!delta.isValid && delta.finishReason.empty())
            return;

        // 映射 finish_reason -> STOP_REASON
        if (!delta.finishReason.empty())
        {
            if (delta.finishReason == "stop")
                finalStopReason = ConversationNode::STOP_REASON_STOP;
            else if (delta.finishReason == "length")
                finalStopReason = ConversationNode::STOP_REASON_LENGTH;
            else if (delta.finishReason == "content_filter")
                finalStopReason = ConversationNode::STOP_REASON_CONTENT_FILTER;
            else
                finalStopReason = ConversationNode::STOP_REASON_ERROR;
        }

        // 若无内容增量且未结束，则无需处理
        if (delta.content.empty() && delta.reasoningContent.empty() && delta.finishReason.empty())
            return;

        std::lock_guard<std::mutex> lock(responseMutex);

        // 首次收到有效内容时创建 assistant 节点
        if (!responseStarted && (!delta.content.empty() || !delta.reasoningContent.empty()))
        {
            responseStarted = true;
            std::unique_lock<std::shared_mutex> stateLock(stateMutex);
            assistantNodeId = strUtils::randomId();
            ConversationNode *parent = findNode(currentNodeId);
            if (parent)
                parent->childIds.push_back(assistantNodeId);
            nodeMap[assistantNodeId] = std::make_unique<ConversationNode>(
                assistantNodeId, ConversationNode::ROLE_ASSISTANT, "", currentNodeId);
            currentNodeId = assistantNodeId;
            stateLock.unlock();
            saveConversation();
        }

        // 追加内容到节点
        if (!delta.content.empty() || !delta.reasoningContent.empty())
        {
            std::unique_lock<std::shared_mutex> stateLock(stateMutex);
            ConversationNode *assistantNode = findNode(assistantNodeId);
            if (assistantNode)
            {
                if (!delta.reasoningContent.empty())
                {
                    fullReasoning += delta.reasoningContent;
                    assistantNode->reasoningContent = fullReasoning;
                }
                if (!delta.content.empty())
                {
                    fullContent += delta.content;
                    assistantNode->content = fullContent;
                }
            }
            stateLock.unlock();
            saveConversation();
        }

        // 向 UI 层推送片段（带类型前缀）
        if (!delta.reasoningContent.empty())
            streamCallback(std::string("\x01") + delta.reasoningContent);
        if (!delta.content.empty())
            streamCallback(std::string("\x02") + delta.content);
    };

    Response response = performChatCompletion(requestJson, packedStreamCallback, cancellationToken);

    {
        std::lock_guard<std::mutex> cancelLock(requestCancelMutex);
        currentRequestCancelled = nullptr;
    }

    // ---------- 后处理 ----------

    // 用户主动取消
    if (wasCancelled || cancellationToken->load())
    {
        std::lock_guard<std::mutex> lock(responseMutex);
        if (responseStarted && !assistantNodeId.empty())
        {
            std::unique_lock<std::shared_mutex> stateLock(stateMutex);
            ConversationNode *assistantNode = findNode(assistantNodeId);
            if (assistantNode)
                assistantNode->stopReason = ConversationNode::STOP_REASON_USER_STOPPED;
            stateLock.unlock();
            saveConversation();
        }
        return fullContent;
    }

    // HTTP 错误（非 2xx）
    if (!response.isOk())
    {
        // 若流未开始，尝试从 response.body 读取提供商返回的错误信息
        if (!responseStarted)
        {
            try
            {
                nlohmann::json errJson = response.json();
                if (errJson.contains("error") && errJson["error"].contains("message"))
                {
                    std::string errMsg = errJson["error"]["message"].get<std::string>();
                    THROW_NETWORK_ERROR(response.status, errMsg);
                }
            }
            catch (...) {}
        }
        THROW_NETWORK_ERROR(response.status);
    }

    // 正常结束：补充 stopReason 或兜底创建节点
    std::lock_guard<std::mutex> lock(responseMutex);
    if (!responseStarted && !fullContent.empty())
    {
        // 非流式回退（理论上不会走到这里，因为 stream=true）
        addNode(ConversationNode::ROLE_ASSISTANT, fullContent);
    }
    else if (responseStarted && !assistantNodeId.empty() && finalStopReason != ConversationNode::STOP_REASON_NONE)
    {
        std::unique_lock<std::shared_mutex> stateLock(stateMutex);
        ConversationNode *assistantNode = findNode(assistantNodeId);
        if (assistantNode)
            assistantNode->stopReason = finalStopReason;
        stateLock.unlock();
        saveConversation();
    }
    return fullContent;
}

void AI::stopGeneration()
{
    std::lock_guard<std::mutex> cancelLock(requestCancelMutex);
    if (currentRequestCancelled)
        currentRequestCancelled->store(true);
}

// ============================================================
// 模型列表
// ============================================================
std::vector<std::string> AI::getModels()
{
    std::string currentApiKey, currentBaseUrl;
    {
        std::lock_guard<std::mutex> settingsLock(settingsMutex);
        currentApiKey = apiKey;
        currentBaseUrl = baseUrl;
    }

    std::string url = currentBaseUrl;
    if (!url.empty() && url.back() != '/')
        url.push_back('/');
    url += "models";

    Response response = Fetch::fetch(url,
                                     FetchOptions("GET",
                                                  {{"Authorization", "Bearer " + currentApiKey}}));
    if (!response.isOk())
        THROW_NETWORK_ERROR(response.status);

    nlohmann::json responseJson = response.json();
    std::vector<std::string> modelIds;
    if (responseJson.contains("data") && responseJson["data"].is_array())
    {
        for (const auto &model : responseJson.at("data"))
        {
            if (model.contains("id") && model["id"].is_string())
                modelIds.push_back(model.at("id").get<std::string>());
        }
    }
    return modelIds;
}
