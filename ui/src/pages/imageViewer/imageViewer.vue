<!-- imageViewer — 左9/10图区 + 右1/10按钮条
     ⚠️ Falcon 限制: 不支持 scroller 内图片拖动 (scroller 会拦截 touchmove),
        所以图片区绝对不包 scroller, 手势全部手动处理 -->
<template>
    <div class="app">
        <!-- 左 9/10: 图片区 -->
        <div class="img-area">
            <!-- 图片本身 -->
            <div
                v-if="initialized && src"
                class="img-box"
                :style="imageStyle"
                @touchstart="onTouchStart"
                @touchmove="onTouchMove"
                @touchend="onTouchEnd">
                <image :src="src" resize="contain" class="img" />
            </div>
            <!-- 加载失败占位 (永不黑屏) -->
            <text v-else class="no-img">无图片</text>

            <!-- 左下角状态 (index + zoom%) -->
            <div class="status-bar">
                <text class="status-text">{{ indexLabel }} · {{ percentLabel }}</text>
            </div>
        </div>

        <!-- 右 1/10: 按钮条 -->
        <div class="btn-bar">
            <div class="btn" @click="prevImage">
                <text class="btn-icon">‹</text>
            </div>
            <div class="btn" @click="zoomOut">
                <text class="btn-icon">−</text>
            </div>
            <div class="btn" @click="zoomIn">
                <text class="btn-icon">+</text>
            </div>
            <div class="btn" @click="nextImage">
                <text class="btn-icon">›</text>
            </div>
            <div class="btn btn-close" @click="close">
                <text class="btn-icon-close">×</text>
            </div>
        </div>
    </div>
</template>

<style lang="less" scoped>
@import url('imageViewer.less');
</style>

<script>
import iv from './imageViewer';
export default iv;
</script>
