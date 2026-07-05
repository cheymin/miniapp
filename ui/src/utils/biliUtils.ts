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

// B 站播放数等数字的中文格式化（1.2万 / 350 等）
export function formatPlayCount(n: number): string {
    if (!n || n < 0) return '0';
    if (n < 10000) return String(n);
    if (n < 100000000) return (n / 10000).toFixed(1) + '万';
    return (n / 100000000).toFixed(1) + '亿';
}

// 秒数 → mm:ss 或 h:mm:ss
export function formatDuration(seconds: number): string {
    if (!seconds || seconds < 0) return '00:00';
    const s = Math.floor(seconds % 60);
    const m = Math.floor((seconds / 60) % 60);
    const h = Math.floor(seconds / 3600);
    const pad = (x: number) => (x < 10 ? '0' + x : '' + x);
    if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
    return `${pad(m)}:${pad(s)}`;
}

// Unix 时间戳 → YYYY-MM-DD
export function formatDate(timestamp: number): string {
    if (!timestamp) return '';
    const d = new Date(timestamp * 1000);
    const y = d.getFullYear();
    const m: number = d.getMonth() + 1;
    const day: number = d.getDate();
    const pad = (x: number) => (x < 10 ? '0' + x : '' + x);
    return `${y}-${pad(m)}-${pad(day)}`;
}
