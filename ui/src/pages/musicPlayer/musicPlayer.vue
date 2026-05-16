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
        <text class="section-title">音乐播放器</text>
        
        <div v-if="currentSong" class="now-playing">
          <text class="song-title">{{ songName }}</text>
          <text class="song-artist">{{ artist }}</text>
          
          <div class="progress-section">
            <text class="time-text">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</text>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
            </div>
          </div>
          
          <div class="player-controls">
            <div class="control-btn" @click="previousSong">
              <text>上一首</text>
            </div>
            <div class="control-btn control-btn-large" @click="togglePlay">
              <text>{{ isPlaying ? '暂停' : '播放' }}</text>
            </div>
            <div class="control-btn" @click="nextSong">
              <text>下一首</text>
            </div>
          </div>
          
          <div class="player-controls">
            <div class="control-btn" @click="decreaseVolume">
              <text>音量-</text>
            </div>
            <text class="volume-text">{{ volume }}%</text>
            <div class="control-btn" @click="increaseVolume">
              <text>音量+</text>
            </div>
          </div>
          
          <div class="player-controls">
            <div class="control-btn" @click="toggleMode">
              <text>{{ playModeText }}</text>
            </div>
          </div>
        </div>
        
        <div v-else class="empty-state">
          <text class="empty-text">未选择音乐</text>
        </div>
      </div>
      
      <div class="section">
        <text class="section-title">播放列表</text>
        
        <div class="item">
          <text class="item-text">当前目录:</text>
          <text class="item-path">{{ currentDirectory }}</text>
          <div class="btn btn-primary" @click="selectDirectory">
            <text>选择目录</text>
          </div>
        </div>
        
        <div class="item">
          <text class="item-text">扫描音乐</text>
          <div class="btn" @click="scanMusic">
            <text>扫描当前目录</text>
          </div>
        </div>
        
        <div v-if="playlist.length > 0">
          <div v-for="(song, index) in playlist" :key="index" 
               :class="['song-item', currentIndex === index ? 'song-item-active' : '']"
               @click="playSong(index)">
            <text class="song-item-name">{{ song.name }}</text>
            <text class="song-item-duration">{{ song.duration }}</text>
          </div>
        </div>
        <div v-else class="empty-state">
          <text class="empty-text">暂无音乐文件</text>
        </div>
      </div>
    </scroller>
    
    <Loading />
    <ToastMessage />
  </div>
</template>

<style lang="less" scoped>
@import url('musicPlayer.less');
</style>

<script>
import musicPlayer from './musicPlayer';
import Loading from '../../components/Loading.vue';
import ToastMessage from '../../components/ToastMessage.vue';
export default {
  ...musicPlayer,
  components: {
    Loading,
    ToastMessage
  }
};
</script>
