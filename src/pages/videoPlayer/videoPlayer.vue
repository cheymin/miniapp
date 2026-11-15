<template>
    <div>
        <div class="vp">
            <div class="vp-stage" @click="toggleControls">
                <image v-if="frameSrc" class="vp-frame" :src="frameSrc" :width="560" :height="170" resize="contain" />
                <div v-else class="vp-blank">
                    <text class="vp-blank-text">{{ message || '正在加载视频...' }}</text>
                </div>
                <text v-if="hintText && controlsVisible" class="vp-hint">{{ hintText }}</text>
            </div>

            <text v-if="controlsVisible" class="vp-title">{{ fileName }}</text>

            <div v-if="controlsVisible" class="vp-bar">
                <text class="vp-btn" @click="togglePlay">{{ playing ? '暂停' : '播放' }}</text>
                <text class="vp-btn" @click="seekBy(-10)">-10s</text>
                <text class="vp-btn" @click="seekBy(10)">+10s</text>
                <div class="vp-progress">
                    <div class="vp-progress-fill" :style="{ width: progressPercent + '%' }"></div>
                </div>
                <text class="vp-time">{{ timeText }}</text>
                <text class="vp-btn" @click="toggleFullscreen">全屏</text>
                <text class="vp-btn vp-btn-danger" @click="goBack">关闭</text>
            </div>
        </div>
        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('videoPlayer.less');
</style>

<script>
import ToastMessage from '../../components/ToastMessage.vue';
import videoPlayer from './videoPlayer';
export default {
    ...videoPlayer,
    components: {
        ToastMessage
    }
}
</script>
