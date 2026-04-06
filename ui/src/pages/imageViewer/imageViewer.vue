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
    <!-- 顶部控制栏 -->
    <div v-if="showControls" class="header">
      <text class="back-btn" @click="handleBackPress">返回</text>
      <text class="title" :lines="1">{{ imageName || '图片查看器' }}</text>
      <text class="settings-btn" @click="toggleSettings">设置</text>
    </div>
    
    <!-- 设置面板 -->
    <div v-if="showSettingsPanel" class="settings-panel">
      <text class="settings-title">设置</text>
      
      <div class="settings-section">
        <text class="section-label">选择目录</text>
        <text class="path-text">{{ currentDirectory }}</text>
        <text class="action-btn" @click="selectDirectory">选择目录</text>
      </div>
      
      <div class="settings-section">
        <text class="section-label">缩放控制</text>
        <div class="btn-row">
          <text class="control-btn" @click="zoomIn">放大</text>
          <text class="control-btn" @click="zoomOut">缩小</text>
          <text class="control-btn" @click="resetZoom">重置</text>
        </div>
      </div>
      
      <div class="settings-section">
        <text class="section-label">旋转控制</text>
        <div class="btn-row">
          <text class="control-btn" @click="rotateLeft">左转</text>
          <text class="control-btn" @click="rotateRight">右转</text>
        </div>
      </div>
      
      <div class="settings-section">
        <text class="section-label">自动播放</text>
        <div class="btn-row">
          <text class="control-btn" :class="{ 'active': autoPlayInterval === 2 }" @click="setAutoPlayInterval(2)">2秒</text>
          <text class="control-btn" :class="{ 'active': autoPlayInterval === 3 }" @click="setAutoPlayInterval(3)">3秒</text>
          <text class="control-btn" :class="{ 'active': autoPlayInterval === 5 }" @click="setAutoPlayInterval(5)">5秒</text>
        </div>
        <text class="action-btn" :class="{ 'active': autoPlayEnabled }" @click="toggleAutoPlay">
          {{ autoPlayEnabled ? '停止播放' : '开始播放' }}
        </text>
      </div>
    </div>
    
    <!-- 图片显示区域 -->
    <div v-if="currentImageData" class="image-container">
      <image 
        :src="currentImageData" 
        :style="imageStyle"
        class="preview-image"
        resize="contain"
        @click="handleImageClick"
        @touchstart="handleTouchStart"
        @touchend="handleTouchEnd"
      />
    </div>
    
    <!-- 空状态 -->
    <div v-else class="empty-state">
      <text class="empty-icon">[空]</text>
      <text class="empty-text">请选择目录</text>
      <text class="empty-hint">点击右上角设置按钮选择图片目录</text>
    </div>
    
    <!-- 底部控制栏 -->
    <div v-if="showControls && imageList.length > 0" class="footer">
      <text class="nav-btn" @click="prevImage">上一张</text>
      <text class="progress-text">{{ progressText }}</text>
      <text class="nav-btn" @click="nextImage">下一张</text>
    </div>
    
    <!-- 自动播放指示器 -->
    <div v-if="autoPlayEnabled" class="auto-play-indicator">
      <text class="indicator-text">自动播放中</text>
    </div>
    
    <Loading />
    <ToastMessage />
  </div>
</template>

<style lang="less" scoped>
@import url('imageViewer.less');
</style>

<script>
import imageViewer from './imageViewer';
import Loading from '../../components/Loading.vue';
import ToastMessage from '../../components/ToastMessage.vue';
export default {
  ...imageViewer,
  components: {
    Loading,
    ToastMessage
  }
};
</script>
