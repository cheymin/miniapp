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
      <text class="settings-btn" @click="toggleSettings">设置</text>
      <text class="title">{{ imageName || '图片查看器' }}</text>
      <text v-if="imageList.length > 0" class="counter">{{ currentImageIndex + 1 }}/{{ imageList.length }}</text>
    </div>
    
    <div v-if="showSettingsPanel" class="settings-panel">
      <div class="settings-item">
        <text class="settings-label">当前目录:</text>
        <text class="settings-path">{{ currentDirectory }}</text>
      </div>
      
      <div class="settings-actions">
        <text class="settings-btn-action" @click="selectDirectory">选择目录</text>
      </div>
      
      <div v-if="currentImage" class="settings-section">
        <text class="settings-section-title">图片操作</text>
        
        <div class="control-row">
          <text class="btn-small" @click="zoomIn">放大</text>
          <text class="btn-small" @click="zoomOut">缩小</text>
          <text class="btn-small" @click="resetZoom">重置</text>
        </div>
        
        <div class="control-row">
          <text class="btn-small" @click="rotateLeft">左转</text>
          <text class="btn-small" @click="rotateRight">右转</text>
        </div>
        
        <div class="control-row">
          <text class="btn-small" @click="moveUp">上</text>
          <text class="btn-small" @click="moveDown">下</text>
          <text class="btn-small" @click="moveLeft">左</text>
          <text class="btn-small" @click="moveRight">右</text>
        </div>
      </div>
    </div>
    
    <div v-if="currentImageData" class="image-container">
      <div class="nav-left" @click="prevImage">
        <text class="nav-arrow">‹</text>
      </div>
      
      <image 
        :src="currentImageData" 
        :style="imageStyle"
        class="preview-image"
        resize="contain"
        @click="handleImageClick"
        @touchstart="handleTouchStart"
        @touchend="handleTouchEnd"
      />
      
      <div class="nav-right" @click="nextImage">
        <text class="nav-arrow">›</text>
      </div>
    </div>
    
    <div v-else class="empty-state">
      <text class="empty-icon">[空]</text>
      <text class="empty-text">请选择目录</text>
      <text class="empty-hint">点击左上角设置按钮选择图片目录</text>
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
