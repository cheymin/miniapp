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

export interface DatabaseConfig {
    qq: {
        enabled: boolean;
        serverUrl: string;
        accessToken: string;
        userId: string;
    };
    notifications: NotificationItem[];
    settings: {
        theme: string;
        brightness: number;
        screenTimeout: number;
    };
}

export interface NotificationItem {
    id: string;
    title: string;
    text: string;
    time: string;
    read: boolean;
    appId: string;
}

export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    type: 'text' | 'image' | 'unsupported';
    timestamp: number;
    isSelf: boolean;
}

export interface ChatSession {
    id: string;
    name: string;
    avatar: string;
    lastMessage: string;
    lastTime: number;
    unreadCount: number;
    messages: ChatMessage[];
}

const DATABASE_PATH = '/userdisk/database';
const CONFIG_FILE = 'config.json';
const CHAT_FILE = 'chats.json';

class DatabaseManager {
    private config: DatabaseConfig | null = null;
    private chats: Map<string, ChatSession> = new Map();

    async initialize(): Promise<void> {
        try {
            await this.loadConfig();
            await this.loadChats();
        } catch (error) {
            console.error('Database initialization failed:', error);
            this.config = this.getDefaultConfig();
        }
    }

    private getDefaultConfig(): DatabaseConfig {
        return {
            qq: {
                enabled: false,
                serverUrl: 'http://localhost:3000',
                accessToken: '',
                userId: ''
            },
            notifications: [],
            settings: {
                theme: 'default',
                brightness: 60,
                screenTimeout: 30
            }
        };
    }

    async loadConfig(): Promise<DatabaseConfig> {
        try {
            const data = await $falcon.storage.get(`${DATABASE_PATH}/${CONFIG_FILE}`);
            if (data) {
                this.config = JSON.parse(data);
            } else {
                this.config = this.getDefaultConfig();
            }
            return this.config!;
        } catch (error) {
            console.error('Failed to load config:', error);
            this.config = this.getDefaultConfig();
            return this.config;
        }
    }

    async saveConfig(): Promise<void> {
        if (!this.config) return;
        try {
            await $falcon.storage.set(`${DATABASE_PATH}/${CONFIG_FILE}`, JSON.stringify(this.config));
        } catch (error) {
            console.error('Failed to save config:', error);
        }
    }

    getConfig(): DatabaseConfig {
        if (!this.config) {
            this.config = this.getDefaultConfig();
        }
        return this.config;
    }

    async updateQQConfig(qqConfig: Partial<DatabaseConfig['qq']>): Promise<void> {
        if (!this.config) {
            this.config = this.getDefaultConfig();
        }
        this.config.qq = { ...this.config.qq, ...qqConfig };
        await this.saveConfig();
    }

    async addNotification(notification: Omit<NotificationItem, 'id' | 'time' | 'read'>): Promise<void> {
        if (!this.config) {
            this.config = this.getDefaultConfig();
        }
        const newNotification: NotificationItem = {
            ...notification,
            id: Date.now().toString(),
            time: new Date().toLocaleString('zh-CN'),
            read: false
        };
        this.config.notifications.unshift(newNotification);
        if (this.config.notifications.length > 50) {
            this.config.notifications = this.config.notifications.slice(0, 50);
        }
        await this.saveConfig();
    }

    async markNotificationRead(id: string): Promise<void> {
        if (!this.config) return;
        const notification = this.config.notifications.find(n => n.id === id);
        if (notification) {
            notification.read = true;
            await this.saveConfig();
        }
    }

    async clearNotifications(): Promise<void> {
        if (!this.config) return;
        this.config.notifications = [];
        await this.saveConfig();
    }

    getNotifications(): NotificationItem[] {
        return this.config?.notifications || [];
    }

    async loadChats(): Promise<void> {
        try {
            const data = await $falcon.storage.get(`${DATABASE_PATH}/${CHAT_FILE}`);
            if (data) {
                const chatsArray: ChatSession[] = JSON.parse(data);
                this.chats = new Map(chatsArray.map(chat => [chat.id, chat]));
            }
        } catch (error) {
            console.error('Failed to load chats:', error);
        }
    }

    async saveChats(): Promise<void> {
        try {
            const chatsArray = Array.from(this.chats.values());
            await $falcon.storage.set(`${DATABASE_PATH}/${CHAT_FILE}`, JSON.stringify(chatsArray));
        } catch (error) {
            console.error('Failed to save chats:', error);
        }
    }

    getChatSessions(): ChatSession[] {
        return Array.from(this.chats.values()).sort((a, b) => b.lastTime - a.lastTime);
    }

    getChatSession(id: string): ChatSession | undefined {
        return this.chats.get(id);
    }

    async addMessage(sessionId: string, message: Omit<ChatMessage, 'id'>): Promise<void> {
        let session = this.chats.get(sessionId);
        if (!session) {
            session = {
                id: sessionId,
                name: '未知联系人',
                avatar: '',
                lastMessage: '',
                lastTime: 0,
                unreadCount: 0,
                messages: []
            };
            this.chats.set(sessionId, session);
        }

        const newMessage: ChatMessage = {
            ...message,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
        };

        session.messages.push(newMessage);
        session.lastMessage = this.getMessagePreview(message);
        session.lastTime = message.timestamp;
        if (!message.isSelf) {
            session.unreadCount++;
        }

        await this.saveChats();
    }

    private getMessagePreview(message: ChatMessage): string {
        switch (message.type) {
            case 'text':
                return message.content.length > 30 ? message.content.substring(0, 30) + '...' : message.content;
            case 'image':
                return '[图片]';
            case 'unsupported':
                return '[不支持的消息类型]';
            default:
                return '[消息]';
        }
    }

    async markChatRead(sessionId: string): Promise<void> {
        const session = this.chats.get(sessionId);
        if (session) {
            session.unreadCount = 0;
            await this.saveChats();
        }
    }

    async updateChatSession(sessionId: string, updates: Partial<ChatSession>): Promise<void> {
        const session = this.chats.get(sessionId);
        if (session) {
            Object.assign(session, updates);
            await this.saveChats();
        }
    }

    async clearChatHistory(sessionId: string): Promise<void> {
        const session = this.chats.get(sessionId);
        if (session) {
            session.messages = [];
            session.lastMessage = '';
            session.lastTime = 0;
            await this.saveChats();
        }
    }

    async deleteChatSession(sessionId: string): Promise<void> {
        this.chats.delete(sessionId);
        await this.saveChats();
    }

    getTotalUnreadCount(): number {
        return Array.from(this.chats.values()).reduce((total, session) => total + session.unreadCount, 0);
    }
}

export const database = new DatabaseManager();
