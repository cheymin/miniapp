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
      <text class="header-title">浏览器</text>
      <text class="header-btn" @click="toggleMenu">菜单</text>
    </div>

    <div v-if="showMenuPanel" class="menu-panel">
      <div class="menu-section">
        <text class="menu-section-title">导航</text>
        <div class="menu-row">
          <text class="menu-btn" @click="goHome">首页</text>
          <text class="menu-btn" @click="refresh">刷新</text>
        </div>
      </div>
      <div class="menu-section">
        <text class="menu-section-title">当前网址</text>
        <text class="menu-url">{{ currentUrl || '未加载' }}</text>
        <div class="menu-row">
          <text class="menu-btn" @click="inputUrl">输入网址</text>
          <text class="menu-btn" @click="addToBookmarks">收藏</text>
        </div>
      </div>
      <div class="menu-section">
        <text class="menu-section-title">快捷链接</text>
        <div class="quick-links">
          <text class="quick-link" @click="loadUrl('https://www.baidu.com')">百度</text>
          <text class="quick-link" @click="loadUrl('https://www.bing.com')">必应</text>
          <text class="quick-link" @click="loadUrl('https://github.com')">GitHub</text>
        </div>
      </div>
      <div v-if="bookmarks.length > 0" class="menu-section">
        <text class="menu-section-title">我的收藏</text>
        <div v-for="(item, idx) in bookmarks" :key="idx" class="bookmark-item">
          <text class="bookmark-url" @click="loadUrl(item.url)">{{ item.title || item.url }}</text>
          <text class="bookmark-del" @click="deleteBookmark(idx)">删除</text>
        </div>
      </div>
      <text class="menu-close" @click="showMenuPanel = false">关闭菜单</text>
    </div>

    <div v-if="!currentUrl" class="empty-state">
      <text class="empty-icon">🌐</text>
      <text class="empty-text">欢迎使用浏览器</text>
      <text class="empty-hint">点击菜单输入网址或选择快捷链接</text>
    </div>

    <HtmlView v-else :url="currentUrl" @navigate="onNavigate" />

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
