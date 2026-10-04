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
    <div class="container">
        <!-- 顶部状态栏 -->
        <div class="top-bar">
            <text class="back-btn" @click="$page.finish()">←</text>
            <text class="title">视频播放</text>
            <text class="state" :class="isPlaying ? 'playing' : 'stopped'">{{ stateText }}</text>
        </div>

        <scroller class="scroll-area" scroll-direction="vertical">
            <!-- 视频信息 + 渲染区占位 -->
            <div class="video-section">
                <div class="video-placeholder" v-if="!isPlaying">
                    <text class="ph-text">{{ cvplayerReady ? '⏸ 等待播放' : '⚠️ 模块未找到' }}</text>
                    <text class="ph-sub">{{ videoName || '未选择视频' }}</text>
                </div>
                <!-- 视频由硬件解码器直接画到屏幕上，不走 Falcon UI -->
                <!-- setVideoSurface(0,0,320) 把视频画在这个区域 -->
                <div class="video-placeholder playing-placeholder" v-else>
                    <text class="ph-text small">🎬 播放中 (硬解码直出)</text>
                </div>
            </div>

            <!-- 进度条 & 时间 -->
            <div class="progress-section" v-if="currentVideo">
                <text class="time">{{ formatTime(currentPosition) }}</text>
                <div class="progress-track">
                    <div class="progress-fill" :style="{ width: (currentPosition / (duration || 1) * 100) + '%' }"></div>
                </div>
                <text class="time">{{ formatTime(duration) }}</text>
            </div>

            <!-- 播放控件 -->
            <div class="controls" v-if="cvplayerReady">
                <text class="ctrl-btn" @click="seekBackward">⏪</text>
                <text class="ctrl-btn big" @click="togglePlayPause">{{ isPlaying ? '⏸' : '▶' }}</text>
                <text class="ctrl-btn" @click="stopVideo">⏹</text>
                <text class="ctrl-btn" @click="seekForward">⏩</text>
            </div>

            <!-- 选择 & 扫描 -->
            <div class="row">
                <text class="btn" @click="scanVideos">📂 扫描视频</text>
                <text class="btn" @click="selectVideoFile">📁 选择文件</text>
            </div>

            <!-- 播放列表 -->
            <div class="playlist" v-if="playlist.length > 0">
                <text class="playlist-title">播放列表 ({{ playlist.length }})</text>
                <div v-for="(v, i) in playlist" :key="i"
                     :class="['pl-item', currentVideo === v.path ? 'active' : '']"
                     @click="selectVideo(i)">
                    <text class="pl-name">{{ v.name }}</text>
                </div>
            </div>

            <!-- 调试日志 -->
            <div class="debug-section" v-if="nativeLog.length > 0">
                <text class="debug-title">🔧 调试日志</text>
                <div v-for="(line, i) in nativeLog" :key="i" class="debug-line">
                    <text>{{ line }}</text>
                </div>
            </div>
        </scroller>

        <Loading />
        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('videoPlayer.less');
</style>

<script>
import videoPlayer from './videoPlayer';
import Loading from '../../components/Loading.vue';
import ToastMessage from '../../components/ToastMessage.vue';
export default {
    ...videoPlayer,
    components: { Loading, ToastMessage }
};
</script>
