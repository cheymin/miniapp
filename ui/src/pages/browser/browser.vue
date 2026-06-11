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
      <text class="section-title">🌐 网址收藏夹</text>
      <text class="section-desc">管理常用网址，快速复制访问</text>
      
      <div class="url-input-section">
        <text class="input-label">网址输入</text>
        <div class="input-row">
          <text class="url-display" @click="inputUrl">{{ currentUrl || '点击输入网址...' }}</text>
        </div>
        <div class="button-row">
          <text class="action-btn copy-btn" @click="copyUrl">📋 复制网址</text>
          <text class="action-btn save-btn" @click="saveToBookmarks">⭐ 收藏</text>
        </div>
      </div>
    </div>
    
    <div class="section">
      <text class="section-title">⚡ 快捷链接</text>
      <div class="quick-links">
        <div class="quick-link-item" @click="copyQuickLink('https://www.baidu.com')">
          <text class="quick-link-icon">🔍</text>
          <text class="quick-link-name">百度</text>
        </div>
        <div class="quick-link-item" @click="copyQuickLink('https://www.bing.com')">
          <text class="quick-link-icon">🔎</text>
          <text class="quick-link-name">必应</text>
        </div>
        <div class="quick-link-item" @click="copyQuickLink('https://www.google.com')">
          <text class="quick-link-icon">🌐</text>
          <text class="quick-link-name">谷歌</text>
        </div>
        <div class="quick-link-item" @click="copyQuickLink('https://github.com')">
          <text class="quick-link-icon">💻</text>
          <text class="quick-link-name">GitHub</text>
        </div>
        <div class="quick-link-item" @click="copyQuickLink('https://www.bilibili.com')">
          <text class="quick-link-icon">📺</text>
          <text class="quick-link-name">B站</text>
        </div>
        <div class="quick-link-item" @click="copyQuickLink('https://www.zhihu.com')">
          <text class="quick-link-icon">💬</text>
          <text class="quick-link-name">知乎</text>
        </div>
        <div class="quick-link-item" @click="copyQuickLink('https://www.taobao.com')">
          <text class="quick-link-icon">🛒</text>
          <text class="quick-link-name">淘宝</text>
        </div>
        <div class="quick-link-item" @click="copyQuickLink('https://www.jd.com')">
          <text class="quick-link-icon">📦</text>
          <text class="quick-link-name">京东</text>
        </div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-header">
        <text class="section-title">⭐ 我的收藏</text>
        <text v-if="bookmarks.length > 0" class="clear-all-btn" @click="clearBookmarks">清空</text>
      </div>
      
      <div v-if="bookmarks.length > 0">
        <div v-for="(item, index) in bookmarks" :key="'bm-' + index" class="history-item">
          <div class="item-content">
            <text class="history-title">{{ item.title || item.url }}</text>
            <text class="history-url">{{ item.url }}</text>
            <text class="history-time">{{ item.time }}</text>
          </div>
          <div class="item-actions">
            <text class="btn-small" @click="copyHistoryUrl(item.url)">复制</text>
            <text class="btn-small btn-danger" @click="deleteBookmark(index)">删除</text>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <text class="empty-icon">📭</text>
        <text class="empty-text">暂无收藏网址</text>
        <text class="empty-hint">输入网址后点击"收藏"按钮添加</text>
      </div>
    </div>
    
    <div class="section">
      <text class="section-title">📜 浏览历史</text>
      
      <div v-if="history.length > 0">
        <div v-for="(item, index) in history" :key="'his-' + index" class="history-item">
          <div class="item-content">
            <text class="history-title">{{ item.title || item.url }}</text>
            <text class="history-url">{{ item.url }}</text>
            <text class="history-time">{{ item.time }}</text>
          </div>
          <div class="item-actions">
            <text class="btn-small" @click="copyHistoryUrl(item.url)">复制</text>
            <text class="btn-small btn-danger" @click="deleteHistory(index)">删除</text>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <text class="empty-icon">📭</text>
        <text class="empty-text">暂无浏览历史</text>
      </div>
    </div>
    
    <div class="section tips-section">
      <text class="section-title">💡 使用提示</text>
      <text class="tip-text">• 点击快捷链接快速复制网址</text>
      <text class="tip-text">• 输入网址后可复制或收藏</text>
      <text class="tip-text">• 在其他设备粘贴网址访问</text>
      <text class="tip-text">• 收藏的网址会永久保存</text>
    </div>
    
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
