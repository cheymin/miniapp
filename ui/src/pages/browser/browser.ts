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
            showMenu: false as boolean,
            showInputPanel: false as boolean,
            showBookmarks: false as boolean,
            bookmarks: [] as Array<{ url: string; title: string }>
        };
    },

    computed: {
        displayUrl(): string {
            if (!this.currentUrl) return '输入网址';
            try {
                const urlObj = new URL(this.currentUrl);
                let path = urlObj.pathname;
                if (path.length > 12) path = path.substring(0, 10) + '...';
                return urlObj.hostname + path;
            } catch {
                return this.currentUrl.length > 18 ? this.currentUrl.substring(0, 16) + '...' : this.currentUrl;
            }
        }
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
            if (this.showMenu) {
                this.showMenu = false;
            } else if (this.showInputPanel) {
                this.showInputPanel = false;
            } else if (this.showBookmarks) {
                this.showBookmarks = false;
            } else {
                $falcon.navBack();
            }
        },

        goBack() {
            $falcon.navBack();
        },

        toggleMenu() {
            this.showMenu = !this.showMenu;
            this.showInputPanel = false;
            this.showBookmarks = false;
        },

        goHome() {
            this.currentUrl = '';
            this.showMenu = false;
        },

        refresh() {
            if (!this.currentUrl) return;
            const url = this.currentUrl;
            this.currentUrl = '';
            this.$nextTick(() => {
                this.currentUrl = url;
            });
            this.showMenu = false;
        },

        inputUrl() {
            openSoftKeyboard(
                () => this.currentUrl || 'https://',
                (value: string) => {
                    this.currentUrl = value;
                }
            );
        },

        goToUrl() {
            if (!this.currentUrl) {
                showError('请输入网址');
                return;
            }
            let url = this.currentUrl.trim();
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            this.currentUrl = url;
            this.showInputPanel = false;
        },

        loadUrl(url: string) {
            this.currentUrl = url;
            this.showMenu = false;
            this.showInputPanel = false;
            this.showBookmarks = false;
        },

        onNavigate(href: string) {
            console.log('导航到:', href);
        },

        showBookmarksList() {
            this.showBookmarks = true;
            this.showMenu = false;
        },

        async addBookmark() {
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
