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
      <text class="title">AI 聊天</text>
      <text class="clear-btn" @click="clearChat">清空</text>
    </div>
    
    <scroller class="messages-container" scroll-direction="vertical" :show-scrollbar="false">
      <div class="messages-list">
        <div 
          v-for="(msg, index) in messages" 
          :key="index"
          :class="['message-wrapper', msg.role === 'user' ? 'user-wrapper' : 'assistant-wrapper']">
          
          <div :class="['message-bubble', msg.role === 'user' ? 'user-bubble' : 'assistant-bubble']">
            <text class="message-text">{{ msg.content }}</text>
            <text class="message-time">{{ formatTime(msg.timestamp) }}</text>
          </div>
          
        </div>
        
        <div v-if="isStreaming" class="message-wrapper assistant-wrapper">
          <div class="message-bubble assistant-bubble">
            <text class="message-text typing">正在输入...</text>
          </div>
        </div>
      </div>
    </scroller>
    
    <div class="input-container">
      <input 
        v-model="inputText"
        class="input-field"
        type="text"
        placeholder="输入消息..."
        @confirm="sendMessage"
      />
      <text 
        class="send-btn" 
        :class="{ 'disabled': !inputText.trim() || isStreaming }"
        @click="sendMessage">
        发送
      </text>
    </div>
  </div>
</template>

<style lang="less" scoped>
@import url('chat.less');
</style>

<script>
import chat from './chat';
export default chat;
</script>
