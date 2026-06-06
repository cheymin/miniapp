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

export type BrowserOptions = {
    url?: string;
};

const browser = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<BrowserOptions>,
            currentUrl: '' as string,
            showMenuPanel: false as boolean,
            bookmarks: [] as Array<{ url: string; title: string }>
        };
    },

    async mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on("backpressed", this.handleBackPress);
        await this.loadBookmarks();

        const options = this.$page.loadOptions;
        if (options.url) {
            this.currentUrl = options.url;
        }
    },

    beforeDestroy() {
        this.$page.$npage.off("backpressed", this.handleBackPress);
    },

    methods: {
        handleBackPress() {
            if (this.showMenuPanel) {
                this.showMenuPanel = false;
            } else {
                $falcon.navBack();
            }
        },

        goBack() {
            $falcon.navBack();
        },

        toggleMenu() {
            this.showMenuPanel = !this.showMenuPanel;
        },

        goHome() {
            this.currentUrl = '';
            this.showMenuPanel = false;
        },

        refresh() {
            if (!this.currentUrl) return;
            const url = this.currentUrl;
            this.currentUrl = '';
            this.$nextTick(() => {
                this.currentUrl = url;
            });
            this.showMenuPanel = false;
        },

        inputUrl() {
            openSoftKeyboard(
                () => this.currentUrl || 'https://',
                (value: string) => {
                    if (value) {
                        this.loadUrl(value);
                    }
                }
            );
        },

        loadUrl(url: string) {
            if (!url) return;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            this.currentUrl = url;
            this.showMenuPanel = false;
        },

        onNavigate(href: string) {
            console.log('导航到:', href);
        },

        shortenUrl(url: string): string {
            try {
                const urlObj = new URL(url);
                let path = urlObj.pathname;
                if (path.length > 15) path = path.substring(0, 12) + '...';
                return urlObj.hostname + path;
            } catch {
                return url.length > 20 ? url.substring(0, 17) + '...' : url;
            }
        },

        async addToBookmarks() {
            if (!this.currentUrl) {
                showError('当前没有加载网页');
                return;
            }

            const exists = this.bookmarks.some(b => b.url === this.currentUrl);
            if (exists) {
                showInfo('该网址已在收藏中');
                return;
            }

            const title = this.extractTitle(this.currentUrl);
            this.bookmarks.push({ url: this.currentUrl, title });
            await this.saveBookmarks();
            showSuccess('已添加到收藏');
        },

        async deleteBookmark(index: number) {
            this.bookmarks.splice(index, 1);
            await this.saveBookmarks();
            showSuccess('已删除');
        },

        extractTitle(url: string): string {
            try {
                const urlObj = new URL(url);
                return urlObj.hostname.replace('www.', '').replace('m.', '');
            } catch {
                return url;
            }
        },

        async loadBookmarks() {
            try {
                const data = await $falcon.storage.get('browser_bookmarks');
                if (data) {
                    this.bookmarks = JSON.parse(data);
                }
            } catch (e) {
                console.error('加载收藏失败:', e);
            }
        },

        async saveBookmarks() {
            try {
                await $falcon.storage.set('browser_bookmarks', JSON.stringify(this.bookmarks));
            } catch (e) {
                console.error('保存收藏失败:', e);
            }
        }
    }
});

export default browser;
