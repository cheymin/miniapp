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
    <div class="page">
        <scroller class="container" scroll-direction="vertical" :show-scrollbar="true">
            <div v-if="videoInfo" class="info-section">
                <text class="title">{{ videoInfo.title }}</text>
                <text class="owner">UP: {{ videoInfo.ownerName }}</text>
                <text class="date">{{ formatDate(videoInfo.pubdate) }}</text>

                <div class="stat-row">
                    <text class="stat">▶ {{ formatPlayCount(videoInfo.playCount) }}</text>
                    <text class="stat">👍 {{ formatPlayCount(videoInfo.likeCount) }}</text>
                    <text class="stat">💰 {{ formatPlayCount(videoInfo.coinCount) }}</text>
                    <text class="stat">⭐ {{ formatPlayCount(videoInfo.favouriteCount) }}</text>
                </div>

                <text class="desc-title">简介</text>
                <text class="desc" :lines="20">{{ videoInfo.desc || '无简介' }}</text>

                <div class="actions">
                    <text class="btn-download"
                        :class="{ 'btn-disabled': isDownloading }"
                        @click="startDownload">
                        {{ isDownloading ? '下载中...' : '下载音频' }}
                    </text>
                </div>

                <div v-if="isDownloading" class="progress-block">
                    <text class="progress-status">{{ downloadStatus }}</text>
                    <text class="progress-num">{{ downloadProgress }}%</text>
                </div>
            </div>
        </scroller>
        <Loading />
        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('biliDetail.less');
</style>

<script>
import biliDetail from './biliDetail';
import Loading from '../../components/Loading.vue';
import ToastMessage from '../../components/ToastMessage.vue';
export default {
    ...biliDetail,
    components: {
        Loading,
        ToastMessage,
    }
};
</script>
