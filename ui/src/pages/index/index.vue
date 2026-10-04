<template>
    <div class="page-container">
        <LeftRail :items="railItems" active="" :showSettings="true" />
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
                        @click="open(item)">
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
