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
            <text class="top-title">{{ icon('webdav') }} WebDAV备份</text>
            <text class="top-btn-placeholder"></text>
        </div>
        <scroller class="container" scroll-direction="vertical" :show-scrollbar="true">
            <div class="section">
                <text class="section-title">连接配置</text>

                <div class="item">
                    <text class="item-text">服务器URL</text>
                    <text class="item-input" @click="editUrl">{{ url || '点击输入' }}</text>
                </div>

                <div class="item">
                    <text class="item-text">用户名</text>
                    <text class="item-input" @click="editUsername">{{ username || '点击输入' }}</text>
                </div>

                <div class="item">
                    <text class="item-text">密码</text>
                    <text class="item-input" @click="editPassword">{{ password.split('').map(_ => '*').join('') || '点击输入' }}</text>
                </div>

                <div class="item">
                    <text class="item-text">远程路径</text>
                    <text class="item-input" @click="editRemotePath">{{ remotePath || '点击输入' }}</text>
                </div>
            </div>

            <div class="section">
                <text class="section-title">操作</text>

                <div class="btn-row">
                    <text class="btn btn-info" @click="testConnection">{{ icon('check') }} 测试</text>
                    <text class="btn btn-primary" @click="saveConfig">{{ icon('save') }} 保存</text>
                </div>

                <div class="btn-row">
                    <text class="btn btn-success" @click="backupConfig">{{ icon('backup') }} 备份</text>
                    <text class="btn btn-warning" @click="restoreConfig">{{ icon('restore') }} 恢复</text>
                </div>

                <text v-if="lastBackupTime" class="info-text">{{ icon('clock') }} 上次备份: {{ lastBackupTime }}</text>
            </div>
        </scroller>

        <Loading />
        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('webdavBackup.less');
</style>

<script>
import webdavBackup from './webdavBackup';
import Loading from '../../components/Loading.vue';
import ToastMessage from '../../components/ToastMessage.vue';
export default {
    ...webdavBackup,
    components: {
        Loading,
        ToastMessage
    }
};
</script>
