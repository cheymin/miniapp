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
        <text class="input-field" @click="inputUrl">{{ currentUrl || '输入网址...' }}</text>
      </div>
      <div class="input-actions">
        <text class="input-btn go-btn" @click="goToUrl">访问</text>
        <text class="input-btn cancel-btn" @click="showInputPanel = false">取消</text>
      </div>
    </div>

    <!-- 菜单面板 -->
    <div v-if="showMenu" class="menu-panel">
      <div class="menu-item" @click="goHome">
        <text class="menu-text">🏠 首页</text>
      </div>
      <div class="menu-item" @click="refresh">
        <text class="menu-text">🔄 刷新</text>
      </div>
      <div class="menu-item" @click="addBookmark">
        <text class="menu-text">⭐ 收藏</text>
      </div>
      <div class="menu-item" @click="showBookmarksList">
        <text class="menu-text">📋 收藏夹</text>
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
          <text class="bookmark-del" @click="deleteBookmark(idx)">✕</text>
        </div>
        <div v-if="bookmarks.length === 0" class="empty-tip">
          <text class="empty-text">暂无收藏</text>
        </div>
      </scroller>
    </div>

    <!-- 主内容区 -->
    <div v-if="!currentUrl" class="home-content">
      <text class="home-title">🌐 迷你浏览器</text>
      
      <div class="search-box" @click="showInputPanel = true">
        <text class="search-placeholder">点击输入网址...</text>
      </div>

      <div class="site-grid">
        <div class="site-item" @click="loadUrl('http://m.baidu.com')">
          <text class="site-icon">🔍</text>
          <text class="site-name">百度</text>
        </div>
        <div class="site-item" @click="loadUrl('http://m.bing.com')">
          <text class="site-icon">🔎</text>
          <text class="site-name">必应</text>
        </div>
        <div class="site-item" @click="loadUrl('http://m.github.com')">
          <text class="site-icon">💻</text>
          <text class="site-name">GitHub</text>
        </div>
        <div class="site-item" @click="loadUrl('http://m.bilibili.com')">
          <text class="site-icon">📺</text>
          <text class="site-name">B站</text>
        </div>
      </div>
    </div>

    <!-- 网页内容 -->
    <HtmlView v-else :url="currentUrl" @navigate="onNavigate" />

    <!-- 底部状态栏 -->
    <div v-if="currentUrl" class="status-bar">
      <text class="status-btn" @click="goBack">&lt; 返回</text>
      <text class="status-btn" @click="addBookmark">⭐</text>
      <text class="status-btn" @click="toggleMenu">≡</text>
    </div>

    <ToastMessage />
  </div>
</template>

<style lang="less" scoped>
.container {
  width: 172px;
  height: 560px;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.toolbar {
  height: 32px;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 0 4px;
  background-color: #4a90d9;
}

.nav-btn {
  font-size: 14px;
  color: #ffffff;
  padding: 4px 6px;
}

.url-bar {
  flex: 1;
  height: 22px;
  margin: 0 4px;
  padding: 0 6px;
  background-color: rgba(255,255,255,0.2);
  border-radius: 10px;
  display: flex;
  align-items: center;
}

.url-text {
  font-size: 9px;
  color: #ffffff;
  lines: 1;
}

.input-panel {
  position: absolute;
  top: 32px;
  left: 0;
  right: 0;
  background-color: #ffffff;
  padding: 6px;
  border-bottom-width: 1px;
  border-bottom-color: #e0e0e0;
  border-bottom-style: solid;
  z-index: 100;
}

.input-row {
  margin-bottom: 6px;
}

.input-field {
  font-size: 10px;
  color: #333333;
  padding: 5px 6px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.input-actions {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
}

.input-btn {
  font-size: 10px;
  color: #ffffff;
  padding: 4px 10px;
  border-radius: 4px;
  margin-left: 6px;
}

.go-btn {
  background-color: #4a90d9;
}

.cancel-btn {
  background-color: #999999;
}

.menu-panel {
  position: absolute;
  top: 32px;
  right: 0;
  width: 120px;
  background-color: #ffffff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  z-index: 100;
}

.menu-item {
  height: 32px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  border-bottom-width: 1px;
  border-bottom-color: #f0f0f0;
  border-bottom-style: solid;
}

.menu-text {
  font-size: 11px;
  color: #333333;
}

.menu-close {
  display: block;
  font-size: 10px;
  color: #999999;
  text-align: center;
  padding: 8px;
}

.bookmarks-panel {
  position: absolute;
  top: 32px;
  left: 0;
  right: 0;
  bottom: 32px;
  background-color: #ffffff;
  z-index: 100;
}

.panel-header {
  height: 28px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 0 8px;
  border-bottom-width: 1px;
  border-bottom-color: #e0e0e0;
  border-bottom-style: solid;
}

.panel-title {
  font-size: 11px;
  color: #333333;
  font-weight: bold;
}

.panel-close {
  font-size: 12px;
  color: #999999;
}

.bookmarks-list {
  flex: 1;
}

.bookmark-item {
  height: 28px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 0 8px;
  border-bottom-width: 1px;
  border-bottom-color: #f0f0f0;
  border-bottom-style: solid;
}

.bookmark-name {
  font-size: 10px;
  color: #333333;
  flex: 1;
  lines: 1;
}

.bookmark-del {
  font-size: 10px;
  color: #e74c3c;
  padding: 4px 6px;
}

.empty-tip {
  padding: 20px;
  text-align: center;
}

.empty-text {
  font-size: 10px;
  color: #999999;
}

.home-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  background-color: #ffffff;
}

.home-title {
  font-size: 14px;
  color: #333333;
  font-weight: bold;
  margin-top: 20px;
  margin-bottom: 10px;
}

.search-box {
  width: 150px;
  height: 28px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f5f5f5;
  border-radius: 14px;
  margin-bottom: 15px;
}

.search-placeholder {
  font-size: 10px;
  color: #999999;
}

.site-grid {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
}

.site-item {
  width: 70px;
  height: 55px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin: 4px;
  background-color: #f9f9f9;
  border-radius: 6px;
}

.site-icon {
  font-size: 18px;
  margin-bottom: 3px;
}

.site-name {
  font-size: 9px;
  color: #666666;
}

.status-bar {
  height: 32px;
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  align-items: center;
  background-color: #ffffff;
  border-top-width: 1px;
  border-top-color: #e0e0e0;
  border-top-style: solid;
}

.status-btn {
  font-size: 10px;
  color: #4a90d9;
  padding: 4px 6px;
}
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
