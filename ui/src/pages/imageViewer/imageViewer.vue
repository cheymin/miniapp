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
      <text class="top-btn" @click="showMenu = true">≡</text>
    </div>

    <!-- 图片区 -->
    <div v-if="hasImage" class="image-area"
      @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd" @click="onImageClick">
      <scroller class="pan-scroll" scroll-direction="vertical" :show-scrollbar="false">
        <scroller class="pan-scroll-h" scroll-direction="horizontal" :show-scrollbar="false">
          <image :src="currentImageData" :style="imageStyle" class="preview-image" resize="contain" />
        </scroller>
      </scroller>

      <!-- 翻页箭头(controls显示时,可靠浏览) -->
      <div v-if="showControls && imageCount > 1" class="nav-arrow nav-arrow-left" @click="prevImage">
        <text class="nav-arrow-icon">‹</text>
      </div>
      <div v-if="showControls && imageCount > 1" class="nav-arrow nav-arrow-right" @click="nextImage">
        <text class="nav-arrow-icon">›</text>
      </div>

      <div v-if="isSlideshow" class="slideshow-badge">
        <text class="slideshow-text">▶ 幻灯片</text>
      </div>
    </div>

    <!-- 持久≡按钮:controls隐藏时也显示,保证随时能打开菜单(修复"隐藏UI回不来") -->
    <text v-if="hasImage && !showControls" class="float-menu-btn" @click="restoreControls">≡</text>

    <!-- 空状态 -->
    <div v-if="!hasImage" class="empty-state">
      <text class="empty-icon">◇</text>
      <text class="empty-title">图片查看器</text>
      <text class="empty-hint">点击菜单选择图片目录</text>
      <text class="empty-btn" @click="selectDirectory">选择目录</text>
      <text class="empty-btn empty-btn-ghost" @click="showMenu = true">菜单</text>
    </div>

    <!-- 全屏覆盖式菜单(图片列表/缩放/旋转等都在这里) -->
    <div v-if="showMenu" class="menu-overlay">
      <div class="menu-header">
        <text class="menu-title">菜单</text>
        <text class="menu-close" @click="showMenu = false">✕</text>
      </div>
      <scroller class="menu-scroller" scroll-direction="vertical" :show-scrollbar="true">
        <div class="menu-content">
          <template v-if="hasImage">
            <text class="menu-section-title">缩放</text>
            <div class="menu-row">
              <text class="menu-btn" @click="zoomOut">− 缩小</text>
              <text class="menu-btn menu-btn-info">{{ Math.round(scale * 100) }}%</text>
              <text class="menu-btn" @click="zoomIn">+ 放大</text>
            </div>
            <div class="menu-row">
              <text class="menu-btn" @click="resetView">⟳ 重置</text>
              <text class="menu-btn" @click="rotateLeft">↺ 左转</text>
              <text class="menu-btn" @click="rotateRight">↻ 右转</text>
            </div>

            <text class="menu-section-title">平移</text>
            <div class="menu-row">
              <text class="menu-btn" @click="panLeft">← 左移</text>
              <text class="menu-btn" @click="panRight">→ 右移</text>
            </div>
            <div class="menu-row">
              <text class="menu-btn" @click="panUp">↑ 上移</text>
              <text class="menu-btn" @click="panDown">↓ 下移</text>
            </div>

            <text class="menu-section-title">操作</text>
            <div class="menu-row">
              <text class="menu-btn" @click="toggleSlideshow">{{ isSlideshow ? '⏹ 停止' : '▶ 幻灯片' }}</text>
              <text class="menu-btn" @click="toggleImageInfo">i 信息</text>
            </div>
            <div class="menu-row">
              <text class="menu-btn" @click="renameImage">✎ 重命名</text>
              <text class="menu-btn menu-btn-danger" @click="deleteImage">✕ 删除</text>
            </div>
          </template>

          <template v-if="showImageInfo && hasImage">
            <text class="menu-section-title">图片信息</text>
            <text class="menu-info">文件: {{ imageName }}</text>
            <text class="menu-info">大小: {{ formatFileSize(imageSize) }}</text>
            <text class="menu-info">路径: {{ currentImage }}</text>
          </template>

          <text class="menu-section-title">目录</text>
          <text class="menu-path" :lines="2">{{ currentDirectory }}</text>
          <div class="menu-row">
            <text class="menu-btn" @click="selectDirectory">选择目录</text>
            <text class="menu-btn" @click="scanImages">扫描图片</text>
          </div>
        </div>
      </scroller>
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
