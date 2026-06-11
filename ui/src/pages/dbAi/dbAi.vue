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
    <!-- 顶部标题栏 -->
    <div class="header">
      <text class="header-title">DB-AI 助手</text>
      <text class="header-btn" @click="clearHistory">清空</text>
    </div>

    <!-- 消息列表 -->
    <scroller ref="msgScroller" class="messages-area" scroll-direction="vertical" :show-scrollbar="true">
      <div v-if="messages.length === 0" class="welcome-area">
        <text class="welcome-icon">🤖</text>
        <text class="welcome-title">DB-AI 助手</text>
        <text class="welcome-desc">数据存储在本地DB文件</text>
        <text class="welcome-hint">点击下方输入框开始对话</text>
      </div>

      <div v-for="(msg, idx) in messages" :key="idx" :class="['msg-row', msg.role === 'user' ? 'msg-right' : 'msg-left']">
        <div v-if="msg.role === 'assistant'" class="avatar avatar-ai">AI</div>
        
        <div :class="['bubble', msg.role === 'user' ? 'bubble-user' : 'bubble-ai']">
          <text class="bubble-text">{{ msg.content }}</text>
        </div>
        
        <div v-if="msg.role === 'user'" class="avatar avatar-user">Me</div>
      </div>

      <div v-if="isGenerating" class="msg-row msg-left">
        <div class="avatar avatar-ai">AI</div>
        <div class="bubble bubble-ai">
          <text class="bubble-text">{{ streamingText || '思考中...' }}</text>
        </div>
      </div>
    </scroller>

    <!-- 输入区域 -->
    <div class="input-area">
      <text class="input-box" @click="openKeyboard">{{ inputText || '输入消息...' }}</text>
      <text v-if="!isGenerating" :class="['send-btn', inputText.trim() ? 'send-active' : 'send-disabled']" @click="sendMsg">发送</text>
      <text v-else class="send-btn send-stop" @click="stopGen">停止</text>
    </div>

    <ToastMessage />
  </div>
</template>

<style lang="less" scoped>
.container {
  width: 320px;
  height: 240px;
  display: flex;
  flex-direction: column;
  background-color: #f0f0f0;
}

.header {
  height: 28px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 0 10px;
  background-color: #6c5ce7;
}

.header-title {
  font-size: 14px;
  color: #ffffff;
  font-weight: bold;
}

.header-btn {
  font-size: 11px;
  color: #ffffff;
  padding: 3px 8px;
  background-color: rgba(255,255,255,0.2);
  border-radius: 4px;
}

.messages-area {
  flex: 1;
  background-color: #ffffff;
}

.welcome-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.welcome-icon {
  font-size: 36px;
  margin-bottom: 8px;
}

.welcome-title {
  font-size: 16px;
  color: #333333;
  font-weight: bold;
  margin-bottom: 4px;
}

.welcome-desc {
  font-size: 10px;
  color: #6c5ce7;
  margin-bottom: 4px;
}

.welcome-hint {
  font-size: 10px;
  color: #999999;
}

.msg-row {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  padding: 6px 8px;
}

.msg-left {
  justify-content: flex-start;
}

.msg-right {
  justify-content: flex-end;
}

.avatar {
  width: 24px;
  height: 24px;
  border-radius: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 9px;
  color: #ffffff;
}

.avatar-ai {
  background-color: #6c5ce7;
  margin-right: 6px;
}

.avatar-user {
  background-color: #00b894;
  margin-left: 6px;
}

.bubble {
  max-width: 220px;
  padding: 6px 10px;
  border-radius: 8px;
}

.bubble-ai {
  background-color: #f0f0f0;
}

.bubble-user {
  background-color: #6c5ce7;
}

.bubble-text {
  font-size: 11px;
  color: #333333;
  lines: 0;
}

.bubble-user .bubble-text {
  color: #ffffff;
}

.input-area {
  height: 32px;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 0 8px;
  background-color: #ffffff;
  border-top-width: 1px;
  border-top-color: #e0e0e0;
  border-top-style: solid;
}

.input-box {
  flex: 1;
  height: 24px;
  font-size: 11px;
  color: #333333;
  padding: 0 8px;
  background-color: #f5f5f5;
  border-radius: 12px;
  lines: 1;
}

.send-btn {
  font-size: 11px;
  color: #ffffff;
  padding: 4px 12px;
  border-radius: 12px;
  margin-left: 8px;
}

.send-active {
  background-color: #6c5ce7;
}

.send-disabled {
  background-color: #cccccc;
}

.send-stop {
  background-color: #e74c3c;
}
</style>

<script>
import dbAi from './dbAi';
import ToastMessage from '../../components/ToastMessage.vue';
export default {
  ...dbAi,
  components: { ToastMessage }
};
</script>
