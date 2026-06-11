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
import { AI } from 'langningchen';
import { showError, showSuccess } from '../../components/ToastMessage';
import { openSoftKeyboard } from '../../utils/softKeyboardUtils';

export type DbAiOptions = {};

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

const DB_KEY = 'dbai_messages';

export default defineComponent({
    data() {
        return {
            $page: {} as FalconPage<DbAiOptions>,
            messages: [] as Message[],
            inputText: '' as string,
            isGenerating: false as boolean,
            streamingText: '' as string,
            aiInitialized: false as boolean
        };
    },

    mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on("backpressed", () => { $falcon.navBack(); });

        // 加载历史消息
        this.loadMessages();

        // 初始化AI
        try {
            AI.initialize();
            this.aiInitialized = true;
            
            AI.on('ai_stream', (data: string) => {
                this.streamingText += data;
            });
        } catch (e) {
            console.error('AI初始化错误:', e);
        }
    },

    methods: {
        // 加载消息
        async loadMessages() {
            try {
                const data = await $falcon.storage.get(DB_KEY);
                if (data) {
                    this.messages = JSON.parse(data);
                }
            } catch (e) {
                console.error('加载消息失败:', e);
            }
        },

        // 保存消息
        async saveMessages() {
            try {
                await $falcon.storage.set(DB_KEY, JSON.stringify(this.messages));
            } catch (e) {
                console.error('保存消息失败:', e);
            }
        },

        // 打开软键盘
        openKeyboard() {
            if (this.isGenerating) return;
            
            openSoftKeyboard(
                () => this.inputText,
                (value: string) => {
                    this.inputText = value;
                }
            );
        },

        // 发送消息
        async sendMsg() {
            if (!this.aiInitialized) {
                showError('AI未初始化');
                return;
            }

            if (this.isGenerating) return;
            
            const text = this.inputText.trim();
            if (!text) return;

            // 添加用户消息
            const userMsg: Message = {
                role: 'user',
                content: text,
                timestamp: Date.now()
            };
            this.messages.push(userMsg);
            this.inputText = '';
            this.streamingText = '';
            this.isGenerating = true;

            // 保存消息
            await this.saveMessages();

            try {
                // 调用AI
                await AI.addUserMessage(text);
                await AI.generateResponse();
                
                // 添加AI回复
                const aiMsg: Message = {
                    role: 'assistant',
                    content: this.streamingText || '（无响应）',
                    timestamp: Date.now()
                };
                this.messages.push(aiMsg);
                
                // 保存消息
                await this.saveMessages();
                
            } catch (e) {
                showError('生成响应失败');
                console.error('AI生成错误:', e);
            } finally {
                this.isGenerating = false;
                this.streamingText = '';
            }
        },

        // 停止生成
        stopGen() {
            if (!this.isGenerating) return;
            
            AI.stopGeneration();
            
            setTimeout(async () => {
                this.isGenerating = false;
                
                // 如果有部分内容，保存为回复
                if (this.streamingText) {
                    const aiMsg: Message = {
                        role: 'assistant',
                        content: this.streamingText,
                        timestamp: Date.now()
                    };
                    this.messages.push(aiMsg);
                    await this.saveMessages();
                }
                
                this.streamingText = '';
            }, 100);
        },

        // 清空历史
        async clearHistory() {
            this.messages = [];
            this.streamingText = '';
            this.isGenerating = false;
            
            await $falcon.storage.remove(DB_KEY);
            
            showSuccess('历史已清空');
        }
    }
});
