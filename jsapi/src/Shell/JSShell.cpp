#include "JSShell.hpp"
#include <Exceptions/AssertFailed.hpp>
#include <nlohmann/json.hpp>

#include <algorithm>
#include <cstdio>
#include <cstring>
#include <dirent.h>
#include <fstream>
#include <sstream>
#include <stdexcept>
#include <sys/stat.h>
#include <unistd.h>
#include <vector>

using json = nlohmann::json;

namespace
{
std::string joinPath(const std::string& base, const std::string& name)
{
    if (base.empty()) return name;
    if (base.back() == '/') return base + name;
    return base + "/" + name;
}

bool statPath(const std::string& path, struct stat& st)
{
    return ::lstat(path.c_str(), &st) == 0;
}

bool isDirectory(const std::string& path)
{
    struct stat st;
    return statPath(path, st) && S_ISDIR(st.st_mode);
}

std::string readFile(const std::string& path, size_t maxBytes)
{
    std::ifstream in(path, std::ios::binary);
    if (!in) throw std::runtime_error("无法打开文件: " + path);
    std::string data;
    data.resize(maxBytes);
    in.read(&data[0], static_cast<std::streamsize>(maxBytes));
    data.resize(static_cast<size_t>(in.gcount()));
    return data;
}

void writeFile(const std::string& path, const std::string& data)
{
    std::ofstream out(path, std::ios::binary | std::ios::trunc);
    if (!out) throw std::runtime_error("无法写入文件: " + path);
    out.write(data.data(), static_cast<std::streamsize>(data.size()));
    if (!out) throw std::runtime_error("写入失败: " + path);
}

void removeAll(const std::string& path)
{
    struct stat st;
    if (!statPath(path, st)) return;
    if (!S_ISDIR(st.st_mode))
    {
        if (::unlink(path.c_str()) != 0) throw std::runtime_error("删除失败: " + path);
        return;
    }

    DIR* dir = ::opendir(path.c_str());
    if (!dir) throw std::runtime_error("无法打开目录: " + path);
    struct dirent* entry;
    while ((entry = ::readdir(dir)) != nullptr)
    {
        std::string name = entry->d_name;
        if (name == "." || name == "..") continue;
        removeAll(joinPath(path, name));
    }
    ::closedir(dir);
    if (::rmdir(path.c_str()) != 0) throw std::runtime_error("删除目录失败: " + path);
}

void copyAll(const std::string& from, const std::string& to)
{
    struct stat st;
    if (!statPath(from, st)) throw std::runtime_error("源文件不存在: " + from);

    if (!S_ISDIR(st.st_mode))
    {
        std::ifstream in(from, std::ios::binary);
        if (!in) throw std::runtime_error("无法读取: " + from);
        std::ofstream out(to, std::ios::binary | std::ios::trunc);
        if (!out) throw std::runtime_error("无法写入: " + to);
        out << in.rdbuf();
        if (!in.eof() && in.fail()) throw std::runtime_error("复制失败: " + from);
        return;
    }

    if (::mkdir(to.c_str(), 0777) != 0 && !isDirectory(to))
        throw std::runtime_error("创建目录失败: " + to);

    DIR* dir = ::opendir(from.c_str());
    if (!dir) throw std::runtime_error("无法打开目录: " + from);
    struct dirent* entry;
    while ((entry = ::readdir(dir)) != nullptr)
    {
        std::string name = entry->d_name;
        if (name == "." || name == "..") continue;
        copyAll(joinPath(from, name), joinPath(to, name));
    }
    ::closedir(dir);
}
} // namespace

JSShell::JSShell() {}
JSShell::~JSShell() {}

void JSShell::ensure()
{
    if (shell == nullptr) shell = std::make_unique<Shell>();
}

void JSShell::initialize(JQFunctionInfo& info)
{
    try
    {
        ASSERT(info.Length() == 0);
        std::lock_guard<std::mutex> lock(mutex);
        ensure();
        info.GetReturnValue().Set(true);
    }
    catch (const std::exception& e)
    {
        info.GetReturnValue().ThrowInternalError(e.what());
    }
}

void JSShell::exec(JQAsyncInfo& info)
{
    try
    {
        ASSERT(info.Length() == 1);
        ASSERT(info[0].is_string());

        std::string cmd = info[0].string_value();
        {
            std::lock_guard<std::mutex> lock(mutex);
            ensure();
        }
        std::string output = shell->exec(cmd);
        info.post(output);
    }
    catch (const std::exception& e)
    {
        info.postError(e.what());
    }
}

void JSShell::list(JQAsyncInfo& info)
{
    try
    {
        ASSERT(info.Length() == 1);
        ASSERT(info[0].is_string());
        std::string path = info[0].string_value();
        if (path.empty()) path = "/";
        if (!isDirectory(path)) throw std::runtime_error("不是目录: " + path);

        struct Entry
        {
            std::string name;
            std::string full;
            bool dir;
            long long size;
            long long mtime;
        };
        std::vector<Entry> entries;

        DIR* dir = ::opendir(path.c_str());
        if (!dir) throw std::runtime_error("无法打开目录: " + path);
        struct dirent* item;
        while ((item = ::readdir(dir)) != nullptr)
        {
            std::string name = item->d_name;
            if (name == "." || name == "..") continue;
            std::string full = joinPath(path, name);
            struct stat st;
            if (!statPath(full, st)) continue;
            entries.push_back({name, full, S_ISDIR(st.st_mode),
                               static_cast<long long>(st.st_size),
                               static_cast<long long>(st.st_mtime)});
        }
        ::closedir(dir);

        std::sort(entries.begin(), entries.end(), [](const Entry& a, const Entry& b) {
            if (a.dir != b.dir) return a.dir > b.dir;
            std::string la = a.name, lb = b.name;
            std::transform(la.begin(), la.end(), la.begin(), ::tolower);
            std::transform(lb.begin(), lb.end(), lb.begin(), ::tolower);
            return la < lb;
        });

        json arr = json::array();
        for (const auto& e : entries)
        {
            arr.push_back({{"name", e.name},
                           {"path", e.full},
                           {"dir", e.dir},
                           {"size", e.size},
                           {"mtime", e.mtime}});
        }
        info.post(arr.dump());
    }
    catch (const std::exception& e)
    {
        info.postError(e.what());
    }
}

void JSShell::stat(JQAsyncInfo& info)
{
    try
    {
        ASSERT(info.Length() == 1);
        ASSERT(info[0].is_string());
        std::string path = info[0].string_value();
        struct stat st;
        if (!statPath(path, st)) throw std::runtime_error("路径不存在: " + path);
        json obj = {{"path", path},
                    {"dir", S_ISDIR(st.st_mode)},
                    {"size", static_cast<long long>(st.st_size)},
                    {"mtime", static_cast<long long>(st.st_mtime)}};
        info.post(obj.dump());
    }
    catch (const std::exception& e)
    {
        info.postError(e.what());
    }
}

void JSShell::mkdir(JQAsyncInfo& info)
{
    try
    {
        ASSERT(info.Length() == 1);
        ASSERT(info[0].is_string());
        std::string path = info[0].string_value();
        if (path.empty()) throw std::runtime_error("路径为空");
        if (::mkdir(path.c_str(), 0777) != 0 && !isDirectory(path))
            throw std::runtime_error("创建目录失败: " + path);
        info.post(true);
    }
    catch (const std::exception& e)
    {
        info.postError(e.what());
    }
}

void JSShell::removePath(JQAsyncInfo& info)
{
    try
    {
        ASSERT(info.Length() == 1);
        ASSERT(info[0].is_string());
        std::string path = info[0].string_value();
        if (path == "/" || path.empty() || path == "/userdisk" || path == "/sdcard")
            throw std::runtime_error("不允许删除该目录");
        removeAll(path);
        info.post(true);
    }
    catch (const std::exception& e)
    {
        info.postError(e.what());
    }
}

void JSShell::rename(JQAsyncInfo& info)
{
    try
    {
        ASSERT(info.Length() == 2);
        ASSERT(info[0].is_string());
        ASSERT(info[1].is_string());
        std::string from = info[0].string_value();
        std::string to = info[1].string_value();
        if (::rename(from.c_str(), to.c_str()) != 0)
            throw std::runtime_error("重命名失败: " + from);
        info.post(true);
    }
    catch (const std::exception& e)
    {
        info.postError(e.what());
    }
}

void JSShell::copy(JQAsyncInfo& info)
{
    try
    {
        ASSERT(info.Length() == 2);
        ASSERT(info[0].is_string());
        ASSERT(info[1].is_string());
        copyAll(info[0].string_value(), info[1].string_value());
        info.post(true);
    }
    catch (const std::exception& e)
    {
        info.postError(e.what());
    }
}

void JSShell::readText(JQAsyncInfo& info)
{
    try
    {
        ASSERT(info.Length() == 1);
        ASSERT(info[0].is_string());
        info.post(readFile(info[0].string_value(), 256 * 1024));
    }
    catch (const std::exception& e)
    {
        info.postError(e.what());
    }
}

void JSShell::writeText(JQAsyncInfo& info)
{
    try
    {
        ASSERT(info.Length() == 2);
        ASSERT(info[0].is_string());
        ASSERT(info[1].is_string());
        writeFile(info[0].string_value(), info[1].string_value());
        info.post(true);
    }
    catch (const std::exception& e)
    {
        info.postError(e.what());
    }
}

void JSShell::exists(JQAsyncInfo& info)
{
    try
    {
        ASSERT(info.Length() == 1);
        ASSERT(info[0].is_string());
        struct stat st;
        info.post(statPath(info[0].string_value(), st));
    }
    catch (const std::exception& e)
    {
        info.postError(e.what());
    }
}

JSValue createShell(JQModuleEnv* env)
{
    JQFunctionTemplateRef tpl = JQFunctionTemplate::New(env, "Shell");
    tpl->InstanceTemplate()->setObjectCreator([]() {
        return new JSShell();
    });

    tpl->SetProtoMethod("initialize", &JSShell::initialize);
    tpl->SetProtoMethodPromise("exec", &JSShell::exec);
    tpl->SetProtoMethodPromise("list", &JSShell::list);
    tpl->SetProtoMethodPromise("stat", &JSShell::stat);
    tpl->SetProtoMethodPromise("mkdir", &JSShell::mkdir);
    tpl->SetProtoMethodPromise("remove", &JSShell::removePath);
    tpl->SetProtoMethodPromise("rename", &JSShell::rename);
    tpl->SetProtoMethodPromise("copy", &JSShell::copy);
    tpl->SetProtoMethodPromise("readText", &JSShell::readText);
    tpl->SetProtoMethodPromise("writeText", &JSShell::writeText);
    tpl->SetProtoMethodPromise("exists", &JSShell::exists);

    JSShell::InitTpl(tpl);
    return tpl->CallConstructor();
}
