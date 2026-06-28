<template>
    <div class="browser">
        <!-- 顶栏 -->
        <div class="header">
            <text class="header-btn" @click="goBack">‹</text>
            <text class="header-title">{{ pageTitle }}</text>
            <text class="header-btn" @click="toggleMenu">≡</text>
        </div>

        <!-- 菜单面板 -->
        <div v-if="showMenu" class="menu-panel">
            <div class="menu-section">
                <text class="menu-label">输入网址</text>
                <div class="url-bar">
                    <text class="url-display" @click="inputUrl">{{ currentUrl || '点击输入网址' }}</text>
                    <text class="url-go" @click="goHome">⌂</text>
                </div>
            </div>
            <div class="menu-section">
                <text class="menu-label">快捷链接</text>
                <div v-for="(link, idx) in quickLinks" :key="'ql'+idx" class="link-item" @click="visitLink(link.url)">
                    <text class="link-text">{{ link.name }}</text>
                </div>
            </div>
            <div class="menu-section">
                <text class="menu-label">收藏</text>
                <div v-if="bookmarks.length === 0" class="empty-text">
                    <text class="empty-tip">暂无收藏</text>
                </div>
                <div v-for="(bm, idx) in bookmarks" :key="'bm'+idx" class="link-item" @click="visitLink(bm.url)">
                    <text class="link-text">{{ bm.name }}</text>
                    <text class="link-del" @click.stop="deleteBookmark(idx)">×</text>
                </div>
            </div>
        </div>

        <!-- 网页内容 -->
        <div class="content-area">
            <HtmlView v-if="currentUrl" :url="currentUrl" />
            <div v-else class="empty-page">
                <text class="empty-tip">输入网址开始浏览</text>
            </div>
        </div>

        <!-- 底栏 -->
        <div class="footer">
            <text class="footer-btn" @click="inputUrl">网址</text>
            <text class="footer-btn" @click="reload">刷新</text>
            <text class="footer-btn" @click="addBookmark">收藏</text>
            <text class="footer-btn" @click="goHome">首页</text>
        </div>
    </div>
</template>

<style lang="less" scoped>
@import url('browser.less');
</style>

<script>
import browser from './browser';
import HtmlView from '../../components/webview.vue';
export default {
    ...browser,
    components: {
        HtmlView
    }
};
</script>
