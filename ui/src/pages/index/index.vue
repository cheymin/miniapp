<template>
    <div class="home-root">
        <!-- 锁屏态：大时钟 -->
        <div class="lock-screen" v-if="!unlocked"
             @touchstart="onTouchStart"
             @touchmove="onTouchMove"
             @touchend="onTouchEnd">
            <text class="lock-time">{{ timeText }}</text>
            <div class="lock-date-row">
                <text class="lock-date">{{ dateText }}</text>
                <text class="lock-version">v{{ version }}</text>
            </div>
            <div class="lock-swipe">
                <text class="swipe-icon">↑</text>
                <text class="swipe-hint">上滑解锁</text>
            </div>
        </div>

        <!-- 应用态：大图标网格（手动两行） -->
        <div class="app-screen" v-if="unlocked">
            <!-- 顶部状态栏 -->
            <div class="status-bar">
                <text class="status-time">{{ timeText }}</text>
                <text class="status-date">{{ dateText }}</text>
                <text class="status-version">v{{ version }}</text>
            </div>

            <!-- 第一行 3 个 -->
            <div class="app-row">
                <div class="app-tile" v-for="(item, i) in row1" :key="i" @click="go(item)">
                    <text class="app-icon">{{ item.icon }}</text>
                    <text class="app-name">{{ item.label }}</text>
                </div>
            </div>
            <!-- 第二行 3 个 -->
            <div class="app-row">
                <div class="app-tile" v-for="(item, i) in row2" :key="i" @click="go(item)">
                    <text class="app-icon">{{ item.icon }}</text>
                    <text class="app-name">{{ item.label }}</text>
                </div>
            </div>

            <!-- 底部 -->
            <div class="app-footer">
                <text class="footer-hint">返回键锁屏</text>
                <text class="footer-settings" @click="goSettings">⚙️ 设置</text>
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
