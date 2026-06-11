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
    <div class="toolbar">
      <text class="nav-btn" @click="goBack">&lt;</text>
      <div class="url-bar" @click="editUrl">
        <text class="url-text">{{ currentUrl || '输入网址' }}</text>
      </div>
      <text class="nav-btn" @click="goUrl">Go</text>
    </div>

    <div v-if="currentUrl" class="webview-wrapper">
      <HtmlView :url="currentUrl"/>
    </div>
    <div v-else class="home">
      <text class="title">浏览器</text>
      <div class="quick-sites">
        <text class="qs-btn" @click="loadUrl('http://m.baidu.com')">百度</text>
        <text class="qs-btn" @click="loadUrl('http://m.bing.com')">必应</text>
        <text class="qs-btn" @click="loadUrl('http://m.github.com')">GitHub</text>
        <text class="qs-btn" @click="loadUrl('http://m.bilibili.com')">B站</text>
      </div>
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

.webview-wrapper {
  flex: 1;
}

.home {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 10px;
  background-color: #ffffff;
}

.title {
  font-size: 16px;
  color: #333;
  font-weight: bold;
  margin-bottom: 20px;
}

.quick-sites {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
}

.qs-btn {
  font-size: 11px;
  color: #4a90d9;
  padding: 6px 12px;
  margin: 4px;
  background-color: #f0f7ff;
  border-radius: 4px;
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