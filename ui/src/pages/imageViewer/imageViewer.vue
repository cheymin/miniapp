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
    <div class="viewer">
        <!-- 左：9/10 图片区 -->
        <div
            class="image-area"
            @touchstart="onTouchStart"
            @touchmove="onTouchMove"
            @touchend="onTouchEnd"
            @click="onImageClick">

            <image
                v-if="imageReady && currentDisplayPath"
                :src="currentDisplayPath"
                resize="contain"
                class="img-main"
                :style="imageStyle"
            />

            <!-- 图片信息（角落小字） -->
            <text v-if="imageReady" class="info-badge" :lines="1">
                {{ currentIndex + 1 }}/{{ imageCount }} · {{ Math.round(scale * 100) }}%
            </text>
        </div>

        <!-- 右：按钮条 -->
        <div class="btn-bar">
            <text class="btn" @click="prevImage">«</text>
            <text class="btn" @click="zoomOut">−</text>
            <text class="btn-info">{{ Math.round(scale * 100) }}%</text>
            <text class="btn" @click="zoomIn">+</text>
            <text class="btn" @click="nextImage">»</text>
            <text class="btn btn-close" @click="close">×</text>
        </div>

        <Loading />
        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('imageViewer.less');
</style>

<script>
import imageViewer from './imageViewer';
import Loading from '../../components/Loading.vue';
import ToastMessage from '../../components/ToastMessage.vue';
export default {
    ...imageViewer,
    components: { Loading, ToastMessage }
};
</script>
