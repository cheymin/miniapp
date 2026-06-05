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
      <text class="header-title">Cloudreve</text>
      <text class="header-btn" @click="toggleSettings">设置</text>
    </div>

    <div v-if="showSettings" class="settings-panel">
      <div class="settings-row">
        <text class="settings-label">服务器:</text>
        <text class="settings-value" @click="inputServerUrl">{{ serverUrl || '点击设置' }}</text>
      </div>
      <div class="settings-row">
        <text class="settings-label">用户名:</text>
        <text class="settings-value" @click="inputUsername">{{ username || '点击设置' }}</text>
      </div>
      <div class="settings-row">
        <text class="settings-label">密码:</text>
        <text class="settings-value" @click="inputPassword">{{ password ? '******' : '点击设置' }}</text>
      </div>
      <div class="settings-actions">
        <text class="action-btn" @click="login">登录</text>
        <text class="action-btn action-btn-secondary" @click="toggleSettings">关闭</text>
      </div>
    </div>

    <div class="path-bar">
      <text class="path-text">{{ currentPath || '/' }}</text>
      <text class="refresh-btn" @click="refreshFiles">刷新</text>
    </div>

    <scroller class="file-list" scroll-direction="vertical" :show-scrollbar="true">
      <div v-if="!isLoggedIn" class="empty-state">
        <text class="empty-icon">Cloud</text>
        <text class="empty-text">Cloudreve 文件管理</text>
        <text class="empty-hint">请先在设置中配置服务器并登录</text>
      </div>

      <div v-else-if="files.length === 0" class="empty-state">
        <text class="empty-icon">Empty</text>
        <text class="empty-text">目录为空</text>
      </div>

      <div v-else>
        <div v-for="(file, index) in files" :key="index" class="file-item" @click="handleFileClick(file)">
          <text :class="['file-icon', file.type === 'dir' ? 'file-icon-dir' : 'file-icon-file']">{{ file.type === 'dir' ? 'D' : 'F' }}</text>
          <div class="file-info">
            <text class="file-name">{{ file.name }}</text>
            <text class="file-meta">{{ file.size }} · {{ file.date }}</text>
          </div>
        </div>
      </div>
    </scroller>

    <div v-if="isLoggedIn" class="bottom-bar">
      <text class="bottom-btn" @click="uploadFile">上传</text>
      <text class="bottom-btn" @click="createFolder">新建</text>
    </div>

    <Loading />
    <ToastMessage />
  </div>
</template>

<style lang="less" scoped>
@import url('cloudreve.less');
</style>

<script>
import cloudreve from './cloudreve';
import Loading from '../../components/Loading.vue';
import ToastMessage from '../../components/ToastMessage.vue';
export default {
  ...cloudreve,
  components: { Loading, ToastMessage }
};
</script>
