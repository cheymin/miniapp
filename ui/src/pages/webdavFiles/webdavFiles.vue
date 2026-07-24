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
    <div class="webdav-page">
        <div class="top-bar">
            <text class="top-btn" @click="handleBackPress">{{ icon('back') }}</text>
            <text class="top-title" :lines="1">{{ icon('webdav') }} {{ pathDisplay }}</text>
            <text class="top-btn" @click="refresh">{{ icon('refresh') }}</text>
            <text class="top-btn" @click="uploadFile">{{ icon('upload') }}</text>
        </div>

        <scroller class="container" scroll-direction="vertical" :show-scrollbar="true">
            <div v-if="!hasConfig" class="empty-state">
                <text class="empty-icon">{{ icon('webdav') }}</text>
                <text class="empty-text">请先在WebDAV备份中配置连接</text>
            </div>
            <div v-else-if="itemList.length === 0 && !isLoading" class="empty-state">
                <text class="empty-icon">{{ icon('folder') }}</text>
                <text class="empty-text">空目录</text>
            </div>
            <div v-for="(item, idx) in itemList" :key="idx" class="file-item" @click="openItem(item)">
                <text class="file-icon">{{ item.isDirectory ? icon('folder') : icon('file') }}</text>
                <text class="file-name" :lines="1">{{ item.name }}</text>
                <text v-if="!item.isDirectory" class="file-size">{{ formatSize(item.size) }}</text>
            </div>
        </scroller>

        <!-- 文件操作菜单 -->
        <div v-if="showItemMenu && selectedItem" class="overlay" @click="showItemMenu = false">
            <div class="action-card" @click.stop="noop">
                <text class="action-title" :lines="2">{{ selectedItem.name }}</text>
                <text class="action-btn" @click="downloadFile(selectedItem)">{{ icon('download') }} 下载</text>
                <text class="action-btn action-danger" @click="deleteItem(selectedItem)">{{ icon('trash') }} 删除</text>
                <text class="action-btn action-cancel" @click="showItemMenu = false">{{ icon('close') }} 取消</text>
            </div>
        </div>

        <Loading />
        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('webdavFiles.less');
</style>

<script>
import webdavFiles from './webdavFiles';
import Loading from '../../components/Loading.vue';
import ToastMessage from '../../components/ToastMessage.vue';
export default {
    ...webdavFiles,
    components: {
        Loading,
        ToastMessage
    }
};
</script>
