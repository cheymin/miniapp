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

#pragma once

#include <string>
#include <vector>
#include <functional>
#include <memory>
#include <unordered_map>
#include <mutex>
#include <shared_mutex>
#include <nlohmann/json.hpp>
#include "Fetch.hpp"
#include "AICallback.hpp"
#include "ConversationInfo.hpp"
#include "ConversationManager.hpp"
#include "SettingsResponse.hpp"

/**
 * @brief OpenAI 兼容 API 的 AI 核心类
 *
 * 负责对话树管理、持久化、流式请求生成与解析。
 * 所有公共接口均保持线程安全，并与 JSAI 的 JS 绑定一一对应。
 */
class AI
{
private:
    ConversationManager conversationManager;

    // API 设置
    std::string apiKey;
    std::string baseUrl;
    std::string model = "deepseek-chat";
    int maxTokens = 1000;
    double temperature = 0.7;
    double topP = 1.0;
    std::string systemPrompt = "你是一个有用的助手。请尽力回答问题。请不要使用任何 Markdown 语法或者表情符号等特殊字符来格式化回答。";

    // 对话树状态
    std::unordered_map<std::string, std::unique_ptr<ConversationNode>> nodeMap;
    std::string currentNodeId;
    std::string rootNodeId;
    std::string conversationId;

    // 同步原语
    mutable std::shared_mutex stateMutex;
    mutable std::mutex settingsMutex;
    mutable std::mutex conversationMutex;

    // 请求取消
    std::shared_ptr<std::atomic<bool>> currentRequestCancelled;
    std::mutex requestCancelMutex;

    // ---------- 内部工具方法 ----------
    ConversationNode *findNode(const std::string &nodeId);
    std::vector<ConversationNode> getPathFromRoot(const std::string &nodeId) const;
    void saveConversation();

    // OpenAI 请求构造
    nlohmann::json buildChatRequestJson() const;

    // SSE Chunk 解析结果
    struct StreamDelta
    {
        std::string content;
        std::string reasoningContent;
        std::string finishReason;
        bool isValid = false;
    };
    StreamDelta parseStreamDelta(const std::string &sseData) const;

    // 网络请求封装
    Response performChatCompletion(const nlohmann::json &requestJson,
                                   StreamCallback streamCallback,
                                   std::shared_ptr<std::atomic<bool>> cancellationToken) const;

public:
    AI();

    // ---------- 对话节点管理 ----------
    void addNode(ConversationNode::ROLE role, std::string content);
    bool deleteNode(const std::string &nodeId);
    bool switchNode(const std::string &nodeId);

    std::vector<std::string> getChildren(const std::string &nodeId);
    std::vector<ConversationNode> getCurrentPath();
    std::string getCurrentNodeId() const;
    std::string getRootNodeId() const;
    std::string getConversationId() const;

    // ---------- 对话生命周期 ----------
    std::vector<ConversationInfo> getConversationList();
    void createConversation(const std::string &title);
    void loadConversation(const std::string &conversationId);
    void deleteConversation(const std::string &conversationId);
    void updateConversationTitle(const std::string &conversationId, const std::string &title);

    // ---------- 设置 ----------
    void setSettings(const std::string &apiKey, const std::string &baseUrl,
                     const std::string &model, int maxTokens,
                     double temperature, double topP, std::string systemPrompt);
    SettingsResponse getSettings() const;

    // ---------- 生成与模型 ----------
    std::string generateResponse(AIStreamCallback streamCallback);
    void stopGeneration();
    std::vector<std::string> getModels();
};
