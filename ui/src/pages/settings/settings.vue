<template>
    <div class="app-root">
        <div class="left-rail">
            <text v-for="(r, i) in rail" :key="i" class="rail-item" @click="open(r.page)">
                <text class="rail-icon">{{ r.icon }}</text>
                <text class="rail-label">{{ r.label }}</text>
            </text>
            <text class="rail-item" style="flex:1"></text>
        </div>
        <div class="main-area">
            <div class="title-bar"><text class="title-text">设置</text></div>
            <scroller class="content" scroll-direction="vertical" :show-scrollbar="false">
                <div class="card">
                    <text class="card-title">输入</text>
                    <div class="setting-row" @click="toggleKeyboard">
                        <div style="flex:1">
                            <text class="setting-label">系统键盘</text>
                            <text class="setting-desc">关闭后使用自研软键盘</text>
                        </div>
                        <text :class="useSystemKeyboard ? 'toggle toggle-on' : 'toggle'">{{ useSystemKeyboard ? 'ON' : 'OFF' }}</text>
                    </div>
                </div>
                <div class="card">
                    <text class="card-title">显示</text>
                    <text class="setting-label">字体大小</text>
                    <div class="font-picker">
                        <text :class="fontScale==='small' ? 'font-item font-item-on' : 'font-item'" @click="setFont('small')">小</text>
                        <text :class="fontScale==='normal' ? 'font-item font-item-on' : 'font-item'" @click="setFont('normal')">中</text>
                        <text :class="fontScale==='large' ? 'font-item font-item-on' : 'font-item'" @click="setFont('large')">大</text>
                    </div>
                </div>
                <div class="card">
                    <text class="card-title">关于</text>
                    <text class="version-info">版本: v{{ version }}</text>
                    <text class="version-info">为有道词典笔 A6P 打造</text>
                    <div class="btn-row">
                        <text class="btn btn-secondary" @click="about">详细信息</text>
                        <text class="btn btn-danger" @click="reboot">重启应用</text>
                    </div>
                </div>
            </scroller>
        </div>
    </div>
</template>

<style lang="less" scoped>
@import url('settings.less');
</style>

<script>
import settings from './settings';
export default settings;
</script>
