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
        <div class="container iv">
            <div class="iv-stage" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd">
                <div class="iv-top">
                    <text class="iv-back" @click="goBack">‹ 返回</text>
                    <text class="iv-name">{{ images.length ? (index + 1) + ' / ' + images.length : '—' }} · {{ currentName }}</text>
                    <text class="iv-zoom">{{ zoomPercent }}%</text>
                </div>

                <div class="iv-canvas">
                    <image v-if="currentUrl" :key="currentUrl" class="iv-image" :src="currentUrl" :width="boxWidth"
                        :height="boxHeight" :style="imageStyle" resize="contain" />
                    <text v-else class="iv-empty">{{ scanning ? '加载中…' : '没有图片' }}</text>
                </div>

                <text class="iv-tip">拖动查看细节</text>
            </div>

            <div class="iv-controls">
                <text :class="'iv-btn' + (scale >= 4 ? ' iv-btn-off' : '')" @click="zoomIn">＋</text>
                <text :class="'iv-btn' + (index <= 0 ? ' iv-btn-off' : '')" @click="prev">↑</text>
                <text :class="'iv-btn' + (index >= images.length - 1 ? ' iv-btn-off' : '')" @click="next">↓</text>
                <text :class="'iv-btn' + (scale <= 1 ? ' iv-btn-off' : '')" @click="zoomOut">－</text>
            </div>
        </div>
        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('imageView.less');
</style>

<script>
import ToastMessage from '../../components/ToastMessage.vue';
import imageView from './imageView';
export default {
    ...imageView,
    components: {
        ToastMessage
    }
}
</script>
