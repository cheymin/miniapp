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
import { Bilibili } from 'langningchen';
import type { BiliSearchItem } from 'langningchen';
import { showError, showSuccess, showInfo } from '../../components/ToastMessage';
import { hideLoading, showLoading } from '../../components/Loading';
import { openSoftKeyboard } from '../../utils/softKeyboardUtils';
import { formatDuration, formatPlayCount, formatDate } from '../../utils/biliUtils';

export type biliOptions = {};

const DEFAULT_RANK_RID = 0;
const PAGE_SIZE = 20;

const bili = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<biliOptions>,

            activeTab: 'rank' as 'rank' | 'search' | 'fav' | 'downloads',

            // 排行榜
            rankItems: [] as BiliSearchItem[],
            rankRid: 0,
            rankLoading: false,
            rankRidOptions: [
                { rid: 0, name: '全站' },
                { rid: 1, name: '动画' },
                { rid: 3, name: '音乐' },
                { rid: 4, name: '游戏' },
                { rid: 5, name: '娱乐' },
                { rid: 36, name: '科技' },
                { rid: 119, name: '鬼畜' },
                { rid: 155, name: '时尚' },
                { rid: 181, name: '影视' },
            ],
            rankRidMenuOpen: false,

            // 搜索
            searchKeyword: '',
            searchResults: [] as BiliSearchItem[],
            searchPage: 1,
            searchTotal: 0,
            searchLoading: false,

            // 收藏夹
            favFolders: [] as { id: string; title: string }[],
            favItems: [] as any[],
            activeFavId: '',
            favLoading: false,
            isLoggedIn: false,

            // 下载列表
            downloads: [] as { name: string; path: string }[],

            // 下载进度
            downloadingBvid: '',
            downloadProgress: 0,
            downloadStatus: '',
        };
    },

    computed: {
        rankRidName(): string {
            const opt = this.rankRidOptions.find((o) => o.rid === this.rankRid);
            return opt ? opt.name : '全站';
        },
    },

    mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on('backpressed', () => {
            if (this.rankRidMenuOpen) {
                this.rankRidMenuOpen = false;
                return false;
            }
            return true;
        });

        this.isLoggedIn = Bilibili.isLoggedIn();
        this.loadRanking();
    },

    methods: {
        switchTab(tab: 'rank' | 'search' | 'fav' | 'downloads') {
            this.activeTab = tab;
            if (tab === 'rank' && this.rankItems.length === 0) this.loadRanking();
            if (tab === 'fav') {
                this.isLoggedIn = Bilibili.isLoggedIn();
                if (this.isLoggedIn && this.favFolders.length === 0) this.loadFavFolders();
            }
            if (tab === 'downloads') this.loadDownloads();
        },

        // ===== 排行榜 =====
        loadRanking() {
            this.rankLoading = true;
            showLoading();
            Bilibili.getRanking(this.rankRid, 50).then((items) => {
                this.rankItems = items;
            }).catch((e) => {
                showError(e as string || '加载排行榜失败');
            }).finally(() => {
                this.rankLoading = false;
                hideLoading();
            });
        },

        toggleRankRidMenu() { this.rankRidMenuOpen = !this.rankRidMenuOpen; },

        selectRankRid(rid: number) {
            this.rankRid = rid;
            this.rankRidMenuOpen = false;
            this.loadRanking();
        },

        // ===== 搜索 =====
        editSearchKeyword() {
            openSoftKeyboard(
                () => this.searchKeyword,
                (value) => {
                    this.searchKeyword = value.trim();
                    this.$forceUpdate();
                    if (this.searchKeyword) {
                        this.searchPage = 1;
                        this.doSearch();
                    }
                }
            );
        },

        doSearch() {
            if (!this.searchKeyword) return;
            this.searchLoading = true;
            showLoading();
            Bilibili.search(this.searchKeyword, this.searchPage, PAGE_SIZE).then((items) => {
                if (this.searchPage === 1) {
                    this.searchResults = items;
                } else {
                    this.searchResults = this.searchResults.concat(items);
                }
                this.searchTotal = this.searchResults.length;
                if (items.length === 0 && this.searchPage > 1) {
                    showInfo('没有更多结果了');
                }
            }).catch((e) => {
                showError(e as string || '搜索失败');
            }).finally(() => {
                this.searchLoading = false;
                hideLoading();
            });
        },

        searchNextPage() {
            this.searchPage++;
            this.doSearch();
        },

        clearSearch() {
            this.searchKeyword = '';
            this.searchResults = [];
            this.searchPage = 1;
            this.$forceUpdate();
        },

        // ===== 收藏夹 =====
        loadFavFolders() {
            this.favLoading = true;
            showLoading();
            Bilibili.getFavoriteFolders().then((folders) => {
                this.favFolders = folders;
                if (folders.length > 0 && !this.activeFavId) {
                    this.activeFavId = folders[0].id;
                    this.loadFavItems();
                }
            }).catch((e) => {
                showError(e as string || '获取收藏夹失败');
            }).finally(() => {
                this.favLoading = false;
                hideLoading();
            });
        },

        selectFavFolder(id: string) {
            this.activeFavId = id;
            this.loadFavItems();
        },

        loadFavItems() {
            if (!this.activeFavId) return;
            this.favLoading = true;
            showLoading();
            Bilibili.getFavoriteItems(this.activeFavId, 1, 50).then((items) => {
                this.favItems = items;
            }).catch((e) => {
                showError(e as string || '加载收藏夹内容失败');
            }).finally(() => {
                this.favLoading = false;
                hideLoading();
            });
        },

        openBiliSettings() {
            $falcon.navTo('biliSettings', {});
        },

        // ===== 详情 =====
        openDetail(bvid: string) {
            $falcon.navTo('biliDetail', { bvid });
        },

        // ===== 下载 =====
        downloadVideo(bvid: string, title: string) {
            if (this.downloadingBvid) {
                showInfo('已有下载任务进行中');
                return;
            }
            this.downloadingBvid = bvid;
            this.downloadProgress = 0;
            this.downloadStatus = '准备中...';

            Bilibili.on('bili_download_progress', (data) => {
                this.downloadProgress = data.progress;
                this.downloadStatus = data.status;
                this.$forceUpdate();
            });

            Bilibili.downloadAudio(bvid, title).then((path) => {
                showSuccess('已下载: ' + path);
                if (this.activeTab === 'downloads') this.loadDownloads();
            }).catch((e) => {
                showError(e as string || '下载失败');
            }).finally(() => {
                this.downloadingBvid = '';
                this.downloadProgress = 0;
                this.downloadStatus = '';
            });
        },

        loadDownloads() {
            this.downloads = Bilibili.listDownloads();
        },

        deleteDownload(filename: string) {
            showLoading();
            Bilibili.deleteDownload(filename).then(() => {
                showSuccess('已删除');
                this.loadDownloads();
            }).catch((e) => {
                showError(e as string || '删除失败');
            }).finally(() => {
                hideLoading();
            });
        },

        // ===== 工具 =====
        formatDuration,
        formatPlayCount,
        formatDate,
    },
});

export default bili;
