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
      <text class="header-btn" @click="toggleSettings">菜单</text>
      <text class="title">{{ imageName || '图片查看器' }}</text>
      <text v-if="imageList.length > 0" class="counter">{{ currentImageIndex + 1 }}/{{ imageList.length }}</text>
    </div>

    <!-- 全屏覆盖式菜单弹窗：用 scroller 包裹，所有内容都可滚动 -->
    <div v-if="showSettingsPanel" class="menu-overlay">
      <div class="menu-header">
        <text class="menu-title">菜单</text>
        <text class="menu-close" @click="toggleSettings">✕</text>
      </div>
      <scroller class="menu-scroller" scroll-direction="vertical" :show-scrollbar="true">
        <div class="menu-content">
          <text class="menu-section-title">目录</text>
          <text class="menu-path">{{ currentDirectory }}</text>
          <div class="menu-row">
            <text class="menu-btn" @click="selectDirectory">选择目录</text>
            <text class="menu-btn" @click="scanImages">扫描图片</text>
          </div>

          <template v-if="currentImage">
            <text class="menu-section-title">图片操作</text>
            <div class="menu-row">
              <text class="menu-btn" @click="rotateLeft">左转</text>
              <text class="menu-btn" @click="rotateRight">右转</text>
              <text class="menu-btn" @click="resetView">重置</text>
            </div>
            <div class="menu-row">
              <text class="menu-btn" @click="toggleSlideshow">{{ isSlideshow ? '停止幻灯片' : '幻灯片' }}</text>
              <text class="menu-btn" @click="toggleImageInfo">信息</text>
            </div>
            <div class="menu-row">
              <text class="menu-btn" @click="renameImage">重命名</text>
              <text class="menu-btn menu-btn-danger" @click="deleteImage">删除</text>
            </div>
          </template>

          <template v-if="showImageInfo && currentImage">
            <text class="menu-section-title">图片信息</text>
            <text class="menu-info">文件: {{ imageName }}</text>
            <text class="menu-info">大小: {{ formatFileSize(imageSize) }}</text>
            <text class="menu-info">路径: {{ currentImage }}</text>
            <text class="menu-info">缩放: {{ Math.round(scale * 100) }}%</text>
          </template>
        </div>
      </scroller>
    </div>

    <div v-if="currentImageData" class="image-area">
      <scroller class="image-scroller" scroll-direction="vertical" :show-scrollbar="false">
        <scroller class="image-scroller-h" scroll-direction="horizontal" :show-scrollbar="false">
          <image
            :src="currentImageData"
            :style="imageStyle"
            class="preview-image"
            resize="contain"
          />
        </scroller>
      </scroller>

      <div class="swipe-hint" v-if="imageList.length > 1">
        <text class="swipe-arrow" @click="prevImage">&lt;</text>
        <text class="swipe-text">滑动切换</text>
        <text class="swipe-arrow" @click="nextImage">&gt;</text>
      </div>
    </div>

    <div v-else class="empty-state">
      <text class="empty-icon">📁</text>
      <text class="empty-text">请选择图片目录</text>
      <text class="empty-hint">点击菜单 → 选择目录</text>
    </div>

    <div v-if="currentImageData" class="zoom-bar">
      <text class="zoom-label" @click="zoomOut">-</text>
      <div class="zoom-track">
        <div class="zoom-fill" :style="{ width: zoomPercent + '%' }"></div>
        <div class="zoom-thumb" :style="{ left: zoomPercent + '%' }" @touchstart="onThumbTouchStart" @touchmove="onThumbTouchMove" @touchend="onThumbTouchEnd"></div>
      </div>
      <text class="zoom-label" @click="zoomIn">+</text>
      <text class="zoom-value">{{ Math.round(scale * 100) }}%</text>
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
