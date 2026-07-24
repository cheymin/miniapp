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

#include "JSDatabase.hpp"
#include <Exceptions/AssertFailed.hpp>
#include <stdexcept>

JSDatabase::JSDatabase() {}
JSDatabase::~JSDatabase()
{
    std::lock_guard<std::mutex> lock(dbMutex);
    if (conn)
    {
        sqlite3_close(conn);
        conn = nullptr;
    }
}

void JSDatabase::initialize(JQFunctionInfo &info)
{
    try
    {
        ASSERT(info.Length() == 1);
        JSContext *ctx = info.GetContext();
        std::string dbPath = JQString(ctx, info[0]).getString();
        ASSERT(!dbPath.empty());

        std::lock_guard<std::mutex> lock(dbMutex);
        if (conn)
        {
            sqlite3_close(conn);
            conn = nullptr;
        }
        if (sqlite3_open(dbPath.c_str(), &conn) != SQLITE_OK)
        {
            std::string err = conn ? sqlite3_errmsg(conn) : "unknown open error";
            if (conn)
            {
                sqlite3_close(conn);
                conn = nullptr;
            }
            throw std::runtime_error("sqlite3_open failed for '" + dbPath + "': " + err);
        }
        // 并发保护：WAL + 忙等待
        sqlite3_busy_timeout(conn, 5000);
        sqlite3_exec(conn, "PRAGMA journal_mode=WAL;", nullptr, nullptr, nullptr);
        sqlite3_exec(conn, "PRAGMA synchronous=NORMAL;", nullptr, nullptr, nullptr);
        // 建 KV 表（若不存在）
        char *errMsg = nullptr;
        if (sqlite3_exec(conn, "CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL)", nullptr, nullptr, &errMsg) != SQLITE_OK)
        {
            std::string error = errMsg ? errMsg : "Unknown error";
            if (errMsg)
                sqlite3_free(errMsg);
            throw std::runtime_error("CREATE TABLE kv failed: " + error);
        }
        if (errMsg)
            sqlite3_free(errMsg);
        info.GetReturnValue().Set(true);
    }
    catch (const std::exception &e)
    {
        info.GetReturnValue().ThrowInternalError(e.what());
    }
}

void JSDatabase::get(JQFunctionInfo &info)
{
    try
    {
        sqlite3 *db = getConn();
        ASSERT(db != nullptr);
        ASSERT(info.Length() == 1);
        JSContext *ctx = info.GetContext();
        std::string key = JQString(ctx, info[0]).getString();

        sqlite3_stmt *stmt = nullptr;
        if (sqlite3_prepare_v2(db, "SELECT value FROM kv WHERE key = ?", -1, &stmt, nullptr) != SQLITE_OK)
            throw std::runtime_error(std::string("prepare failed: ") + sqlite3_errmsg(db));
        sqlite3_bind_text(stmt, 1, key.c_str(), -1, SQLITE_TRANSIENT);

        std::string value;
        if (sqlite3_step(stmt) == SQLITE_ROW)
        {
            const unsigned char *val = sqlite3_column_text(stmt, 0);
            if (val)
                value = std::string(reinterpret_cast<const char *>(val));
        }
        sqlite3_finalize(stmt);
        info.GetReturnValue().Set(value);
    }
    catch (const std::exception &e)
    {
        info.GetReturnValue().ThrowInternalError(e.what());
    }
}

void JSDatabase::set(JQFunctionInfo &info)
{
    try
    {
        sqlite3 *db = getConn();
        ASSERT(db != nullptr);
        ASSERT(info.Length() == 2);
        JSContext *ctx = info.GetContext();
        std::string key = JQString(ctx, info[0]).getString();
        std::string value = JQString(ctx, info[1]).getString();
        ASSERT(!key.empty());

        sqlite3_stmt *stmt = nullptr;
        if (sqlite3_prepare_v2(db, "INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)", -1, &stmt, nullptr) != SQLITE_OK)
            throw std::runtime_error(std::string("prepare failed: ") + sqlite3_errmsg(db));
        sqlite3_bind_text(stmt, 1, key.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(stmt, 2, value.c_str(), -1, SQLITE_TRANSIENT);

        if (sqlite3_step(stmt) != SQLITE_DONE)
        {
            sqlite3_finalize(stmt);
            throw std::runtime_error(std::string("step failed: ") + sqlite3_errmsg(db));
        }
        sqlite3_finalize(stmt);
        info.GetReturnValue().Set(true);
    }
    catch (const std::exception &e)
    {
        info.GetReturnValue().ThrowInternalError(e.what());
    }
}

void JSDatabase::remove(JQFunctionInfo &info)
{
    try
    {
        sqlite3 *db = getConn();
        ASSERT(db != nullptr);
        ASSERT(info.Length() == 1);
        JSContext *ctx = info.GetContext();
        std::string key = JQString(ctx, info[0]).getString();

        sqlite3_stmt *stmt = nullptr;
        if (sqlite3_prepare_v2(db, "DELETE FROM kv WHERE key = ?", -1, &stmt, nullptr) != SQLITE_OK)
            throw std::runtime_error(std::string("prepare failed: ") + sqlite3_errmsg(db));
        sqlite3_bind_text(stmt, 1, key.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_step(stmt);
        sqlite3_finalize(stmt);
        info.GetReturnValue().Set(true);
    }
    catch (const std::exception &e)
    {
        info.GetReturnValue().ThrowInternalError(e.what());
    }
}

void JSDatabase::keys(JQFunctionInfo &info)
{
    try
    {
        sqlite3 *db = getConn();
        ASSERT(db != nullptr);
        ASSERT(info.Length() == 0);

        sqlite3_stmt *stmt = nullptr;
        if (sqlite3_prepare_v2(db, "SELECT key FROM kv", -1, &stmt, nullptr) != SQLITE_OK)
            throw std::runtime_error(std::string("prepare failed: ") + sqlite3_errmsg(db));

        Bson::array result;
        while (sqlite3_step(stmt) == SQLITE_ROW)
        {
            const unsigned char *val = sqlite3_column_text(stmt, 0);
            if (val)
                result.push_back(std::string(reinterpret_cast<const char *>(val)));
        }
        sqlite3_finalize(stmt);
        info.GetReturnValue().Set(result);
    }
    catch (const std::exception &e)
    {
        info.GetReturnValue().ThrowInternalError(e.what());
    }
}

extern JSValue createDatabase(JQModuleEnv *env)
{
    JQFunctionTemplateRef tpl = JQFunctionTemplate::New(env, "Database");
    tpl->InstanceTemplate()->setObjectCreator([]()
                                             { return new JSDatabase(); });

    tpl->SetProtoMethod("initialize", &JSDatabase::initialize);
    tpl->SetProtoMethod("get", &JSDatabase::get);
    tpl->SetProtoMethod("set", &JSDatabase::set);
    tpl->SetProtoMethod("remove", &JSDatabase::remove);
    tpl->SetProtoMethod("keys", &JSDatabase::keys);

    JSDatabase::InitTpl(tpl);
    return tpl->CallConstructor();
}
