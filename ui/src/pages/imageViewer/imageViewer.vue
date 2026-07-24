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
  <div class="viewer">
    <!-- 顶栏(可隐藏) -->
    <div v-if="showControls && hasImage" class="top-bar">
      <text class="top-btn" @click="handleBackPress">‹</text>
      <text class="top-title" :lines="1">{{ imageName || '图片查看器' }}</text>
      <text v-if="imageCount > 0" class="top-counter">{{ currentImageIndex + 1 }}/{{ imageCount }}</text>
      <text v-else class="top-btn" @click="showMenu = true">≡</text>
    </div>

    <!-- 图片区 -->
    <div v-if="hasImage" class="image-area"
      @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd">
      <scroller class="pan-scroll" scroll-direction="vertical" :show-scrollbar="false">
        <scroller class="pan-scroll-h" scroll-direction="horizontal" :show-scrollbar="false">
          <image
            :src="currentImageData"
            :style="imageStyle"
            class="preview-image"
            resize="contain"
          />
        </scroller>
      </scroller>

      <!-- 幻灯片指示 -->
      <div v-if="isSlideshow" class="slideshow-badge">
        <text class="slideshow-text">▶ 幻灯片播放中</text>
      </div>

      <!-- 左右翻页(可隐藏) -->
      <div v-if="showControls && imageCount > 1" class="nav-arrow nav-arrow-left" @click="prevImage">
        <text class="nav-arrow-icon">‹</text>
      </div>
      <div v-if="showControls && imageCount > 1" class="nav-arrow nav-arrow-right" @click="nextImage">
        <text class="nav-arrow-icon">›</text>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <text class="empty-icon">🖼</text>
      <text class="empty-title">图片查看器</text>
      <text class="empty-hint">长按或点击菜单选择图片目录</text>
      <text class="empty-btn" @click="selectDirectory">选择目录</text>
    </div>

    <!-- 底部缩放栏(可隐藏) -->
    <div v-if="showControls && hasImage" class="bottom-bar">
      <text class="zoom-icon" @click="zoomOut">−</text>
      <div class="zoom-track">
        <div class="zoom-fill" :style="{ width: zoomPercent + '%' }"></div>
        <div class="zoom-thumb" :style="{ left: zoomPercent + '%' }"
          @touchstart="onThumbTouchStart" @touchmove="onThumbTouchMove" @touchend="onThumbTouchEnd"></div>
      </div>
      <text class="zoom-icon" @click="zoomIn">+</text>
      <text class="zoom-value">{{ Math.round(scale * 100) }}%</text>
      <text class="zoom-reset" @click="resetView">⟳</text>
    </div>

    <!-- 长按菜单 -->
    <div v-if="showMenu" class="menu-mask" @click="showMenu = false">
      <div class="menu-card" @click.stop="noop">
        <div class="menu-card-header">
          <text class="menu-card-title">操作</text>
          <text class="menu-card-close" @click="showMenu = false">✕</text>
        </div>

        <div class="menu-grid">
          <text class="menu-grid-btn" @click="rotateLeft">↺ 左转</text>
          <text class="menu-grid-btn" @click="rotateRight">↻ 右转</text>
          <text class="menu-grid-btn" @click="resetView">⟳ 重置</text>
          <text class="menu-grid-btn" @click="toggleSlideshow">{{ isSlideshow ? '⏹ 停止' : '▶ 幻灯片' }}</text>
          <text class="menu-grid-btn" @click="toggleImageInfo">ℹ 信息</text>
          <text class="menu-grid-btn" @click="renameImage">✎ 重命名</text>
          <text class="menu-grid-btn menu-grid-danger" @click="deleteImage">🗑 删除</text>
        </div>

        <div class="menu-divider"></div>
        <text class="menu-section-label">目录</text>
        <text class="menu-path" :lines="2">{{ currentDirectory }}</text>
        <div class="menu-row">
          <text class="menu-row-btn" @click="selectDirectory">选择目录</text>
          <text class="menu-row-btn" @click="scanImages">扫描图片</text>
        </div>

        <template v-if="showImageInfo">
          <div class="menu-divider"></div>
          <text class="menu-section-label">图片信息</text>
          <text class="menu-info">文件: {{ imageName }}</text>
          <text class="menu-info">大小: {{ formatFileSize(imageSize) }}</text>
          <text class="menu-info">路径: {{ currentImage }}</text>
          <text class="menu-info">缩放: {{ Math.round(scale * 100) }}%</text>
        </template>
      </div>
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
