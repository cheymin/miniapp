<template>
    <div class="app-root">
        <div class="left-rail">
            <text v-for="(r, i) in rail" :key="i" class="rail-item" @click="open(r.page)">
                <text :class="activeKey === r.page ? 'rail-icon rail-icon-on' : 'rail-icon'">{{ r.icon }}</text>
                <text :class="activeKey === r.page ? 'rail-label rail-label-on' : 'rail-label'">{{ r.label }}</text>
            </text>
            <text class="rail-item" style="flex:1"></text>
            <text class="rail-item" @click="open('settings')">
                <text class="rail-icon">⚙️</text><text class="rail-label">设置</text>
            </text>
        </div>
        <div class="main-area">
            <div class="title-bar"><text class="title-text">视频播放</text></div>
            <div class="content">
                <div class="video-placeholder">
                    <text v-if="!isPlaying" class="ph-text">{{ useNative ? '⏸ 等待播放' : '⚠ Shell 模式 (ffplay)' }}</text>
                    <text v-else class="ph-video">🎬 播放中</text>
                </div>
                <div class="btn-row">
                    <text class="btn" @click="playVideo">▶ 播放</text>
                    <text class="btn btn-sec" @click="togglePause">{{ isPlaying ? '⏸' : '▶' }}</text>
                    <text class="btn btn-sec" @click="stopVideo">⏹ 停止</text>
                    <text class="btn btn-sec" @click="openFileMgr">📁 选文件</text>
                </div>
                <text class="list-title">视频列表 ({{ playlist.length }})</text>
                <div v-for="(v, i) in playlist.slice(0, 8)" :key="i" class="list-item" @click="selectVideo(i)">
                    <text class="item-icon">🎬</text>
                    <text class="item-name">{{ v.name }}</text>
                </div>
                <div v-if="playlist.length === 0" class="list-item">
                    <text class="item-name">（未找到视频）</text>
                </div>
                <div class="log-area">
                    <div v-for="(l, i) in logs" :key="i" class="log-line">{{ l }}</div>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="less" scoped>
@import url('videoPlayer.less');
</style>

<script>
import videoPlayer from './videoPlayer';
export default videoPlayer;
</script>
