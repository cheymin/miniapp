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
      <text class="header-title">图片查看器</text>
      <text class="header-info" v-if="imageList.length > 0">{{ currentImageIndex + 1 }}/{{ imageList.length }}</text>
    </div>
    
    <div v-if="currentImageData" class="image-container">
      <div v-if="imageList.length > 1" class="nav-area nav-left" @click="prevImage">
        <text class="nav-arrow">◀</text>
      </div>
      
      <image 
        :src="currentImageData" 
        class="preview-image"
        resize="contain"
      />
      
      <div v-if="imageList.length > 1" class="nav-area nav-right" @click="nextImage">
        <text class="nav-arrow">▶</text>
      </div>
    </div>
    
    <div v-else class="empty-container">
      <text class="empty-text">未选择图片</text>
      <text class="empty-hint">请从图库中选择图片</text>
    </div>
    
    <div v-if="imageList.length > 1" class="controls">
      <text class="btn btn-nav" @click="prevImage">◀ 上一张</text>
      <text class="btn btn-nav" @click="nextImage">下一张 ▶</text>
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
