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

#include <sqlite3/sqlite3.h>
#include <jqutil_v2/jqutil.h>
#include <memory>
#include <mutex>
#include <string>

using namespace JQUTIL_NS;

// JS 绑定的 KV 型 SQLite 数据库
// 对外暴露 initialize/get/set/remove/keys 五个方法
// 用于替代散落的 JSON 配置文件，统一持久化到 /userdisk/database/*.db
// 直接持有 sqlite3 连接做参数化查询，安全且支持空字符串值
class JSDatabase : public JQPublishObject
{
private:
    sqlite3 *conn = nullptr;
    mutable std::mutex dbMutex;

    sqlite3 *getConn() const
    {
        std::lock_guard<std::mutex> lock(dbMutex);
        return conn;
    }

public:
    JSDatabase();
    ~JSDatabase();

    void initialize(JQFunctionInfo &info);
    void get(JQFunctionInfo &info);
    void set(JQFunctionInfo &info);
    void remove(JQFunctionInfo &info);
    void keys(JQFunctionInfo &info);
};

extern JSValue createDatabase(JQModuleEnv *env);
