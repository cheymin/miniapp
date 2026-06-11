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

interface BookmarkItem {
    url: string;
    title: string;
    time: string;
}

const browser = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<BrowserOptions>,
            currentUrl: '' as string,
            showInputPanel: false as boolean,
            showMenu: false as boolean,
            showBookmarks: false as boolean,
            bookmarks: [] as BookmarkItem[]
        };
    },

    computed: {
        displayUrl(): string {
            if (!this.currentUrl) return '点击输入网址';
            try {
                const url = new URL(this.currentUrl);
                return url.hostname;
            } catch {
                return this.currentUrl.substring(0, 20);
            }
        }
    },

    async mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on("backpressed", this.handleBackPress);
        await this.loadBookmarks();
    },

    beforeDestroy() {
        this.$page.$npage.off("backpressed", this.handleBackPress);
    },

    methods: {
        handleBackPress() {
            if (this.showInputPanel) {
                this.showInputPanel = false;
                return;
            }
            if (this.showMenu) {
                this.showMenu = false;
                return;
            }
            if (this.showBookmarks) {
                this.showBookmarks = false;
                return;
            }
            if (this.currentUrl) {
                this.currentUrl = '';
                return;
            }
            $falcon.navBack();
        },

        inputUrl() {
            openSoftKeyboard(
                () => this.currentUrl,
                (value: string) => {
                    this.currentUrl = value;
                }
            );
        },

        loadUrl(url: string) {
            if (!url) return;
            let normalizedUrl = url.trim();
            if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
                normalizedUrl = 'http://' + normalizedUrl;
            }
            this.currentUrl = normalizedUrl;
            this.showInputPanel = false;
            this.showMenu = false;
            this.showBookmarks = false;
        },

        goToUrl() {
            if (!this.currentUrl.trim()) {
                showError('请输入网址');
                return;
            }
            this.loadUrl(this.currentUrl);
        },

        goBack() {
            if (this.currentUrl) {
                this.currentUrl = '';
            }
        },

        goHome() {
            this.currentUrl = '';
            this.showMenu = false;
        },

        refresh() {
            if (this.currentUrl) {
                // 触发重新加载
                const tempUrl = this.currentUrl;
                this.currentUrl = '';
                this.$nextTick(() => {
                    this.currentUrl = tempUrl;
                });
            }
            this.showMenu = false;
        },

        toggleMenu() {
            this.showMenu = !this.showMenu;
            if (this.showMenu) {
                this.showInputPanel = false;
                this.showBookmarks = false;
            }
        },

        showBookmarksList() {
            this.showBookmarks = true;
            this.showMenu = false;
        },

        onNavigate(href: string) {
            console.log('Navigate to:', href);
        },

        async addBookmark() {
            if (!this.currentUrl) {
                showError('请先访问网页');
                return;
            }

            const existingIndex = this.bookmarks.findIndex(item => item.url === this.currentUrl);
            if (existingIndex !== -1) {
                showInfo('该网页已收藏');
                return;
            }

            const now = new Date();
            const time = now.toLocaleString();

            let title = this.currentUrl;
            try {
                const url = new URL(this.currentUrl);
                title = url.hostname;
            } catch {
                // use full URL as title
            }

            this.bookmarks.unshift({
                url: this.currentUrl,
                title: title,
                time: time
            });

            await this.saveBookmarks();
            showSuccess('已收藏');
        },

        async deleteBookmark(index: number) {
            if (index >= 0 && index < this.bookmarks.length) {
                this.bookmarks.splice(index, 1);
                await this.saveBookmarks();
                showSuccess('已删除');
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
