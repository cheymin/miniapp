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
        <!-- 顶部 Tab -->
        <div class="tab-bar">
            <text class="tab" :class="{ 'tab-active': activeTab === 'rank' }" @click="switchTab('rank')">热门</text>
            <text class="tab" :class="{ 'tab-active': activeTab === 'search' }" @click="switchTab('search')">搜索</text>
            <text class="tab" :class="{ 'tab-active': activeTab === 'fav' }" @click="switchTab('fav')">收藏</text>
            <text class="tab" :class="{ 'tab-active': activeTab === 'downloads' }" @click="switchTab('downloads')">已下载</text>
            <text class="tab tab-settings" @click="openBiliSettings">⚙</text>
        </div>

        <!-- 下载进度条 -->
        <div v-if="downloadingBvid" class="progress-bar">
            <text class="progress-text">{{ downloadStatus }} ({{ downloadProgress }}%)</text>
        </div>

        <scroller class="container" scroll-direction="vertical" :show-scrollbar="true">

            <!-- 排行榜 -->
            <div v-if="activeTab === 'rank'">
                <div class="filter-bar">
                    <text class="filter-label" @click="toggleRankRidMenu">分区: {{ rankRidName }} ▼</text>
                </div>

                <div v-for="(item, idx) in rankItems" :key="item.bvid" class="video-card">
                    <text class="rank-num">{{ idx + 1 }}</text>
                    <div class="video-info" @click="openDetail(item.bvid)">
                        <text class="video-title" :lines="2">{{ item.title }}</text>
                        <text class="video-meta">{{ item.author }} · {{ formatDuration(item.duration) }}</text>
                        <text class="video-stats">▶ {{ formatPlayCount(item.playCount) }} 💬 {{ formatPlayCount(item.danmakuCount) }}</text>
                    </div>
                    <text class="btn btn-download"
                        :class="{ 'btn-disabled': downloadingBvid === item.bvid }"
                        @click="downloadVideo(item.bvid, item.title)">下</text>
                </div>
                <div v-if="rankItems.length === 0 && !rankLoading" class="empty">
                    <text class="empty-text">暂无数据</text>
                </div>
            </div>

            <!-- 搜索 -->
            <div v-if="activeTab === 'search'">
                <div class="search-bar">
                    <text class="search-input" @click="editSearchKeyword">{{ searchKeyword || '点击输入关键词...' }}</text>
                    <text v-if="searchKeyword" class="btn btn-danger" @click="clearSearch">清除</text>
                </div>

                <div v-for="item in searchResults" :key="item.bvid" class="video-card">
                    <div class="video-info" @click="openDetail(item.bvid)">
                        <text class="video-title" :lines="2">{{ item.title }}</text>
                        <text class="video-meta">{{ item.author }} · {{ formatDuration(item.duration) }}</text>
                        <text class="video-stats">▶ {{ formatPlayCount(item.playCount) }}</text>
                    </div>
                    <text class="btn btn-download"
                        :class="{ 'btn-disabled': downloadingBvid === item.bvid }"
                        @click="downloadVideo(item.bvid, item.title)">下</text>
                </div>

                <div v-if="searchResults.length > 0" class="load-more" @click="searchNextPage">
                    <text class="load-more-text">加载更多</text>
                </div>
                <div v-if="searchResults.length === 0 && !searchLoading" class="empty">
                    <text class="empty-text">输入关键词搜索</text>
                </div>
            </div>

            <!-- 收藏夹 -->
            <div v-if="activeTab === 'fav'">
                <div v-if="!isLoggedIn" class="empty">
                    <text class="empty-text">未登录</text>
                    <text class="empty-hint">点击右上角 ⚙ 填写 SESSDATA</text>
                </div>
                <div v-else>
                    <div class="fav-folder-bar">
                        <text v-for="folder in favFolders" :key="folder.id"
                            class="fav-folder"
                            :class="{ 'fav-folder-active': folder.id === activeFavId }"
                            @click="selectFavFolder(folder.id)">{{ folder.title }}</text>
                    </div>

                    <div v-for="item in favItems" :key="item.bvid" class="video-card">
                        <div class="video-info" @click="openDetail(item.bvid)">
                            <text class="video-title" :lines="2">{{ item.title }}</text>
                            <text class="video-meta">{{ item.upperName }} · {{ formatDuration(item.duration) }}</text>
                        </div>
                        <text class="btn btn-download"
                            :class="{ 'btn-disabled': downloadingBvid === item.bvid }"
                            @click="downloadVideo(item.bvid, item.title)">下</text>
                    </div>
                    <div v-if="favItems.length === 0 && !favLoading" class="empty">
                        <text class="empty-text">收藏夹为空</text>
                    </div>
                </div>
            </div>

            <!-- 已下载 -->
            <div v-if="activeTab === 'downloads'">
                <div v-for="(file, idx) in downloads" :key="file.name" class="download-item">
                    <text class="download-name" :lines="2">{{ file.name }}</text>
                    <text class="btn btn-danger" @click="deleteDownload(file.name)">删</text>
                </div>
                <div v-if="downloads.length === 0" class="empty">
                    <text class="empty-text">暂无下载</text>
                    <text class="empty-hint">保存在 /userdisk/Music/bili/</text>
                </div>
            </div>
        </scroller>

        <!-- 分区选择菜单 -->
        <div v-if="rankRidMenuOpen" class="menu-overlay" @click="toggleRankRidMenu">
            <div class="menu-panel">
                <text class="menu-title">选择分区</text>
                <text v-for="opt in rankRidOptions" :key="opt.rid"
                    class="menu-item"
                    :class="{ 'menu-item-active': opt.rid === rankRid }"
                    @click="selectRankRid(opt.rid)">{{ opt.name }}</text>
            </div>
        </div>

        <Loading />
        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('bili.less');
</style>

<script>
import bili from './bili';
import Loading from '../../components/Loading.vue';
import ToastMessage from '../../components/ToastMessage.vue';
export default {
    ...bili,
    components: {
        Loading,
        ToastMessage,
    }
};
</script>
