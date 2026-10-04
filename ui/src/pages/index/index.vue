<template>
    <div class="app-root">
        <!-- 左栏 -->
        <div class="left-rail">
            <text
                v-for="(r, i) in rail"
                :key="i"
                class="rail-item"
                @click="open(r.page)">
                <text class="rail-icon">{{ r.icon }}</text>
                <text class="rail-label">{{ r.label }}</text>
            </text>
            <text class="rail-item" style="flex:1"></text>
            <text class="rail-item" @click="goSettings">
                <text class="rail-icon">⚙️</text>
                <text class="rail-label">设置</text>
            </text>
        </div>
        <!-- 主内容 -->
        <div class="main-area">
            <div class="title-bar">
                <text class="title-text">min的工具箱</text>
                <text class="title-version">v{{ version }}</text>
            </div>
            <scroller class="content" scroll-direction="vertical" :show-scrollbar="false">
                <div class="card-row" v-for="(row, ri) in rows" :key="ri">
                    <div
                        v-for="(item, ci) in row"
                        :key="ci"
                        :class="['home-card', ri === 0 ? 'home-card-on' : '', ri === rows.length - 1 && row.length === 1 ? 'single-card' : '']"
                        @click="go(item)">
                        <text class="home-card-icon">{{ item.icon }}</text>
                        <text class="home-card-label">{{ item.label }}</text>
                        <text class="home-card-desc">{{ item.desc }}</text>
                    </div>
                </div>
            </scroller>
        </div>
    </div>
</template>

<style lang="less" scoped>
@import url('index.less');
</style>

<script>
import index from './index';
export default index;
</script>
