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
        <div class="container image-view">
            <div class="item">
                <text class="item-input" @click="editUrl">{{ url || '点击输入图片地址（http/https/本地路径）' }}</text>
                <text v-if="url" class="btn btn-danger" @click="clearUrl">清空</text>
                <text class="btn btn-info" @click="goBack">返回</text>
            </div>

            <div class="image-area">
                <AppImage v-if="url" :src="url" :width="width" :height="height" resize="contain" />
                <text v-else class="image-hint">输入图片地址后在此查看</text>
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
