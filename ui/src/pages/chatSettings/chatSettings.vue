<template>
    <div>
        <div class="settings-container">
            <div class="top-bar">
                <text class="top-btn" @click="handleBackPress">←</text>
                <text class="top-title">设置</text>
                <text class="top-btn-placeholder"></text>
            </div>

            <scroller class="settings-scroller" scroll-direction="vertical" :show-scrollbar="true">
                <div class="settings-content">
                    <div class="setting-section">
                        <text class="section-label">API 配置</text>
                        <div class="setting-item" @click="editApiKey">
                            <text class="item-label">API 密钥</text>
                            <text class="item-value">{{ apiKey ? '***' : '点击设置' }}</text>
                        </div>
                        <div class="setting-item" @click="editBaseUrl">
                            <text class="item-label">基础 URL</text>
                            <text class="item-value">{{ baseUrl || '点击设置' }}</text>
                        </div>
                        <div class="setting-item" @click="editModelName">
                            <text class="item-label">模型</text>
                            <text class="item-value">{{ modelName || '点击设置' }}</text>
                        </div>
                    </div>

                    <div class="setting-section">
                        <text class="section-label">模型参数</text>
                        <div class="setting-item" @click="editTemperature">
                            <text class="item-label">温度</text>
                            <text class="item-value">{{ temperature.toFixed(1) }}</text>
                        </div>
                        <div class="setting-item" @click="editTopP">
                            <text class="item-label">Top-P</text>
                            <text class="item-value">{{ topP.toFixed(1) }}</text>
                        </div>
                        <div class="setting-item" @click="editMaxTokens">
                            <text class="item-label">最大长度</text>
                            <text class="item-value">{{ maxTokens }}</text>
                        </div>
                    </div>

                    <div class="setting-section">
                        <text class="section-label">系统提示词</text>
                        <div class="setting-textarea" @click="editSystemPrompt">
                            <text class="textarea-text">{{ systemPrompt || '点击编辑系统提示词' }}</text>
                        </div>
                    </div>

                    <div class="save-btn-row">
                        <text class="save-btn" @click="saveSettings">保存设置</text>
                    </div>
                </div>
            </scroller>
        </div>

        <Loading />
        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('chatSettings.less');
</style>

<script>
import Loading from '../../components/Loading.vue';
import ToastMessage from '../../components/ToastMessage.vue';
import chatSettings from './chatSettings';
export default {
    ...chatSettings,
    components: {
        Loading,
        ToastMessage
    }
};
</script>
