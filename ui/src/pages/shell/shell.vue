<template>
    <div class="app-root">
        <div class="left-rail">
            <text v-for="(r, i) in rail" :key="i" class="rail-item" @click="open(r.page)">
                <text class="rail-icon">{{ r.icon }}</text>
                <text class="rail-label">{{ r.label }}</text>
            </text>
            <text class="rail-item" style="flex:1"></text>
            <text class="rail-item" @click="open('settings')">
                <text class="rail-icon">⚙️</text>
                <text class="rail-label">设置</text>
            </text>
        </div>
        <div class="main-area">
            <div class="title-bar"><text class="title-text">Shell 终端</text></div>
            <div class="content">
                <div class="status" style="margin-bottom:@s4;">
                    <div :class="shellInitialized ? 'status-dot status-dot-on' : 'status-dot status-dot-off'"></div>
                    <text class="status-text">{{ shellInitialized ? '就绪' : '初始化中' }} · cwd: {{ cwd }}</text>
                </div>
                <div class="terminal-wrap">
                    <scroller class="terminal" scroll-direction="vertical" :show-scrollbar="false">
                        <div v-for="line in lines" :key="line.key" class="line">
                            <text :class="'line-' + line.type">{{ line.text }}</text>
                        </div>
                    </scroller>
                    <div class="prompt-row">
                        <text class="prompt">{{ currentPrompt }}</text>
                        <text class="input-hint" v-if="!shellInitialized">Shell 未就绪</text>
                        <text class="input-hint" v-else>点击下方命令执行</text>
                    </div>
                </div>
                <div class="quick-row">
                    <text class="quick-chip" @click="useExample('help')">help</text>
                    <text class="quick-chip" @click="useExample('ls -la')">ls -la</text>
                    <text class="quick-chip" @click="useExample('pwd')">pwd</text>
                    <text class="quick-chip" @click="useExample('cat /proc/meminfo | head -3')">mem</text>
                    <text class="quick-chip" @click="useExample('echo hello')">echo</text>
                    <text class="quick-chip" @click="useExample('df -h')">df -h</text>
                    <text class="quick-chip" @click="useExample('ps | head -5')">ps</text>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="less" scoped>
@import url('shell.less');
</style>

<script>
import shellPage from './shell';
export default shellPage;
</script>
