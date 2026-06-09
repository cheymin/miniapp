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
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <text class="nav-btn" @click="goBack">&lt;</text>
      <div class="url-bar" @click="showInputPanel = true">
        <text class="url-text">{{ displayUrl }}</text>
      </div>
      <text class="nav-btn" @click="toggleMenu">≡</text>
    </div>

    <!-- 输入面板 -->
    <div v-if="showInputPanel" class="input-panel">
      <div class="input-row">
        <text class="input-label">网址:</text>
        <text class="input-field" @click="inputUrl">{{ currentUrl || '输入网址...' }}</text>
      </div>
      <div class="input-actions">
        <text class="input-btn go-btn" @click="goToUrl">访问</text>
        <text class="input-btn cancel-btn" @click="showInputPanel = false">取消</text>
      </div>
    </div>

    <!-- 菜单面板 -->
    <div v-if="showMenu" class="menu-panel">
      <div class="menu-header">
        <text class="menu-title">浏览器菜单</text>
      </div>
      <div class="menu-grid">
        <div class="menu-item" @click="goHome">
          <text class="menu-icon">🏠</text>
          <text class="menu-text">首页</text>
        </div>
        <div class="menu-item" @click="refresh">
          <text class="menu-icon">🔄</text>
          <text class="menu-text">刷新</text>
        </div>
        <div class="menu-item" @click="addBookmark">
          <text class="menu-icon">⭐</text>
          <text class="menu-text">收藏</text>
        </div>
        <div class="menu-item" @click="showBookmarksList">
          <text class="menu-icon">📋</text>
          <text class="menu-text">收藏夹</text>
        </div>
      </div>
      <div class="quick-sites">
        <text class="quick-title">快捷网站</text>
        <div class="quick-row">
          <text class="quick-site" @click="loadUrl('https://m.baidu.com')">百度</text>
          <text class="quick-site" @click="loadUrl('https://m.bing.com')">必应</text>
          <text class="quick-site" @click="loadUrl('https://m.github.com')">GitHub</text>
        </div>
      </div>
      <text class="menu-close" @click="showMenu = false">关闭菜单</text>
    </div>

    <!-- 收藏夹列表 -->
    <div v-if="showBookmarks" class="bookmarks-panel">
      <div class="panel-header">
        <text class="panel-title">我的收藏</text>
        <text class="panel-close" @click="showBookmarks = false">✕</text>
      </div>
      <scroller class="bookmarks-list" scroll-direction="vertical" :show-scrollbar="true">
        <div v-for="(item, idx) in bookmarks" :key="idx" class="bookmark-item">
          <text class="bookmark-name" @click="loadUrl(item.url)">{{ item.title }}</text>
          <text class="bookmark-del" @click="deleteBookmark(idx)">删除</text>
        </div>
        <div v-if="bookmarks.length === 0" class="empty-tip">
          <text class="empty-text">暂无收藏</text>
        </div>
      </scroller>
    </div>

    <!-- 主内容区 -->
    <div v-if="!currentUrl" class="home-content">
      <text class="home-title">🌐 迷你浏览器</text>
      <text class="home-subtitle">专为小屏幕设计</text>
      
      <div class="search-box" @click="showInputPanel = true">
        <text class="search-placeholder">点击输入网址搜索...</text>
      </div>

      <div class="site-grid">
        <div class="site-item" @click="loadUrl('https://m.baidu.com')">
          <text class="site-icon">🔍</text>
          <text class="site-name">百度</text>
        </div>
        <div class="site-item" @click="loadUrl('https://m.bing.com')">
          <text class="site-icon">🔎</text>
          <text class="site-name">必应</text>
        </div>
        <div class="site-item" @click="loadUrl('https://m.github.com')">
          <text class="site-icon">💻</text>
          <text class="site-name">GitHub</text>
        </div>
        <div class="site-item" @click="loadUrl('https://m.bilibili.com')">
          <text class="site-icon">📺</text>
          <text class="site-name">B站</text>
        </div>
        <div class="site-item" @click="loadUrl('https://m.zhihu.com')">
          <text class="site-icon">💬</text>
          <text class="site-name">知乎</text>
        </div>
        <div class="site-item" @click="loadUrl('https://m.sohu.com')">
          <text class="site-icon">📰</text>
          <text class="site-name">搜狐</text>
        </div>
      </div>
    </div>

    <!-- 网页内容 -->
    <HtmlView v-else :url="currentUrl" @navigate="onNavigate" />

    <!-- 底部状态栏 -->
    <div v-if="currentUrl" class="status-bar">
      <text class="status-btn" @click="goBack">&lt; 返回</text>
      <text class="status-btn" @click="addBookmark">⭐ 收藏</text>
      <text class="status-btn" @click="toggleMenu">≡ 菜单</text>
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
