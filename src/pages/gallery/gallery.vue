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
        <div class="app">
            <div class="g-top">
                <text class="g-back" @click="goBack">‹ 返回</text>
                <text class="g-path" @click="editPath">{{ root }}</text>
                <text class="g-count">{{ loading ? '扫描中…' : images.length + ' 张' }}</text>
            </div>

            <scroller class="grid-scroller" scroll-direction="vertical" :show-scrollbar="false">
                <div class="grid">
                    <div v-for="(row, rowIndex) in rows" :key="rowIndex" class="grid-row">
                        <div v-for="item in row" :key="item.path" class="grid-cell"
                            :style="{ width: cellW + 'px', height: cellH + 'px', marginRight: '4px' }"
                            @click="openImage(item.index)">
                            <image class="thumb" :src="item.path" :width="cellW" :height="cellH" resize="cover" />
                        </div>
                    </div>

                    <div class="list-footer">
                        <text class="footer-text">{{ images.length ? '没有更多了' : '没有找到图片' }}</text>
                    </div>
                </div>

                <div v-if="!loading && !images.length" class="empty">
                    <text class="empty-text">相册为空</text>
                    <text class="empty-sub">点击上方路径切换目录</text>
                </div>
            </scroller>

            <div class="floating-cancel" @click="editPath">
                <text class="footer-text">目录</text>
            </div>
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
