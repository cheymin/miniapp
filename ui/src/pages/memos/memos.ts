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
import { openSoftKeyboard } from '../../utils/softKeyboardUtils';
import { showSuccess, showWarning } from '../../components/ToastMessage';

export type MemosOptions = {};

interface Memo {
    id: string;
    content: string;
    createdAt: number;
    updatedAt: number;
}

const STORAGE_KEY = 'memos_data';
const PENDING_DELETE_TIMEOUT = 3000;

function pad2(n: number): string {
    return n < 10 ? '0' + n : '' + n;
}

const memos = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<MemosOptions>,
            memos: [] as Memo[],
            searchMode: false,
            searchQuery: '',
            pendingDeleteId: '',
            pendingDeleteTimer: null as ReturnType<typeof setTimeout> | null,
        };
    },

    computed: {
        filteredMemos(): Memo[] {
            const list = this.memos.slice();
            list.sort((a, b) => b.updatedAt - a.updatedAt);
            const q = this.searchQuery.trim().toLowerCase();
            if (!q) {
                return list;
            }
            const result: Memo[] = [];
            for (let i = 0; i < list.length; i++) {
                if ((list[i].content || '').toLowerCase().indexOf(q) >= 0) {
                    result.push(list[i]);
                }
            }
            return result;
        },
    },

    async mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on('backpressed', () => {
            if (this.searchMode) {
                this.searchMode = false;
                this.searchQuery = '';
            } else {
                this.$page.finish();
            }
        });
        await this.loadMemos();
    },

    beforeDestroy() {
        this.clearPendingDelete();
    },

    methods: {
        async loadMemos() {
            try {
                const data = await $falcon.storage.get(STORAGE_KEY);
                if (data) {
                    const parsed = JSON.parse(data);
                    if (Array.isArray(parsed)) {
                        this.memos = parsed as Memo[];
                    }
                }
            } catch (error) {
                console.error('加载备忘录失败:', error);
            }
        },

        async saveMemos() {
            try {
                await $falcon.storage.set(STORAGE_KEY, JSON.stringify(this.memos));
            } catch (error) {
                console.error('保存备忘录失败:', error);
                showWarning('保存失败');
            }
        },

        findIndex(id: string): number {
            for (let i = 0; i < this.memos.length; i++) {
                if (this.memos[i].id === id) {
                    return i;
                }
            }
            return -1;
        },

        formatTime(ts: number): string {
            const d = new Date(ts);
            return pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' +
                pad2(d.getHours()) + ':' + pad2(d.getMinutes());
        },

        toggleSearch() {
            this.clearPendingDelete();
            this.searchMode = !this.searchMode;
            if (!this.searchMode) {
                this.searchQuery = '';
            }
        },

        onSearchInput() {
            openSoftKeyboard(
                () => this.searchQuery,
                (value) => {
                    this.searchQuery = value;
                }
            );
        },

        clearSearch() {
            this.searchQuery = '';
        },

        onNew() {
            this.clearPendingDelete();
            openSoftKeyboard(
                () => '',
                (value) => {
                    const text = (value || '').trim();
                    if (!text) {
                        return;
                    }
                    const now = Date.now();
                    const memo: Memo = {
                        id: now.toString() + Math.random().toString(36).substr(2, 5),
                        content: value,
                        createdAt: now,
                        updatedAt: now,
                    };
                    this.memos.push(memo);
                    this.saveMemos();
                    showSuccess('已添加');
                }
            );
        },

        onEdit(id: string) {
            this.clearPendingDelete();
            const idx = this.findIndex(id);
            if (idx < 0) {
                return;
            }
            const original = this.memos[idx].content;
            openSoftKeyboard(
                () => original,
                (value) => {
                    const text = (value || '').trim();
                    if (!text) {
                        showWarning('内容不能为空');
                        return;
                    }
                    if (text === original.trim()) {
                        return;
                    }
                    const i = this.findIndex(id);
                    if (i < 0) {
                        return;
                    }
                    const m = this.memos[i];
                    this.memos.splice(i, 1, {
                        id: m.id,
                        content: value,
                        createdAt: m.createdAt,
                        updatedAt: Date.now(),
                    });
                    this.saveMemos();
                    showSuccess('已更新');
                }
            );
        },

        onDelete(id: string) {
            if (this.pendingDeleteId === id) {
                this.clearPendingDelete();
                const idx = this.findIndex(id);
                if (idx >= 0) {
                    this.memos.splice(idx, 1);
                    this.saveMemos();
                    showSuccess('已删除');
                }
                return;
            }
            this.pendingDeleteId = id;
            if (this.pendingDeleteTimer) {
                clearTimeout(this.pendingDeleteTimer);
            }
            this.pendingDeleteTimer = setTimeout(() => {
                this.pendingDeleteId = '';
                this.pendingDeleteTimer = null;
            }, PENDING_DELETE_TIMEOUT);
        },

        clearPendingDelete() {
            if (this.pendingDeleteTimer) {
                clearTimeout(this.pendingDeleteTimer);
                this.pendingDeleteTimer = null;
            }
            this.pendingDeleteId = '';
        },
    },
});

export default memos;
