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
      <text class="header-btn" @click="toggleMenu">菜单</text>
      <text class="title">{{ imageName || '图片查看器' }}</text>
      <text v-if="imageList.length > 0" class="counter">{{ currentImageIndex + 1 }}/{{ imageList.length }}</text>
    </div>

    <!-- 菜单面板 - 用scroller包裹防止内容溢出 -->
    <scroller v-if="showMenuPanel" class="menu-scroll" scroll-direction="vertical" :show-scrollbar="true">
      <div class="menu-panel">
        <div class="menu-section">
          <text class="menu-section-title">目录</text>
          <div class="menu-row">
            <text class="menu-path">{{ currentDirectory }}</text>
          </div>
          <div class="menu-row">
            <text class="menu-btn" @click="selectDirectory">选择目录</text>
            <text class="menu-btn" @click="scanImages">扫描图片</text>
          </div>
        </div>
        <div v-if="currentImage" class="menu-section">
          <text class="menu-section-title">缩放 {{ Math.round(scale * 100) }}%</text>
          <div class="menu-row">
            <text class="menu-btn" @click="zoomOut">缩小</text>
            <text class="menu-btn" @click="resetView">重置</text>
            <text class="menu-btn" @click="zoomIn">放大</text>
          </div>
        </div>
        <div v-if="currentImage" class="menu-section">
          <text class="menu-section-title">操作</text>
          <div class="menu-row">
            <text class="menu-btn" @click="rotateLeft">左转</text>
            <text class="menu-btn" @click="rotateRight">右转</text>
          </div>
          <div class="menu-row">
            <text class="menu-btn" @click="toggleSlideshow">{{ isSlideshow ? '停止幻灯片' : '幻灯片' }}</text>
            <text class="menu-btn" @click="toggleImageInfo">信息</text>
          </div>
          <div class="menu-row">
            <text class="menu-btn" @click="renameImage">重命名</text>
            <text class="menu-btn btn-danger" @click="deleteImage">删除</text>
          </div>
        </div>
      </div>
    </scroller>

    <div v-if="showImageInfo && currentImage" class="info-panel">
      <text class="info-item">文件: {{ imageName }}</text>
      <text class="info-item">大小: {{ formatFileSize(imageSize) }}</text>
      <text class="info-item">路径: {{ currentImage }}</text>
      <text class="info-item">缩放: {{ Math.round(scale * 100) }}%</text>
      <text class="menu-btn" @click="toggleImageInfo">关闭</text>
    </div>

    <!-- 图片区域 - 双向scroller实现滑动查看 -->
    <div v-if="currentImageData" class="image-area">
      <div class="nav-btn nav-left" @click="prevImage">
        <text class="nav-arrow">&lt;</text>
      </div>

      <scroller class="image-scroller-v" scroll-direction="vertical" :show-scrollbar="false">
        <scroller class="image-scroller-h" scroll-direction="horizontal" :show-scrollbar="false">
          <image
            :src="currentImageData"
            :style="imageStyle"
            class="preview-image"
            resize="contain"
          />
        </scroller>
      </scroller>

      <div class="nav-btn nav-right" @click="nextImage">
        <text class="nav-arrow">&gt;</text>
      </div>
    </div>

    <div v-else class="empty-state">
      <text class="empty-icon">IMG</text>
      <text class="empty-text">请选择图片目录</text>
      <text class="empty-hint">点击菜单 → 选择目录</text>
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
