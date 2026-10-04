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

import { defineComponent } from 'vue';
import { database, ChatSession, ChatMessage } from '../../utils/database';

export type QQChatOptions = {
    sessionId?: string;
};

const qqchat = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<QQChatOptions>,
            
            serverUrl: '',
            accessToken: '',
            userId: '',
            isConfigured: false,
            showSettings: false,
            
            sessions: [] as ChatSession[],
            currentSession: null as ChatSession | null,
            
            inputMessage: '',
            isConnected: false
        };
    },

    async mounted() {
        await database.initialize();
        await this.loadConfig();
        await this.loadSessions();
        
        const sessionId = this.$page.loadOptions?.sessionId;
        if (sessionId) {
            this.openSession(sessionId);
        }
    },

    methods: {
        async loadConfig() {
            const config = database.getConfig();
            this.serverUrl = config.qq.serverUrl;
            this.accessToken = config.qq.accessToken;
            this.userId = config.qq.userId;
            this.isConfigured = config.qq.enabled && !!config.qq.serverUrl;
        },

        async saveConfig() {
            await database.updateQQConfig({
                enabled: true,
                serverUrl: this.serverUrl,
                accessToken: this.accessToken,
                userId: this.userId
            });
            this.isConfigured = true;
            this.showSettings = false;
            this.showToast('配置已保存');
        },

        async loadSessions() {
            this.sessions = database.getChatSessions();
        },

        openSession(sessionId: string) {
            this.currentSession = database.getChatSession(sessionId) || null;
            if (this.currentSession) {
                database.markChatRead(sessionId);
            }
        },

        backToList() {
            this.currentSession = null;
            this.loadSessions();
        },

        async sendMessage() {
            if (!this.inputMessage.trim() || !this.currentSession) return;
            
            const message: Omit<ChatMessage, 'id'> = {
                senderId: this.userId,
                senderName: '我',
                content: this.inputMessage.trim(),
                type: 'text',
                timestamp: Date.now(),
                isSelf: true
            };

            await database.addMessage(this.currentSession.id, message);
            this.inputMessage = '';
            this.currentSession = database.getChatSession(this.currentSession.id) || null;
            
            this.simulateReply();
        },

        async simulateReply() {
            if (!this.currentSession) return;
            
            setTimeout(async () => {
                const replies = [
                    '收到！',
                    '好的，我知道了',
                    '😊',
                    '稍等一下',
                    '没问题',
                    '👍'
                ];
                
                const replyMessage: Omit<ChatMessage, 'id'> = {
                    senderId: 'test',
                    senderName: this.currentSession?.name || '联系人',
                    content: replies[Math.floor(Math.random() * replies.length)],
                    type: 'text',
                    timestamp: Date.now(),
                    isSelf: false
                };

                await database.addMessage(this.currentSession!.id, replyMessage);
                this.currentSession = database.getChatSession(this.currentSession!.id) || null;
            }, 1000 + Math.random() * 2000);
        },

        formatMessage(content: string): string {
            let formatted = content;
            
            const emojiPatterns: { [key: string]: string } = {
                '\\[微笑\\]': '😊',
                '\\[撇嘴\\]': '😒',
                '\\[色\\]': '😍',
                '\\[发呆\\]': '😳',
                '\\[得意\\]': '😎',
                '\\[流泪\\]': '😢',
                '\\[害羞\\]': '😳',
                '\\[闭嘴\\]': '😶',
                '\\[睡\\]': '😴',
                '\\[大哭\\]': '😭',
                '\\[尴尬\\]': '😅',
                '\\[发怒\\]': '😠',
                '\\[调皮\\]': '😜',
                '\\[呲牙\\]': '😁',
                '\\[惊讶\\]': '😲',
                '\\[难过\\]': '😞',
                '\\[酷\\]': '😎',
                '\\[冷汗\\]': '😰',
                '\\[抓狂\\]': '😫',
                '\\[吐\\]': '🤮',
                '\\[偷笑\\]': '🤭',
                '\\[可爱\\]': '🥰',
                '\\[白眼\\]': '🙄',
                '\\[傲慢\\]': '😤',
                '\\[饥饿\\]': '🤤',
                '\\[困\\]': '😪',
                '\\[惊恐\\]': '😱',
                '\\[流汗\\]': '😓',
                '\\[憨笑\\]': '😄',
                '\\[大兵\\]': '💂',
                '\\[奋斗\\]': '💪',
                '\\[咒骂\\]': '🤬',
                '\\[疑问\\]': '❓',
                '\\[嘘\\]': '🤫',
                '\\[晕\\]': '😵',
                '\\[折磨\\]': '😫',
                '\\[衰\\]': '😞',
                '\\[骷髅\\]': '💀',
                '\\[敲打\\]': '🔨',
                '\\[再见\\]': '👋',
                '\\[擦汗\\]': '😓',
                '\\[抠鼻\\]': '🤏',
                '\\[鼓掌\\]': '👏',
                '\\[糗大了\\]': '😳',
                '\\[坏笑\\]': '😏',
                '\\[左哼哼\\]': '😤',
                '\\[右哼哼\\]': '😤',
                '\\[哈欠\\]': '🥱',
                '\\[鄙视\\]': '😒',
                '\\[委屈\\]': '🥺',
                '\\[快哭了\\]': '😢',
                '\\[阴险\\]': '😈',
                '\\[亲亲\\]': '😘',
                '\\[吓\\]': '😨',
                '\\[可怜\\]': '🥺',
                '\\[菜刀\\]': '🔪',
                '\\[西瓜\\]': '🍉',
                '\\[啤酒\\]': '🍺',
                '\\[篮球\\]': '🏀',
                '\\[乒乓\\]': '🏓',
                '\\[咖啡\\]': '☕',
                '\\[饭\\]': '🍚',
                '\\[猪头\\]': '🐷',
                '\\[玫瑰\\]': '🌹',
                '\\[凋谢\\]': '🥀',
                '\\[示爱\\]': '❤️',
                '\\[爱心\\]': '❤️',
                '\\[心碎\\]': '💔',
                '\\[蛋糕\\]': '🎂',
                '\\[闪电\\]': '⚡',
                '\\[炸弹\\]': '💣',
                '\\[刀\\]': '🗡️',
                '\\[足球\\]': '⚽',
                '\\[瓢虫\\]': '🐞',
                '\\[便便\\]': '💩',
                '\\[月亮\\]': '🌙',
                '\\[太阳\\]': '☀️',
                '\\[礼物\\]': '🎁',
                '\\[拥抱\\]': '🤗',
                '\\[强\\]': '👍',
                '\\[弱\\]': '👎',
                '\\[握手\\]': '🤝',
                '\\[胜利\\]': '✌️',
                '\\[抱拳\\]': '🙏',
                '\\[勾引\\]': '👉',
                '\\[拳头\\]': '👊',
                '\\[差劲\\]': '👎',
                '\\[爱你\\]': '🤟',
                '\\[NO\\]': '🙅',
                '\\[OK\\]': '👌',
                '\\[爱情\\]': '💕',
                '\\[飞吻\\]': '💋',
                '\\[跳跳\\]': '💃',
                '\\[发抖\\]': '🫨',
                '\\[怄火\\]': '🤬',
                '\\[转圈\\]': '🔄',
                '\\[磕头\\]': '🙇',
                '\\[回头\\]': '🔙',
                '\\[跳绳\\]': '🏃',
                '\\[挥手\\]': '👋',
                '\\[激动\\]': '🤩',
                '\\[街舞\\]': '🕺',
                '\\[献吻\\]': '😘',
                '\\[左太极\\]': '🥋',
                '\\[右太极\\]': '🥋'
            };

            for (const [pattern, emoji] of Object.entries(emojiPatterns)) {
                const regex = new RegExp(pattern, 'g');
                formatted = formatted.replace(regex, emoji);
            }

            return formatted;
        },

        formatTime(timestamp: number): string {
            if (!timestamp) return '';
            const date = new Date(timestamp);
            const now = new Date();
            
            if (date.toDateString() === now.toDateString()) {
                return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
            } else {
                return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
            }
        },

        onScroll(event: any) {
        },

        async clearAllData() {
            const sessions = database.getChatSessions();
            for (const session of sessions) {
                await database.deleteChatSession(session.id);
            }
            await database.updateQQConfig({
                enabled: false,
                serverUrl: '',
                accessToken: '',
                userId: ''
            });
            this.isConfigured = false;
            this.showSettings = false;
            this.sessions = [];
            this.currentSession = null;
            this.showToast('数据已清除');
        },

        showToast(message: string) {
            $falcon.trigger('toast:show', { message, duration: 2000 });
        }
    }
});

export default qqchat;
