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
      <text class="header-title">min-AI</text>
      <text class="header-btn" @click="clearChat">清空</text>
    </div>

    <scroller ref="chatScroller" class="chat-area" scroll-direction="vertical" :show-scrollbar="true">
      <div v-if="messages.length === 0" class="welcome">
        <text class="welcome-icon">AI</text>
        <text class="welcome-text">min-AI 助手</text>
        <text class="welcome-hint">点击下方输入框开始对话</text>
      </div>

      <div v-for="(msg, index) in messages" :key="index" :class="['msg-row', msg.role === 'user' ? 'msg-row-user' : 'msg-row-ai']">
        <text v-if="msg.role === 'ai'" class="avatar avatar-ai">AI</text>
        <div :class="['bubble', msg.role === 'user' ? 'bubble-user' : 'bubble-ai']">
          <text class="bubble-text">{{ msg.content }}</text>
        </div>
        <text v-if="msg.role === 'user'" class="avatar avatar-user">Me</text>
      </div>

      <div v-if="isGenerating" class="msg-row msg-row-ai">
        <text class="avatar avatar-ai">AI</text>
        <div class="bubble bubble-ai">
          <text class="bubble-text">{{ streamingContent || '思考中...' }}</text>
        </div>
      </div>
    </scroller>

    <div class="input-bar">
      <text class="input-field" @click="openInput">{{ currentInput || '输入消息...' }}</text>
      <text v-if="!isGenerating" :class="['send-btn', currentInput.trim() ? 'send-btn-active' : 'send-btn-disabled']" @click="sendMessage">发送</text>
      <text v-else class="send-btn send-btn-stop" @click="stopGeneration">停止</text>
    </div>

    <ToastMessage />
  </div>
</template>

<style lang="less" scoped>
@import url('minAi.less');
</style>

<script>
import minAi from './minAi';
import ToastMessage from '../../components/ToastMessage.vue';
export default {
  ...minAi,
  components: { ToastMessage }
};
</script>
