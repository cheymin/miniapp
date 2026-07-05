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
#include <chrono>
#include <map>
#include <algorithm>
#include <stdexcept>
#include "Md5.hpp"

// B 站 WBI 签名实现
// 文档：https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/misc/sign/wbi.md
class WbiSigner
{
private:
    // C++17 inline 静态成员，避免头文件被多 TU 包含时产生重复定义
    static constexpr int MIXIN_KEY_ENC_TAB[64] = {
        46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
        33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
        61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
        36, 20, 34, 44, 52};

    std::string imgKey;
    std::string subKey;
    int64_t cachedAt = 0;
    static constexpr int CACHE_TTL_SECONDS = 3600; // 1 小时缓存

    static std::string urlEncode(const std::string &s)
    {
        static const char *hex = "0123456789ABCDEF";
        std::string result;
        result.reserve(s.size() * 3);
        for (unsigned char c : s)
        {
            if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') ||
                (c >= '0' && c <= '9') || c == '-' || c == '_' || c == '.' || c == '~')
            {
                result += (char)c;
            }
            else
            {
                result += '%';
                result += hex[c >> 4];
                result += hex[c & 0x0F];
            }
        }
        return result;
    }

public:
    void setKeys(const std::string &img, const std::string &sub)
    {
        imgKey = img;
        subKey = sub;
        cachedAt = nowSeconds();
    }

    bool isExpired() const
    {
        if (imgKey.empty() || subKey.empty()) return true;
        return (nowSeconds() - cachedAt) > CACHE_TTL_SECONDS;
    }

    // 由 img_key + sub_key 经重排表生成 mixin_key，取前 32 字符
    static std::string getMixinKey(const std::string &img, const std::string &sub)
    {
        std::string raw = img + sub;
        std::string mixin;
        mixin.reserve(32);
        for (int i = 0; i < 32; ++i)
        {
            int idx = MIXIN_KEY_ENC_TAB[i];
            if (idx < (int)raw.size())
                mixin += raw[idx];
        }
        return mixin;
    }

    // 给定参数表，返回带 w_rid 和 wts 的完整 query string
    // 用法：auto q = signer.sign({{"keyword", "x"}, {"search_type", "video"}});
    std::string sign(std::map<std::string, std::string> params) const
    {
        if (imgKey.empty() || subKey.empty())
            throw std::runtime_error("WBI keys not initialized");

        int64_t wts = nowSeconds();
        params["wts"] = std::to_string(wts);

        std::string mixinKey = getMixinKey(imgKey, subKey);

        std::vector<std::pair<std::string, std::string>> sortedParams(
            params.begin(), params.end());
        std::sort(sortedParams.begin(), sortedParams.end());

        std::string query;
        for (size_t i = 0; i < sortedParams.size(); ++i)
        {
            if (i) query += "&";
            query += urlEncode(sortedParams[i].first) + "=" +
                     urlEncode(sortedParams[i].second);
        }

        std::string toSign = query + mixinKey;
        std::string wRid = Md5::hexDigest(toSign);

        query += "&w_rid=" + wRid;
        return query;
    }

    static int64_t nowSeconds()
    {
        return std::chrono::duration_cast<std::chrono::seconds>(
                   std::chrono::system_clock::now().time_since_epoch())
            .count();
    }
};
