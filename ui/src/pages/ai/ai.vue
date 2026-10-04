<template>
    <div class="app-root">
        <div class="left-rail">
            <text v-for="(r, i) in rail" :key="i" class="rail-item" @click="open(r.page)">
                <text :class="activeKey === r.page ? 'rail-icon rail-icon-on' : 'rail-icon'">{{ r.icon }}</text>
                <text :class="activeKey === r.page ? 'rail-label rail-label-on' : 'rail-label'">{{ r.label }}</text>
            </text>
            <text class="rail-item" style="flex:1"></text>
            <text class="rail-item" @click="open('settings')">
                <text class="rail-icon">⚙️</text><text class="rail-label">设置</text>
            </text>
        </div>
        <div class="main-area">
            <div class="title-bar"><text class="title-text">AI 助手</text></div>
            <div class="content" style="flex-direction:column;">
                <div class="status-row">
                    <text class="status-text">{{ streaming ? '⚡ 生成中...' : '就绪' }} · {{ initialized ? 'AI OK' : 'AI 未初始化' }}</text>
                    <text class="clear-btn" @click="clearAll">清空</text>
                </div>
                <scroller class="chat-list" scroll-direction="vertical" :show-scrollbar="false">
                    <div v-for="m in messages" :key="m.id" :class="m.role === 'user' ? 'msg-user' : 'msg-assistant'">
                        <div :class="m.role === 'user' ? 'msg-bubble-user' : 'msg-bubble-assistant'">
                            <text class="msg-text">{{ m.text }}</text>
                        </div>
                    </div>
                </scroller>
                <div class="input-area">
                    <div class="input-box"><text class="input-hint">📝 点下方快捷输入</text></div>
                    <text class="send-btn" @click="quickInput('你好')">发送</text>
                </div>
                <div class="quick-row">
                    <text class="quick-chip" @click="quickInput('介绍一下你自己')">自我介绍</text>
                    <text class="quick-chip" @click="quickInput('给我一首唐诗')">唐诗</text>
                    <text class="quick-chip" @click="quickInput('写一段 Python 排序')">Python</text>
                    <text class="quick-chip" @click="trySettings">⚙️ 设置</text>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="less" scoped>
@import url('ai.less');
</style>

<script>
import ai from './ai';
export default ai;
</script>
