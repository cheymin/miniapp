<!-- misc 设置页 — Falcon 兼容版, 新样式 class, 已有软键盘设置 -->
<template>
    <div class="container">
        <scroller class="scroll-area" scroll-direction="vertical">

            <!-- 亮屏时间 -->
            <text class="sec-title-first">亮屏时间</text>
            <div class="btn-row">
                <text class="btn-item-first" @click="setBrightTime(30, '30秒')">
                    <text class="btn-text">30秒</text>
                </text>
                <text class="btn-item" @click="setBrightTime(1800, '30分钟')">
                    <text class="btn-text">30分钟</text>
                </text>
            </div>
            <div class="btn-row">
                <text class="btn-item-first" @click="setBrightTime(3600, '1小时')">
                    <text class="btn-text">1小时</text>
                </text>
                <text class="btn-item" @click="setBrightTime(2147483647, '无限')">
                    <text class="btn-text">无限</text>
                </text>
            </div>

            <!-- 屏幕亮度 -->
            <text class="sec-title">屏幕亮度</text>
            <div class="btn-row">
                <text class="btn-item-first" @click="setBrightness(30)">
                    <text class="btn-text">低</text>
                </text>
                <text class="btn-item" @click="setBrightness(60)">
                    <text class="btn-text">中</text>
                </text>
                <text class="btn-item" @click="setBrightness(100)">
                    <text class="btn-text">高</text>
                </text>
            </div>

            <!-- 手电筒 -->
            <text class="sec-title">手电筒</text>
            <div class="btn-row">
                <text :class="torchOn ? 'btn-item-on-first' : 'btn-item-first'" @click="toggleTorch">
                    <text :class="torchOn ? 'btn-text-on' : 'btn-text'">{{ torchOn ? '关闭' : '打开' }}</text>
                </text>
                <text class="btn-item" @click="torchOn ? function(){} : function(){}">
                    <text class="btn-text-dim">—</text>
                </text>
            </div>

            <!-- 键盘设置 (已支持软键盘/系统键盘切换, 用 dbGet/dbSet 持久化) -->
            <text class="sec-title">键盘模式</text>
            <div class="btn-row">
                <text
                    :class="keyboardType === 'soft' ? 'btn-item-on-first' : 'btn-item-first'"
                    @click="setKeyboardType('soft')">
                    <text :class="keyboardType === 'soft' ? 'btn-text-on' : 'btn-text'">软键盘</text>
                </text>
                <text
                    :class="keyboardType === 'system' ? 'btn-item-on' : 'btn-item'"
                    @click="setKeyboardType('system')">
                    <text :class="keyboardType === 'system' ? 'btn-text-on' : 'btn-text'">系统键盘</text>
                </text>
            </div>
            <text :class="keyboardType === 'soft' ? 'hint-text-on' : 'hint-text'">
                当前: {{ keyboardType === 'soft' ? 'miniapp 内置软键盘' : '设备物理/系统键盘' }}
            </text>

        </scroller>
    </div>
</template>

<style lang="less" scoped>
@import './misc.less';
</style>

<script>
import misc from './misc';
export default misc;
</script>
