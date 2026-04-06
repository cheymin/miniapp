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
import { showError } from '../../components/ToastMessage';
import { showLoading, hideLoading } from '../../components/Loading';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

const ASTRBOT_API_URL = 'https://bot.346247.xyz/api/v1/chat';
const ASTRBOT_API_KEY = 'Bearer abk_0lbfCj4GaJBMQgfkWlMwtmZ0nZchssezZG7fPkrG8Bo';

const chat = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<{}>,
            
            messages: [] as Message[],
            inputText: '' as string,
            isStreaming: false as boolean,
            sessionId: '' as string,
            username: 'user' as string,
            
            scroller: null as any
        };
    },

    async mounted() {
        this.$page.$npage.on("backpressed", this.handleBackPress);
        this.sessionId = this.generateSessionId();
        this.addWelcomeMessage();
    },
    
    beforeDestroy() {
        this.$page.$npage.off("backpressed", this.handleBackPress);
    },

    methods: {
        handleBackPress() {
            this.$page.finish();
        },
        
        generateSessionId(): string {
            return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        },
        
        addWelcomeMessage() {
            this.messages.push({
                role: 'assistant',
                content: '你好！我是AI助手，有什么可以帮助你的吗？',
                timestamp: Date.now()
            });
        },
        
        async sendMessage() {
            const text = this.inputText.trim();
            if (!text || this.isStreaming) return;
            
            this.messages.push({
                role: 'user',
                content: text,
                timestamp: Date.now()
            });
            
            this.inputText = '';
            this.isStreaming = true;
            
            const assistantMessage: Message = {
                role: 'assistant',
                content: '',
                timestamp: Date.now()
            };
            this.messages.push(assistantMessage);
            
            try {
                await this.callAstrBotAPI(text, assistantMessage);
            } catch (error: any) {
                console.error('调用API失败:', error);
                assistantMessage.content = '抱歉，发生了错误：' + (error.message || '未知错误');
                showError('发送消息失败');
            } finally {
                this.isStreaming = false;
            }
        },
        
        async callAstrBotAPI(message: string, assistantMessage: Message) {
            try {
                const response = await $falcon.jsapi.http.request({
                    url: ASTRBOT_API_URL,
                    method: 'POST',
                    headers: {
                        'Authorization': ASTRBOT_API_KEY,
                        'Content-Type': 'application/json',
                        'Accept': 'text/event-stream'
                    },
                    data: {
                        username: this.username,
                        session_id: this.sessionId,
                        message: message,
                        enable_streaming: true
                    },
                    timeout: 60000
                });
                
                if (response.statusCode === 200) {
                    const data = response.data;
                    
                    if (typeof data === 'string') {
                        const lines = data.split('\n');
                        let fullContent = '';
                        
                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const jsonStr = line.substring(6).trim();
                                if (jsonStr && jsonStr !== '[DONE]') {
                                    try {
                                        const json = JSON.parse(jsonStr);
                                        if (json.choices && json.choices[0] && json.choices[0].delta) {
                                            const content = json.choices[0].delta.content || '';
                                            fullContent += content;
                                        }
                                    } catch (e) {
                                        console.log('解析SSE行失败:', e);
                                    }
                                }
                            }
                        }
                        
                        assistantMessage.content = fullContent || '收到回复但无法解析内容';
                    } else if (typeof data === 'object') {
                        assistantMessage.content = data.completion_text || data.message || JSON.stringify(data);
                    } else {
                        assistantMessage.content = '收到非预期格式的回复';
                    }
                } else {
                    throw new Error(`HTTP ${response.statusCode}: ${response.statusText || '请求失败'}`);
                }
            } catch (error: any) {
                console.error('API调用错误:', error);
                throw error;
            }
        },
        
        formatTime(timestamp: number): string {
            const date = new Date(timestamp);
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
        },
        
        scrollToBottom() {
            if (this.scroller) {
                this.scroller.scrollToEnd();
            }
        },
        
        clearChat() {
            this.messages = [];
            this.sessionId = this.generateSessionId();
            this.addWelcomeMessage();
        }
    }
});

export default chat;
