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

#include "Database.hpp"
#include <stdexcept>

DATABASE::DATABASE(const std::string &filePath)
{
    conn = nullptr;
    if (sqlite3_open(filePath.c_str(), &conn) != SQLITE_OK)
    {
        std::string err = conn ? sqlite3_errmsg(conn) : "unknown open error";
        if (conn)
        {
            sqlite3_close(conn);
            conn = nullptr;
        }
        throw std::runtime_error("sqlite3_open failed for '" + filePath + "': " + err);
    }
    // 并发保护：WAL + 忙等待，避免流式写线程与 UI 读线程互相 SQLITE_BUSY
    sqlite3_busy_timeout(conn, 5000);
    sqlite3_exec(conn, "PRAGMA journal_mode=WAL;", nullptr, nullptr, nullptr);
    sqlite3_exec(conn, "PRAGMA synchronous=NORMAL;", nullptr, nullptr, nullptr);
}
DATABASE::~DATABASE()
{
    if (conn)
        sqlite3_close(conn);
}

TABLE DATABASE::table(const std::string &tableName) { return TABLE(conn, tableName); }
SELECT DATABASE::select(const std::string &tableName) { return SELECT(conn, tableName); }
INSERT DATABASE::insert(const std::string &tableName) { return INSERT(conn, tableName); }
DELETE DATABASE::remove(const std::string &tableName) { return DELETE(conn, tableName); }
UPDATE DATABASE::update(const std::string &tableName) { return UPDATE(conn, tableName); }
SIZE DATABASE::size(const std::string &tableName) { return SIZE(conn, tableName); }

void DATABASE::reopen(const std::string &filePath)
{
    if (conn)
    {
        sqlite3_close(conn);
        conn = nullptr;
    }
    if (sqlite3_open(filePath.c_str(), &conn) != SQLITE_OK)
    {
        std::string err = conn ? sqlite3_errmsg(conn) : "unknown open error";
        if (conn)
        {
            sqlite3_close(conn);
            conn = nullptr;
        }
        throw std::runtime_error("sqlite3_open failed for '" + filePath + "': " + err);
    }
    sqlite3_busy_timeout(conn, 5000);
    sqlite3_exec(conn, "PRAGMA journal_mode=WAL;", nullptr, nullptr, nullptr);
    sqlite3_exec(conn, "PRAGMA synchronous=NORMAL;", nullptr, nullptr, nullptr);
}

void DATABASE::exec(const std::string &sql)
{
    char *errMsg = nullptr;
    if (sqlite3_exec(conn, sql.c_str(), nullptr, nullptr, &errMsg) != SQLITE_OK)
    {
        std::string error = errMsg ? errMsg : "Unknown error";
        if (errMsg)
            sqlite3_free(errMsg);
        throw std::runtime_error("SQL exec failed: " + error);
    }
    if (errMsg)
        sqlite3_free(errMsg);
}
