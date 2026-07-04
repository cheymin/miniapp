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
#include <functional>

using AIStreamCallback = std::function<void(const std::string &messageDelta)>;

// 账户余额信息（New API / One API 兼容）
struct BalanceInfo
{
    double balance;    // 剩余余额（美元）
    double used;       // 已使用（美元）
    double total;      // 总额度（美元）
    bool unlimited;    // 是否无限额度

    BalanceInfo() : balance(0.0), used(0.0), total(0.0), unlimited(false) {}
    BalanceInfo(double balance, double used, double total, bool unlimited)
        : balance(balance), used(used), total(total), unlimited(unlimited) {}
};
