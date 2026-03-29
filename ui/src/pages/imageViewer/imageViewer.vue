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
        <text class="section-title">图片查看器</text>
        
        <div class="item">
          <text class="item-text">当前目录:</text>
          <text class="item-path">{{ currentDirectory }}</text>
          <text class="btn btn-primary" @click="selectDirectory">选择目录</text>
        </div>
        
        <div class="item">
          <text class="item-text">扫描图片</text>
          <text class="btn" @click="selectImage">扫描当前目录</text>
        </div>
        
        <div v-if="currentImageData" class="image-preview">
          <image 
            :src="currentImageData" 
            :style="imageStyle"
            class="preview-image"
            resize="contain"
          />
        </div>
        
        <div v-else class="empty-state">
          <text class="empty-text">未选择图片</text>
        </div>
        
        <div v-if="imageList.length > 0" class="navigation-row">
          <text class="btn" @click="prevImage">上一张</text>
          <text class="nav-info">{{ currentImageIndex + 1 }} / {{ imageList.length }}</text>
          <text class="btn" @click="nextImage">下一张</text>
        </div>
      </div>
      
      <div v-if="currentImage" class="section">
        <text class="section-title">图片操作</text>
        
        <div class="control-row">
          <text class="control-label">缩放:</text>
          <text class="btn" @click="zoomIn">放大</text>
          <text class="btn" @click="zoomOut">缩小</text>
          <text class="btn" @click="resetZoom">重置</text>
        </div>
        
        <div class="control-row">
          <text class="control-label">旋转:</text>
          <text class="btn" @click="rotateLeft">左转</text>
          <text class="btn" @click="rotateRight">右转</text>
        </div>
        
        <div class="control-row">
          <text class="control-label">移动:</text>
          <text class="btn" @click="moveUp">上</text>
          <text class="btn" @click="moveDown">下</text>
          <text class="btn" @click="moveLeft">左</text>
          <text class="btn" @click="moveRight">右</text>
        </div>
        
        <div class="info-row">
          <text class="info-text">缩放: {{ (scale * 100).toFixed(0) }}%</text>
          <text class="info-text">旋转: {{ rotation }}°</text>
        </div>
      </div>
      
      <div class="section">
        <text class="section-title">最近图片</text>
        <div v-if="recentImages.length > 0">
          <div v-for="(img, index) in recentImages" :key="index" class="recent-item" @click="loadRecentImage(index)">
            <text class="recent-name">{{ img.name }}</text>
            <text class="recent-path">{{ img.path }}</text>
          </div>
        </div>
        <div v-else class="empty-state">
          <text class="empty-text">暂无最近图片</text>
        </div>
      </div>
    </scroller>
    
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
