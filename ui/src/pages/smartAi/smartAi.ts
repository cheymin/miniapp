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
import { showError, showSuccess } from '../../components/ToastMessage';
import { openSoftKeyboard } from '../../utils/softKeyboardUtils';

export type SmartAiOptions = {};

const DB_PATH = '/userdisk/database/smart_ai.json';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface Config {
    apiUrl: string;
    apiKey: string;
    model: string;
    messages: Message[];
}

const smartAi = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<SmartAiOptions>,
            messages: [] as Message[],
            inputText: '' as string,
            isThinking: false as boolean,
            showSettings: false as boolean,
            apiUrl: '' as string,
            apiKey: '' as string,
            model: 'gpt-3.5-turbo' as string
        };
    },

    async mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on("backpressed", this.handleBackPress);
        await this.loadConfig();
    },

    beforeDestroy() {
        this.$page.$npage.off("backpressed", this.handleBackPress);
    },

    methods: {
        handleBackPress() {
            if (this.showSettings) {
                this.showSettings = false;
            } else {
                $falcon.navBack();
            }
        },

        async loadConfig() {
            try {
                const data = await $falcon.storage.get(DB_PATH);
                if (data) {
                    const config: Config = JSON.parse(data);
                    this.apiUrl = config.apiUrl || '';
                    this.apiKey = config.apiKey || '';
                    this.model = config.model || 'gpt-3.5-turbo';
                    this.messages = config.messages || [];
                }
            } catch (e) {
                console.error('Load config failed:', e);
            }
        },

        async saveConfig() {
            try {
                const config: Config = {
                    apiUrl: this.apiUrl,
                    apiKey: this.apiKey,
                    model: this.model,
                    messages: this.messages
                };
                await $falcon.storage.set(DB_PATH, JSON.stringify(config));
            } catch (e) {
                console.error('Save config failed:', e);
            }
        },

        openInput() {
            openSoftKeyboard(
                () => this.inputText,
                (value: string) => {
                    this.inputText = value;
                }
            );
        },

        async sendMessage() {
            if (!this.inputText.trim() || this.isThinking) return;

            if (!this.apiUrl || !this.apiKey) {
                showError('Please set API URL and Key');
                this.showSettings = true;
                return;
            }

            const userMessage: Message = {
                role: 'user',
                content: this.inputText.trim()
            };
            this.messages.push(userMessage);
            this.inputText = '';
            this.isThinking = true;

            try {
                const response = await this.callAI();
                const assistantMessage: Message = {
                    role: 'assistant',
                    content: response
                };
                this.messages.push(assistantMessage);
                await this.saveConfig();
            } catch (e: any) {
                showError('Request failed: ' + (e.message || 'Unknown error'));
            } finally {
                this.isThinking = false;
            }
        },

        async callAI(): Promise<string> {
            const messages = this.messages.map(m => ({
                role: m.role,
                content: m.content
            }));

            const response = await $falcon.jsapi.http.request({
                url: this.apiUrl,
                method: 'POST',
                header: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this.apiKey
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: messages,
                    max_tokens: 1000
                })
            });

            let result: any = {};
            if (typeof response === 'string') {
                result = JSON.parse(response);
            } else if (response.result) {
                result = typeof response.result === 'string' ? JSON.parse(response.result) : response.result;
            } else if (response.data) {
                result = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
            }

            if (result.error) {
                throw new Error(result.error.message || 'API error');
            }

            return result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content ? result.choices[0].message.content : 'No response';
        },

        editApiUrl() {
            openSoftKeyboard(
                () => this.apiUrl || 'https://api.openai.com/v1/chat/completions',
                (value: string) => {
                    this.apiUrl = value.trim();
                }
            );
        },

        editApiKey() {
            openSoftKeyboard(
                () => this.apiKey,
                (value: string) => {
                    this.apiKey = value.trim();
                }
            );
        },

        editModel() {
            openSoftKeyboard(
                () => this.model,
                (value: string) => {
                    this.model = value.trim();
                }
            );
        },

        async clearHistory() {
            this.messages = [];
            await this.saveConfig();
            showSuccess('Cleared');
        },

        async saveSettings() {
            await this.saveConfig();
            showSuccess('Saved');
            this.showSettings = false;
        }
    }
});

export default smartAi;
