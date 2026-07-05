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

// B 站视频信息
struct BiliVideoInfo
{
    std::string bvid;
    std::string aid;
    std::string title;
    std::string desc;
    std::string pic;
    std::string ownerName;
    std::string ownerMid;
    int64_t duration = 0;
    int64_t pubdate = 0;
    int64_t playCount = 0;
    int64_t danmakuCount = 0;
    int64_t likeCount = 0;
    int64_t coinCount = 0;
    int64_t favouriteCount = 0;
    int64_t replyCount = 0;
    int64_t shareCount = 0;
};

// 搜索结果项
struct BiliSearchItem
{
    std::string bvid;
    std::string aid;
    std::string title;
    std::string desc;
    std::string pic;
    std::string author;
    int64_t duration = 0;
    int64_t playCount = 0;
    int64_t danmakuCount = 0;
    int64_t pubdate = 0;
};

// 收藏夹资源项
struct BiliFavItem
{
    std::string bvid;
    std::string aid;
    std::string title;
    std::string cover;
    std::string upperName;
    int64_t duration = 0;
    int64_t favTime = 0;
};

// 榜单项（与 BiliSearchItem 字段相同，但来源不同）
using BiliRankItem = BiliSearchItem;

// 下载进度回调
using BiliDownloadCallback = std::function<void(int progressPercent, const std::string &status)>;

// 音频流信息
struct BiliAudioStream
{
    int id = 0;
    std::string baseUrl;
    std::string backupUrl;
    int bandwidth = 0;
    std::string mimeType;
    std::string code;
};
