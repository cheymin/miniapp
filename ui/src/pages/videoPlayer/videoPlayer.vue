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
        <scroller class="scroll-area" scroll-direction="vertical" :show-scrollbar="true">
            <div class="header">
                <text class="title">视频播放器</text>
            </div>

            <div class="player-section">
                <text class="section-title">播放方式</text>
                
                <div class="mode-buttons">
                    <div 
                        class="mode-btn" 
                        :class="{ active: playMode === 'ffplay' }"
                        @click="selectPlayMode('ffplay')">
                        <text>FFplay</text>
                    </div>
                    <div 
                        class="mode-btn" 
                        :class="{ active: playMode === 'mpv' }"
                        @click="selectPlayMode('mpv')">
                        <text>MPV</text>
                    </div>
                    <div 
                        class="mode-btn" 
                        :class="{ active: playMode === 'vlc' }"
                        @click="selectPlayMode('vlc')">
                        <text>VLC</text>
                    </div>
                </div>
            </div>

            <div class="video-section">
                <text class="section-title">视频文件</text>
                
                <div class="current-video" v-if="currentVideo">
                    <text class="video-name">{{ videoName }}</text>
                    <text class="video-path">{{ currentVideo }}</text>
                </div>
                
                <div class="no-video" v-else>
                    <text class="no-video-text">未选择视频文件</text>
                </div>

                <div class="action-buttons">
                    <div class="action-btn" @click="selectVideoFile">
                        <text>选择视频</text>
                    </div>
                    <div class="action-btn" @click="scanVideos">
                        <text>扫描视频</text>
                    </div>
                </div>
            </div>

            <div class="playlist-section" v-if="playlist.length > 0">
                <text class="section-title">播放列表 ({{ playlist.length }})</text>
                
                <div class="playlist-items">
                    <div 
                        v-for="(video, index) in playlist" 
                        :key="index"
                        class="playlist-item"
                        @click="selectVideo(index)">
                        <text class="item-name">{{ video.name }}</text>
                        <text class="item-path">{{ video.path }}</text>
                    </div>
                </div>
            </div>

            <div class="control-section">
                <div class="control-buttons">
                    <div class="control-btn" @click="playVideo">
                        <text>▶ 播放</text>
                    </div>
                    <div class="control-btn" @click="stopVideo">
                        <text>⏹ 停止</text>
                    </div>
                </div>
            </div>

            <div class="info-section">
                <text class="info-text">当前模式: {{ playModeText }}</text>
                <text class="info-text">支持格式: MP4, AVI, MKV, MOV, FLV, WMV</text>
            </div>
        </scroller>
    </div>
</template>

<style lang="less" scoped>
@import url('videoPlayer.less');
</style>

<script>
import videoPlayer from './videoPlayer';
export default videoPlayer;
</script>
