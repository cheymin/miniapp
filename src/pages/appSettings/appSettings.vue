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
        <div class="root">
            <scroller class="sidebar" scroll-direction="vertical" :show-scrollbar="false">
                <div class="sidebar-content">
                    <text class="header-title">设置</text>

                    <div class="search-bar" @click="editSearch">
                        <text class="search-icon">⌕</text>
                        <text class="search-text">{{ searchText || '搜索软件设置项' }}</text>
                    </div>

                    <div class="account-card" @click="openUpdate">
                        <div class="account-row">
                            <div class="account-avatar-placeholder">
                                <text class="avatar-placeholder-text">C</text>
                            </div>
                            <div class="account-info">
                                <text class="account-name">Cheymin Pen</text>
                                <text class="account-hint">本地模式 · v{{ version }}</text>
                            </div>
                            <text class="arrow">›</text>
                        </div>
                    </div>

                    <div class="card">
                        <div v-for="(tab, index) in visibleTabs" :key="tab.key"
                            :class="'item' + (activeTab === tab.key ? ' item-disabled' : '')"
                            @click="activeTab = tab.key">
                            <div class="icon-box">
                                <text class="item-title">{{ tab.glyph }}</text>
                            </div>
                            <div class="item-body">
                                <text class="item-title">{{ tab.name }}</text>
                                <text class="item-subtitle">{{ tab.desc }}</text>
                            </div>
                            <text class="arrow">›</text>
                        </div>
                    </div>
                </div>
            </scroller>

            <scroller class="main-panel" scroll-direction="vertical" :show-scrollbar="true">
                <div class="main-content">
                    <div v-if="activeTab === 'update'" class="page">
                        <div class="update-header">
                            <text class="app-brand">Cheymin Pen</text>
                            <text class="app-version">版本 v{{ version }} · QuickJS 20200705</text>
                        </div>
                        <div class="card">
                            <div class="item" @click="openUpdate">
                                <div class="item-body">
                                    <text class="item-title">检查更新</text>
                                    <text class="item-subtitle">从官网获取最新安装包</text>
                                </div>
                                <div class="update-status">
                                    <text class="status-txt">当前已是最新</text>
                                </div>
                            </div>
                            <div class="divider"></div>
                            <div class="item" @click="openUpdate">
                                <div class="item-body">
                                    <text class="item-title">操作日志</text>
                                    <text class="item-subtitle">系统反馈记录</text>
                                </div>
                                <text class="arrow">›</text>
                            </div>
                        </div>
                        <text class="section-title">软件版本</text>
                        <div class="card">
                            <div class="item">
                                <div class="item-body">
                                    <text class="item-title">版本号</text>
                                </div>
                                <text class="status-text">v{{ version }}</text>
                            </div>
                        </div>
                    </div>

                    <div v-else-if="activeTab === 'data'" class="page">
                        <text class="section-title">本地存储与缓存</text>
                        <div class="card">
                            <div class="item" @click="clearCache">
                                <div class="item-body">
                                    <text class="item-title">清理播放缓存</text>
                                    <text class="item-subtitle">删除临时抽帧与旧版缓存</text>
                                </div>
                                <text class="arrow">›</text>
                            </div>
                            <div class="divider"></div>
                            <div class="item" @click="clearKeyboard">
                                <div class="item-body">
                                    <text class="item-title">清除输入学习</text>
                                    <text class="item-subtitle">已记录 {{ learnedCount }} 个词，清除后候选恢复默认</text>
                                </div>
                                <text class="arrow">›</text>
                            </div>
                        </div>
                        <text class="section-title">数据管理</text>
                        <div class="card">
                            <div class="item" @click="openAiSettings">
                                <div class="item-body">
                                    <text class="item-title">AI 模型与接口</text>
                                    <text class="item-subtitle">API 密钥、基础 URL、模型参数</text>
                                </div>
                                <text class="arrow">›</text>
                            </div>
                        </div>
                    </div>

                    <div v-else-if="activeTab === 'prefs'" class="page">
                        <text class="section-title">偏好设置</text>
                        <div class="card">
                            <div class="item" @click="editPassword">
                                <div class="item-body">
                                    <text class="item-title">应用锁</text>
                                    <text class="item-subtitle">{{ hasPassword ? '已开启，启动时需要密码' : '未设置启动密码' }}</text>
                                </div>
                                <div :class="'toggle ' + (hasPassword ? 'toggle-on' : '')"
                                    :style="{ backgroundColor: hasPassword ? '#7c3aed' : '#232428' }">
                                    <div class="toggle-thumb"
                                        :style="{ transform: 'translateX(' + (hasPassword ? '18px' : '0px') + ')' }">
                                    </div>
                                </div>
                            </div>
                            <div v-if="hasPassword" class="divider"></div>
                            <div v-if="hasPassword" class="item" @click="clearPassword">
                                <div class="item-body">
                                    <text class="item-title">清除密码</text>
                                    <text class="item-subtitle">关闭应用锁</text>
                                </div>
                                <text class="arrow">›</text>
                            </div>
                        </div>
                        <text class="section-title">键盘</text>
                        <div class="card">
                            <div class="item" @click="clearKeyboard">
                                <div class="item-body">
                                    <text class="item-title">输入学习</text>
                                    <text class="item-subtitle">已记录 {{ learnedCount }} 个词</text>
                                </div>
                                <text class="arrow">›</text>
                            </div>
                        </div>
                    </div>

                    <div v-else class="page">
                        <text class="section-title">关于</text>
                        <div class="card">
                            <div class="item">
                                <div class="item-body">
                                    <text class="item-title">Cheymin Pen</text>
                                    <text class="item-subtitle">工具箱 · 笔上桌面 v{{ version }}</text>
                                </div>
                            </div>
                            <div class="divider"></div>
                            <div class="item" @click="openUpdate">
                                <div class="item-body">
                                    <text class="item-title">检查更新</text>
                                </div>
                                <text class="arrow">›</text>
                            </div>
                        </div>
                        <text class="section-title">鸣谢</text>
                        <div class="card">
                            <div v-for="(credit, index) in credits" :key="credit.name" class="item">
                                <div class="item-body">
                                    <text class="item-title">{{ credit.name }}</text>
                                    <text class="item-subtitle">{{ credit.role }}</text>
                                </div>
                                <text v-if="index === 0" class="badge-text badge">致谢</text>
                            </div>
                        </div>
                    </div>
                </div>
            </scroller>
        </div>
        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('appSettings.less');
</style>

<script>
import ToastMessage from '../../components/ToastMessage.vue';
import appSettings from './appSettings';
export default {
    ...appSettings,
    components: {
        ToastMessage
    }
}
</script>
