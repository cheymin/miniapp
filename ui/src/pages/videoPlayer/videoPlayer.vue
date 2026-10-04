<template>
    <PageShell title="视频播放" activeKey="video">
        <div class="content" style="padding-left: @content-left;">
            <!-- 状态 + 渲染占位 -->
            <div class="video-placeholder">
                <text v-if="!isPlaying" class="ph-text">{{ useNative ? '⏸ 等待播放' : '⚠ Shell 模式 (ffplay)' }}</text>
                <text v-else class="ph-video">🎬 播放中（硬解码直出）</text>
            </div>

            <!-- 文件名 + 状态 -->
            <div class="btn-row">
                <text class="btn" @click="playVideo">▶ 播放</text>
                <text class="btn btn-sec" @click="togglePause">{{ isPlaying ? '⏸' : '▶' }}</text>
                <text class="btn btn-sec" @click="stopVideo">⏹ 停止</text>
                <text class="btn btn-sec" @click="openFileMgr">📁 选文件</text>
            </div>

            <!-- 播放列表 -->
            <text class="list-title">视频列表 ({{ playlist.length }})</text>
            <div v-for="(v, i) in playlist.slice(0, 8)" :key="i"
                 class="list-item"
                 @click="selectVideo(i)">
                <text class="item-icon">🎬</text>
                <text class="item-name">{{ v.name }}</text>
            </div>
            <div v-if="playlist.length === 0" class="list-item">
                <text class="item-name">（未找到视频，请点"选文件"）</text>
            </div>

            <!-- 调试日志 -->
            <div class="log-area">
                <div v-for="(l, i) in logs" :key="i" class="log-line">{{ l }}</div>
            </div>
        </div>
    </PageShell>
</template>

<style lang="less" scoped>
@import url('videoPlayer.less');
</style>

<script>
import videoPlayer from './videoPlayer';
export default videoPlayer;
</script>
