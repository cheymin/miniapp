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
    <!-- 顶部导航栏 -->
    <div class="header">
      <text class="header-btn" @click="goBack">←</text>
      <text class="url-bar" @click="showUrlEditor">{{ url }}</text>
      <text class="header-btn" @click="showUrlEditor">✎</text>
    </div>

    <!-- WebView 内容区 -->
    <div class="webview-area">
      <webview :key="webviewKey" ref="webview" :url="url" />
    </div>

    <!-- 底部工具栏 -->
    <div class="toolbar">
      <text
        :class="['toolbar-btn', historyIndex <= 0 ? 'toolbar-btn-disabled' : '']"
        @click="goBackPage"
      >←</text>
      <text
        :class="['toolbar-btn', historyIndex >= history.length - 1 ? 'toolbar-btn-disabled' : '']"
        @click="goForward"
      >→</text>
      <text class="toolbar-btn" @click="refresh">↻</text>
    </div>

    <!-- URL 编辑弹窗 -->
    <div v-if="showUrlInput" class="url-overlay">
      <div class="url-dialog">
        <text class="url-dialog-title">输入网址</text>
        <text class="url-input-display" @click="openUrlKeyboard">{{ tempUrl || 'https://' }}</text>
        <div class="url-dialog-buttons">
          <text @click="cancelUrlEdit" class="dialog-btn dialog-btn-cancel">取消</text>
          <text @click="confirmUrlEdit" class="dialog-btn dialog-btn-confirm">确定</text>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
@import url('webBrowser.less');
</style>

<script>
import webBrowser from './webBrowser';
import webview from '../../components/webview.vue';
export default {
  ...webBrowser,
  components: {
    webview,
  },
};
</script>