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
            <div class="title-bar"><text class="title-text">图片查看</text></div>
            <div class="content">
                <div class="info-bar">
                    <text class="info-text">{{ indexLabel() }}</text>
                    <text class="info-text" v-if="src">{{ src.split('/').pop() }}</text>
                </div>
                <div class="img-area">
                    <image
                        v-if="src"
                        :src="src"
                        resize="contain"
                        class="img-tag"
                        :style="{ transform: 'scale(' + scale + ') translate(' + panX + 'px,' + panY + 'px)' }" />
                    <text v-else class="img-empty">（暂无图片，点下方扫描）</text>
                </div>
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
        </div>
    </div>
</template>

<style lang="less" scoped>
@import url('imageViewer.less');
</style>

<script>
import imageViewer from './imageViewer';
export default imageViewer;
</script>
