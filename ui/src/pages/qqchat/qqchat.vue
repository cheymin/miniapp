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
            <text class="header-title">QQ聊天</text>
            <text class="header-btn" @click="showSettings = true">⚙️</text>
        </div>

        <div v-if="!isConfigured" class="config-panel">
            <text class="config-title">配置Napcat连接</text>
            <div class="config-item">
                <text class="config-label">服务器地址</text>
                <input class="config-input" v-model="serverUrl" placeholder="http://localhost:3000" />
            </div>
            <div class="config-item">
                <text class="config-label">Access Token</text>
                <input class="config-input" v-model="accessToken" placeholder="输入Access Token" type="password" />
            </div>
            <div class="config-item">
                <text class="config-label">QQ号</text>
                <input class="config-input" v-model="userId" placeholder="输入QQ号" />
            </div>
            <div class="config-btn" @click="saveConfig">
                <text class="config-btn-text">保存配置</text>
            </div>
        </div>

        <div v-else-if="currentSession" class="chat-view">
            <div class="chat-header">
                <text class="back-btn" @click="backToList">◀️</text>
                <text class="chat-title">{{ currentSession.name }}</text>
            </div>
            
            <scroller class="message-list" scroll-direction="vertical" :show-scrollbar="true" @scroll="onScroll">
                <div class="message-item" v-for="(msg, index) in currentSession.messages" :key="index">
                    <div :class="['message-bubble', msg.isSelf ? 'self' : 'other']">
                        <text class="message-sender">{{ msg.senderName }}</text>
                        <text v-if="msg.type === 'text'" class="message-content">{{ formatMessage(msg.content) }}</text>
                        <text v-else-if="msg.type === 'image'" class="message-unsupported">[图片消息]</text>
                        <text v-else class="message-unsupported">[不支持的消息类型]</text>
                        <text class="message-time">{{ formatTime(msg.timestamp) }}</text>
                    </div>
                </div>
            </scroller>

            <div class="input-area">
                <input class="message-input" v-model="inputMessage" placeholder="输入消息..." @confirm="sendMessage" />
                <div class="send-btn" @click="sendMessage">
                    <text class="send-btn-text">发送</text>
                </div>
            </div>
        </div>

        <div v-else class="session-list">
            <div v-if="sessions.length > 0">
                <div class="session-item" v-for="(session, index) in sessions" :key="index" @click="openSession(session.id)">
                    <div class="session-avatar">
                        <text class="avatar-text">{{ session.name.charAt(0) }}</text>
                    </div>
                    <div class="session-info">
                        <text class="session-name">{{ session.name }}</text>
                        <text class="session-last">{{ session.lastMessage }}</text>
                    </div>
                    <div class="session-meta">
                        <text class="session-time">{{ formatTime(session.lastTime) }}</text>
                        <div v-if="session.unreadCount > 0" class="unread-badge">
                            <text class="unread-count">{{ session.unreadCount }}</text>
                        </div>
                    </div>
                </div>
            </div>
            <div v-else class="empty-state">
                <text class="empty-text">暂无聊天记录</text>
                <text class="empty-hint">连接Napcat后开始聊天</text>
            </div>
        </div>

        <div v-if="showSettings" class="settings-modal" @click="showSettings = false">
            <div class="settings-content" @click.stop>
                <text class="settings-title">设置</text>
                <div class="config-item">
                    <text class="config-label">服务器地址</text>
                    <input class="config-input" v-model="serverUrl" placeholder="http://localhost:3000" />
                </div>
                <div class="config-item">
                    <text class="config-label">Access Token</text>
                    <input class="config-input" v-model="accessToken" placeholder="输入Access Token" type="password" />
                </div>
                <div class="config-item">
                    <text class="config-label">QQ号</text>
                    <input class="config-input" v-model="userId" placeholder="输入QQ号" />
                </div>
                <div class="settings-actions">
                    <div class="settings-btn" @click="saveConfig">
                        <text class="settings-btn-text">保存</text>
                    </div>
                    <div class="settings-btn danger" @click="clearAllData">
                        <text class="settings-btn-text">清除数据</text>
                    </div>
                </div>
            </div>
        </div>

        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('qqchat.less');
</style>

<script>
import qqchat from './qqchat';
import ToastMessage from '../../components/ToastMessage.vue';
export default {
    ...qqchat,
    components: {
        ToastMessage
    }
};
</script>
