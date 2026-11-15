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

struct StreamContext
{
    const FetchOptions *options;
    std::string buffer;
    std::string raw;
    bool sawData = false;
};

static void processStreamLine(StreamContext *context, const std::string &rawLine)
{
    std::string line = rawLine;
    if (!line.empty() && line.back() == '\r')
        line.pop_back();
    if (line.rfind("data:", 0) != 0)
        return;

    std::string payload = line.substr(5);
    if (!payload.empty() && payload.front() == ' ')
        payload.erase(payload.begin());
    if (payload.empty())
        return;

    context->sawData = true;
    context->options->streamCallback(payload);
}

size_t Fetch::StreamWriteCallback(void *contents, size_t size, size_t nmemb, void *userdata)
{
    size_t totalSize = size * nmemb;
    StreamContext *context = static_cast<StreamContext *>(userdata);
    if (!context || !context->options)
        return totalSize;

    const FetchOptions *options = context->options;
    if (options->cancelled && options->cancelled->load())
        return 0;

    try
    {
        context->raw.append((char *)contents, totalSize);
        context->buffer.append((char *)contents, totalSize);

        // 网络分片可能把一行 SSE 拆开，必须缓存到换行再解析，否则反代节点会丢内容
        size_t newlinePos;
        while ((newlinePos = context->buffer.find('\n')) != std::string::npos)
        {
            std::string line = context->buffer.substr(0, newlinePos);
            context->buffer.erase(0, newlinePos + 1);
            processStreamLine(context, line);
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

    StreamContext streamContext = {&options, "", "", false};

    if (options.stream && options.streamCallback)
    {
        ASSERT_CURL_OK(curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, StreamWriteCallback));
        ASSERT_CURL_OK(curl_easy_setopt(curl, CURLOPT_WRITEDATA, &streamContext));
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

    CURLcode performResult = curl_easy_perform(curl);

    if (options.stream && options.streamCallback)
    {
        // 最后一行可能没有换行符
        if (!streamContext.buffer.empty() && streamContext.sawData)
            processStreamLine(&streamContext, streamContext.buffer);
        // 反代忽略 stream=true 时返回普通 JSON，整体交给上层兜底解析
        if (!streamContext.sawData && !streamContext.raw.empty() &&
            (!options.cancelled || !options.cancelled->load()))
            options.streamCallback(streamContext.raw);
    }

    ASSERT_CURL_OK(curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &responseCode));

    if (headers)
        curl_slist_free_all(headers);
    curl_easy_cleanup(curl);

    if (performResult != CURLE_OK && performResult != CURLE_ABORTED_BY_CALLBACK)
    {
        // 反代提前断开时保留已收内容，不要整段丢弃
        if (!(options.stream && performResult == CURLE_PARTIAL_FILE))
            THROW_CURL_ERROR(performResult);
    }

    Response response(responseCode, responseBody);
    response.headers = responseHeaders;
    return response;
}
