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

#include "Fetch.hpp"
#include "strUtils.hpp"
#include <iostream>
#include <sstream>

Response::Response(int status, std::string body) : status(status), body(body), ok(status >= 200 && status < 300) {}
nlohmann::json Response::json()
{
    try
    {
        return nlohmann::json::parse(body);
    }
    catch (const nlohmann::json::parse_error &e)
    {
        throw std::runtime_error("Failed to parse JSON: " + std::string(e.what()));
    }
}
std::string Response::text() { return body; }
bool Response::isOk() { return ok; }

size_t Fetch::WriteCallback(void *contents, size_t size, size_t nmemb, std::string *data)
{
    size_t totalSize = size * nmemb;
    data->append((char *)contents, totalSize);
    return totalSize;
}

static int xferinfo(void *clientp, curl_off_t dltotal, curl_off_t dlnow, curl_off_t ultotal, curl_off_t ulnow)
{
    const FetchOptions *options = static_cast<const FetchOptions *>(clientp);
    if (options && options->cancelled && options->cancelled->load())
        return 1;
    return 0;
}
size_t Fetch::StreamWriteCallback(void *contents, size_t size, size_t nmemb, void *userdata)
{
    size_t totalSize = size * nmemb;
    try
    {
        StreamContext *ctx = static_cast<StreamContext *>(userdata);
        if (!ctx || !ctx->options) return totalSize;
        if (ctx->options->cancelled && ctx->options->cancelled->load())
            return 0;
        if (ctx->options->streamCallback)
        {
            // 本次 chunk 追加到跨回调缓冲区，按 \n 分割出完整行，
            // 不完整的尾部保留到下次回调拼接。这样 SSE 消息即使被
            // curl 的网络分块切断也不会丢内容。
            ctx->buffer.append((char *)contents, totalSize);
            std::string::size_type pos = 0;
            while (true)
            {
                std::string::size_type nl = ctx->buffer.find('\n', pos);
                if (nl == std::string::npos) break;
                std::string line = ctx->buffer.substr(pos, nl - pos);
                pos = nl + 1;
                line = strUtils::trimEnd(line);
                if (line.size() >= 6 && line.substr(0, 6) == "data: ")
                    ctx->options->streamCallback(line.substr(6));
            }
            // 保留剩余不完整部分
            if (pos > 0)
                ctx->buffer.erase(0, pos);
        }
    }
    catch (const std::exception &e)
    {
        std::cerr << "Stream write callback error: " << e.what() << std::endl;
    }
    return totalSize;
}
size_t Fetch::HeaderCallback(char *buffer, size_t size, size_t nitems, std::unordered_map<std::string, std::string> *headers)
{
    size_t totalSize = size * nitems;
    std::string header(buffer, totalSize);
    header = strUtils::trimEnd(header);
    size_t colonPos = header.find(':');
    if (colonPos != std::string::npos)
    {
        std::string key = header.substr(0, colonPos);
        std::string value = header.substr(colonPos + 1);
        (*headers)[strUtils::trimEnd(key)] = strUtils::trim(value);
    }
    return totalSize;
}

Response Fetch::fetch(const std::string &url, const FetchOptions &options)
{
    CURL *curl = curl_easy_init();
    if (!curl)
        THROW_CURL_ERROR(CURLE_FAILED_INIT);

    long responseCode = 0;
    std::string responseBody;
    std::unordered_map<std::string, std::string> responseHeaders;

    ASSERT_CURL_OK(curl_easy_setopt(curl, CURLOPT_URL, url.c_str()));
    ASSERT_CURL_OK(curl_easy_setopt(curl, CURLOPT_HEADERFUNCTION, HeaderCallback));
    ASSERT_CURL_OK(curl_easy_setopt(curl, CURLOPT_HEADERDATA, &responseHeaders));
    if (options.timeout > 0)
        ASSERT_CURL_OK(curl_easy_setopt(curl, CURLOPT_TIMEOUT, options.timeout));
    ASSERT_CURL_OK(curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, options.followRedirects ? 1L : 0L));
    ASSERT_CURL_OK(curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 0L));
    ASSERT_CURL_OK(curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 0L));

    if (options.cancelled)
    {
        ASSERT_CURL_OK(curl_easy_setopt(curl, CURLOPT_XFERINFOFUNCTION, xferinfo));
        ASSERT_CURL_OK(curl_easy_setopt(curl, CURLOPT_XFERINFODATA, &options));
        ASSERT_CURL_OK(curl_easy_setopt(curl, CURLOPT_NOPROGRESS, 0L));
    }

    StreamContext streamCtx{&options, ""};
    if (options.stream && options.streamCallback)
    {
        ASSERT_CURL_OK(curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, StreamWriteCallback));
        ASSERT_CURL_OK(curl_easy_setopt(curl, CURLOPT_WRITEDATA, &streamCtx));
    }
    else
    {
        ASSERT_CURL_OK(curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback));
        ASSERT_CURL_OK(curl_easy_setopt(curl, CURLOPT_WRITEDATA, &responseBody));
    }

    if (options.method == "GET")
        ASSERT_CURL_OK(curl_easy_setopt(curl, CURLOPT_HTTPGET, 1L));
    else if (options.method == "POST")
    {
        ASSERT_CURL_OK(curl_easy_setopt(curl, CURLOPT_POST, 1L));
        if (!options.body.empty())
            ASSERT_CURL_OK(curl_easy_setopt(curl, CURLOPT_POSTFIELDS, options.body.c_str()));
    }
    else
    {
        ASSERT_CURL_OK(curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, options.method.c_str()));
        if (!options.body.empty())
            ASSERT_CURL_OK(curl_easy_setopt(curl, CURLOPT_POSTFIELDS, options.body.c_str()));
    }

    struct curl_slist *headers = nullptr;
    for (const auto &header : options.headers)
        headers = curl_slist_append(headers, std::string(header.first + ": " + header.second).c_str());
    if (headers)
        ASSERT_CURL_OK(curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers));

    ASSERT_CURL_OK(curl_easy_perform(curl));

    // 流结束后处理缓冲区里残留的最后一行（结尾可能没有 \n）
    if (options.stream && options.streamCallback && !streamCtx.buffer.empty())
    {
        std::string line = strUtils::trimEnd(streamCtx.buffer);
        streamCtx.buffer.clear();
        if (line.size() >= 6 && line.substr(0, 6) == "data: ")
            options.streamCallback(line.substr(6));
    }

    ASSERT_CURL_OK(curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &responseCode));

    if (headers)
        curl_slist_free_all(headers);
    curl_easy_cleanup(curl);

    Response response(responseCode, responseBody);
    response.headers = responseHeaders;
    return response;
}
