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
      <text class="settings-btn" @click="toggleSettings">⚙</text>
      <text class="title">图库</text>
      <text v-if="imageList.length > 0" class="counter">{{ imageList.length }}张</text>
    </div>
    
    <div v-if="showSettingsPanel" class="settings-panel">
      <div class="settings-item">
        <text class="settings-label">当前目录:</text>
        <text class="settings-path">{{ currentDirectory }}</text>
      </div>
      
      <div class="settings-actions">
        <text class="settings-btn-action" @click="selectDirectory">选择目录</text>
      </div>
    </div>
    
    <scroller 
      v-if="imageList.length > 0" 
      class="gallery-grid" 
      scroll-direction="vertical" 
      :show-scrollbar="true"
      @scroll="handleScroll">
      <div class="grid-row" v-for="(row, rowIndex) in gridRows" :key="rowIndex">
        <div 
          v-for="(item, colIndex) in row" 
          :key="item.path"
          class="grid-item"
          @click="openImage(rowIndex * 3 + colIndex)">
          <image 
            v-if="item.thumbnail"
            :src="item.thumbnail" 
            class="thumbnail"
            resize="cover"
          />
          <div v-else class="thumbnail-placeholder">
            <text class="placeholder-icon">🖼</text>
          </div>
          <text class="image-name" :lines="1">{{ item.name }}</text>
        </div>
      </div>
      
      <div v-if="loadedCount < imageList.length" class="load-more">
        <text class="load-more-text">加载更多...</text>
      </div>
    </scroller>
    
    <div v-else class="empty-state">
      <text class="empty-icon">📁</text>
      <text class="empty-text">暂无图片</text>
      <text class="empty-hint">点击左上角设置按钮选择图片目录</text>
    </div>
    
    <Loading />
    <ToastMessage />
  </div>
</template>

<style lang="less" scoped>
@import url('gallery.less');
</style>

<script>
import gallery from './gallery';
import Loading from '../../components/Loading.vue';
import ToastMessage from '../../components/ToastMessage.vue';
export default {
  ...gallery,
  components: {
    Loading,
    ToastMessage
  }
};
</script>
