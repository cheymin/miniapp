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

#include "Bilibili.hpp"
#include <jqutil_v2/jqutil.h>
#include <memory>
#include <mutex>

using namespace JQUTIL_NS;

class JSBilibili : public JQPublishObject
{
private:
    std::unique_ptr<Bilibili> biliObject;
    mutable std::mutex mutex;

public:
    JSBilibili();
    ~JSBilibili();

    // 登录凭证
    void setCredential(JQAsyncInfo &info);
    void clearCredential(JQFunctionInfo &info);
    void isLoggedIn(JQFunctionInfo &info);

    // 搜索/排行
    void search(JQAsyncInfo &info);
    void getRanking(JQAsyncInfo &info);
    void getVideoInfo(JQAsyncInfo &info);

    // 收藏夹
    void getFavoriteFolders(JQAsyncInfo &info);
    void getFavoriteItems(JQAsyncInfo &info);

    // 下载
    void downloadAudio(JQAsyncInfo &info);
    void listDownloads(JQFunctionInfo &info);
    void deleteDownload(JQAsyncInfo &info);
};

extern JSValue createBilibili(JQModuleEnv *env);
