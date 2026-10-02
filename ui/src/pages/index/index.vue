<!--
  全新主页 — 卡片网格 + 底部 TabBar
  横屏 640×260
  ⚠️ Falcon 限制: 不支持 flex-wrap (手动分行), 不支持复合选择器 (动态 class 切换)
-->
<template>
    <div class="app">
        <!-- 顶部状态栏 28px -->
        <div class="status-bar">
            <text class="sb-title">min的工具箱</text>
            <text class="sb-sep">·</text>
            <text class="sb-version">{{ version }}</text>
        </div>

        <!-- 主内容区: 手动分行 (Falcon 不支持 flex-wrap) -->
        <scroller class="main" scroll-direction="vertical" :show-scrollbar="false">
            <div class="row" v-for="(row, ri) in rows" :key="ri">
                <div
                    v-for="(item, ci) in row"
                    :key="ci"
                    class="card"
                    @click="openPage(item.page)">
                    <text class="card-icon">{{ item.icon }}</text>
                    <text class="card-label">{{ item.label }}</text>
                </div>
            </div>
            <div v-if="rows.length === 0" class="empty">
                <text class="empty-text">（此分类暂未启用）</text>
            </div>
        </scroller>

        <!-- 底部 TabBar 32px (动态 class, Falcon 不支持 .a.b 复合选择器) -->
        <div class="tabbar">
            <div
                v-for="(tab, i) in tabs"
                :key="i"
                class="tab"
                @click="activeTab = i">
                <text :class="activeTab === i ? 'tab-icon-on' : 'tab-icon'">{{ tab.icon }}</text>
                <text :class="activeTab === i ? 'tab-label-on' : 'tab-label'">{{ tab.label }}</text>
            </div>
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
