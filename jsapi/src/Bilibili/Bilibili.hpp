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
#include <mutex>
#include <memory>
#include "Fetch.hpp"
#include "WbiSigner.hpp"
#include "BilibiliCallback.hpp"

class Bilibili
{
private:
    WbiSigner wbiSigner;
    mutable std::mutex mutex;

    // 可选登录凭证
    std::string sessdata;
    std::string biliJct;   // CSRF token
    std::string buvid3;
    std::string dedeuserid;

    static constexpr const char *API_HOST = "https://api.bilibili.com";
    static constexpr const char *SAVED_DIR = "/userdisk/Music/bili";

    // 获取 WBI 签名所需的 img_key / sub_key（带缓存）
    void ensureWbiKeys();

    // 内部调用 fetch，附加 Cookie 和 UA
    Response fetchApi(const std::string &path,
                      const std::string &method = "GET",
                      const std::string &body = "",
                      bool needWbi = false,
                      std::map<std::string, std::string> params = {});

    // 通用请求头（UA + Cookie）
    std::unordered_map<std::string, std::string> commonHeaders() const;

    // 简单 HTML 标签清理
    static std::string stripTags(const std::string &s);

public:
    Bilibili() = default;

    // 设置登录凭证（可选）
    void setCredential(const std::string &sessdata,
                       const std::string &biliJct,
                       const std::string &buvid3,
                       const std::string &dedeuserid);
    void clearCredential();
    bool isLoggedIn() const { return !sessdata.empty(); }

    // 搜索视频（keyword, page, page_size 默认 20）
    std::vector<BiliSearchItem> searchVideos(const std::string &keyword,
                                             int page = 1,
                                             int pageSize = 20);

    // 热门排行榜（rid=0 全站, 1=动画, 3=音乐, 4=游戏, 5=娱乐, 36=科技, 119=鬼畜, 155=时尚, 181=影视）
    std::vector<BiliRankItem> getRanking(int rid = 0, int pageSize = 50);

    // 获取视频详情（包含 aid/cid/统计）
    BiliVideoInfo getVideoInfo(const std::string &bvid);

    // 获取视频播放流地址（返回音频流列表）
    std::vector<BiliAudioStream> getAudioStreams(const std::string &bvid);

    // 下载音频到 /userdisk/Music/bili/<bvid>.m4a
    // 返回完整文件路径，progressCallback 可用于报告进度
    std::string downloadAudio(const std::string &bvid,
                              const std::string &title,
                              BiliDownloadCallback progressCallback = nullptr);

    // 列出已下载的音频文件
    std::vector<std::pair<std::string, std::string>> listDownloads();

    // 删除已下载文件
    bool deleteDownload(const std::string &filename);

    // 获取登录用户自己的收藏夹列表（需要登录）
    // 返回 (mid, name) 列表
    std::vector<std::pair<std::string, std::string>> getFavoriteFolders();

    // 获取某个收藏夹内的视频
    std::vector<BiliFavItem> getFavoriteItems(const std::string &mediaId,
                                              int page = 1,
                                              int pageSize = 20);
};
