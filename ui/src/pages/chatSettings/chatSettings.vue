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
        <div class="settings-container">
            <div class="top-bar">
                <text class="top-btn" @click="handleBackPress">←</text>
                <text class="top-title">设置</text>
                <text class="top-btn-placeholder"></text>
            </div>

            <scroller class="settings-scroller" scroll-direction="vertical" :show-scrollbar="true">
                <div class="settings-content">
                    <div class="setting-section">
                        <text class="section-label">当前配置</text>
                        <div class="setting-item" @click="toggleConfigMenu">
                            <text class="item-label">配置名称</text>
                            <text class="item-value">{{ activeConfigName || '无配置' }}</text>
                            <text class="item-chevron">{{ showConfigMenu ? '▲' : '▼' }}</text>
                        </div>
                        <div class="btn-row">
                            <text class="mini-btn btn-success" @click="createConfig">新建</text>
                            <text class="mini-btn btn-warning"
                                @click="renameConfig(activeConfigId, activeConfigName)">改名</text>
                            <text class="mini-btn btn-danger" @click="removeConfig(activeConfigId)">删除</text>
                        </div>
                    </div>

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

                    <div class="setting-section">
                        <text class="section-label">余额查询</text>
                        <div class="setting-item" @click="editAccessToken">
                            <text class="item-label">访问令牌</text>
                            <text class="item-value">{{ accessToken ? '***' : '点击设置' }}</text>
                        </div>
                        <div class="setting-item" @click="editUserId">
                            <text class="item-label">用户 ID</text>
                            <text class="item-value">{{ userId || '点击设置' }}</text>
                        </div>
                        <div class="setting-item" @click="refreshBalance">
                            <text class="item-label">账户余额</text>
                            <text v-if="balanceLoading" class="item-value">查询中...</text>
                            <text v-else-if="balanceError" class="item-value">{{ balanceError }}</text>
                            <text v-else-if="balanceInfo" class="item-value">{{ formatBalance(balanceInfo)
                                }}</text>
                            <text v-else class="item-value">点击查询</text>
                        </div>
                    </div>

                    <div class="save-btn-row">
                        <text class="save-btn" @click="saveSettings">保存设置</text>
                    </div>
                </div>
            </scroller>
        </div>

        <div v-if="showConfigMenu" class="config-menu-overlay">
            <div class="config-menu-panel">
                <text class="config-menu-title">选择配置</text>
                <scroller class="config-menu-scroller" scroll-direction="vertical" :show-scrollbar="true">
                    <div>
                        <div v-for="cfg in configs" :key="cfg.id" class="config-menu-item">
                            <text class="config-menu-name" @click="switchConfig(cfg.id)">{{ cfg.name }}</text>
                            <text v-if="cfg.id === activeConfigId" class="config-menu-active">●</text>
                            <text class="config-mini-btn btn-warning"
                                @click="renameConfig(cfg.id, cfg.name)">改</text>
                            <text class="config-mini-btn btn-danger" @click="removeConfig(cfg.id)">删</text>
                        </div>
                    </div>
                </scroller>
                <div class="config-menu-footer">
                    <text class="mini-btn btn-success" @click="createConfig">新建</text>
                    <text class="mini-btn btn-info" @click="toggleConfigMenu">关闭</text>
                </div>
            </div>
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
