<template>
    <div class="home-root">
        <div class="lock-screen" v-if="!unlocked" @click="unlock">
            <text class="lock-time">{{ timeText }}</text>
            <div class="lock-date-row">
                <text class="lock-date">{{ dateText }}</text>
                <text class="lock-version">v{{ version }}</text>
            </div>
            <text class="lock-tap-hint">▶ 点击解锁</text>
        </div>

        <div class="app-screen" v-if="unlocked">
            <div class="status-bar">
                <text class="status-time">{{ timeText }}</text>
                <text class="status-date">{{ dateText }}</text>
                <text class="status-version">v{{ version }}</text>
            </div>
            <div class="app-row">
                <div class="app-tile" v-for="(item, i) in row1" :key="i" @click="go(item)">
                    <text class="app-icon">{{ item.icon }}</text>
                    <text class="app-name">{{ item.label }}</text>
                </div>
            </div>
            <div class="app-row">
                <div class="app-tile" v-for="(item, i) in row2" :key="i" @click="go(item)">
                    <text class="app-icon">{{ item.icon }}</text>
                    <text class="app-name">{{ item.label }}</text>
                </div>
            </div>
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
