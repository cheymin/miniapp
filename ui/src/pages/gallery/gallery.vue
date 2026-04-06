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
      <text class="title">图库</text>
      <text class="path-text" @click="selectDirectory">{{ currentPath }}</text>
    </div>
    
    <div class="actions">
      <text class="btn" @click="goToParent">上一级</text>
      <text class="btn btn-primary" @click="loadImages">刷新</text>
    </div>
    
    <scroller class="scroll-area" scroll-direction="vertical" :show-scrollbar="true">
      <div class="gallery-grid">
        <div 
          v-for="(image, index) in images" 
          :key="index"
          class="gallery-item"
          @click="openImage(image)">
          <image 
            :src="image.base64" 
            class="gallery-image"
            mode="aspectFill" />
          <text class="image-name">{{ image.name }}</text>
        </div>
      </div>
      
      <div v-if="images.length === 0" class="empty-state">
        <text class="empty-text">暂无图片</text>
        <text class="empty-hint">点击上方路径选择其他目录</text>
      </div>
    </scroller>
    
    <ToastMessage />
  </div>
</template>

<style lang="less" scoped>
@import url('gallery.less');
</style>

<script>
import gallery from './gallery';
import ToastMessage from '../../components/ToastMessage.vue';
export default {
  ...gallery,
  components: {
    ToastMessage
  }
};
</script>
