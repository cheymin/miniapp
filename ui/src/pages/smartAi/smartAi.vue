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
      <text class="header-title">智能助手</text>
      <text class="header-btn" @click="showSettings = true">设置</text>
    </div>

    <scroller class="messages-area" scroll-direction="vertical" :show-scrollbar="true">
      <div v-if="messages.length === 0" class="welcome">
        <text class="welcome-icon">AI</text>
        <text class="welcome-title">智能助手</text>
        <text class="welcome-desc">我可以帮你回答问题</text>
      </div>
      
      <div v-for="(msg, idx) in messages" :key="idx" :class="'msg-row ' + (msg.role === 'user' ? 'msg-user' : 'msg-ai')">
        <div :class="'msg-bubble ' + msg.role">
          <text class="msg-text">{{ msg.content }}</text>
        </div>
      </div>
      
      <div v-if="isThinking" class="msg-row msg-ai">
        <div class="msg-bubble ai thinking">
          <text class="msg-text">思考中...</text>
        </div>
      </div>
    </scroller>

    <div class="input-area">
      <text class="input-box" @click="openInput">{{ inputText || '输入消息...' }}</text>
      <text class="send-btn" @click="sendMessage">发送</text>
    </div>

    <div v-if="showSettings" class="settings-panel">
      <div class="settings-header">
        <text class="settings-title">设置</text>
        <text class="settings-close" @click="showSettings = false">X</text>
      </div>
      <div class="settings-content">
        <div class="setting-item">
          <text class="setting-label">API地址:</text>
          <text class="setting-value" @click="editApiUrl">{{ apiUrl || '点击设置' }}</text>
        </div>
        <div class="setting-item">
          <text class="setting-label">API密钥:</text>
          <text class="setting-value" @click="editApiKey">{{ apiKey ? '已设置' : '点击设置' }}</text>
        </div>
        <div class="setting-item">
          <text class="setting-label">模型:</text>
          <text class="setting-value" @click="editModel">{{ model }}</text>
        </div>
        <div class="setting-actions">
          <text class="setting-btn" @click="clearHistory">清空对话</text>
          <text class="setting-btn" @click="saveSettings">保存设置</text>
        </div>
      </div>
    </div>

    <ToastMessage />
  </div>
</template>

<style lang="less" scoped>
@import url('smartAi.less');
</style>

<script>
import smartAi from './smartAi';
import ToastMessage from '../../components/ToastMessage.vue';
export default {
  ...smartAi,
  components: { ToastMessage }
};
</script>
