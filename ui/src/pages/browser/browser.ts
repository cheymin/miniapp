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
            history: [] as Array<{ url: string; title: string; time: string }>,
            bookmarks: [] as Array<{ url: string; title: string; time: string }>
        };
    },

    async mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on("backpressed", this.handleBackPress);
        await this.loadHistory();
        await this.loadBookmarks();
    },
    
    beforeDestroy() {
        this.$page.$npage.off("backpressed", this.handleBackPress);
    },

    methods: {
        handleBackPress() {
            $falcon.navBack();
        },
        
        inputUrl() {
            openSoftKeyboard(
                () => this.currentUrl,
                (value: string) => {
                    this.currentUrl = value;
                },
                (value) => {
                    if (value && !this.isValidUrl(value)) {
                        return '请输入有效的网址';
                    }
                    return undefined;
                }
            );
        },
        
        isValidUrl(url: string): boolean {
            try {
                const urlObj = new URL(this.normalizeUrl(url));
                return true;
            } catch {
                return false;
            }
        },
        
        normalizeUrl(url: string): string {
            if (!url) return '';
            
            url = url.trim();
            
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            
            return url;
        },
        
        async copyUrl() {
            if (!this.currentUrl) {
                showError('请输入网址');
                return;
            }
            
            const normalizedUrl = this.normalizeUrl(this.currentUrl);
            
            if (!this.isValidUrl(normalizedUrl)) {
                showError('请输入有效的网址');
                return;
            }
            
            try {
                this.addToHistory(normalizedUrl);
                showSuccess(`已复制: ${normalizedUrl}`);
            } catch (error: any) {
                console.error('复制失败:', error);
                showError('复制失败: ' + error.message);
            }
        },
        
        async saveToBookmarks() {
            if (!this.currentUrl) {
                showError('请输入网址');
                return;
            }
            
            const normalizedUrl = this.normalizeUrl(this.currentUrl);
            
            if (!this.isValidUrl(normalizedUrl)) {
                showError('请输入有效的网址');
                return;
            }
            
            const existingIndex = this.bookmarks.findIndex(item => item.url === normalizedUrl);
            if (existingIndex !== -1) {
                showInfo('该网址已在收藏中');
                return;
            }
            
            const now = new Date();
            const time = now.toLocaleString();
            
            this.bookmarks.unshift({
                url: normalizedUrl,
                title: this.extractTitle(normalizedUrl),
                time
            });
            
            await this.saveBookmarks();
            showSuccess('已收藏: ' + normalizedUrl);
        },
        
        copyQuickLink(url: string) {
            this.currentUrl = url;
            this.addToHistory(url);
            showSuccess(`已复制: ${url}`);
        },
        
        copyHistoryUrl(url: string) {
            this.currentUrl = url;
            showSuccess(`已复制: ${url}`);
        },
        
        deleteHistory(index: number) {
            if (index >= 0 && index < this.history.length) {
                this.history.splice(index, 1);
                this.saveHistory();
                showSuccess('已删除');
            }
        },
        
        deleteBookmark(index: number) {
            if (index >= 0 && index < this.bookmarks.length) {
                this.bookmarks.splice(index, 1);
                this.saveBookmarks();
                showSuccess('已删除收藏');
            }
        },
        
        async clearBookmarks() {
            this.bookmarks = [];
            await this.saveBookmarks();
            showSuccess('已清空收藏');
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
        },
        
        async loadBookmarks() {
            try {
                const data = await $falcon.storage.get('browser_bookmarks');
                if (data) {
                    this.bookmarks = JSON.parse(data);
                }
            } catch (error) {
                console.error('加载收藏失败:', error);
            }
        },
        
        async saveBookmarks() {
            try {
                await $falcon.storage.set('browser_bookmarks', JSON.stringify(this.bookmarks));
            } catch (error) {
                console.error('保存收藏失败:', error);
            }
        }
    }
});

export default browser;
