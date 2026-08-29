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
        <div class="container" style="display: flex; flex-direction: column;">
            <div style="flex: 1; display: flex; flex-direction: row;">
                <scroller ref="messageScroller" class="messages-scroller" scroll-direction="vertical"
                    :show-scrollbar="true">
                    <div v-for="(message, index) in displayMessages" :key="message.id">
                        <text v-if="message.reasoningContent" class="message-reasoning" @click="toggleReasoning(message.id)">{{
                            (isReasoningExpanded(message.id) ? '▼' : '▶') + ' 思考过程' }}</text>
                        <text v-if="isReasoningExpanded(message.id) && message.reasoningContent"
                            class="reasoning-text">{{ message.reasoningContent }}</text>
                        <text :class="'message message-' + message.role">{{ message.content }}</text>
                        <text v-if="![0, 1, 6].includes(message.stopReason)" class="stop-reason-warning">{{
                            getStopReasonText(message.stopReason) }}</text>
                        <div v-if="message.role === 1 && !isStreaming" class="message-actions">
                            <text @click="copyMessage(message)" class="square-btn">复</text>
                            <text v-if="index === displayMessages.length - 1 && canRegenerate" @click="regenerateLast"
                                class="square-btn">重</text>
                        </div>
                    </div>
                    <text v-if="hasMore" class="load-more" @click="loadMoreMessages">▲ 加载更多</text>
                    <text v-if="errorMsg" class="stop-reason-warning" @click="retryLastGenerate">⚠ {{ errorMsg }} · 点击重试
                    </text>
                </scroller>

                <div class="side-buttons">
                    <text @click="openChatList"
                        :class="'square-btn' + (isStreaming ? ' square-btn-disabled' : '')">历</text>
                    <text @click="editTitle"
                        :class="'square-btn' + (isStreaming ? ' square-btn-disabled' : '')">题</text>
                    <text @click="openChatSettings"
                        :class="'square-btn' + (isStreaming ? ' square-btn-disabled' : '')">设</text>
                </div>
            </div>

            <div class="item">
                <text :class="'item-input' + (isStreaming ? ' item-input-disabled' : '')" @click="openChatKeyboard">{{
                    currentInput || '点击输入...' }}</text>
                <text v-if="!isStreaming" @click="sendMessage(currentInput)"
                    :class="'square-btn square-btn-' + (canSendMessage ? 'primary' : 'disabled')">发</text>
                <text v-else @click="stopGeneration" class="square-btn square-btn-danger">停</text>
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