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

#include "JSChat.hpp"
#include <iostream>

JSChat::JSChat() : AIObject(nullptr) {}

JSChat::~JSChat() {}

void JSChat::initialize(JQFunctionInfo &info)
{
    try
    {
        ASSERT(info.Length() == 1);
        JSContext *ctx = info.GetContext();
        std::string dbPath = JQString(ctx, info[0]).getString();
        std::lock_guard<std::mutex> lock(aiObjectMutex);
        AIObject = std::make_unique<AI>(dbPath);
        info.GetReturnValue().Set(true);
    }
    catch (const std::exception &e)
    {
        info.GetReturnValue().ThrowInternalError(e.what());
    }
}

void JSChat::getCurrentPath(JQFunctionInfo &info)
{
    try
    {
        AI *ai = getAIObject();
        ASSERT(ai != nullptr);
        ASSERT(info.Length() == 0);
        std::vector<ConversationNode> path = ai->getCurrentPath();
        Bson::array result;
        for (const auto &msg : path)
        {
            Bson::object msgObj = {
                {"id", msg.id},
                {"role", (int)msg.role},
                {"stopReason", (int)msg.stopReason},
                {"content", msg.content},
                {"reasoningContent", msg.reasoningContent},
                {"parentId", msg.parentId},
                {"timestamp", std::to_string(msg.timestamp)}};
            Bson::array childIds;
            for (const auto &childId : msg.childIds)
                childIds.push_back(childId);
            msgObj["childIds"] = childIds;
            result.push_back(msgObj);
        }
        info.GetReturnValue().Set(result);
    }
    catch (const std::exception &e)
    {
        info.GetReturnValue().ThrowInternalError(e.what());
    }
}

void JSChat::getCurrentConversationId(JQFunctionInfo &info)
{
    try
    {
        AI *ai = getAIObject();
        ASSERT(ai != nullptr);
        ASSERT(info.Length() == 0);
        info.GetReturnValue().Set(ai->getConversationId());
    }
    catch (const std::exception &e)
    {
        info.GetReturnValue().ThrowInternalError(e.what());
    }
}

void JSChat::addUserMessage(JQAsyncInfo &info)
{
    try
    {
        AI *ai = getAIObject();
        ASSERT(ai != nullptr);
        ASSERT(info.Length() == 1);
        ASSERT(info[0].is_string());
        std::string userMessage = info[0].string_value();
        ai->addNode(ConversationNode::ROLE_USER, userMessage);
        info.post(true);
    }
    catch (const std::exception &e)
    {
        info.postError(e.what());
    }
}

void JSChat::generateResponse(JQAsyncInfo &info)
{
    try
    {
        AI *ai = getAIObject();
        ASSERT(ai != nullptr);
        ASSERT(info.Length() == 0);
        AIStreamCallback callback = [this](const std::string &messageDelta)
        {
            publish("chat_stream", messageDelta);
        };
        info.post(ai->generateResponse(callback));
    }
    catch (const std::exception &e)
    {
        info.postError(e.what());
    }
}

void JSChat::stopGeneration(JQFunctionInfo &info)
{
    try
    {
        AI *ai = getAIObject();
        ASSERT(ai != nullptr);
        ASSERT(info.Length() == 0);
        ai->stopGeneration();
        info.GetReturnValue().Set(true);
    }
    catch (const std::exception &e)
    {
        info.GetReturnValue().ThrowInternalError(e.what());
    }
}

void JSChat::getModels(JQAsyncInfo &info)
{
    try
    {
        AI *ai = getAIObject();
        ASSERT(ai != nullptr);
        ASSERT(info.Length() == 0);
        Bson::array modelsArray;
        for (const auto &model : ai->getModels())
            modelsArray.push_back(model);
        info.post(modelsArray);
    }
    catch (const std::exception &e)
    {
        info.postError(e.what());
    }
}

void JSChat::getConversationList(JQAsyncInfo &info)
{
    try
    {
        AI *ai = getAIObject();
        ASSERT(ai != nullptr);
        ASSERT(info.Length() == 0);
        Bson::array conversationsArray;
        auto response = ai->getConversationList();
        for (const auto &conv : response)
        {
            conversationsArray.push_back(Bson::object{
                {"id", conv.id},
                {"title", conv.title},
                {"createdAt", std::to_string(conv.createdAt)},
                {"updatedAt", std::to_string(conv.updatedAt)}});
        }
        info.post(conversationsArray);
    }
    catch (const std::exception &e)
    {
        info.postError(e.what());
    }
}

void JSChat::createConversation(JQAsyncInfo &info)
{
    try
    {
        AI *ai = getAIObject();
        ASSERT(ai != nullptr);
        ASSERT(info.Length() <= 1);
        std::string title = "新对话";
        if (info.Length() == 1 && !info[0].string_value().empty())
            title = info[0].string_value();
        ASSERT(!title.empty());
        ai->createConversation(title);
        info.post(true);
    }
    catch (const std::exception &e)
    {
        info.postError(e.what());
    }
}

void JSChat::loadConversation(JQAsyncInfo &info)
{
    try
    {
        AI *ai = getAIObject();
        ASSERT(ai != nullptr);
        ASSERT(info.Length() == 1);
        ASSERT(info[0].is_string());
        std::string conversationId = info[0].string_value();
        ai->loadConversation(conversationId);
        info.post(true);
    }
    catch (const std::exception &e)
    {
        info.postError(e.what());
    }
}

void JSChat::deleteConversation(JQAsyncInfo &info)
{
    try
    {
        AI *ai = getAIObject();
        ASSERT(ai != nullptr);
        ASSERT(info.Length() == 1);
        ASSERT(info[0].is_string());
        std::string conversationId = info[0].string_value();
        ai->deleteConversation(conversationId);
        info.post(true);
    }
    catch (const std::exception &e)
    {
        info.postError(e.what());
    }
}

void JSChat::updateConversationTitle(JQAsyncInfo &info)
{
    try
    {
        AI *ai = getAIObject();
        ASSERT(ai != nullptr);
        ASSERT(info.Length() == 2);
        ASSERT(info[0].is_string());
        ASSERT(info[1].is_string());
        std::string conversationId = info[0].string_value();
        std::string title = info[1].string_value();
        ai->updateConversationTitle(conversationId, title);
        info.post(true);
    }
    catch (const std::exception &e)
    {
        info.postError(e.what());
    }
}

void JSChat::setSettings(JQFunctionInfo &info)
{
    try
    {
        AI *ai = getAIObject();
        ASSERT(ai != nullptr);
        ASSERT(info.Length() >= 7);
        JSContext *ctx = info.GetContext();
        std::string apiKey = JQString(ctx, info[0]).getString();
        std::string baseUrl = JQString(ctx, info[1]).getString();
        std::string modelName = JQString(ctx, info[2]).getString();
        int maxTokens = JQNumber(ctx, info[3]).getInt32();
        double temperature = JQNumber(ctx, info[4]).getDouble();
        double topP = JQNumber(ctx, info[5]).getDouble();
        std::string systemPrompt = JQString(ctx, info[6]).getString();

        ai->setSettings(apiKey, baseUrl, modelName, maxTokens, temperature, topP, systemPrompt);
        info.GetReturnValue().Set(true);
    }
    catch (const std::exception &e)
    {
        info.GetReturnValue().ThrowInternalError(e.what());
    }
}

void JSChat::getSettings(JQFunctionInfo &info)
{
    try
    {
        AI *ai = getAIObject();
        ASSERT(ai != nullptr);
        ASSERT(info.Length() == 0);
        SettingsResponse settings = ai->getSettings();
        info.GetReturnValue().Set(Bson::object{
            {"apiKey", settings.apiKey},
            {"baseUrl", settings.baseUrl},
            {"modelName", settings.modelName},
            {"maxTokens", settings.maxTokens},
            {"temperature", settings.temperature},
            {"topP", settings.topP},
            {"systemPrompt", settings.systemPrompt}});
    }
    catch (const std::exception &e)
    {
        info.GetReturnValue().ThrowInternalError(e.what());
    }
}

void JSChat::regenerateLastMessage(JQAsyncInfo &info)
{
    try
    {
        AI *ai = getAIObject();
        ASSERT(ai != nullptr);
        ASSERT(info.Length() == 0);
        ai->deleteLastMessage();
        AIStreamCallback callback = [this](const std::string &messageDelta)
        {
            publish("chat_stream", messageDelta);
        };
        info.post(ai->generateResponse(callback));
    }
    catch (const std::exception &e)
    {
        info.postError(e.what());
    }
}

void JSChat::deleteLastMessage(JQFunctionInfo &info)
{
    try
    {
        AI *ai = getAIObject();
        ASSERT(ai != nullptr);
        ASSERT(info.Length() == 0);
        info.GetReturnValue().Set(ai->deleteLastMessage());
    }
    catch (const std::exception &e)
    {
        info.GetReturnValue().ThrowInternalError(e.what());
    }
}

extern JSValue createChat(JQModuleEnv *env)
{
    JQFunctionTemplateRef tpl = JQFunctionTemplate::New(env, "Chat");
    tpl->InstanceTemplate()->setObjectCreator([]()
                                              { return new JSChat(); });

    tpl->SetProtoMethod("initialize", &JSChat::initialize);
    tpl->SetProtoMethod("getCurrentPath", &JSChat::getCurrentPath);
    tpl->SetProtoMethod("getCurrentConversationId", &JSChat::getCurrentConversationId);

    tpl->SetProtoMethodPromise("addUserMessage", &JSChat::addUserMessage);
    tpl->SetProtoMethodPromise("generateResponse", &JSChat::generateResponse);
    tpl->SetProtoMethod("stopGeneration", &JSChat::stopGeneration);
    tpl->SetProtoMethodPromise("getModels", &JSChat::getModels);

    tpl->SetProtoMethodPromise("getConversationList", &JSChat::getConversationList);
    tpl->SetProtoMethodPromise("createConversation", &JSChat::createConversation);
    tpl->SetProtoMethodPromise("loadConversation", &JSChat::loadConversation);
    tpl->SetProtoMethodPromise("deleteConversation", &JSChat::deleteConversation);
    tpl->SetProtoMethodPromise("updateConversationTitle", &JSChat::updateConversationTitle);

    tpl->SetProtoMethod("setSettings", &JSChat::setSettings);
    tpl->SetProtoMethod("getSettings", &JSChat::getSettings);

    tpl->SetProtoMethodPromise("regenerateLastMessage", &JSChat::regenerateLastMessage);
    tpl->SetProtoMethod("deleteLastMessage", &JSChat::deleteLastMessage);

    JSChat::InitTpl(tpl);
    return tpl->CallConstructor();
}
