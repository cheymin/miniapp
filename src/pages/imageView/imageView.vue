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
        <div class="container viewer">
            <div class="topbar">
                <text class="path-input" @click="editPath">{{ path || '输入本地目录或图片路径' }}</text>
                <text class="viewer-btn btn-primary" @click="scan">{{ scanning ? '扫描中' : '扫描' }}</text>
                <text class="viewer-btn btn-info" @click="goBack">返回</text>
            </div>

            <div class="image-area">
                <AppImage v-if="current" :src="current" :width="544" :height="88" resize="contain" />
                <text v-else class="image-hint">{{ scanning ? '正在扫描图片...' : '输入目录后点击扫描，可逐张查看' }}</text>
            </div>

            <div class="bottombar" v-if="images.length > 0">
                <text :class="'viewer-btn ' + (index > 0 ? 'btn-primary' : 'btn-disabled')" @click="prev">上一张</text>
                <text class="counter">{{ index + 1 }} / {{ images.length }}</text>
                <text :class="'viewer-btn ' + (index < images.length - 1 ? 'btn-primary' : 'btn-disabled')" @click="next">下一张</text>
                <text :class="'viewer-btn ' + (autoPlay ? 'btn-danger' : 'btn-success')" @click="toggleAutoPlay">{{ autoPlay ? '停止' : '播放' }}</text>
                <text class="filename">{{ currentName }}</text>
            </div>
        </div>
        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('imageView.less');
</style>

<script>
import AppImage from '../../components/AppImage.vue';
import ToastMessage from '../../components/ToastMessage.vue';
import imageView from './imageView';
export default {
    ...imageView,
    components: {
        AppImage,
        ToastMessage
    }
}
</script>
