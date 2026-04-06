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
    <div class="header">
      <text class="title">录音机</text>
      <text class="counter">{{ recordings.length }}个录音</text>
    </div>
    
    <div class="recording-section">
      <text class="time-display">{{ formattedRecordingTime }}</text>
      
      <div 
        :class="['record-btn', isRecording ? 'recording' : '']"
        @click="isRecording ? stopRecording() : startRecording()">
        <text class="record-icon">{{ isRecording ? '■' : '●' }}</text>
      </div>
      
      <text class="record-hint">{{ isRecording ? '点击停止' : '点击开始录音' }}</text>
    </div>
    
    <div class="recordings-header">
      <text class="recordings-title">录音列表</text>
      <text class="save-path">{{ saveDirectory }}</text>
    </div>
    
    <scroller v-if="recordings.length > 0" class="recordings-list" scroll-direction="vertical" :show-scrollbar="true">
      <div 
        v-for="(item, index) in recordings" 
        :key="item.filepath"
        class="recording-item">
        <div class="recording-info">
          <text class="recording-name" :lines="1">{{ item.filename }}</text>
          <text class="recording-meta">{{ formatTime(item.createTime) }} · {{ formatSize(item.size) }}</text>
        </div>
        
        <div class="recording-actions">
          <text 
            :class="['action-btn', 'play-btn', currentPlayingFile === item.filepath && isPlaying ? 'active' : '']"
            @click="playRecording(item.filepath)">
            {{ currentPlayingFile === item.filepath && isPlaying ? '■' : '▶' }}
          </text>
          <text class="action-btn delete-btn" @click="deleteRecording(item.filepath)">删除</text>
        </div>
      </div>
    </scroller>
    
    <div v-else class="empty-state">
      <text class="empty-icon">[空]</text>
      <text class="empty-text">暂无录音</text>
      <text class="empty-hint">点击上方按钮开始录音</text>
    </div>
    
    <Loading />
    <ToastMessage />
  </div>
</template>

<style lang="less" scoped>
@import url('recorder.less');
</style>

<script>
import recorder from './recorder';
import Loading from '../../components/Loading.vue';
import ToastMessage from '../../components/ToastMessage.vue';
export default {
  ...recorder,
  components: {
    Loading,
    ToastMessage
  }
};
</script>
