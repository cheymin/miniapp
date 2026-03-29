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
      <div class="section">
        <text class="section-title">视频播放器</text>
        
        <div class="item">
          <text class="item-text">当前目录:</text>
          <text class="item-path">{{ currentDirectory }}</text>
          <text class="btn btn-primary" @click="selectDirectory">选择目录</text>
        </div>
        
        <div class="item">
          <text class="item-text">扫描视频</text>
          <text class="btn" @click="selectVideo">扫描当前目录</text>
        </div>
        
        <div v-if="currentVideo" class="video-info">
          <text class="video-name">{{ videoName }}</text>
          <text class="video-path">{{ currentVideo }}</text>
        </div>
        
        <div v-if="videoList.length > 0" class="navigation-row">
          <text class="btn" @click="prevVideo">上一个</text>
          <text class="nav-info">{{ currentVideoIndex + 1 }} / {{ videoList.length }}</text>
          <text class="btn" @click="nextVideo">下一个</text>
        </div>
      </div>
      
      <div v-if="currentVideo" class="section">
        <text class="section-title">播放控制</text>
        
        <div class="player-controls">
          <div class="progress-bar">
            <text class="progress-text">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</text>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
            </div>
          </div>
          
          <div class="control-buttons">
            <text class="control-btn" @click="seekBackward">-10s</text>
            <text class="control-btn control-btn-large" @click="togglePlay">{{ isPlaying ? '暂停' : '播放' }}</text>
            <text class="control-btn" @click="seekForward">+10s</text>
          </div>
          
          <div class="control-buttons">
            <text class="control-btn" @click="decreaseVolume">音量-</text>
            <text class="volume-text">{{ volume }}%</text>
            <text class="control-btn" @click="increaseVolume">音量+</text>
          </div>
          
          <div class="control-buttons">
            <text class="control-btn" @click="changeSpeed">速度: {{ playbackSpeed }}x</text>
          </div>
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
  components: {
    Loading,
    ToastMessage
  }
};
</script>
