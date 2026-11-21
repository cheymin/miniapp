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
        <div class="container home">
            <div v-if="checking" class="center-box">
                <text class="hint">正在启动...</text>
            </div>

            <div v-else-if="locked" class="center-box">
                <div class="lock-card">
                    <image class="lock-icon" :src="icons.lock" :width="22" :height="22" />
                    <text class="lock-title">应用已锁定</text>
                    <text class="lock-hint">输入密码后继续使用</text>
                    <text class="unlock-btn" @click="unlock">解锁</text>
                </div>
            </div>

            <div v-else class="desk">
                <div class="clock-card">
                    <text class="clock-time">{{ clockTime }}</text>
                    <text class="clock-date">{{ clockDate }}</text>
                    <text class="clock-brand">Cheymin Pen</text>
                    <text class="clock-sub">工具中心 · v{{ version }}</text>
                </div>

                <div class="desk-right">
                    <div class="dock">
                        <div class="dock-head">
                            <text class="dock-title">快捷应用</text>
                            <text class="dock-hint">6 项工具</text>
                        </div>
                        <div class="dock-list">
                            <div v-for="app in apps" :key="app.key" class="dock-item" @click="openApp(app.key)">
                                <div :class="'dock-icon ' + app.theme">
                                    <image class="dock-img" :src="app.icon" :width="20" :height="20" />
                                </div>
                                <text class="dock-name">{{ app.name }}</text>
                            </div>
                        </div>
                    </div>

                    <div class="bottom-row">
                        <div class="focus-card" @click="openAi">
                            <text class="focus-kicker">AI 助手</text>
                            <text class="focus-title">对话 · 写作 · 翻译</text>
                            <text class="focus-arrow">打开 ›</text>
                        </div>

                        <div class="status-card" @click="openSettings">
                            <text class="status-kicker">应用版本</text>
                            <text class="status-value">v{{ version }}</text>
                            <text class="status-link">设置 ›</text>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('index.less');
</style>

<script>
import ToastMessage from '../../components/ToastMessage.vue';
import index from './index';
export default {
    ...index,
    components: {
        ToastMessage
    }
}
</script>
