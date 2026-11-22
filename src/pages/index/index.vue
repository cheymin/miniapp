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
                <div v-if="page === 0" :class="'page page-home ' + animClass">
                    <div class="safe-top-bar">
                        <div class="safe-time-box">
                            <text class="safe-time">{{ clockTime }}</text>
                            <text class="safe-date">{{ clockDate }}</text>
                        </div>
                        <div class="safe-top-right">
                            <text class="safe-next-class" @click="goPage(1)">全部应用</text>
                            <text class="safe-exit-btn" @click="lockNow">锁屏</text>
                        </div>
                    </div>

                    <div class="home-main">
                        <div class="calculator-card">
                            <div class="calculator-inner">
                                <div class="sys-title-row">
                                    <text class="sys-title">Cheymin Pen</text>
                                    <div class="pro-badge">
                                        <text class="pro-badge-txt">3.0</text>
                                    </div>
                                </div>
                                <text class="sys-version">当前版本 {{ version }}</text>
                                <text class="btn-update" @click="openApp('update')">检查更新</text>
                            </div>
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
                                    <div class="account-status-info">
                                        <text class="account-status-name">本地模式</text>
                                        <text class="account-status-money">{{ apps.length }} 个应用</text>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="messages-section">
                        <div class="msg-list">
                            <div class="msg-item" @click="openApp('appsManage')">
                                <div class="msg-icon-box">
                                    <text class="msg-icon-txt">应</text>
                                </div>
                                <div class="msg-content">
                                    <div class="msg-title-row">
                                        <text class="msg-title">应用管理</text>
                                        <text class="msg-time">安装 / 卸载</text>
                                    </div>
                                    <text class="msg-desc">管理桌面图标与应用</text>
                                </div>
                            </div>

                            <div class="msg-item" @click="openApp('settings')">
                                <div class="msg-icon-box">
                                    <text class="msg-icon-txt">设</text>
                                </div>
                                <div class="msg-content">
                                    <div class="msg-title-row">
                                        <text class="msg-title">系统设置</text>
                                        <text class="msg-time">应用锁</text>
                                    </div>
                                    <text class="msg-desc">密码、键盘与缓存</text>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="dots dots-clock">
                        <text class="dot dot-active"></text>
                        <text class="dot" @click="goPage(1)"></text>
                    </div>
                </div>

                <div v-else :class="'page page-apps ' + animClass">
                    <div class="safe-top-bar">
                        <div class="safe-time-box">
                            <text class="safe-time">{{ clockTime }}</text>
                            <text class="safe-date">{{ clockDate }}</text>
                        </div>
                        <div class="safe-top-right">
                            <text class="safe-exit-btn" @click="goPage(0)">返回</text>
                        </div>
                    </div>

                    <div class="apps-head">
                        <text class="apps-title">全部应用</text>
                        <text class="apps-sub">{{ apps.length }} 个</text>
                    </div>

                    <div class="screen2-container">
                        <div class="apps-grid">
                            <div v-for="app in apps" :key="app.key" class="app-item" @click="openApp(app.key)">
                                <div :class="'app-icon ' + app.theme">
                                    <text v-if="app.glyph" class="app-glyph">{{ app.glyph }}</text>
                                    <image v-else class="app-img" :src="app.icon" :width="26" :height="26" />
                                </div>
                                <text class="app-name">{{ app.name }}</text>
                            </div>
                        </div>
                    </div>

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
