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
import { showError } from '../../components/ToastMessage';
import { openSoftKeyboard } from '../../utils/softKeyboardUtils';

export type MinAiOptions = {};

const minAi = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<MinAiOptions>,
            messages: [] as Array<{ role: string; content: string }>,
            currentInput: '' as string,
            isGenerating: false as boolean,
            streamingContent: '' as string,
            aiInitialized: false as boolean
        };
    },

    mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on("backpressed", () => { $falcon.navBack(); });
        try {
            AI.initialize();
            this.aiInitialized = true;
            AI.on('ai_stream', (data: string) => {
                this.streamingContent += data;
            });
        } catch (e) {
            showError('AI 初始化失败');
        }
    },

    methods: {
        openInput() {
            if (this.isGenerating) return;
            openSoftKeyboard(
                () => this.currentInput,
                (value: string) => { this.currentInput = value; }
            );
        },

        async sendMessage() {
            if (!this.aiInitialized || this.isGenerating || !this.currentInput.trim()) return;

            const userMsg = this.currentInput.trim();
            this.messages.push({ role: 'user', content: userMsg });
            this.currentInput = '';
            this.streamingContent = '';
            this.isGenerating = true;

            try {
                await AI.addUserMessage(userMsg);
                await AI.generateResponse();
            } catch (e) {
                showError('生成响应失败');
            } finally {
                this.isGenerating = false;
                const aiContent = this.streamingContent || '（无响应）';
                this.messages.push({ role: 'ai', content: aiContent });
                this.streamingContent = '';
            }
        },

        stopGeneration() {
            if (!this.isGenerating) return;
            AI.stopGeneration();
            setTimeout(() => {
                this.isGenerating = false;
                if (this.streamingContent) {
                    this.messages.push({ role: 'ai', content: this.streamingContent });
                }
                this.streamingContent = '';
            }, 100);
        },

        clearChat() {
            this.messages = [];
            this.streamingContent = '';
            this.isGenerating = false;
        }
    }
});

export default minAi;
