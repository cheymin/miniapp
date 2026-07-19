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
    <div>
        <div class="chatlist-container">
            <div class="top-bar">
                <text class="top-btn" @click="handleBackPress">←</text>
                <text class="top-title">会话</text>
                <text class="top-btn" @click="createConversation">+</text>
            </div>

            <scroller class="list-scroller" scroll-direction="vertical" :show-scrollbar="true">
                <div class="list-wrapper">
                    <div v-for="conversation in sortedConversations" :key="conversation.id"
                        class="conversation-card">
                        <div class="card-main" @click="loadConversation(conversation.id)">
                            <div class="card-header">
                                <text class="card-title">{{ conversation.title || '新对话' }}</text>
                                <text v-if="conversation.id === currentConversationId"
                                    class="current-dot">●</text>
                            </div>
                            <div class="card-footer">
                                <text class="card-preview">{{ getPreviewText(conversation) }}</text>
                                <text class="card-time">{{ formatTime(conversation.updatedAt) }}</text>
                            </div>
                        </div>
                        <div class="card-actions">
                            <text class="action-btn"
                                @click="editConversationTitle(conversation.id, conversation.title)">✎</text>
                            <text class="action-btn action-btn-danger"
                                @click="deleteConversation(conversation.id)">🗑</text>
                        </div>
                    </div>

                    <div v-if="sortedConversations.length === 0" class="empty-state">
                        <text class="empty-text">暂无会话</text>
                        <text class="empty-hint">点击右上角 + 新建对话</text>
                    </div>
                </div>
            </scroller>
        </div>
        <Loading />
        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('chatList.less');
</style>

<script>
import Loading from '../../components/Loading.vue';
import ToastMessage from '../../components/ToastMessage.vue';
import chatList from './chatList';
export default {
    ...chatList,
    components: {
        Loading,
        ToastMessage
    }
};
</script>
