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
        <div class="top-bar">
            <text class="top-btn" @click="handleBackPress">{{ icon('back') }}</text>
            <text class="top-title">{{ icon('memos') }} 备忘录</text>
            <text class="top-btn" @click="openConfig">{{ icon('settings') }}</text>
        </div>

        <scroller class="container" scroll-direction="vertical" :show-scrollbar="true">
            <div v-if="memoList.length === 0 && !isLoading" class="empty-state">
                <text class="empty-icon">{{ icon('memos') }}</text>
                <text class="empty-text">暂无备忘录</text>
                <text class="empty-sub">点击右下角 + 新建</text>
            </div>
            <div v-for="memo in memoList" :key="memo.id" class="memo-card">
                <text class="memo-content" :lines="4">{{ memo.content }}</text>
                <div class="memo-footer">
                    <text class="memo-time">{{ formatTime(memo.updateTime || memo.createTime) }}</text>
                    <text class="memo-btn" @click="openEditMemo(memo)">{{ icon('edit') }}</text>
                    <text class="memo-btn memo-btn-danger" @click="deleteMemo(memo)">{{ icon('trash') }}</text>
                </div>
            </div>
        </scroller>

        <text v-if="!showConfig && !showEditor && hasConfig" class="fab-btn" @click="openNewMemo">{{ icon('note-add') }}</text>

        <div v-if="showConfig" class="overlay">
            <div class="overlay-card">
                <div class="overlay-header">
                    <text class="overlay-title">{{ icon('settings') }} Memos配置</text>
                    <text class="overlay-close" @click="closeConfig">{{ icon('close') }}</text>
                </div>
                <div class="config-item">
                    <text class="config-label">服务地址</text>
                    <text class="config-input" @click="editUrl">{{ memosUrl || '点击输入' }}</text>
                </div>
                <div class="config-item">
                    <text class="config-label">Token</text>
                    <text class="config-input" @click="editToken">{{ memosToken ? memosToken.split('').map(_ => '*').join('') : '点击输入' }}</text>
                </div>
                <text class="btn btn-primary" @click="saveConfig">{{ icon('save') }} 保存并连接</text>
            </div>
        </div>

        <Loading />
        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('memos.less');
</style>

<script>
import memos from './memos';
import Loading from '../../components/Loading.vue';
import ToastMessage from '../../components/ToastMessage.vue';
export default {
    ...memos,
    components: {
        Loading,
        ToastMessage
    }
};
</script>
