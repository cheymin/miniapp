<!-- gallery — 修复版, 永不黑屏
     直接渲染原图 (Falcon resize="cover" 自动缩), 不依赖 ffmpeg -->
<template>
    <div class="container">
        <div class="topbar">
            <text class="title">图库</text>
            <text class="dir" @click="selectDirectory">{{ currentDirectory }}</text>
        </div>

        <scroller class="grid" scroll-direction="vertical" :show-scrollbar="false">
            <div class="row" v-for="(row, ri) in gridRows" :key="ri">
                <div
                    v-for="(item, ci) in row"
                    :key="ci"
                    class="cell"
                    @click="openImage(ri * 3 + ci)">
                    <image
                        :src="item.path"
                        resize="cover"
                        class="thumb" />
                </div>
            </div>
            <div v-if="gridRows.length === 0" class="empty">
                <text class="empty-text">没有找到图片</text>
            </div>
        </scroller>
    </div>
</template>

<style lang="less" scoped>
@import url('gallery.less');
</style>

<script>
import gallery from './gallery';
import Loading from '../../components/Loading.vue';
import ToastMessage from '../../components/ToastMessage.vue';
export default { ...gallery, components: { Loading, ToastMessage } };
</script>
