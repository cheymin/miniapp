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
    <div class="container">
        <!-- 顶部工具栏 -->
        <div class="toolbar">
            <text class="tool-btn" @click="toggleSettings">⚙</text>
            <text class="tool-title">图库</text>
            <text class="tool-count" v-if="imageList.length > 0">{{ imageList.length }}张</text>
        </div>

        <!-- 设置面板 -->
        <div v-if="showSettings" class="settings">
            <text class="set-label">目录:</text>
            <text class="set-path">{{ currentDirectory }}</text>
            <text class="set-btn" @click="selectDirectory">选择目录</text>
        </div>

        <!-- 图片网格 -->
        <scroller
            class="grid"
            scroll-direction="vertical"
            :show-scrollbar="true"
            @scroll="onGridScroll">
            <div class="grid-row" v-for="(row, ri) in gridRows" :key="ri">
                <div
                    v-for="(item, ci) in row"
                    :key="item.path"
                    class="cell"
                    @click="openImage(ri * 3 + ci)">
                    <image
                        v-if="item.loaded"
                        :src="item.thumbPath"
                        class="thumb"
                        resize="cover"
                    />
                    <div v-else class="thumb-empty">
                        <text class="thumb-dot">·</text>
                    </div>
                </div>
            </div>

            <!-- 空状态 -->
            <div v-if="imageList.length === 0" class="empty">
                <text class="empty-icon">📷</text>
                <text class="empty-hint">目录里没有图片</text>
            </div>
        </scroller>

        <Loading />
        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('gallery.less');
</style>

<script>
import gallery from './gallery';
import Loading from '../../components/Loading.vue';
import ToastMessage from '../../components/ToastMessage.vue';
export default {
    ...gallery,
    components: { Loading, ToastMessage }
};
</script>
