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
        <scroller class="container" scroll-direction="vertical" :show-scrollbar="true">
            <div class="section">
                <text class="section-title">系统更新</text>

                <div class="item">
                    <text class="item-text">当前版本</text>
                    <text class="update-value">v{{ currentVersion }}</text>
                </div>

                <div class="item">
                    <text class="item-text">最新版本</text>
                    <text class="update-value">{{ latestVersion ? 'v' + latestVersion : '未检查' }}</text>
                </div>

                <div class="item">
                    <text class="item-text">状态</text>
                    <text :class="'update-status status-' + status">{{ message || '等待检查' }}</text>
                </div>

                <div class="item update-buttons">
                    <text :class="'btn btn-primary' + (busy ? ' btn-disabled' : '')" @click="checkUpdate">检查更新</text>
                    <text v-if="status === 'available'" class="btn btn-success" @click="installUpdate">下载并安装</text>
                    <text class="btn btn-info" @click="goBack">返回</text>
                </div>
            </div>

            <div v-if="notes" class="section">
                <text class="section-title">更新说明</text>
                <text class="update-notes">{{ notes }}</text>
            </div>
        </scroller>
        <Loading />
        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('update.less');
</style>

<script>
import Loading from '../../components/Loading.vue';
import ToastMessage from '../../components/ToastMessage.vue';
import update from './update';
export default {
    ...update,
    components: {
        Loading,
        ToastMessage
    }
}
</script>
