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
      <text class="header-btn" @click="goBack">&lt;</text>
      <text class="header-url" @click="inputUrl">{{ currentUrl ? shortenUrl(currentUrl) : '输入网址' }}</text>
      <text class="header-btn" @click="toggleMenu">...</text>
    </div>

    <div v-if="showMenuPanel" class="menu-panel">
      <div class="menu-row">
        <text class="menu-btn" @click="goHome">首页</text>
        <text class="menu-btn" @click="refresh">刷新</text>
        <text class="menu-btn" @click="inputUrl">输入</text>
      </div>
      <div class="menu-row">
        <text class="quick-btn" @click="loadUrl('https://m.baidu.com')">百度</text>
        <text class="quick-btn" @click="loadUrl('https://m.bing.com')">必应</text>
        <text class="quick-btn" @click="loadUrl('https://m.github.com')">GitHub</text>
      </div>
      <div v-if="bookmarks.length > 0" class="bookmarks">
        <text class="bookmarks-title">收藏:</text>
        <div class="menu-row">
          <text v-for="(item, idx) in bookmarks.slice(0, 4)" :key="idx" class="quick-btn" @click="loadUrl(item.url)">{{ item.title }}</text>
        </div>
      </div>
      <text class="menu-close" @click="showMenuPanel = false">关闭</text>
    </div>

    <div v-if="!currentUrl" class="empty-state">
      <text class="empty-title">浏览器</text>
      <text class="empty-hint">点击上方输入网址</text>
      <div class="quick-grid">
        <text class="quick-item" @click="loadUrl('https://m.baidu.com')">百度</text>
        <text class="quick-item" @click="loadUrl('https://m.bing.com')">必应</text>
        <text class="quick-item" @click="loadUrl('https://m.github.com')">GitHub</text>
        <text class="quick-item" @click="loadUrl('https://m.sohu.com')">搜狐</text>
      </div>
    </div>

    <HtmlView v-else :url="currentUrl" @navigate="onNavigate" />

    <div v-if="currentUrl" class="bottom-bar">
      <text class="bottom-btn" @click="goBack">&lt; 返回</text>
      <text class="bottom-btn" @click="addToBookmarks">收藏</text>
      <text class="bottom-btn" @click="toggleMenu">菜单</text>
    </div>

    <ToastMessage />
  </div>
</template>

<style lang="less" scoped>
@import url('browser.less');
</style>

<script>
import browser from './browser';
import HtmlView from '../../components/webview.vue';
import ToastMessage from '../../components/ToastMessage.vue';
export default {
  ...browser,
  components: { HtmlView, ToastMessage }
};
</script>
