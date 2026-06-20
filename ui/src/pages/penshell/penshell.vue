<template>
    <div class="penshell">
        <!-- 顶栏 -->
        <div class="topbar">
            <text class="topbar-title">Penshell 终端</text>
            <text class="topbar-status" :class="{ 'status-on': shellRunning, 'status-off': !shellRunning }">
                {{ shellRunning ? '● 在线' : '○ 离线' }}
            </text>
        </div>

        <!-- 输出区域 -->
        <scroller ref="outputScroller" class="output-scroller" scroll-direction="vertical" :show-scrollbar="true">
            <div class="output-container">
                <div v-for="(line, idx) in lines" :key="'l'+idx" class="line">
                    <text :class="'line-' + line.type">{{ line.text }}</text>
                </div>
                <!-- 当前提示符 -->
                <div class="line-prompt-row" v-if="initialized">
                    <text class="line-prompt">{{ prompt }}</text>
                </div>
            </div>
        </scroller>

        <!-- 输入栏 -->
        <div class="input-bar">
            <div class="input-box" @click="showInput">
                <text class="input-placeholder" v-if="!currentInput">点击输入命令...</text>
                <text class="input-text" v-else>{{ currentInput }}</text>
            </div>
            <text class="btn-go" @click="executeCommand">↵</text>
        </div>
    </div>
</template>

<style lang="less" scoped>
@import url('penshell.less');
</style>

<script>
import penshell from './penshell';
export default {
    ...penshell,
};
</script>