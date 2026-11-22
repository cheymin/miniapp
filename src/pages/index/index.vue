<template>
    <div>
        <div class="container home" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd">
            <div v-if="checking" class="center-box">
                <text class="hint">正在启动...</text>
            </div>

            <div v-else-if="locked" class="center-box">
                <div class="lock-card">
                    <text class="lock-time">{{ clockTime }}</text>
                    <text class="lock-hint">应用已锁定</text>
                    <text class="unlock-btn" @click="unlock">输入密码解锁</text>
                </div>
            </div>

            <div v-else class="pager">
                <div v-if="page === 0" :class="'page page-clock ' + animClass">
                    <text class="clock-time">{{ clockTime }}</text>
                    <text class="clock-date">{{ clockDate }}</text>
                    <text class="clock-brand">Cheymin Pen</text>
                    <text class="swipe-hint">↑ 上滑查看应用</text>
                </div>

                <div v-else :class="'page page-apps ' + animClass">
                    <div class="apps-head">
                        <text class="apps-title">应用</text>
                        <text class="apps-time">{{ clockTime }}</text>
                        <text class="apps-back" @click="goPage(0)">下滑返回</text>
                    </div>
                    <div class="apps-grid">
                        <div v-for="app in apps" :key="app.key" class="app-item" @click="openApp(app.key)">
                            <div :class="'app-icon ' + app.theme">
                                <text v-if="app.glyph" class="app-glyph">{{ app.glyph }}</text>
                                <image v-else class="app-img" :src="app.icon" :width="20" :height="20" />
                            </div>
                            <text class="app-name">{{ app.name }}</text>
                        </div>
                    </div>
                    <div class="dots">
                        <text class="dot" @click="goPage(0)"></text>
                        <text class="dot dot-active"></text>
                    </div>
                </div>

                <div v-if="page === 0" class="dots dots-clock">
                    <text class="dot dot-active"></text>
                    <text class="dot" @click="goPage(1)"></text>
                </div>
            </div>
        </div>
        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('index.less');
</style>

<script>
import ToastMessage from '../../components/ToastMessage.vue';
import index from './index';
export default {
    ...index,
    components: {
        ToastMessage
    }
}
</script>
