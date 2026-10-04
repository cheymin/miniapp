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
            <text class="top-title">{{ icon('install') }} 安装应用</text>
            <text class="top-btn-placeholder"></text>
        </div>
        <div class="install-container">
            <div class="install-icon-area">
                <text class="install-icon">{{ icon('package') }}</text>
            </div>
            <text class="install-filename" :lines="2">{{ fileName }}</text>

            <div class="info-section">
                <div class="info-row">
                    <text class="info-label">{{ icon('file') }} 文件:</text>
                    <text class="info-value" :lines="2">{{ filePath }}</text>
                </div>
                <div class="info-row">
                    <text class="info-label">{{ icon('info') }} 大小:</text>
                    <text class="info-value">{{ fileSizeFormatted }}</text>
                </div>
            </div>

            <text v-if="statusMessage" :class="'status-msg status-' + installStatus">{{ statusMessage }}</text>

            <div class="btn-area">
                <div v-if="installStatus !== 'success'" :class="'install-btn ' + (canInstall ? 'btn-install-active' : 'btn-install-disabled')" @click="doInstall">
                    <text class="btn-text-white">{{ icon('install') }} {{ isInstalling ? '安装中...' : '安装' }}</text>
                </div>
                <div class="cancel-btn" @click="cancelInstall">
                    <text class="btn-text">{{ icon('close') }} {{ installStatus === 'success' ? '完成' : '取消' }}</text>
                </div>
            </div>
        </div>
        <Loading />
        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('amrInstall.less');
</style>

<script>
import amrInstall from './amrInstall';
import Loading from '../../components/Loading.vue';
import ToastMessage from '../../components/ToastMessage.vue';
export default { ...amrInstall, components: { Loading, ToastMessage } };
</script>
