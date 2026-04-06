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

export type MemoOptions = {};

interface MemoItem {
    id: string;
    title: string;
    content: string;
    createTime: number;
    updateTime: number;
}

const memo = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<MemoOptions>,
            
            memos: [] as MemoItem[],
            currentMemo: null as MemoItem | null,
            isEditing: false,
            searchText: '',
        };
    },

    computed: {
        filteredMemos(): MemoItem[] {
            if (!this.searchText) {
                return this.memos;
            }
            const keyword = this.searchText.toLowerCase();
            return this.memos.filter(memo => 
                memo.title.toLowerCase().includes(keyword) || 
                memo.content.toLowerCase().includes(keyword)
            );
        }
    },

    async mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on("backpressed", this.handleBackPress);
        await this.loadMemos();
    },
    
    beforeDestroy() {
        this.$page.$npage.off("backpressed", this.handleBackPress);
    },

    methods: {
        handleBackPress() {
            if (this.isEditing) {
                this.cancelEdit();
            } else {
                $falcon.navBack();
            }
        },
        
        async loadMemos() {
            try {
                const data = await $falcon.storage.get('memos');
                if (data) {
                    this.memos = JSON.parse(data);
                }
            } catch (error) {
                console.error('加载备忘录失败:', error);
            }
        },

        async saveMemos() {
            try {
                await $falcon.storage.set('memos', JSON.stringify(this.memos));
            } catch (error) {
                console.error('保存备忘录失败:', error);
                showError('保存失败');
            }
        },

        createNewMemo() {
            const now = Date.now();
            this.currentMemo = {
                id: `memo_${now}`,
                title: '',
                content: '',
                createTime: now,
                updateTime: now
            };
            this.isEditing = true;
        },

        editMemo(memo: MemoItem) {
            this.currentMemo = { ...memo };
            this.isEditing = true;
        },

        async saveCurrentMemo() {
            if (!this.currentMemo) return;
            
            if (!this.currentMemo.title.trim() && !this.currentMemo.content.trim()) {
                showError('标题和内容不能同时为空');
                return;
            }

            const now = Date.now();
            const existingIndex = this.memos.findIndex(m => m.id === this.currentMemo!.id);
            
            if (existingIndex >= 0) {
                this.memos[existingIndex] = {
                    ...this.currentMemo,
                    updateTime: now
                };
            } else {
                this.currentMemo.createTime = now;
                this.currentMemo.updateTime = now;
                this.memos.unshift(this.currentMemo);
            }

            await this.saveMemos();
            showSuccess('保存成功');
            this.isEditing = false;
            this.currentMemo = null;
        },

        cancelEdit() {
            this.isEditing = false;
            this.currentMemo = null;
        },

        async deleteMemo(memo: MemoItem) {
            const index = this.memos.findIndex(m => m.id === memo.id);
            if (index >= 0) {
                this.memos.splice(index, 1);
                await this.saveMemos();
                showSuccess('删除成功');
            }
        },

        editTitle() {
            if (!this.currentMemo) return;
            openSoftKeyboard(
                () => this.currentMemo!.title,
                (value) => {
                    if (this.currentMemo) {
                        this.currentMemo.title = value;
                        this.$forceUpdate();
                    }
                }
            );
        },

        editContent() {
            if (!this.currentMemo) return;
            openSoftKeyboard(
                () => this.currentMemo!.content,
                (value) => {
                    if (this.currentMemo) {
                        this.currentMemo.content = value;
                        this.$forceUpdate();
                    }
                }
            );
        },

        searchMemo() {
            openSoftKeyboard(
                () => this.searchText,
                (value) => {
                    this.searchText = value;
                    this.$forceUpdate();
                }
            );
        },

        formatTime(timestamp: number): string {
            const date = new Date(timestamp);
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const hour = date.getHours().toString().padStart(2, '0');
            const minute = date.getMinutes().toString().padStart(2, '0');
            return `${month}-${day} ${hour}:${minute}`;
        }
    }
});

export default memo;
