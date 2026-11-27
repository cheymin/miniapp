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
        <div class="wrapper" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd">
            <div v-if="showStartupCover" class="startup-cover" :style="{ opacity: startupCoverOpacity }">
                <div class="startup-icon" :style="{ transform: 'scale(' + startupIconScale + ')' }">
                    <text class="app-glyph">计</text>
                </div>
                <text class="startup-text">{{ startupStatusText }}</text>
            </div>

            <div v-if="page === 0" :class="'page page-apps ' + animClass">
                <scroller class="apps-h-scroller" scroll-direction="horizontal" :show-scrollbar="false">
                    <div class="h-app-list">
                        <div class="calculator-card">
                            <div class="calculator-inner">
                                <text class="sys-title">计算器</text>
                                <text class="sys-version">当前版本 {{ appVersion }}</text>

                                <div v-if="updateStep === 'idle'" class="btn-update" @click="checkUpdate">
                                    <text class="btn-update-txt">检查更新</text>
                                </div>
                                <div v-else-if="updateStep === 'checking'" class="btn-update">
                                    <text class="btn-update-txt">检查中...</text>
                                </div>
                                <div v-else class="btn-update" @click="closeUpdatePopup">
                                    <text class="btn-update-txt">已是最新</text>
                                </div>

                                <div class="btn-exit" @click="exitToCalculator">
                                    <text class="btn-update-txt">‹ 返回计算器</text>
                                </div>
                            </div>
                        </div>

                        <div v-for="app in apps" :key="app.key" class="h-app-item" @click="openApp(app.key)">
                            <div class="app-icon" :style="{ backgroundColor: app.color }">
                                <text class="app-glyph">{{ app.glyph }}</text>
                            </div>
                            <text class="app-label">{{ app.name }}</text>
                        </div>
                    </div>
                </scroller>
            </div>

            <div v-else-if="page === 1" :class="'page page-clock ' + animClass">
                <div class="screen2-container">
                    <div class="messages-section">
                        <scroller class="msg-list" scroll-direction="vertical" :show-scrollbar="false">
                            <div v-for="msg in desktopMessages" :key="msg.id" class="msg-item"
                                @click="toggleControlPanel">
                                <div class="msg-icon-box" :style="{ backgroundColor: msg.color }">
                                    <text class="msg-icon-txt">{{ msg.glyph }}</text>
                                </div>
                                <div class="msg-content">
                                    <div class="msg-title-row">
                                        <text class="msg-title">{{ msg.title }}</text>
                                        <text class="msg-time">{{ msg.time }}</text>
                                    </div>
                                    <text class="msg-desc">{{ msg.desc }}</text>
                                </div>
                                <div v-if="msg.count" class="msg-count-dot">
                                    <text class="msg-count-txt">{{ msg.count > 99 ? '99+' : msg.count }}</text>
                                </div>
                            </div>
                        </scroller>
                    </div>

                    <div class="clock-section">
                        <div class="clock-widget" @click="toggleControlPanel">
                            <text class="time-text">{{ time }}</text>
                            <div class="date-row">
                                <text class="date-text">{{ date }}</text>
                            </div>
                            <div class="account-status-row">
                                <div class="account-status-avatar">
                                    <text class="account-status-avatar-txt">C</text>
                                </div>
                                <text class="account-status-name">{{ accountName }}</text>
                                <text class="account-status-money">{{ userInfo.money }}</text>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div v-else :class="'page page-media ' + animClass">
                <div class="media-card">
                    <div class="bg-overlay"></div>
                    <div class="media-content">
                        <div class="media-left">
                            <div class="info-area">
                                <div class="cover cover-fallback">
                                    <text class="app-glyph">♫</text>
                                </div>
                                <div class="text-area">
                                    <text class="song-title">{{ songTitle }}</text>
                                    <text class="song-subtitle">{{ songSubtitle }}</text>
                                </div>
                            </div>

                            <div class="progress-area">
                                <div class="audio-seekbar seekbar-track">
                                    <div class="seekbar-fill" :style="{ width: '0%' }"></div>
                                </div>
                                <div class="time-text-box">
                                    <text class="time-text-small">{{ audioTimeText }}</text>
                                    <text class="time-text-small">{{ audioDurationText }}</text>
                                </div>
                            </div>

                            <div class="control-area">
                                <div class="btn-text-group" @click="toggleQueueDrawer">
                                    <text class="btn-text">列表</text>
                                </div>
                                <div class="btn-icon" @click="togglePlaylistDrawer">
                                    <text class="btn-text">歌单</text>
                                </div>
                                <div class="btn-play" @click="togglePlay">
                                    <text class="btn-play-icon">{{ audioPlaying ? '❚❚' : '▶' }}</text>
                                </div>
                                <div class="btn-icon" @click="doNext">
                                    <text class="btn-text">下一首</text>
                                </div>
                                <div class="btn-text-group">
                                    <text class="btn-speed">1.0x</text>
                                </div>
                            </div>
                        </div>

                        <div class="media-right">
                            <div class="empty-lyric">
                                <text class="lyric-line">上滑/下滑切换桌面</text>
                                <text class="lyric-active">桌面后台播放引擎已就绪</text>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="showControlPanel" :class="'cp-overlay ' + controlPanelAnimClass" @click="toggleControlPanel">
                <div class="cp-panel" @click.stop="noop">
                    <div class="cp-content">
                        <div class="cp-left">
                            <text class="cp-section-title">通知中心</text>
                            <scroller class="cp-msg-list" scroll-direction="vertical" :show-scrollbar="false">
                                <div v-for="msg in desktopMessages" :key="msg.id" class="cp-msg-item">
                                    <div class="cp-msg-icon-box" :style="{ backgroundColor: msg.color }">
                                        <text class="cp-msg-icon-txt">{{ msg.glyph }}</text>
                                    </div>
                                    <div class="cp-msg-content">
                                        <div class="cp-msg-title-row">
                                            <text class="cp-msg-title">{{ msg.title }}</text>
                                            <text class="cp-msg-time">{{ msg.time }}</text>
                                        </div>
                                        <text class="cp-msg-desc">{{ msg.desc }}</text>
                                    </div>
                                </div>
                                <div v-if="!desktopMessages.length" class="cp-empty-msg">
                                    <text class="cp-empty-txt">暂无通知</text>
                                </div>
                            </scroller>
                        </div>

                        <div class="cp-right">
                            <text class="cp-section-title">控制中心</text>
                            <div class="cp-grid">
                                <div class="cp-btn" @click="doScreenshot">
                                    <text class="cp-btn-txt">截屏</text>
                                </div>
                                <div class="cp-btn" @click="doCamera">
                                    <text class="cp-btn-txt">相机</text>
                                </div>
                                <div :class="'cp-btn' + (audioPlaying ? ' cp-btn-active' : '')" @click="togglePlay">
                                    <text class="cp-btn-txt">{{ audioPlaying ? '暂停' : '播放' }}</text>
                                </div>
                                <div class="cp-btn" @click="doNext">
                                    <text class="cp-btn-txt">下一首</text>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="showUpdatePopup" class="update-popup-overlay">
                <div class="update-popup-card">
                    <text class="popup-title">{{ updateStep === 'latest' ? '已是最新版本' : '发现新版本' }}</text>
                    <text class="popup-desc">当前版本 {{ appVersion }}</text>
                    <div class="popup-actions">
                        <text class="btn-now" @click="closeUpdatePopup">确定</text>
                    </div>
                </div>
            </div>
        </div>
        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('desktop.less');
</style>

<script>
import ToastMessage from '../../components/ToastMessage.vue';
import desktop from './desktop';
export default {
    ...desktop,
    components: {
        ToastMessage
    }
}
</script>
