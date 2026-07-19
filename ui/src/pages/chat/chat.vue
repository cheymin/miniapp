<!--
    Copyright (C) 2025 Langning Chen

    This file is part of miniapp.

    miniapp is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    miniapp is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with miniapp.  If not, see <https://www.gnu.org/licenses/>.
-->

<template>
    <div>
        <div class="chat-container">
            <div class="top-bar">
                <text class="top-btn" @click="openChatList">☰</text>
                <text class="top-title">{{ currentConversationTitle || '新对话' }}</text>
                <text class="top-btn" @click="openChatSettings">⚙</text>
            </div>

            <scroller ref="messageScroller" class="messages-scroller" scroll-direction="vertical"
                :show-scrollbar="true">
                <div class="messages-wrapper">
                    <div v-if="hasMore" class="load-more-btn" @click="loadMoreMessages">
                        <text class="load-more-text">加载更多</text>
                    </div>

                    <div v-for="message in displayMessages" :key="message.id" class="message-row"
                        :class="message.role === 0 ? 'message-row-right' : 'message-row-left'">
                        <div v-if="message.reasoningContent" class="reasoning-bubble"
                            @click="toggleReasoning(message.id)">
                            <text v-if="isReasoningExpanded(message.id)" class="reasoning-text">{{
                                message.reasoningContent }}</text>
                            <text v-else class="reasoning-text">💭 思考中...</text>
                        </div>

                        <div class="message-bubble" :class="message.role === 0 ? 'bubble-user' : 'bubble-assistant'">
                            <text class="message-text">{{ message.content }}</text>
                        </div>

                        <text v-if="![0, 1, 6].includes(message.stopReason) && message.role === 1"
                            class="stop-reason-text">{{ getStopReasonText(message.stopReason) }}</text>
                    </div>
                </div>
            </scroller>

            <div class="input-bar">
                <text class="input-preview" @click="openChatKeyboard">{{
                    currentInput || '点击输入消息...' }}</text>
                <text v-if="!isStreaming" @click="sendMessage(currentInput)"
                    :class="'send-btn ' + (canSendMessage ? 'send-btn-active' : 'send-btn-disabled')">发</text>
                <text v-else @click="stopGeneration" class="send-btn send-btn-stop">停</text>
            </div>
        </div>
        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('chat.less');
</style>

<script>
import ToastMessage from '../../components/ToastMessage.vue';
import chat from './chat';
export default {
    ...chat,
    components: {
        ToastMessage
    }
}
</script>
