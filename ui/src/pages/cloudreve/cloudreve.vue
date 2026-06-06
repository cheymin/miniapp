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
      <text v-if="isLoggedIn" class="header-btn" @click="showMenu = !showMenu">菜单</text>
    </div>

    <div v-if="showMenu" class="menu-panel">
      <text class="menu-item" @click="showMenu = false; showLoginPanel = true">账号设置</text>
      <text class="menu-item" @click="doLogout">退出登录</text>
      <text class="menu-item" @click="showMenu = false">关闭</text>
    </div>

    <!-- 登录界面 - 用scroller包裹 -->
    <scroller v-if="!isLoggedIn" class="main-scroll" scroll-direction="vertical" :show-scrollbar="true">
      <div class="login-panel">
        <text class="login-title">Cloudreve 登录</text>
        <text class="login-desc">请配置您的 Cloudreve 服务器信息</text>

        <div class="form-group">
          <text class="form-label">服务器地址</text>
          <text class="form-input" @click="inputServerUrl">{{ serverUrl || '例如: https://cloud.example.com' }}</text>
        </div>

        <div class="form-group">
          <text class="form-label">用户名</text>
          <text class="form-input" @click="inputUsername">{{ username || '输入用户名' }}</text>
        </div>

        <div class="form-group">
          <text class="form-label">密码</text>
          <text class="form-input" @click="inputPassword">{{ password ? '******' : '输入密码' }}</text>
        </div>

        <div class="form-actions">
          <text class="btn btn-primary" @click="doLogin">登录</text>
        </div>

        <div v-if="loginError" class="error-msg">
          <text class="error-text">{{ loginError }}</text>
        </div>
      </div>
    </scroller>

    <!-- 确认连接界面 - 用scroller包裹 -->
    <scroller v-else-if="showLoginPanel" class="main-scroll" scroll-direction="vertical" :show-scrollbar="true">
      <div class="login-panel">
        <text class="login-title">账号信息</text>

        <div class="form-group">
          <text class="form-label">服务器</text>
          <text class="form-value">{{ serverUrl }}</text>
        </div>

        <div class="form-group">
          <text class="form-label">用户名</text>
          <text class="form-value">{{ username }}</text>
        </div>

        <div class="form-group">
          <text class="form-label">状态</text>
          <text class="form-value connected">已连接</text>
        </div>

        <div class="form-actions">
          <text class="btn btn-primary" @click="showLoginPanel = false">返回文件</text>
          <text class="btn btn-danger" @click="doLogout">退出登录</text>
        </div>
      </div>
    </scroller>

    <!-- 文件浏览界面 -->
    <div v-else class="file-area">
      <div class="path-bar">
        <text class="path-text">{{ currentPath || '/' }}</text>
        <text class="refresh-btn" @click="refreshFiles">刷新</text>
      </div>

      <scroller class="file-list" scroll-direction="vertical" :show-scrollbar="true">
        <div v-if="files.length === 0" class="empty-state">
          <text class="empty-text">目录为空</text>
        </div>

        <div v-for="(file, index) in files" :key="index" class="file-item" @click="handleFileClick(file)">
          <text :class="['file-icon', file.type === 'dir' ? 'file-icon-dir' : 'file-icon-file']">{{ file.type === 'dir' ? 'D' : 'F' }}</text>
          <div class="file-info">
            <text class="file-name">{{ file.name }}</text>
            <text class="file-meta">{{ file.size }} · {{ file.date }}</text>
          </div>
        </div>
      </scroller>

      <div class="bottom-bar">
        <text class="bottom-btn" @click="uploadFile">上传</text>
        <text class="bottom-btn" @click="createFolder">新建文件夹</text>
      </div>
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
