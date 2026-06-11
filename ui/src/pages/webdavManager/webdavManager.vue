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
    <div class="header">
      <text class="header-title">WebDAV文件管理</text>
      <text class="header-btn" @click="showSettings = true">设置</text>
    </div>

    <!-- 路径导航 -->
    <div class="path-bar">
      <text class="nav-btn" @click="goBack">&lt;</text>
      <scroller class="path-scroller" scroll-direction="horizontal" :show-scrollbar="false">
        <text class="path-text">{{ currentPath || '/' }}</text>
      </scroller>
    </div>

    <!-- 文件列表 -->
    <scroller class="file-list" scroll-direction="vertical" :show-scrollbar="true">
      <div v-if="!isConnected" class="empty-state">
        <text class="empty-text">未连接WebDAV服务器</text>
        <text class="empty-hint">点击右上角"设置"配置连接</text>
      </div>

      <div v-else-if="isLoading" class="loading-state">
        <text class="loading-text">加载中...</text>
      </div>

      <div v-else-if="files.length === 0" class="empty-state">
        <text class="empty-text">目录为空</text>
      </div>

      <div v-else>
        <div v-for="(file, idx) in files" :key="idx" class="file-item" @click="openItem(file)">
          <text class="file-icon">{{ file.isDirectory ? '📁' : '📄' }}</text>
          <div class="file-info">
            <text class="file-name">{{ file.name }}</text>
            <text class="file-meta">{{ file.size }}</text>
          </div>
        </div>
      </div>
    </scroller>

    <!-- 操作栏 -->
    <div class="action-bar">
      <text class="action-btn" @click="refreshList">刷新</text>
      <text class="action-btn" @click="createFolder">新建</text>
    </div>

    <!-- 设置面板 -->
    <div v-if="showSettings" class="modal-overlay" @click="showSettings = false">
      <div class="modal-content" @click.stop="">
        <text class="modal-title">WebDAV设置</text>
        
        <div class="form-item">
          <text class="form-label">服务器地址</text>
          <text class="form-input" @click="editServerUrl">{{ serverUrl || '点击输入' }}</text>
        </div>
        
        <div class="form-item">
          <text class="form-label">用户名</text>
          <text class="form-input" @click="editUsername">{{ username || '点击输入' }}</text>
        </div>
        
        <div class="form-item">
          <text class="form-label">密码</text>
          <text class="form-input" @click="editPassword">{{ password ? '******' : '点击输入' }}</text>
        </div>

        <div class="modal-buttons">
          <text class="modal-btn btn-primary" @click="saveSettings">保存</text>
          <text class="modal-btn" @click="testConnection">测试</text>
          <text class="modal-btn btn-danger" @click="showSettings = false">取消</text>
        </div>
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

.header {
  height: 36px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 0 8px;
  background-color: #4a90d9;
}

.header-title {
  font-size: 14px;
  color: #ffffff;
  font-weight: bold;
}

.header-btn {
  font-size: 12px;
  color: #ffffff;
  padding: 4px 8px;
  background-color: rgba(255,255,255,0.2);
  border-radius: 4px;
}

.path-bar {
  height: 28px;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 0 4px;
  background-color: #ffffff;
  border-bottom-width: 1px;
  border-bottom-color: #e0e0e0;
  border-bottom-style: solid;
}

.nav-btn {
  font-size: 14px;
  color: #4a90d9;
  padding: 2px 6px;
}

.path-scroller {
  flex: 1;
  height: 20px;
}

.path-text {
  font-size: 10px;
  color: #333333;
  lines: 1;
}

.file-list {
  flex: 1;
  background-color: #ffffff;
}

.empty-state, .loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.empty-text {
  font-size: 12px;
  color: #666666;
  margin-bottom: 4px;
}

.empty-hint {
  font-size: 10px;
  color: #999999;
}

.loading-text {
  font-size: 12px;
  color: #666666;
}

.file-item {
  height: 40px;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 0 6px;
  border-bottom-width: 1px;
  border-bottom-color: #f0f0f0;
  border-bottom-style: solid;
}

.file-icon {
  font-size: 16px;
  margin-right: 6px;
}

.file-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.file-name {
  font-size: 11px;
  color: #333333;
  lines: 1;
}

.file-meta {
  font-size: 9px;
  color: #999999;
  lines: 1;
}

.action-bar {
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

.action-btn {
  font-size: 11px;
  color: #4a90d9;
  padding: 4px 12px;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  width: 160px;
  background-color: #ffffff;
  border-radius: 8px;
  padding: 10px;
}

.modal-title {
  font-size: 13px;
  color: #333333;
  font-weight: bold;
  text-align: center;
  margin-bottom: 10px;
}

.form-item {
  margin-bottom: 8px;
}

.form-label {
  font-size: 10px;
  color: #666666;
  margin-bottom: 2px;
}

.form-input {
  font-size: 10px;
  color: #333333;
  padding: 5px 6px;
  background-color: #f5f5f5;
  border-radius: 4px;
  border-width: 1px;
  border-color: #e0e0e0;
  border-style: solid;
}

.modal-buttons {
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  margin-top: 10px;
  flex-wrap: wrap;
}

.modal-btn {
  font-size: 10px;
  color: #666666;
  padding: 5px 10px;
  background-color: #f5f5f5;
  border-radius: 4px;
  margin: 2px;
}

.btn-primary {
  color: #ffffff;
  background-color: #4a90d9;
}

.btn-danger {
  color: #ffffff;
  background-color: #e74c3c;
}
</style>

<script>
import webdavManager from './webdavManager';
import ToastMessage from '../../components/ToastMessage.vue';
export default {
  ...webdavManager,
  components: { ToastMessage }
};
</script>
