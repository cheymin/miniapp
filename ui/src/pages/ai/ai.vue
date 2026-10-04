<!-- AI 助手 — Falcon 兼容样式模板, 去掉内联 style, 用语义化 class -->
<template>
    <div class="container">
        <!-- 主区: 消息列表 + 右侧按钮 -->
        <div class="main-row">
            <scroller class="messages-scroller" scroll-direction="vertical" :show-scrollbar="true">
                <div v-for="message in displayMessages" :key="message.id" class="msg-item">
                    <!-- reasoning 折叠 -->
                    <text
                        v-if="message.reasoningContent"
                        class="message-r">{{ message.reasoningContent }}</text>
                    <!-- 气泡 -->
                    <text
                        :class="message.role === 0 ? 'message message-u' : 'message message-a'">{{ message.content }}</text>
                    <!-- 停流警告 -->
                    <text
                        v-if="![0, 1, 6].includes(message.stopReason)"
                        class="stop-warn">{{ getStopReasonText(message.stopReason) }}</text>
                    <!-- 消息操作条 (只有 user/assistant) -->
                    <div
                        v-if="message.role === 0 || message.role === 1"
                        :class="message.role === 0 ? 'actions-row-u' : 'actions-row'">
                        <text
                            v-if="message.role === 0"
                            @click="editUserMessage(message.id)"
                            :class="'sq-btn' + (isStreaming ? ' sq-btn-dis' : '')">
                            <text class="sq-btn-text">编</text>
                        </text>
                        <text
                            v-if="message.role === 1"
                            @click="regenerateMessage(message.id)"
                            :class="'sq-btn' + (isStreaming ? ' sq-btn-dis' : '')">
                            <text class="sq-btn-text">重</text>
                        </text>
                        <text
                            @click="switchVariant(message.id, -1, message.role === 1)"
                            :class="'sq-btn' + ((canGoVariant(message.id, -1) && !isStreaming) ? '' : ' sq-btn-dis')">
                            <text class="sq-btn-text">左</text>
                        </text>
                        <text class="variant-text">{{ getVariantInfo(message.id) }}</text>
                        <text
                            @click="switchVariant(message.id, 1, message.role === 1)"
                            :class="'sq-btn' + ((canGoVariant(message.id, 1) && !isStreaming) ? '' : ' sq-btn-dis')">
                            <text class="sq-btn-text">右</text>
                        </text>
                    </div>
                </div>
            </scroller>

            <!-- 右侧按钮栏 -->
            <div class="side-btns">
                <text
                    @click="openHistory"
                    :class="'side-btn' + (isStreaming ? ' side-btn-disabled' : '')">
                    <text class="side-btn-text">历</text>
                </text>
                <text
                    @click="openMessageNavigation"
                    :class="'side-btn' + (isStreaming ? ' side-btn-disabled' : '')">
                    <text class="side-btn-text">导</text>
                </text>
                <text
                    @click="openSettings"
                    :class="'side-btn' + (isStreaming ? ' side-btn-disabled' : '')">
                    <text class="side-btn-text">设</text>
                </text>
            </div>
        </div>

        <!-- 底部输入区 -->
        <div class="input-row">
            <text
                class="input-area"
                @click="loadSoftKeyboard">
                <text :class="currentInput ? 'input-text' : 'input-empty'">{{ currentInput || '点击输入...' }}</text>
            </text>
            <text
                v-if="!isStreaming"
                @click="sendMessage(this.currentInput)"
                :class="'send-btn' + (this.canSendMessage ? '' : '-dis')">
                <text class="send-btn-text">发</text>
            </text>
            <text
                v-else
                @click="stopGeneration"
                class="send-btn">
                <text class="send-btn-text">停</text>
            </text>
        </div>

        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('ai.less');
</style>

<script>
import ToastMessage from '../../components/ToastMessage.vue';
import ai from './ai';
export default {
    ...ai,
    components: { ToastMessage }
}
</script>
