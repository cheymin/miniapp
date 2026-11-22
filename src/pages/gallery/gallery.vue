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
        <div class="container gallery">
            <div class="gallery-head">
                <text class="gallery-back" @click="goBack">返回</text>
                <text class="gallery-path" @click="editPath">{{ root }}</text>
                <text class="gallery-count">{{ loading ? '扫描中…' : images.length + ' 张' }}</text>
                <text class="gallery-refresh" @click="scan">刷新</text>
            </div>

            <scroller class="gallery-scroll" scroll-direction="vertical" :show-scrollbar="true">
                <div class="gallery-grid">
                    <div v-for="(item, index) in images" :key="item" class="gallery-cell" @click="openImage(index)">
                        <image class="gallery-thumb" :src="item" :width="102" :height="62" resize="cover" />
                        <text class="gallery-name">{{ shortName(item) }}</text>
                    </div>
                </div>
                <text v-if="!loading && !images.length" class="gallery-empty">没有找到图片，点击路径换一个目录</text>
            </scroller>
        </div>
        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('gallery.less');
</style>

<script>
import ToastMessage from '../../components/ToastMessage.vue';
import gallery from './gallery';
export default {
    ...gallery,
    components: {
        ToastMessage
    }
}
</script>
