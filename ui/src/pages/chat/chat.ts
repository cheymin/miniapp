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
import { ROLE, ConversationNode, STOP_REASON } from '../../@types/langningchen';
import { showError } from '../../components/ToastMessage';

export type chatOptions = {};

const MAX_VISIBLE_MESSAGES = 30;

const chat = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<chatOptions>,
            chatInitialized: false,
            currentInput: '',
            streamingContent: '',
            streamingReasoning: '',
            isStreaming: false,
            messages: [] as ConversationNode[],
            currentConversationId: '',
            currentConversationTitle: '',
            expandedReasoning: {} as Record<string, boolean>,
            offset: 0,
            hasMore: false,
            streamTimer: null as ReturnType<typeof setTimeout> | null,
            streamDirty: false,
        };
    },

    created() {
        this.$page.on("show", this.onPageShow);
    },
    destroyed() {
        this.$page.off("show", this.onPageShow);
    },

    mounted() {
        try {
            Chat.initialize("/userdisk/database/langningchen-chat.db");
            this.chatInitialized = true;
            this.refreshMessages();
            this.refreshConversationInfo();
            Chat.on('chat_stream', (data: string) => {
                if (data && data.length > 0) {
                    const marker = data.charCodeAt(0);
                    const text = data.substring(1);
                    if (marker === 1) {
                        this.streamingReasoning += text;
                    } else if (marker === 2) {
                        this.streamingContent += text;
                    } else {
                        this.streamingContent += data;
                    }
                }
                this.scheduleStreamUpdate();
            });
        } catch (e) {
            showError(e as string || 'Chat 初始化失败');
        }
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on('backpressed', this.handleBackPress);
    },

    beforeDestroy() {
        this.$page.$npage.off('backpressed', this.handleBackPress);
        if (this.streamTimer) {
            clearTimeout(this.streamTimer);
            this.streamTimer = null;
        }
    },

    computed: {
        displayMessages(): ConversationNode[] {
            let messages = this.messages.slice();
            if (this.offset > 0) {
                messages = messages.slice(this.offset);
            }

            if (this.isStreaming && (this.streamingContent || this.streamingReasoning)) {
                const lastMessage = messages[messages.length - 1];
                if (lastMessage && lastMessage.role === ROLE.ROLE_ASSISTANT) {
                    const msgs = messages.slice(0, -1);
                    msgs.push({
                        ...lastMessage,
                        content: this.streamingContent,
                        reasoningContent: this.streamingReasoning,
                    });
                    return msgs;
                } else {
                    const tempId = `streaming_${Date.now()}`;
                    const streamingMessage: ConversationNode = {
                        role: ROLE.ROLE_ASSISTANT,
                        content: this.streamingContent,
                        reasoningContent: this.streamingReasoning,
                        timestamp: new Date().toISOString(),
                        id: tempId,
                        parentId: '',
                        childIds: [],
                        stopReason: STOP_REASON.STOP_REASON_NONE,
                    };
                    messages.push(streamingMessage);
                }
            }
            return messages;
        },
        canSendMessage(): boolean {
            return this.chatInitialized && !this.isStreaming && this.currentInput.trim().length > 0;
        }
    },

    methods: {
        handleBackPress() {
            this.$page.finish();
        },

        onPageShow() {
            this.refreshMessages();
            this.refreshConversationInfo();
            this.handleKeyboardResult();
        },

        handleKeyboardResult() {
        },

        scheduleStreamUpdate() {
            this.streamDirty = true;
            if (!this.streamTimer) {
                this.streamTimer = setTimeout(() => {
                    this.streamTimer = null;
                    if (this.streamDirty) {
                        this.streamDirty = false;
                        this.$forceUpdate();
                    }
                }, 100);
            }
        },

        refreshConversationInfo() {
            try {
                this.currentConversationId = Chat.getCurrentConversationId();
            } catch (e) {
                showError(e as string || '获取会话信息失败');
            }
        },

        refreshMessages() {
            try {
                this.messages = Chat.getCurrentPath().map((node: ConversationNode) => ({ ...node, childIds: [...node.childIds] }));
                const total = this.messages.length;
                this.hasMore = total > MAX_VISIBLE_MESSAGES;
                if (this.hasMore) {
                    this.offset = total - MAX_VISIBLE_MESSAGES;
                } else {
                    this.offset = 0;
                }
            } catch (e) {
                showError(e as string || '获取消息失败');
            }
        },

        loadMoreMessages() {
            const newOffset = Math.max(0, this.offset - 30);
            if (newOffset < this.offset) {
                this.offset = newOffset;
                this.hasMore = this.offset > 0;
                this.$forceUpdate();
            }
        },

        toggleReasoning(messageId: string) {
            this.expandedReasoning[messageId] = !this.expandedReasoning[messageId];
            this.$forceUpdate();
        },

        isReasoningExpanded(messageId: string): boolean {
            return !!this.expandedReasoning[messageId];
        },

        async sendMessage(userMessage: string) {
            if (!this.chatInitialized || this.isStreaming || !userMessage?.trim()) return;
            userMessage = userMessage.trim();

            this.streamingContent = '';
            this.streamingReasoning = '';

            Chat.addUserMessage(userMessage).then(() => {
                this.refreshMessages();
                this.$forceUpdate();
                this.generateResponse();
            }).catch((e) => {
                showError(e as string || '添加用户消息失败');
            });
            this.currentInput = '';
        },

        async generateResponse() {
            this.isStreaming = true;
            Chat.generateResponse().then(() => {
                this.refreshMessages();
                this.$forceUpdate();
            }).catch((e) => {
                showError(e as string || '生成响应失败');
            }).finally(() => {
                this.isStreaming = false;
                this.streamingContent = '';
                this.streamingReasoning = '';
                if (this.streamTimer) {
                    clearTimeout(this.streamTimer);
                    this.streamTimer = null;
                }
            });
        },

        stopGeneration() {
            if (this.isStreaming) {
                Chat.stopGeneration();
                setTimeout(() => {
                    this.isStreaming = false;
                    this.streamingContent = '';
                    this.streamingReasoning = '';
                    this.refreshMessages();
                    this.$forceUpdate();
                }, 100);
            }
        },

        openChatKeyboard() {
            if (this.isStreaming) return;
            $falcon.navTo('chatKeyboard', { initialText: this.currentInput });

            const handler = (e: { data: any }) => {
                const result = e.data;
                if (result && typeof result === 'object' && typeof result.text === 'string') {
                    this.currentInput = result.text;
                    if (result.send) {
                        this.sendMessage(this.currentInput);
                    }
                } else if (typeof result === 'string') {
                    this.currentInput = result;
                }
                this.$forceUpdate();
                $falcon.off('chatKeyboard', handler);
            };
            $falcon.on('chatKeyboard', handler);
        },

        openChatList() {
            if (this.isStreaming) return;
            $falcon.navTo('chatList', {});
        },

        openChatSettings() {
            if (this.isStreaming) return;
            $falcon.navTo('chatSettings', {});
        },

        regenerateLast() {
            if (this.isStreaming) return;
            try {
                Chat.deleteLastMessage();
                this.streamingContent = '';
                this.streamingReasoning = '';
                this.refreshMessages();
                this.generateResponse();
            } catch (e) {
                showError(e as string || '重新生成失败');
            }
        },

        getStopReasonText(stopReason: STOP_REASON): string {
            switch (stopReason) {
                case STOP_REASON.STOP_REASON_LENGTH:
                    return '超出最大长度限制';
                case STOP_REASON.STOP_REASON_ERROR:
                    return '生成时出现错误';
                case STOP_REASON.STOP_REASON_CONTENT_FILTER:
                    return '内容被过滤';
                case STOP_REASON.STOP_REASON_USER_STOPPED:
                    return '用户手动停止';
                case STOP_REASON.STOP_REASON_STOP:
                    return '模型主动停止';
                case STOP_REASON.STOP_REASON_DONE:
                    return '生成完成';
                case STOP_REASON.STOP_REASON_NONE:
                    return '无';
                default:
                    return '未知';
            }
        },
    }
});

export default chat;
