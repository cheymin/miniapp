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
import { Chat } from 'langningchen';
import { ConversationInfo } from '../../@types/langningchen';
import { showError, showSuccess } from '../../components/ToastMessage';
import { hideLoading, showLoading } from '../../components/Loading';
import { openSoftKeyboard } from '../../utils/softKeyboardUtils';

export type chatListOptions = {};

const chatList = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<chatListOptions>,
            conversationList: [] as ConversationInfo[],
            currentConversationId: '',
        };
    },

    async mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on('backpressed', this.handleBackPress);
        try {
            Chat.initialize("/userdisk/database/langningchen-chat.db");
            await this.loadConversationList();
        } catch (e) {
            showError(e as string || 'Chat 初始化失败');
        }
    },

    beforeDestroy() {
        this.$page.$npage.off('backpressed', this.handleBackPress);
    },

    computed: {
        sortedConversations(): ConversationInfo[] {
            return [...this.conversationList].sort((a, b) => {
                return b.updatedAt - a.updatedAt;
            });
        }
    },

    methods: {
        handleBackPress() {
            this.$page.finish();
        },

        async loadConversationList() {
            showLoading();
            try {
                this.conversationList = await Chat.getConversationList();
                this.currentConversationId = Chat.getCurrentConversationId();
            } catch (e) {
                showError(e as string || '加载会话列表失败');
            } finally {
                hideLoading();
            }
        },

        async createConversation() {
            openSoftKeyboard(
                () => '',
                (title) => {
                    const trimmedTitle = title.trim();
                    if (!trimmedTitle) {
                        showError('标题不能为空');
                        return;
                    }
                    showLoading();
                    Chat.createConversation(trimmedTitle).then(() => {
                        return this.loadConversationList();
                    }).then(() => {
                        showSuccess('会话创建成功');
                    }).catch((e) => {
                        showError(e as string || '创建会话失败');
                    }).finally(() => {
                        hideLoading();
                    });
                },
                (value) => {
                    if (!value.trim()) { return '标题不能为空'; }
                }
            );
        },

        async loadConversation(conversationId: string) {
            showLoading();
            try {
                await Chat.loadConversation(conversationId);
                this.currentConversationId = conversationId;
                this.$page.finish();
            } catch (e) {
                showError(e as string || '加载会话失败');
            } finally {
                hideLoading();
            }
        },

        async deleteConversation(conversationId: string) {
            showLoading();
            try {
                await Chat.deleteConversation(conversationId);
                await this.loadConversationList();
                showSuccess('会话已删除');
            } catch (e) {
                showError(e as string || '删除会话失败');
            } finally {
                hideLoading();
            }
        },

        editConversationTitle(conversationId: string, currentTitle: string) {
            openSoftKeyboard(
                () => currentTitle,
                (value) => {
                    const trimmedTitle = value.trim();
                    if (trimmedTitle && trimmedTitle !== currentTitle) {
                        Chat.updateConversationTitle(conversationId, trimmedTitle).then(() => {
                            showSuccess('标题修改成功');
                            return this.loadConversationList();
                        }).catch((e) => {
                            showError(e as string || '修改标题失败');
                        });
                    }
                },
                (value) => {
                    if (!value.trim()) { return '标题不能为空'; }
                }
            );
        },

        formatTime(timestamp: number): string {
            const date = new Date(timestamp);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return '刚刚';
            if (diffMins < 60) return `${diffMins}分钟前`;
            if (diffHours < 24) return `${diffHours}小时前`;
            if (diffDays < 7) return `${diffDays}天前`;

            const month = date.getMonth() + 1;
            const day = date.getDate();
            return `${month}/${day}`;
        },

        getPreviewText(conversation: ConversationInfo): string {
            const title = conversation.title || '新对话';
            if (title.length > 20) {
                return title.substring(0, 20) + '...';
            }
            return title;
        },
    }
});

export default chatList;
