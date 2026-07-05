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

#include "Bilibili.hpp"
#include "Shell/Shell.hpp"
#include "strUtils.hpp"
#include <Exceptions/NetworkError.hpp>
#include <sstream>
#include <algorithm>
#include <regex>

void Bilibili::ensureWbiKeys()
{
    if (!wbiSigner.isExpired()) return;

    Response resp = Fetch::fetch(std::string(API_HOST) + "/x/web-interface/nav",
                                 FetchOptions("GET", commonHeaders()));
    if (!resp.isOk())
        THROW_NETWORK_ERROR(resp.status);

    nlohmann::json j = resp.json();
    if (j.value("code", -1) != 0)
        throw std::runtime_error("获取 WBI keys 失败: " + j.value("message", "unknown"));

    auto wbiImg = j["data"]["wbi_img"];
    std::string imgUrl = wbiImg.value("img_url", "");
    std::string subUrl = wbiImg.value("sub_url", "");

    auto extractKey = [](const std::string &url) -> std::string
    {
        size_t slash = url.find_last_of('/');
        size_t dot = url.find_last_of('.');
        if (slash == std::string::npos || dot == std::string::npos || dot < slash) return "";
        return url.substr(slash + 1, dot - slash - 1);
    };

    wbiSigner.setKeys(extractKey(imgUrl), extractKey(subUrl));
}

std::unordered_map<std::string, std::string> Bilibili::commonHeaders() const
{
    std::unordered_map<std::string, std::string> h;
    h["User-Agent"] = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    h["Referer"] = "https://www.bilibili.com/";
    h["Origin"] = "https://www.bilibili.com";
    if (!sessdata.empty())
    {
        std::string cookie = "SESSDATA=" + sessdata;
        if (!biliJct.empty()) cookie += "; bili_jct=" + biliJct;
        if (!buvid3.empty()) cookie += "; buvid3=" + buvid3;
        if (!dedeuserid.empty()) cookie += "; DedeUserID=" + dedeuserid;
        h["Cookie"] = cookie;
    }
    return h;
}

std::string Bilibili::stripTags(const std::string &s)
{
    std::string out;
    out.reserve(s.size());
    bool inTag = false;
    for (char c : s)
    {
        if (c == '<') { inTag = true; continue; }
        if (c == '>') { inTag = false; continue; }
        if (!inTag) out += c;
    }
    // 解码常见 HTML 实体
    auto replace = [&out](const std::string &from, const std::string &to)
    {
        size_t pos = 0;
        while ((pos = out.find(from, pos)) != std::string::npos)
        {
            out.replace(pos, from.size(), to);
            pos += to.size();
        }
    };
    replace("&amp;", "&");
    replace("&lt;", "<");
    replace("&gt;", ">");
    replace("&quot;", "\"");
    replace("&#39;", "'");
    replace("&nbsp;", " ");
    return out;
}

Response Bilibili::fetchApi(const std::string &path,
                            const std::string &method,
                            const std::string &body,
                            bool needWbi,
                            std::map<std::string, std::string> params)
{
    ensureWbiKeys();

    std::string url = std::string(API_HOST) + path;
    if (needWbi)
    {
        std::string query = wbiSigner.sign(params);
        url += "?" + query;
    }
    else if (!params.empty())
    {
        url += "?";
        bool first = true;
        for (const auto &p : params)
        {
            if (!first) url += "&";
            url += p.first + "=" + p.second;
            first = false;
        }
    }

    auto headers = commonHeaders();
    if (method == "POST")
        headers["Content-Type"] = "application/x-www-form-urlencoded";

    FetchOptions opts(method, headers, body, false, nullptr, 30);
    Response resp = Fetch::fetch(url, opts);
    if (!resp.isOk())
        THROW_NETWORK_ERROR(resp.status);
    return resp;
}

void Bilibili::setCredential(const std::string &sessdata,
                              const std::string &biliJct,
                              const std::string &buvid3,
                              const std::string &dedeuserid)
{
    std::lock_guard<std::mutex> lock(mutex);
    this->sessdata = sessdata;
    this->biliJct = biliJct;
    this->buvid3 = buvid3;
    this->dedeuserid = dedeuserid;
}

void Bilibili::clearCredential()
{
    std::lock_guard<std::mutex> lock(mutex);
    sessdata.clear();
    biliJct.clear();
    buvid3.clear();
    dedeuserid.clear();
}

std::vector<BiliSearchItem> Bilibili::searchVideos(const std::string &keyword,
                                                    int page,
                                                    int pageSize)
{
    std::lock_guard<std::mutex> lock(mutex);
    std::map<std::string, std::string> params;
    params["keyword"] = keyword;
    params["search_type"] = "video";
    params["page"] = std::to_string(page);
    params["page_size"] = std::to_string(pageSize);

    Response resp = fetchApi("/x/web-interface/wbi/search/type", "GET", "", true, params);
    nlohmann::json j = resp.json();
    if (j.value("code", -1) != 0)
        throw std::runtime_error("搜索失败: " + j.value("message", "unknown"));

    std::vector<BiliSearchItem> result;
    auto items = j["data"].value("result", nlohmann::json::array());
    for (const auto &item : items)
    {
        if (item.value("type", "") == "video")
        {
            BiliSearchItem v;
            v.bvid = item.value("bvid", "");
            v.aid = std::to_string(item.value("aid", 0LL));
            v.title = stripTags(item.value("title", ""));
            v.desc = item.value("description", "");
            v.pic = item.value("pic", "");
            if (!v.pic.empty() && v.pic.find("http") != 0)
                v.pic = "https:" + v.pic;
            v.author = item.value("author", "");
            v.duration = item.value("duration", 0LL);
            v.playCount = item.value("play", 0LL);
            v.danmakuCount = item.value("video_review", 0LL);
            v.pubdate = item.value("pubdate", 0LL);
            if (!v.bvid.empty())
                result.push_back(v);
        }
    }
    return result;
}

std::vector<BiliRankItem> Bilibili::getRanking(int rid, int pageSize)
{
    std::lock_guard<std::mutex> lock(mutex);
    std::map<std::string, std::string> params;
    params["rid"] = std::to_string(rid);
    params["type"] = "all";
    if (pageSize > 0 && pageSize < 100)
        params["ps"] = std::to_string(pageSize);

    Response resp = fetchApi("/x/web-interface/ranking/v2", "GET", "", false, params);
    nlohmann::json j = resp.json();
    if (j.value("code", -1) != 0)
        throw std::runtime_error("获取排行失败: " + j.value("message", "unknown"));

    std::vector<BiliRankItem> result;
    auto items = j["data"].value("list", nlohmann::json::array());
    for (const auto &item : items)
    {
        BiliRankItem v;
        v.bvid = item.value("bvid", "");
        v.aid = std::to_string(item.value("aid", 0LL));
        v.title = stripTags(item.value("title", ""));
        v.desc = item.value("desc", "");
        v.pic = item.value("pic", "");
        if (!v.pic.empty() && v.pic.find("http") != 0)
            v.pic = "https:" + v.pic;
        v.author = item.value("owner", nlohmann::json::object()).value("name", "");
        v.duration = item.value("duration", 0LL);
        v.playCount = item.value("stat", nlohmann::json::object()).value("view", 0LL);
        v.danmakuCount = item.value("stat", nlohmann::json::object()).value("danmaku", 0LL);
        v.pubdate = item.value("pubdate", 0LL);
        if (!v.bvid.empty())
            result.push_back(v);
    }
    return result;
}

BiliVideoInfo Bilibili::getVideoInfo(const std::string &bvid)
{
    std::lock_guard<std::mutex> lock(mutex);
    std::map<std::string, std::string> params;
    params["bvid"] = bvid;

    Response resp = fetchApi("/x/web-interface/view", "GET", "", false, params);
    nlohmann::json j = resp.json();
    if (j.value("code", -1) != 0)
        throw std::runtime_error("获取视频信息失败: " + j.value("message", "unknown"));

    auto data = j["data"];
    BiliVideoInfo v;
    v.bvid = data.value("bvid", "");
    v.aid = std::to_string(data.value("aid", 0LL));
    v.title = stripTags(data.value("title", ""));
    v.desc = data.value("desc", "");
    v.pic = data.value("pic", "");
    if (!v.pic.empty() && v.pic.find("http") != 0)
        v.pic = "https:" + v.pic;
    v.ownerName = data["owner"].value("name", "");
    v.ownerMid = std::to_string(data["owner"].value("mid", 0LL));
    v.duration = data.value("duration", 0LL);
    v.pubdate = data.value("pubdate", 0LL);
    auto stat = data["stat"];
    v.playCount = stat.value("view", 0LL);
    v.danmakuCount = stat.value("danmaku", 0LL);
    v.likeCount = stat.value("like", 0LL);
    v.coinCount = stat.value("coin", 0LL);
    v.favouriteCount = stat.value("favorite", 0LL);
    v.replyCount = stat.value("reply", 0LL);
    v.shareCount = stat.value("share", 0LL);
    return v;
}

std::vector<BiliAudioStream> Bilibili::getAudioStreams(const std::string &bvid)
{
    std::lock_guard<std::mutex> lock(mutex);
    // 先获取 cid
    std::map<std::string, std::string> viewParams;
    viewParams["bvid"] = bvid;
    Response viewResp = fetchApi("/x/web-interface/view", "GET", "", false, viewParams);
    nlohmann::json viewJ = viewResp.json();
    if (viewJ.value("code", -1) != 0)
        throw std::runtime_error("获取 cid 失败: " + viewJ.value("message", "unknown"));

    int64_t aid = viewJ["data"].value("aid", 0LL);
    int64_t cid = viewJ["data"].value("cid", 0LL);

    std::map<std::string, std::string> params;
    params["avid"] = std::to_string(aid);
    params["cid"] = std::to_string(cid);
    params["qn"] = "64";
    params["fnval"] = "4048"; // DASH
    params["fnver"] = "0";
    params["fourk"] = "0";

    Response resp = fetchApi("/x/player/wbi/playurl", "GET", "", true, params);
    nlohmann::json j = resp.json();
    if (j.value("code", -1) != 0)
        throw std::runtime_error("获取播放流失败: " + j.value("message", "unknown"));

    std::vector<BiliAudioStream> streams;
    auto dash = j["data"]["dash"];
    if (!dash.contains("audio"))
        return streams;

    for (const auto &a : dash["audio"])
    {
        BiliAudioStream s;
        s.id = a.value("id", 0);
        s.baseUrl = a.value("baseUrl", "");
        s.backupUrl = a.value("backupUrl", nlohmann::json::array()).empty()
                          ? ""
                          : a["backupUrl"][0];
        s.bandwidth = a.value("bandwidth", 0);
        s.mimeType = a.value("mimeType", "");
        s.code = a.value("codecs", "");
        if (!s.baseUrl.empty())
            streams.push_back(s);
    }
    // 按 bandwidth 倒序，选最高音质
    std::sort(streams.begin(), streams.end(),
              [](const BiliAudioStream &a, const BiliAudioStream &b)
              { return a.bandwidth > b.bandwidth; });
    return streams;
}

std::string Bilibili::downloadAudio(const std::string &bvid,
                                     const std::string &title,
                                     BiliDownloadCallback progressCallback)
{
    std::lock_guard<std::mutex> lock(mutex);

    if (progressCallback) progressCallback(0, "获取音频流...");
    auto streams = getAudioStreams(bvid);
    if (streams.empty())
        throw std::runtime_error("没有可用的音频流");

    const BiliAudioStream &best = streams[0];

    // 文件名清理：移除文件系统不允许的字符
    std::string safeTitle = title;
    for (char &c : safeTitle)
    {
        if (c == '/' || c == '\\' || c == ':' || c == '*' ||
            c == '?' || c == '"' || c == '<' || c == '>' || c == '|')
            c = '_';
    }
    if (safeTitle.size() > 80) safeTitle = safeTitle.substr(0, 80);

    // 确保 SAVED_DIR 存在
    Shell::exec(std::string("mkdir -p ") + SAVED_DIR);

    std::string tmpFile = std::string("/tmp/bili_") + bvid + ".m4s";
    std::string outFile = std::string(SAVED_DIR) + "/" + safeTitle + "_" + bvid + ".m4a";

    // 如果已存在，先删除
    Shell::exec("rm -f \"" + outFile + "\" \"" + tmpFile + "\"");

    // 用 wget 下载音频流
    // 加上 Referer 头部（B 站要求）
    if (progressCallback) progressCallback(10, "下载音频流...");
    std::string wgetCmd = "wget --no-check-certificate -q -O \"" + tmpFile + "\""
                          " --header=\"Referer: https://www.bilibili.com/\""
                          " --header=\"User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36\"" +
                          " \"" + best.baseUrl + "\"";
    auto [wgetOut, wgetStatus] = Shell::execWithStatus(wgetCmd);
    if (wgetStatus != 0)
    {
        Shell::exec("rm -f \"" + tmpFile + "\"");
        throw std::runtime_error("下载失败: wget 返回 " + std::to_string(wgetStatus));
    }

    // 检查下载文件大小
    auto [sizeOut, sizeStatus] = Shell::execWithStatus("stat -c %s \"" + tmpFile + "\" 2>/dev/null");
    if (sizeStatus != 0 || std::stoll(strUtils::trim(sizeOut)) == 0)
    {
        Shell::exec("rm -f \"" + tmpFile + "\"");
        throw std::runtime_error("下载文件为空");
    }

    // 用 ffmpeg 转封装为 m4a（不重编码，秒级完成）
    if (progressCallback) progressCallback(80, "转码为 m4a...");
    std::string ffmpegCmd = "ffmpeg -y -i \"" + tmpFile + "\""
                            " -c:a copy -movflags +faststart"
                            " \"" + outFile + "\" 2>/dev/null";
    auto [ffOut, ffStatus] = Shell::execWithStatus(ffmpegCmd);

    // 删除临时文件
    Shell::exec("rm -f \"" + tmpFile + "\"");

    if (ffStatus != 0)
        throw std::runtime_error("ffmpeg 转码失败: " + std::to_string(ffStatus));

    if (progressCallback) progressCallback(100, "完成: " + outFile);
    return outFile;
}

std::vector<std::pair<std::string, std::string>> Bilibili::listDownloads()
{
    std::vector<std::pair<std::string, std::string>> result;
    auto [out, status] = Shell::execWithStatus(
        "ls -1 " + std::string(SAVED_DIR) + "/*.m4a 2>/dev/null");
    if (status != 0) return result;

    std::istringstream ss(out);
    std::string line;
    while (std::getline(ss, line))
    {
        line = strUtils::trim(line);
        if (line.empty()) continue;
        size_t slash = line.find_last_of('/');
        std::string name = (slash != std::string::npos) ? line.substr(slash + 1) : line;
        result.emplace_back(name, line);
    }
    return result;
}

bool Bilibili::deleteDownload(const std::string &filename)
{
    // 防路径穿越
    if (filename.find('/') != std::string::npos || filename.find("..") != std::string::npos)
        return false;
    std::string path = std::string(SAVED_DIR) + "/" + filename;
    auto [_, status] = Shell::execWithStatus("rm -f \"" + path + "\"");
    return status == 0;
}

std::vector<std::pair<std::string, std::string>> Bilibili::getFavoriteFolders()
{
    std::lock_guard<std::mutex> lock(mutex);
    if (!isLoggedIn())
        throw std::runtime_error("未登录");

    Response resp = fetchApi("/x/v3/fav/folder/created/list-all", "GET", "", false, {});
    nlohmann::json j = resp.json();
    if (j.value("code", -1) != 0)
        throw std::runtime_error("获取收藏夹失败: " + j.value("message", "unknown"));

    std::vector<std::pair<std::string, std::string>> result;
    for (const auto &item : j["data"].value("list", nlohmann::json::array()))
    {
        result.emplace_back(
            std::to_string(item.value("id", 0LL)),
            item.value("title", ""));
    }
    return result;
}

std::vector<BiliFavItem> Bilibili::getFavoriteItems(const std::string &mediaId,
                                                      int page,
                                                      int pageSize)
{
    std::lock_guard<std::mutex> lock(mutex);
    if (!isLoggedIn())
        throw std::runtime_error("未登录");

    std::map<std::string, std::string> params;
    params["media_id"] = mediaId;
    params["pn"] = std::to_string(page);
    params["ps"] = std::to_string(pageSize);
    params["order"] = "mtime";

    Response resp = fetchApi("/x/v3/fav/resource/list", "GET", "", false, params);
    nlohmann::json j = resp.json();
    if (j.value("code", -1) != 0)
        throw std::runtime_error("获取收藏夹内容失败: " + j.value("message", "unknown"));

    std::vector<BiliFavItem> result;
    for (const auto &item : j["data"].value("medias", nlohmann::json::array()))
    {
        BiliFavItem v;
        v.bvid = item.value("bvid", "");
        v.aid = std::to_string(item.value("id", 0LL));
        v.title = stripTags(item.value("title", ""));
        v.cover = item.value("cover", "");
        v.upperName = item.value("upper", nlohmann::json::object()).value("name", "");
        v.duration = item.value("duration", 0LL);
        v.favTime = item.value("fav_time", 0LL);
        if (!v.bvid.empty())
            result.push_back(v);
    }
    return result;
}
