<template>
    <div class="penshell">
        <!-- 输出区域 -->
        <scroller ref="outputScroller" class="output-scroller" scroll-direction="vertical" :show-scrollbar="true">
            <div class="output-container">
                <div v-for="(line, idx) in lines" :key="'l'+idx" class="line">
                    <text :class="'line-' + line.type">{{ line.text || ' ' }}</text>
                </div>
                <!-- 当前输入行：提示符 + 输入 -->
                <div class="input-line" v-if="initialized && !cmdRunning" @click="showInput">
                    <text class="line-prompt">{{ prompt }}</text>
                    <text class="input-cursor">{{ currentInput || ' ' }}</text>
                </div>
                <!-- 命令运行中提示 -->
                <div class="input-line" v-if="cmdRunning">
                    <text class="line-running">● 运行中...</text>
                </div>
            </div>
        </scroller>

        <!-- 快捷命令栏 -->
        <div class="quick-bar">
            <text class="quick-btn" @click="quickCommand('ls')">ls</text>
            <text class="quick-btn" @click="quickCommand('pwd')">pwd</text>
            <text class="quick-btn" @click="quickCommand('cd ..')">cd..</text>
            <text class="quick-btn" @click="quickCommand('cat')">cat</text>
            <text class="quick-btn" @click="showHistory(-1)">↑</text>
            <text class="quick-btn" @click="showHistory(1)">↓</text>
            <text class="quick-btn quick-cancel" @click="sendCtrlC" v-if="cmdRunning">^C</text>
            <text class="quick-btn quick-go" @click="executeCommand" v-if="!cmdRunning">↵</text>
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
