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

AI::AI()
{
    std::lock_guard<std::mutex> settingsLock(settingsMutex);
    std::lock_guard<std::mutex> conversationLock(conversationMutex);

    conversationManager.loadApiSettings(apiKey, baseUrl, model, maxTokens, temperature, topP, systemPrompt);

    auto conversationsResponse = conversationManager.getConversationList();
    if (conversationsResponse.empty())
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
        conversationId = conversationsResponse[0].id;
        std::unique_lock<std::shared_mutex> stateLock(stateMutex);
        conversationManager.loadConversation(conversationId, nodeMap, rootNodeId, currentNodeId);
    }
}

ConversationNode *AI::findNode(const std::string &nodeId)
{
    auto it = nodeMap.find(nodeId);
    return (it != nodeMap.end()) ? it->second.get() : nullptr;
}

std::vector<ConversationNode> AI::getPathFromRoot(const std::string &nodeId)
{
    std::vector<ConversationNode> path;
    std::string currentId = nodeId;
    while (!currentId.empty())
    {
        ConversationNode *node = findNode(currentId);
        if (!node)
            break;
        path.push_back(*node);
        currentId = node->parentId;
    }
    std::reverse(path.begin(), path.end());
    return path;
}

void AI::addNode(ConversationNode::ROLE role, std::string content)
{
    std::unique_lock<std::shared_mutex> stateLock(stateMutex);
    std::string nodeId = strUtils::randomId();
    ConversationNode *parent = findNode(currentNodeId);
    if (parent)
        parent->childIds.push_back(nodeId);
    nodeMap[nodeId] = std::make_unique<ConversationNode>(nodeId, role, content, currentNodeId);
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
    ConversationNode *node = findNode(nodeId);
    if (node)
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

void AI::saveConversation()
{
    std::shared_lock<std::shared_mutex> stateLock(stateMutex);
    if (!conversationId.empty())
    {
        conversationManager.saveConversation(conversationId, nodeMap);
    }
}

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

void AI::setSettings(const std::string &apiKey, const std::string &baseUrl,
                     const std::string &model, int maxTokens,
                     double temperature, double topP, std::string systemPrompt)
{
    std::lock_guard<std::mutex> settingsLock(settingsMutex);
    this->apiKey = apiKey, this->baseUrl = baseUrl;
    this->model = model, this->maxTokens = maxTokens;
    this->temperature = temperature, this->topP = topP, this->systemPrompt = systemPrompt;
    conversationManager.saveApiSettings(apiKey, baseUrl, model, maxTokens, temperature, topP, systemPrompt);
}
SettingsResponse AI::getSettings() const
{
    std::lock_guard<std::mutex> settingsLock(settingsMutex);
    return SettingsResponse(apiKey, baseUrl,
                            model, maxTokens,
                            temperature, topP, systemPrompt);
}

std::string AI::generateResponse(AIStreamCallback streamCallback)
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

    const std::string_view roleString[3] = {"user", "assistant", "system"};
    nlohmann::json messagesArray = nlohmann::json::array();

    {
        std::shared_lock<std::shared_mutex> stateLock(stateMutex);
        for (const auto &msg : getPathFromRoot(currentNodeId))
            messagesArray.push_back({{"role", roleString[msg.role]},
                                     {"content", msg.content}});
    }

    requestJson["messages"] = messagesArray;

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

    StreamCallback packedStreamCallback = [&fullContent, &fullReasoning, &responseMutex, &wasCancelled, &responseStarted, &assistantNodeId, &finalStopReason, cancellationToken, streamCallback, this](const std::string &chunk)
    {
        if (cancellationToken->load())
        {
            wasCancelled = true;
            finalStopReason = ConversationNode::STOP_REASON_USER_STOPPED;
            return;
        }

        if (chunk.empty() || chunk == "[DONE]")
            return;

        nlohmann::json chunkJson = nlohmann::json::parse(chunk);
        auto choice = chunkJson["choices"][0];

        if (choice["finish_reason"].is_string())
        {
            std::string finishReason = choice["finish_reason"];
            if (finishReason == "stop")
                finalStopReason = ConversationNode::STOP_REASON_STOP;
            else if (finishReason == "length")
                finalStopReason = ConversationNode::STOP_REASON_LENGTH;
            else if (finishReason == "content_filter")
                finalStopReason = ConversationNode::STOP_REASON_CONTENT_FILTER;
            else
                finalStopReason = ConversationNode::STOP_REASON_ERROR;
        }

        std::string reasoningDelta = "";
        std::string contentDelta = "";
        if (choice["delta"]["reasoning_content"].is_string())
            reasoningDelta = choice["delta"]["reasoning_content"];
        if (choice["delta"]["content"].is_string())
            contentDelta = choice["delta"]["content"];
        if (!reasoningDelta.empty() || !contentDelta.empty())
        {
            {
                std::lock_guard<std::mutex> lock(responseMutex);

                if (!responseStarted)
                {
                    responseStarted = true;
                    std::unique_lock<std::shared_mutex> stateLock(stateMutex);
                    assistantNodeId = strUtils::randomId();
                    ConversationNode *parent = findNode(currentNodeId);
                    if (parent)
                        parent->childIds.push_back(assistantNodeId);
                    nodeMap[assistantNodeId] = std::make_unique<ConversationNode>(assistantNodeId, ConversationNode::ROLE_ASSISTANT, fullContent, currentNodeId);
                    currentNodeId = assistantNodeId;
                    stateLock.unlock();
                    saveConversation();
                }

                if (!reasoningDelta.empty() || !contentDelta.empty())
                {
                    std::unique_lock<std::shared_mutex> stateLock(stateMutex);
                    ConversationNode *assistantNode = findNode(assistantNodeId);
                    if (assistantNode)
                    {
                        if (!reasoningDelta.empty())
                        {
                            fullReasoning += reasoningDelta;
                            assistantNode->reasoningContent = fullReasoning;
                        }
                        if (!contentDelta.empty())
                        {
                            fullContent += contentDelta;
                            assistantNode->content = fullContent;
                        }
                    }
                    stateLock.unlock();
                    saveConversation();
                }
            }
            if (!reasoningDelta.empty())
                streamCallback(std::string("\x01") + reasoningDelta);
            if (!contentDelta.empty())
                streamCallback(std::string("\x02") + contentDelta);
        }
    };

    std::string currentApiKey, currentBaseUrl;
    {
        std::lock_guard<std::mutex> settingsLock(settingsMutex);
        currentApiKey = apiKey;
        currentBaseUrl = baseUrl;
    }

    Response response = Fetch::fetch(currentBaseUrl + "chat/completions",
                                     FetchOptions("POST",
                                                  {{"Content-Type", "application/json"},
                                                   {"Authorization", "Bearer " + currentApiKey},
                                                   {"Accept", "text/event-stream"}},
                                                  requestJson.dump(),
                                                  true,
                                                  packedStreamCallback,
                                                  0,
                                                  cancellationToken));
    {
        std::lock_guard<std::mutex> cancelLock(requestCancelMutex);
        currentRequestCancelled = nullptr;
    }
    if (wasCancelled || cancellationToken->load())
    {
        std::lock_guard<std::mutex> lock(responseMutex);
        if (responseStarted && !assistantNodeId.empty())
        {
            std::unique_lock<std::shared_mutex> stateLock(stateMutex);
            ConversationNode *assistantNode = findNode(assistantNodeId);
            if (assistantNode)
            {
                assistantNode->stopReason = ConversationNode::STOP_REASON_USER_STOPPED;
            }
            stateLock.unlock();
            saveConversation();
        }
        return fullContent;
    }
    if (!response.isOk())
        THROW_NETWORK_ERROR(response.status);

    {
        std::lock_guard<std::mutex> lock(responseMutex);
        if (!responseStarted && !fullContent.empty())
        {
            addNode(ConversationNode::ROLE_ASSISTANT, fullContent);
        }
        else if (responseStarted && !assistantNodeId.empty() && finalStopReason != ConversationNode::STOP_REASON_NONE)
        {
            std::unique_lock<std::shared_mutex> stateLock(stateMutex);
            ConversationNode *assistantNode = findNode(assistantNodeId);
            if (assistantNode)
            {
                assistantNode->stopReason = finalStopReason;
            }
            stateLock.unlock();
            saveConversation();
        }
        return fullContent;
    }
}

void AI::stopGeneration()
{
    std::lock_guard<std::mutex> cancelLock(requestCancelMutex);
    if (currentRequestCancelled)
        currentRequestCancelled->store(true);
}

std::vector<std::string> AI::getModels()
{
    std::string currentApiKey, currentBaseUrl;
    {
        std::lock_guard<std::mutex> settingsLock(settingsMutex);
        currentApiKey = apiKey;
        currentBaseUrl = baseUrl;
    }

    std::vector<std::string> modelIds;
    Response response = Fetch::fetch(currentBaseUrl + "models",
                                     FetchOptions("GET",
                                                  {{"Authorization", "Bearer " + currentApiKey}}));
    if (!response.isOk())
        THROW_NETWORK_ERROR(response.status);
    nlohmann::json responseJson = response.json();
    for (const auto &model : responseJson.at("data"))
        modelIds.push_back(model.at("id"));
    return modelIds;
}

BalanceInfo AI::getUserBalance()
{
    std::string currentApiKey, currentBaseUrl;
    {
        std::lock_guard<std::mutex> settingsLock(settingsMutex);
        currentApiKey = apiKey;
        currentBaseUrl = baseUrl;
    }

    std::string authHeader = "Bearer " + currentApiKey;

    // 1. 查总额度上限（OpenAI 兼容 billing 接口，适用于 New API / One API 系网关）
    Response subResp = Fetch::fetch(currentBaseUrl + "dashboard/billing/subscription",
                                    FetchOptions("GET", {{"Authorization", authHeader}}));
    if (!subResp.isOk())
        THROW_NETWORK_ERROR(subResp.status);
    nlohmann::json subJson = subResp.json();
    if (subJson.contains("error"))
        THROW_NETWORK_ERROR(502);
    double hardLimit = 0.0;
    if (subJson["hard_limit_usd"].is_number())
        hardLimit = subJson["hard_limit_usd"].get<double>();

    // New API 无限额度哨兵值
    if (hardLimit >= 100000000.0)
        return BalanceInfo{0.0, 0.0, 0.0, true};

    // 2. 查已使用（单位美分，需 /100 转美元）
    Response usageResp = Fetch::fetch(currentBaseUrl + "dashboard/billing/usage",
                                      FetchOptions("GET", {{"Authorization", authHeader}}));
    if (!usageResp.isOk())
        THROW_NETWORK_ERROR(usageResp.status);
    nlohmann::json usageJson = usageResp.json();
    if (usageJson.contains("error"))
        THROW_NETWORK_ERROR(502);
    double totalUsage = 0.0;
    if (usageJson["total_usage"].is_number())
        totalUsage = usageJson["total_usage"].get<double>();

    double usedUsd = totalUsage / 100.0;
    double balanceUsd = hardLimit - usedUsd;
    if (balanceUsd < 0)
        balanceUsd = 0.0;
    return BalanceInfo{balanceUsd, usedUsd, hardLimit, false};
}
