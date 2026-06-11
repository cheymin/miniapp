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
import { showError, showSuccess, showInfo } from '../../components/ToastMessage';
import { openSoftKeyboard } from '../../utils/softKeyboardUtils';

export type DbAiOptions = {};

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

interface DbData {
    messages: Message[];
    settings: {
        model: string;
        temperature: number;
    };
}

const DB_PATH = '/userdisk/min/db';
const DB_FILE = DB_PATH + '/dbai.db';

const DEFAULT_DATA: DbData = {
    messages: [],
    settings: {
        model: 'default',
        temperature: 0.7
    }
};

export default defineComponent({
    data() {
        return {
            $page: {} as FalconPage<DbAiOptions>,
            messages: [] as Message[],
            inputText: '' as string,
            isGenerating: false as boolean,
            streamingText: '' as string,
            aiInitialized: false as boolean,
            dbData: null as DbData | null
        };
    },

    async mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on("backpressed", () => { $falcon.navBack(); });

        // 加载DB数据
        await this.loadFromDB();

        // 初始化AI
        try {
            AI.initialize();
            this.aiInitialized = true;
            
            AI.on('ai_stream', (data: string) => {
                this.streamingText += data;
            });
        } catch (e) {
            showError('AI初始化失败');
            console.error('AI初始化错误:', e);
        }
    },

    methods: {
        // 从DB文件加载数据
        async loadFromDB() {
            try {
                const data = await this.readDB();
                if (data) {
                    this.dbData = JSON.parse(data);
                    this.messages = this.dbData?.messages || [];
                } else {
                    this.dbData = { ...DEFAULT_DATA };
                    this.messages = [];
                }
            } catch (e) {
                console.error('加载DB失败:', e);
                this.dbData = { ...DEFAULT_DATA };
                this.messages = [];
            }
        },

        // 保存数据到DB文件
        async saveToDB() {
            try {
                if (!this.dbData) {
                    this.dbData = { ...DEFAULT_DATA };
                }
                this.dbData.messages = this.messages;
                await this.writeDB(JSON.stringify(this.dbData));
            } catch (e) {
                console.error('保存DB失败:', e);
            }
        },

        // 读取DB文件
        async readDB(): Promise<string> {
            try {
                const result = await $falcon.storage.read(DB_FILE);
                return result || '';
            } catch (e) {
                return '';
            }
        },

        // 写入DB文件
        async writeDB(data: string) {
            try {
                // 确保目录存在
                try {
                    await $falcon.storage.mkdir(DB_PATH);
                } catch (e) {
                    // 目录可能已存在
                }
                await $falcon.storage.write(DB_FILE, data);
            } catch (e) {
                console.error('写入DB失败:', e);
                throw e;
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

            // 保存到DB
            await this.saveToDB();

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
                
                // 保存到DB
                await this.saveToDB();
                
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
                    await this.saveToDB();
                }
                
                this.streamingText = '';
            }, 100);
        },

        // 清空历史
        async clearHistory() {
            this.messages = [];
            this.streamingText = '';
            this.isGenerating = false;
            
            // 清空DB
            this.dbData = { ...DEFAULT_DATA };
            await this.saveToDB();
            
            showSuccess('历史已清空');
        }
    }
});
