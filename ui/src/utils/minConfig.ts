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

// 统一配置存储：所有新模块数据持久化到 /userdisk/min/database/
// 用 $falcon.storage 的 key-value，key 带 min/database 前缀
const DB_PREFIX = 'min/database';

export interface WebDAVConfig {
    url: string;          // 如 http://dav.example.com/dav
    username: string;
    password: string;
    remotePath: string;   // 备份远程目录 如 /minapp-backup
}

export interface MemosConfig {
    url: string;          // 如 http://memos.example.com
    token: string;        // Access Token
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

class MinConfig {
    private webdav: WebDAVConfig | null = null;
    private memos: MemosConfig | null = null;
    private background: AppBackgroundConfig | null = null;
    private voice: VoiceSTTConfig | null = null;
    private loaded: boolean = false;

    async loadAll(): Promise<void> {
        if (this.loaded) return;
        try {
            this.webdav = await this.read<WebDAVConfig>('webdav', { url: '', username: '', password: '', remotePath: '/minapp-backup' });
            this.memos = await this.read<MemosConfig>('memos', { url: '', token: '' });
            this.background = await this.read<AppBackgroundConfig>('background', { enabled: false, imagePath: '', opacity: 60 });
            this.voice = await this.read<VoiceSTTConfig>('voice', { apiUrl: '', apiKey: '' });
            this.loaded = true;
        } catch (e) {
            console.error('MinConfig load failed:', e);
        }
    }

    private async read<T>(key: string, fallback: T): Promise<T> {
        try {
            const raw = await $falcon.storage.get(`${DB_PREFIX}/${key}`);
            if (raw && typeof raw === 'string') {
                return Object.assign({}, fallback, JSON.parse(raw));
            }
        } catch (e) {
            // ignore
        }
        return fallback;
    }

    private async write<T>(key: string, value: T): Promise<void> {
        try {
            await $falcon.storage.set(`${DB_PREFIX}/${key}`, JSON.stringify(value));
        } catch (e) {
            console.error('MinConfig write failed:', e);
        }
    }

    getWebDAV(): WebDAVConfig {
        return this.webdav || { url: '', username: '', password: '', remotePath: '/minapp-backup' };
    }
    async setWebDAV(cfg: WebDAVConfig): Promise<void> {
        this.webdav = cfg;
        await this.write('webdav', cfg);
    }

    getMemos(): MemosConfig {
        return this.memos || { url: '', token: '' };
    }
    async setMemos(cfg: MemosConfig): Promise<void> {
        this.memos = cfg;
        await this.write('memos', cfg);
    }

    getBackground(): AppBackgroundConfig {
        return this.background || { enabled: false, imagePath: '', opacity: 60 };
    }
    async setBackground(cfg: AppBackgroundConfig): Promise<void> {
        this.background = cfg;
        await this.write('background', cfg);
    }

    getVoice(): VoiceSTTConfig {
        return this.voice || { apiUrl: '', apiKey: '' };
    }
    async setVoice(cfg: VoiceSTTConfig): Promise<void> {
        this.voice = cfg;
        await this.write('voice', cfg);
    }
}

export const minConfig = new MinConfig();
