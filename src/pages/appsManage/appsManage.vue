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
        <div class="container am">
            <div class="am-head">
                <text class="am-back" @click="goBack">返回</text>
                <text class="am-title">应用管理</text>
                <text class="am-count">{{ summary }}</text>
                <text class="am-action" @click="toggleFilter">{{ showSystem ? '全部' : '三方' }}</text>
                <text class="am-action" @click="load()">刷新</text>
                <text class="am-action am-action-primary" @click="installPackage">安装</text>
            </div>

            <div class="am-sub">
                <text class="am-path">{{ registryPath || '扫描安装目录' }}</text>
                <text class="am-hint">桌面开关重启后生效</text>
            </div>

            <scroller class="am-list" scroll-direction="vertical" :show-scrollbar="true">
                <div v-for="app in visibleApps" :key="app.appid" class="am-row">
                    <div :class="'am-icon ' + iconTheme(app)">
                        <text class="am-icon-text">{{ glyph(app) }}</text>
                        <image v-if="app.icon" class="am-icon-img am-icon-overlay" :src="iconUrl(app)"
                            :width="30" :height="30" />
                    </div>

                    <div class="am-main">
                        <text class="am-name">{{ app.name }}</text>
                        <text class="am-meta">{{ app.appid }} · {{ versionText(app) }} · {{ app.categoryLabel }}{{ app.protected ? ' · 受保护' : '' }}</text>
                    </div>

                    <text :class="'am-btn' + (app.self ? ' am-btn-disabled' : '')"
                        @click.stop="launch(app)">{{ app.self ? '当前' : '启动' }}</text>
                    <text :class="'am-btn' + (canToggleDesktop(app) ? '' : ' am-btn-disabled')"
                        @click.stop="toggleDesktop(app)">{{ app.desktop ? '隐藏' : '显示' }}</text>
                    <text :class="'am-btn am-btn-danger' + (app.protected ? ' am-btn-disabled' : '')"
                        @click.stop="askUninstall(app)">卸载</text>
                </div>

                <text v-if="loading" class="am-empty">读取中…</text>
                <text v-else-if="!visibleApps.length" class="am-empty">
                    {{ apps.length ? '没有第三方应用，点右上角切换到全部' : '没有读取到已安装应用' }}
                </text>
            </scroller>
        </div>

        <div v-if="confirmApp" class="am-mask">
            <div class="am-dialog">
                <text class="am-dialog-title">确认卸载</text>
                <text class="am-dialog-name">{{ confirmApp.name }}</text>
                <text class="am-dialog-text">{{ confirmApp.appid }} · {{ confirmApp.categoryLabel }}</text>
                <text class="am-dialog-hint">卸载后应用数据可能一并删除。</text>
                <div class="am-dialog-actions">
                    <text class="am-dialog-btn" @click="cancelUninstall">取消</text>
                    <text class="am-dialog-btn am-dialog-danger" @click="confirmUninstall">卸载</text>
                </div>
            </div>
        </div>

        <div v-if="busy" class="am-mask">
            <div class="am-busy-card">
                <text class="am-busy-text">{{ busyText }}</text>
            </div>
        </div>

        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('appsManage.less');
</style>

<script>
import ToastMessage from '../../components/ToastMessage.vue';
import appsManage from './appsManage';
export default {
    ...appsManage,
    components: {
        ToastMessage
    }
}
</script>
