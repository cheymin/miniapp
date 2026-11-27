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
                    <div class="screen2-container">
                        <div class="messages-section">
                            <scroller class="msg-list" scroll-direction="vertical" :show-scrollbar="false">
                                <div class="msg-item" @click="openApp('appsManage')">
                                    <div class="msg-icon-box msg-icon-apps">
                                        <text class="msg-icon-txt">应</text>
                                    </div>
                                    <div class="msg-content">
                                        <div class="msg-title-row">
                                            <text class="msg-title">应用管理</text>
                                            <text class="msg-time">管理</text>
                                        </div>
                                        <text class="msg-desc">安装、卸载与桌面图标</text>
                                    </div>
                                </div>

                                <div class="msg-item" @click="openApp('settings')">
                                    <div class="msg-icon-box msg-icon-settings">
                                        <text class="msg-icon-txt">设</text>
                                    </div>
                                    <div class="msg-content">
                                        <div class="msg-title-row">
                                            <text class="msg-title">系统设置</text>
                                            <text class="msg-time">设置</text>
                                        </div>
                                        <text class="msg-desc">应用锁、键盘与缓存</text>
                                    </div>
                                </div>

                                <div class="msg-item" @click="openApp('update')">
                                    <div class="msg-icon-box msg-icon-update">
                                        <text class="msg-icon-txt">更</text>
                                    </div>
                                    <div class="msg-content">
                                        <div class="msg-title-row">
                                            <text class="msg-title">检查更新</text>
                                            <text class="msg-time">{{ version }}</text>
                                        </div>
                                        <text class="msg-desc">当前版本 {{ version }}</text>
                                    </div>
                                </div>
                            </scroller>
                        </div>

                        <div class="clock-section">
                            <div class="clock-widget">
                                <text class="time-text">{{ clockTime }}</text>
                                <div class="date-row">
                                    <text class="date-text">{{ clockDate }}</text>
                                </div>
                                <div class="account-status-row">
                                    <div class="account-status-avatar">
                                        <text class="account-status-avatar-txt">C</text>
                                    </div>
                                    <text class="account-status-name">本地模式</text>
                                    <text class="account-status-money">{{ apps.length }} 个应用</text>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="dots">
                        <text class="dot dot-active"></text>
                        <text class="dot" @click="goPage(1)"></text>
                    </div>
                </div>

                <div v-else :class="'page page-apps ' + animClass">
                    <scroller class="apps-h-scroller" scroll-direction="horizontal" :show-scrollbar="false">
                        <div class="h-app-list">
                            <div class="calculator-card">
                                <div class="calculator-inner">
                                    <div class="sys-title-row">
                                        <text class="sys-title">Cheymin Pen</text>
                                        <div class="pro-badge">
                                            <text class="pro-badge-txt">3.0</text>
                                        </div>
                                    </div>
                                    <text class="sys-version">桌面版本 {{ version }} 预览</text>
                                    <div class="btn-update" @click="openApp('update')">
                                        <text class="btn-update-txt">检查更新</text>
                                    </div>
                                </div>
                            </div>

                            <div v-for="app in apps" :key="app.key" class="h-app-item" @click="openApp(app.key)">
                                <div :class="'app-icon ' + app.theme">
                                    <text v-if="app.glyph" class="app-glyph">{{ app.glyph }}</text>
                                    <image v-else class="app-img" :src="app.icon" :width="64" :height="64" />
                                </div>
                                <text class="app-label">{{ app.name }}</text>
                            </div>
                        </div>
                    </scroller>

                    <text class="page-back" @click="goPage(0)">时钟</text>

                    <div class="dots">
                        <text class="dot" @click="goPage(0)"></text>
                        <text class="dot dot-active"></text>
                    </div>
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
