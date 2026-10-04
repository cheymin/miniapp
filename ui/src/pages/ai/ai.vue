<template>
    <PageShell title="AI 助手" activeKey="ai">
        <div class="content" style="flex-direction:column; flex:1; padding-top:0; padding-left:0;">
            <!-- 状态行 -->
            <div class="status-row" style="padding-left: @content-left; padding: 4px 6px;">
                <text class="status-text">{{ streaming ? '⚡ 生成中...' : '就绪' }} · {{ initialized ? 'AI OK' : 'AI 未初始化' }}</text>
                <text class="clear-btn" @click="clearAll">清空</text>
            </div>

            <!-- 消息列表 -->
            <scroller class="chat-list" scroll-direction="vertical" :show-scrollbar="false" style="padding-left: @content-left; padding-right: @s6;">
                <div v-for="m in messages" :key="m.id" :class="m.role === 'user' ? 'msg-user' : 'msg-assistant'">
                    <div :class="m.role === 'user' ? 'msg-bubble-user' : 'msg-bubble-assistant'">
                        <text class="msg-text">{{ m.text }}</text>
                    </div>
                </div>
            </scroller>

            <!-- 输入区 -->
            <div style="padding-left: @content-left; padding-right: @s6;">
                <div class="input-area">
                    <div class="input-box">
                        <text class="input-hint">📝 点下方快捷输入</text>
                    </div>
                    <text class="send-btn" @click="quickInput('你好')">发送</text>
                </div>
                <div class="quick-row">
                    <text class="quick-chip" @click="quickInput('介绍一下你自己')">介绍一下你自己</text>
                    <text class="quick-chip" @click="quickInput('给我一首唐诗')">一首唐诗</text>
                    <text class="quick-chip" @click="quickInput('解释什么是量子力学')">量子力学</text>
                    <text class="quick-chip" @click="quickInput('写一段 Python 排序')">Python 排序</text>
                    <text class="quick-chip" @click="trySettings">⚙️ 设置 API</text>
                </div>
            </div>
        </div>
    </PageShell>
</template>

<style lang="less" scoped>
@import url('ai.less');
</style>

<script>
import ai from './ai';
export default ai;
</script>
