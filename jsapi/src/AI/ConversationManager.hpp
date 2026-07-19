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
#include <memory>
#include <unordered_map>
#include <mutex>
#include "Database/Database.hpp"
#include "ConversationNode.hpp"
#include "ConversationInfo.hpp"

class ConversationManager
{
private:
    std::unique_ptr<DATABASE> database;
    mutable std::mutex dbMutex;
    std::string activeConfigId;

    void migrateToMultiConfig();
    void ensureReasoningContentColumn();
    void initializeTables();

public:
    ConversationManager();
    ~ConversationManager() = default;

    void setDatabasePath(const std::string &path);

    std::vector<ConversationInfo> getConversationList();
    void createConversation(const std::string &title, std::string &outConversationId);
    void deleteConversation(const std::string &conversationId);
    void updateConversationTitle(const std::string &conversationId, const std::string &title);

    void saveConversation(const std::string &conversationId,
                          const std::unordered_map<std::string, std::unique_ptr<ConversationNode>> &nodeMap);
    void loadConversation(const std::string &conversationId,
                          std::unordered_map<std::string, std::unique_ptr<ConversationNode>> &nodeMap,
                          std::string &rootNodeId, std::string &leafNodeId);

    void updateNodeContent(const std::string &conversationId, const std::string &nodeId,
                           const std::string &content, const std::string &reasoningContent);
    void updateNodeStopReason(const std::string &conversationId, const std::string &nodeId, int stopReason);
    void updateConversationUpdatedAt(const std::string &conversationId);
    void addNodeToConversation(const std::string &conversationId, const ConversationNode &node);

    // 多配置 API 设置：基于当前 active 配置读写
    void saveApiSettings(const std::string &apiKey, const std::string &baseUrl,
                         const std::string &model, int maxTokens,
                         double temperature, double topP, const std::string &systemPrompt,
                         const std::string &accessToken = "", const std::string &userId = "");
    void loadApiSettings(std::string &apiKey, std::string &baseUrl,
                         std::string &model, int &maxTokens,
                         double &temperature, double &topP, std::string &systemPrompt,
                         std::string &accessToken, std::string &userId);

    // 多配置管理
    std::vector<ConfigInfo> getConfigList();
    std::string createConfig(const std::string &name);
    void deleteConfig(const std::string &configId);
    std::string getActiveConfigId();
    void setActiveConfigId(const std::string &configId);
    void updateConfigName(const std::string &configId, const std::string &name);
};
