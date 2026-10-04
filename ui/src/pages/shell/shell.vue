<template>
    <PageShell title="Shell 终端" activeKey="term">
        <div class="content" style="flex-direction:column; flex:1; padding-left:0; padding-top:0;">
            <!-- 状态指示 -->
            <div class="status" style="padding-left: @content-left; padding-bottom: 4px;">
                <div :class="shellInitialized ? 'status-dot status-dot-on' : 'status-dot status-dot-off'"></div>
                <text class="status-text">{{ shellInitialized ? '就绪' : '初始化中' }} · cwd: {{ cwd }}</text>
            </div>

            <!-- 终端窗口 -->
            <div class="terminal-wrap" style="margin-left: @content-left; flex: 1;">
                <scroller class="terminal" scroll-direction="vertical" :show-scrollbar="false">
                    <div v-for="line in lines" :key="line.key" class="line">
                        <text :class="'line-' + line.type">{{ line.text }}</text>
                    </div>
                </scroller>
                <div class="prompt-row">
                    <text class="prompt">{{ currentPrompt }}</text>
                    <text class="input-hint" v-if="!shellInitialized">Shell 未就绪</text>
                    <text class="input-hint" v-else>← 输入命令并回车执行（点击下方快捷命令）</text>
                </div>
            </div>

            <!-- 快捷命令 -->
            <div class="quick-row" style="padding-left: @content-left; padding-top: 6px;">
                <text class="quick-chip" @click="useExample('help')">help</text>
                <text class="quick-chip" @click="useExample('ls -la')">ls -la</text>
                <text class="quick-chip" @click="useExample('pwd')">pwd</text>
                <text class="quick-chip" @click="useExample('cat /proc/meminfo | head -3')">mem</text>
                <text class="quick-chip" @click="useExample('echo hello')">echo</text>
                <text class="quick-chip" @click="useExample('find / -name "*.mp4" 2>/dev/null | head -5')">find视频</text>
                <text class="quick-chip" @click="useExample('df -h')">df -h</text>
                <text class="quick-chip" @click="useExample('ps | head -5')">ps</text>
            </div>
        </div>
    </PageShell>
</template>

<style lang="less" scoped>
@import url('shell.less');
</style>

<script>
import shellPage from './shell';
export default shellPage;
</script>
