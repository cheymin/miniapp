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

import { dbGet, dbSet } from './database';

// 统一配置存储：所有模块配置持久化到 SQLite（/userdisk/database/langningchen-config.db）
// 复用 database.ts 的单一 DB 连接（JSDatabase 单连接，禁止各自 initialize）
const CONFIG_KEY = 'min-config';

export interface MemosConfig {
    url: string;          // 如 http://memos.example.com
    username: string;     // 账户名
    password: string;     // 密码
}

export interface AppBackgroundConfig {
    enabled: boolean;
    imagePath: string;    // 本地图片路径
    opacity: number;      // 0~100 背景图透明度(实际用遮罩层实现)
}

export interface VoiceSTTConfig {
    apiUrl: string;       // 语音转文字云端API地址
    apiKey: string;
}

interface AllConfig {
    memos: MemosConfig;
    background: AppBackgroundConfig;
    voice: VoiceSTTConfig;
}

function defaultConfig(): AllConfig {
    return {
        memos: { url: '', username: '', password: '' },
        background: { enabled: false, imagePath: '', opacity: 60 },
        voice: { apiUrl: '', apiKey: '' },
    };
}

class MinConfig {
    private data: AllConfig = defaultConfig();
    private loaded: boolean = false;

    async loadAll(): Promise<void> {
        if (this.loaded) return;
        try {
            const raw = dbGet(CONFIG_KEY);
            if (raw && typeof raw === 'string') {
                const parsed = JSON.parse(raw);
                this.data = Object.assign(defaultConfig(), parsed);
            }
            this.loaded = true;
        } catch (e) {
            console.error('MinConfig load failed:', e);
            this.data = defaultConfig();
        }
    }

    private async save(): Promise<void> {
        try {
            dbSet(CONFIG_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.error('MinConfig save failed:', e);
        }
    }

    getMemos(): MemosConfig {
        return this.data.memos;
    }
    async setMemos(cfg: MemosConfig): Promise<void> {
        this.data.memos = cfg;
        await this.save();
    }

    getBackground(): AppBackgroundConfig {
        return this.data.background;
    }
    async setBackground(cfg: AppBackgroundConfig): Promise<void> {
        this.data.background = cfg;
        await this.save();
    }

    getVoice(): VoiceSTTConfig {
        return this.data.voice;
    }
    async setVoice(cfg: VoiceSTTConfig): Promise<void> {
        this.data.voice = cfg;
        await this.save();
    }
}

export const minConfig = new MinConfig();
