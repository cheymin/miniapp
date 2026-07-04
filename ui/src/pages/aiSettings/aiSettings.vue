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
        <scroller class="container" scroll-direction="vertical" :show-scrollbar="true">
            <div class="section config-bar">
                <text class="section-title">当前配置</text>
                <div class="item" @click="toggleConfigMenu">
                    <text class="item-text">配置名称</text>
                    <text class="item-input">{{ activeConfigName || '无配置' }}</text>
                    <text class="config-chevron">{{ showConfigMenu ? '▲' : '▼' }}</text>
                </div>
                <div class="btn-area config-actions">
                    <text class="btn btn-success" @click="createConfig">新建配置</text>
                    <text class="btn btn-warning" @click="renameConfig(activeConfigId, activeConfigName)">重命名</text>
                    <text class="btn btn-danger" @click="removeConfig(activeConfigId)">删除</text>
                </div>
            </div>

            <div class="section">
                <text class="section-title">API 配置</text>

                <div class="item">
                    <text class="item-text">API 密钥</text>
                    <text class="item-input" @click="editApiKey">{{apiKey.split('').map(_ => '*').join('') ||
                        '点击输入API密钥'}}</text>
                </div>

                <div class="item">
                    <text class="item-text">基础 URL</text>
                    <text class="item-input" @click="editBaseUrl">{{ baseUrl || '点击输入基础URL' }}</text>
                </div>
            </div>

            <div class="section">
                <text class="section-title">账户余额（New API）</text>

                <div class="item">
                    <text class="item-text">访问令牌</text>
                    <text class="item-input" @click="editAccessToken">{{ (accessToken ? accessToken.split('').map(_ => '*').join('') : '点击输入访问令牌') }}</text>
                </div>

                <div class="item">
                    <text class="item-text">用户 ID</text>
                    <text class="item-input" @click="editUserId">{{ userId || '点击输入用户ID' }}</text>
                </div>

                <div class="item">
                    <text class="item-text">账户余额</text>
                    <text v-if="balanceLoading" class="item-input item-input-disabled">查询中...</text>
                    <text v-else-if="balanceError" class="item-input" @click="refreshBalance">{{ balanceError }}（点击重试）</text>
                    <text v-else-if="balanceInfo" class="item-input" @click="refreshBalance">{{ formatBalance(balanceInfo) }}</text>
                    <text v-else class="item-input" @click="refreshBalance">点击查询</text>
                </div>
            </div>

            <div class="section">
                <text class="section-title">模型参数</text>

                <div class="item">
                    <text class="item-text">可用模型</text>
                    <div class="models-grid">
                        <text v-for="model in availableModels" :key="model" @click="selectModel(model)"
                            :class="'item-text model model-item ' + (modelName === model ? 'model-selected' : '')">{{
                                model
                            }}</text>
                    </div>
                    <text @click="refreshModels" class="btn btn-info">刷新模型</text>
                </div>

                <div class="item">
                    <text class="item-text">温度</text>
                    <text class="item-input" @click="editTemperature">{{ temperature.toFixed(1) }}</text>
                </div>

                <div class="item">
                    <text class="item-text">TopP</text>
                    <text class="item-input" @click="editTopP">{{ topP.toFixed(1) }}</text>
                </div>

                <div class="item">
                    <text class="item-text">最大长度</text>
                    <text class="item-input" @click="editMaxTokens">{{ maxTokens }}</text>
                </div>
            </div>

            <div class="section">
                <text class="section-title">系统设置</text>

                <div class="item">
                    <text class="item-text">系统提示词</text>
                    <text class="item-textarea" @click="editSystemPrompt">{{ systemPrompt }}</text>
                </div>
            </div>

            <div class="btn-area">
                <text @click="saveSettings" class="btn btn-primary">保存</text>
            </div>
        </scroller>

        <div v-if="showConfigMenu" class="config-menu-overlay">
            <div class="config-menu-panel">
                <text class="config-menu-title">选择配置</text>
                <scroller class="config-menu-scroller" scroll-direction="vertical" :show-scrollbar="true">
                    <div>
                        <div v-for="cfg in configs" :key="cfg.id" class="config-menu-item">
                            <text class="config-menu-item-name" @click="switchConfig(cfg.id)">{{ cfg.name }}</text>
                            <text v-if="cfg.id === activeConfigId" class="config-menu-active-tag">当前</text>
                            <text class="btn btn-warning config-mini-btn" @click="renameConfig(cfg.id, cfg.name)">改名</text>
                            <text class="btn btn-danger config-mini-btn" @click="removeConfig(cfg.id)">删</text>
                        </div>
                    </div>
                </scroller>
                <div class="config-menu-actions">
                    <text class="btn btn-success" @click="createConfig">新建配置</text>
                    <text class="btn btn-info" @click="toggleConfigMenu">关闭</text>
                </div>
            </div>
        </div>

        <Loading />
        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('aiSettings.less');
</style>

<script>
import aiSettings from './aiSettings';
import Loading from '../../components/Loading.vue';
import ToastMessage from '../../components/ToastMessage.vue';
export default {
    ...aiSettings,
    components: {
        Loading,
        ToastMessage
    }
};
</script>
