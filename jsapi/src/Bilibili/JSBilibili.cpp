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

#include "JSBilibili.hpp"
#include <Exceptions/AssertFailed.hpp>

JSBilibili::JSBilibili() : biliObject(nullptr) {}
JSBilibili::~JSBilibili() {}

// ====== 登录凭证 ======
void JSBilibili::setCredential(JQAsyncInfo &info)
{
    try
    {
        ASSERT(info.Length() == 4);
        if (!biliObject) biliObject = std::make_unique<Bilibili>();
        std::string sessdata = info[0].string_value();
        std::string biliJct = info[1].string_value();
        std::string buvid3 = info[2].string_value();
        std::string dedeuserid = info[3].string_value();
        biliObject->setCredential(sessdata, biliJct, buvid3, dedeuserid);
        info.post(true);
    }
    catch (const std::exception &e)
    {
        info.postError(e.what());
    }
}

void JSBilibili::clearCredential(JQFunctionInfo &info)
{
    try
    {
        if (biliObject) biliObject->clearCredential();
        info.GetReturnValue().Set(true);
    }
    catch (const std::exception &e)
    {
        info.GetReturnValue().ThrowInternalError(e.what());
    }
}

void JSBilibili::isLoggedIn(JQFunctionInfo &info)
{
    try
    {
        bool loggedIn = biliObject && biliObject->isLoggedIn();
        info.GetReturnValue().Set(loggedIn);
    }
    catch (const std::exception &e)
    {
        info.GetReturnValue().ThrowInternalError(e.what());
    }
}

// ====== 搜索 ======
void JSBilibili::search(JQAsyncInfo &info)
{
    try
    {
        ASSERT(info.Length() >= 1);
        if (!biliObject) biliObject = std::make_unique<Bilibili>();
        std::string keyword = info[0].string_value();
        int page = info.Length() >= 2 ? info[1].is_number() ? info[1].int_value() : 1 : 1;
        int pageSize = info.Length() >= 3 ? info[2].is_number() ? info[2].int_value() : 20 : 20;

        auto results = biliObject->searchVideos(keyword, page, pageSize);
        Bson::array arr;
        for (const auto &v : results)
        {
            arr.push_back(Bson::object{
                {"bvid", v.bvid},
                {"aid", v.aid},
                {"title", v.title},
                {"desc", v.desc},
                {"pic", v.pic},
                {"author", v.author},
                {"duration", (int)v.duration},
                {"playCount", (int)v.playCount},
                {"danmakuCount", (int)v.danmakuCount},
                {"pubdate", (int)v.pubdate}});
        }
        info.post(arr);
    }
    catch (const std::exception &e)
    {
        info.postError(e.what());
    }
}

void JSBilibili::getRanking(JQAsyncInfo &info)
{
    try
    {
        if (!biliObject) biliObject = std::make_unique<Bilibili>();
        int rid = info.Length() >= 1 && info[0].is_number() ? info[0].int_value() : 0;
        int pageSize = info.Length() >= 2 && info[1].is_number() ? info[1].int_value() : 50;

        auto results = biliObject->getRanking(rid, pageSize);
        Bson::array arr;
        for (const auto &v : results)
        {
            arr.push_back(Bson::object{
                {"bvid", v.bvid},
                {"aid", v.aid},
                {"title", v.title},
                {"desc", v.desc},
                {"pic", v.pic},
                {"author", v.author},
                {"duration", (int)v.duration},
                {"playCount", (int)v.playCount},
                {"danmakuCount", (int)v.danmakuCount},
                {"pubdate", (int)v.pubdate}});
        }
        info.post(arr);
    }
    catch (const std::exception &e)
    {
        info.postError(e.what());
    }
}

void JSBilibili::getVideoInfo(JQAsyncInfo &info)
{
    try
    {
        ASSERT(info.Length() == 1);
        if (!biliObject) biliObject = std::make_unique<Bilibili>();
        std::string bvid = info[0].string_value();
        auto v = biliObject->getVideoInfo(bvid);
        info.post(Bson::object{
            {"bvid", v.bvid},
            {"aid", v.aid},
            {"title", v.title},
            {"desc", v.desc},
            {"pic", v.pic},
            {"ownerName", v.ownerName},
            {"ownerMid", v.ownerMid},
            {"duration", (int)v.duration},
            {"pubdate", (int)v.pubdate},
            {"playCount", (int)v.playCount},
            {"danmakuCount", (int)v.danmakuCount},
            {"likeCount", (int)v.likeCount},
            {"coinCount", (int)v.coinCount},
            {"favouriteCount", (int)v.favouriteCount},
            {"replyCount", (int)v.replyCount},
            {"shareCount", (int)v.shareCount}});
    }
    catch (const std::exception &e)
    {
        info.postError(e.what());
    }
}

// ====== 收藏夹 ======
void JSBilibili::getFavoriteFolders(JQAsyncInfo &info)
{
    try
    {
        if (!biliObject) biliObject = std::make_unique<Bilibili>();
        auto folders = biliObject->getFavoriteFolders();
        Bson::array arr;
        for (const auto &f : folders)
        {
            arr.push_back(Bson::object{{"id", f.first}, {"title", f.second}});
        }
        info.post(arr);
    }
    catch (const std::exception &e)
    {
        info.postError(e.what());
    }
}

void JSBilibili::getFavoriteItems(JQAsyncInfo &info)
{
    try
    {
        ASSERT(info.Length() >= 1);
        if (!biliObject) biliObject = std::make_unique<Bilibili>();
        std::string mediaId = info[0].string_value();
        int page = info.Length() >= 2 && info[1].is_number() ? info[1].int_value() : 1;
        int pageSize = info.Length() >= 3 && info[2].is_number() ? info[2].int_value() : 20;

        auto results = biliObject->getFavoriteItems(mediaId, page, pageSize);
        Bson::array arr;
        for (const auto &v : results)
        {
            arr.push_back(Bson::object{
                {"bvid", v.bvid},
                {"aid", v.aid},
                {"title", v.title},
                {"cover", v.cover},
                {"upperName", v.upperName},
                {"duration", (int)v.duration},
                {"favTime", (int)v.favTime}});
        }
        info.post(arr);
    }
    catch (const std::exception &e)
    {
        info.postError(e.what());
    }
}

// ====== 下载 ======
void JSBilibili::downloadAudio(JQAsyncInfo &info)
{
    try
    {
        ASSERT(info.Length() == 2);
        if (!biliObject) biliObject = std::make_unique<Bilibili>();
        std::string bvid = info[0].string_value();
        std::string title = info[1].string_value();

        auto self = this;
        BiliDownloadCallback cb = [self](int progress, const std::string &status)
        {
            self->publish("bili_download_progress", Bson::object{
                                                       {"progress", progress},
                                                       {"status", status}});
        };

        std::string path = biliObject->downloadAudio(bvid, title, cb);
        info.post(path);
    }
    catch (const std::exception &e)
    {
        info.postError(e.what());
    }
}

void JSBilibili::listDownloads(JQFunctionInfo &info)
{
    try
    {
        if (!biliObject) biliObject = std::make_unique<Bilibili>();
        auto files = biliObject->listDownloads();
        Bson::array arr;
        for (const auto &f : files)
        {
            arr.push_back(Bson::object{{"name", f.first}, {"path", f.second}});
        }
        info.GetReturnValue().Set(arr);
    }
    catch (const std::exception &e)
    {
        info.GetReturnValue().ThrowInternalError(e.what());
    }
}

void JSBilibili::deleteDownload(JQAsyncInfo &info)
{
    try
    {
        ASSERT(info.Length() == 1);
        if (!biliObject) biliObject = std::make_unique<Bilibili>();
        std::string filename = info[0].string_value();
        bool ok = biliObject->deleteDownload(filename);
        info.post(ok);
    }
    catch (const std::exception &e)
    {
        info.postError(e.what());
    }
}

extern JSValue createBilibili(JQModuleEnv *env)
{
    JQFunctionTemplateRef tpl = JQFunctionTemplate::New(env, "Bilibili");
    tpl->InstanceTemplate()->setObjectCreator([]()
                                              { return new JSBilibili(); });

    tpl->SetProtoMethod("clearCredential", &JSBilibili::clearCredential);
    tpl->SetProtoMethod("isLoggedIn", &JSBilibili::isLoggedIn);
    tpl->SetProtoMethod("listDownloads", &JSBilibili::listDownloads);

    tpl->SetProtoMethodPromise("setCredential", &JSBilibili::setCredential);
    tpl->SetProtoMethodPromise("search", &JSBilibili::search);
    tpl->SetProtoMethodPromise("getRanking", &JSBilibili::getRanking);
    tpl->SetProtoMethodPromise("getVideoInfo", &JSBilibili::getVideoInfo);
    tpl->SetProtoMethodPromise("getFavoriteFolders", &JSBilibili::getFavoriteFolders);
    tpl->SetProtoMethodPromise("getFavoriteItems", &JSBilibili::getFavoriteItems);
    tpl->SetProtoMethodPromise("downloadAudio", &JSBilibili::downloadAudio);
    tpl->SetProtoMethodPromise("deleteDownload", &JSBilibili::deleteDownload);

    JQPublishObject::InitTpl(tpl);
    return tpl->CallConstructor();
}
