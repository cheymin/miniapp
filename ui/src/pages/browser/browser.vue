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
  <scroller class="container" scroll-direction="vertical" :show-scrollbar="true">
    <div class="section">
      <text class="section-title">简易浏览器</text>
      
      <div class="item">
        <text class="item-text">输入网址:</text>
        <text class="item-input" @click="inputUrl">{{ currentUrl || '点击输入网址...' }}</text>
        <text class="btn btn-primary" @click="goToUrl">访问</text>
      </div>
      
      <div class="item">
        <text class="item-text">快捷链接</text>
      </div>
      
      <div class="quick-links">
        <text class="quick-link" @click="goToQuickLink('https://www.baidu.com')">百度</text>
        <text class="quick-link" @click="goToQuickLink('https://www.bing.com')">必应</text>
        <text class="quick-link" @click="goToQuickLink('https://www.google.com')">谷歌</text>
        <text class="quick-link" @click="goToQuickLink('https://github.com')">GitHub</text>
      </div>
    </div>
    
    <div class="section">
      <text class="section-title">浏览历史</text>
      
      <div v-if="history.length > 0">
        <div v-for="(item, index) in history" :key="index" class="history-item" @click="goToUrl(item.url)">
          <text class="history-title">{{ item.title || item.url }}</text>
          <text class="history-url">{{ item.url }}</text>
          <text class="history-time">{{ item.time }}</text>
        </div>
      </div>
      <div v-else class="empty-state">
        <text class="empty-text">暂无浏览历史</text>
      </div>
    </div>
    
    <div class="section">
      <text class="section-title">使用说明</text>
      <text class="instruction-text">1. 输入网址或点击快捷链接</text>
      <text class="instruction-text">2. 点击"访问"按钮打开网页</text>
      <text class="instruction-text">3. 浏览历史会自动保存</text>
      <text class="instruction-text">4. 点击历史记录可快速访问</text>
    </div>
    
    <Loading />
    <ToastMessage />
  </scroller>
</template>

<style lang="less" scoped>
@import url('browser.less');
</style>

<script>
import browser from './browser';
import Loading from '../../components/Loading.vue';
import ToastMessage from '../../components/ToastMessage.vue';
export default {
  ...browser,
  components: {
    Loading,
    ToastMessage
  }
};
</script>
