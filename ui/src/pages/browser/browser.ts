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
import { showError, showSuccess, showInfo } from '../../components/ToastMessage';
import { openSoftKeyboard } from '../../utils/softKeyboardUtils';

export type BrowserOptions = {};

const browser = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<BrowserOptions>,
            
            currentUrl: '' as string,
            history: [] as Array<{ url: string; title: string; time: string }>
        };
    },

    async mounted() {
        await this.loadHistory();
    },

    methods: {
        inputUrl() {
            openSoftKeyboard(
                () => this.currentUrl,
                (value: string) => {
                    this.currentUrl = value;
                }
            );
        },
        
        normalizeUrl(url: string): string {
            if (!url) return '';
            
            url = url.trim();
            
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            
            return url;
        },
        
        async goToUrl(url?: string) {
            const targetUrl = url || this.currentUrl;
            
            if (!targetUrl) {
                showError('请输入网址');
                return;
            }
            
            const normalizedUrl = this.normalizeUrl(targetUrl);
            
            try {
                showInfo(`正在打开: ${normalizedUrl}`);
                
                $falcon.trigger('open_url', normalizedUrl);
                
                this.addToHistory(normalizedUrl);
                
                this.currentUrl = normalizedUrl;
                
            } catch (error: any) {
                console.error('打开网页失败:', error);
                showError('打开网页失败: ' + error.message);
            }
        },
        
        goToQuickLink(url: string) {
            this.currentUrl = url;
            this.goToUrl(url);
        },
        
        addToHistory(url: string) {
            const now = new Date();
            const time = now.toLocaleString();
            
            const existingIndex = this.history.findIndex(item => item.url === url);
            if (existingIndex !== -1) {
                this.history.splice(existingIndex, 1);
            }
            
            this.history.unshift({
                url,
                title: this.extractTitle(url),
                time
            });
            
            if (this.history.length > 20) {
                this.history.pop();
            }
            
            this.saveHistory();
        },
        
        extractTitle(url: string): string {
            try {
                const urlObj = new URL(url);
                return urlObj.hostname;
            } catch {
                return url;
            }
        },
        
        async loadHistory() {
            try {
                const data = await $falcon.storage.get('browser_history');
                if (data) {
                    this.history = JSON.parse(data);
                }
            } catch (error) {
                console.error('加载浏览历史失败:', error);
            }
        },
        
        async saveHistory() {
            try {
                await $falcon.storage.set('browser_history', JSON.stringify(this.history));
            } catch (error) {
                console.error('保存浏览历史失败:', error);
            }
        }
    }
});

export default browser;
