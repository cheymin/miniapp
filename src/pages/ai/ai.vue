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
        <div class="container ai">
            <div class="ai-head">
                <text class="ai-title">AI 助手</text>
                <text :class="'ai-state' + (isStreaming ? ' ai-state-busy' : '')">{{ isStreaming ? '生成中…' : '就绪' }}</text>
            </div>

            <div class="ai-body">
                <scroller ref="messageScroller" class="messages-scroller" scroll-direction="vertical"
                    :show-scrollbar="true">
                    <div v-for="message in displayMessages" :key="message.id"
                        :class="'message-row' + (message.role === 0 ? ' message-row-user' : '')">
                        <div class="message-col">
                            <text :class="'message message-' + message.role">{{ message.content }}</text>
                            <text v-if="![0, 1, 6].includes(message.stopReason)" class="stop-reason-warning">{{
                                getStopReasonText(message.stopReason) }}</text>
                            <div v-if="message.role === 0 || message.role === 1"
                                :class="message.role === 0 ? 'message-actions-user' : 'message-actions'">
                                <text v-if="message.role === 0" @click="editUserMessage(message.id)"
                                    :class="'mini-btn' + (isStreaming ? ' mini-btn-disabled' : '')">编</text>
                                <text v-if="message.role === 1" @click="regenerateMessage(message.id)"
                                    :class="'mini-btn' + (isStreaming ? ' mini-btn-disabled' : '')">重</text>
                                <text @click="switchVariant(message.id, -1, message.role === 1)"
                                    :class="'mini-btn' + ((canGoVariant(message.id, -1) && !isStreaming) ? '' : ' mini-btn-disabled')">左</text>
                                <text class="action-text">{{ getVariantInfo(message.id) }}</text>
                                <text @click="switchVariant(message.id, 1, message.role === 1)"
                                    :class="'mini-btn' + ((canGoVariant(message.id, 1) && !isStreaming) ? '' : ' mini-btn-disabled')">右</text>
                            </div>
                        </div>
                    </div>
                </scroller>

                <div class="side-buttons">
                    <text @click="openHistory"
                        :class="'square-btn' + (isStreaming ? ' square-btn-disabled' : '')">历</text>
                    <text @click="openMessageNavigation"
                        :class="'square-btn' + (isStreaming ? ' square-btn-disabled' : '')">导</text>
                    <text @click="openSettings"
                        :class="'square-btn' + (isStreaming ? ' square-btn-disabled' : '')">设</text>
                    <text @click="scrollToBottom" class="square-btn">底</text>
                </div>
            </div>

            <div class="ai-input-row">
                <text :class="'ai-input' + (isStreaming ? ' ai-input-disabled' : '')"
                    @click="openInput">{{ currentInput || '点击输入…' }}</text>
                <text v-if="!isStreaming" @click="sendMessage(currentInput)"
                    :class="'send-btn' + (canSendMessage ? ' send-btn-on' : '')">发</text>
                <text v-else @click="stopGeneration" class="send-btn send-btn-stop">停</text>
            </div>

            <Keyboard :visible="keyboardVisible" :value="currentInput" placeholder="输入内容…"
                @update:value="onKeyboardValue" @confirm="onKeyboardConfirm" @close="closeKeyboard" />
        </div>

        <Loading />
        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('ai.less');
</style>

<script>
import Keyboard from '../../components/Keyboard.vue';
import Loading from '../../components/Loading.vue';
import ToastMessage from '../../components/ToastMessage.vue';
import ai from './ai';
export default {
    ...ai,
    components: {
        Keyboard,
        Loading,
        ToastMessage
    }
}
</script>
