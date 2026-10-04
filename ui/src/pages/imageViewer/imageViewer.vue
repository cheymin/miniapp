<template>
    <PageShell title="图片查看" activeKey="img">
        <div class="content" style="padding-left: @content-left;">
            <div class="info-bar">
                <text class="info-text">{{ indexLabel() }}</text>
                <text class="info-text" v-if="src">{{ src.split('/').pop() }}</text>
            </div>

            <!-- 图片显示区 -->
            <div class="img-area">
                <image
                    v-if="src"
                    :src="src"
                    resize="contain"
                    class="img-tag"
                    :style="{ transform: 'scale(' + scale + ') translate(' + panX + 'px,' + panY + 'px)' }"
                    @touchstart="onTouchStart"
                    @touchmove="onTouchMove"
                    @touchend="onTouchEnd" />
                <text v-else class="img-empty">（暂无图片，点下方扫描）</text>
            </div>

            <!-- 控件 -->
            <div class="ctrl-row">
                <text class="ctrl-btn" @click="prev">◀ 上一张</text>
                <text class="ctrl-btn" @click="zoomOut">-</text>
                <text class="ctrl-btn" @click="reset">1x</text>
                <text class="ctrl-btn" @click="zoomIn">+</text>
                <text class="ctrl-btn" @click="next">下一张 ▶</text>
            </div>

            <div class="btn-row">
                <text class="btn" @click="scanQuick">🔍 扫描 /userdisk</text>
                <text class="btn btn-sec" @click="$falcon.navTo('fileManager', {})">📁 选目录</text>
            </div>
        </div>
    </PageShell>
</template>

<style lang="less" scoped>
@import url('imageViewer.less');
</style>

<script>
import imageViewer from './imageViewer';
export default imageViewer;
</script>
