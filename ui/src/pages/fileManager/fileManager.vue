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
            <div class="title-bar"><text class="title-text">文件管理</text></div>
            <scroller class="content" scroll-direction="vertical" :show-scrollbar="false">
                <div class="quick-row">
                    <text class="quick-chip" @click="quickDir('/userdisk')">/userdisk</text>
                    <text class="quick-chip" @click="quickDir('/tmp')">/tmp</text>
                    <text class="quick-chip" @click="quickDir('/')">/</text>
                    <text class="quick-chip" @click="quickDir('/etc')">/etc</text>
                    <text class="quick-chip" @click="quickDir('/oem')">/oem</text>
                </div>
                <div class="dir-header">
                    <text class="nav-btn" @click="parentDir">↑</text>
                    <text class="dir-path">{{ currentDir }}</text>
                </div>
                <div v-if="items.length === 0" class="empty">
                    <text class="empty-text">（空目录）</text>
                </div>
                <div v-for="(item, i) in items" :key="i" class="list-item" @click="onItemClick(item)">
                    <text class="item-icon">{{ fileIcon(item) }}</text>
                    <text class="item-name">{{ item.name }}</text>
                    <text class="item-size" v-if="!item.isDir">{{ item.size }}</text>
                </div>
            </scroller>
        </div>
    </div>
</template>

<style lang="less" scoped>
@import url('fileManager.less');
</style>

<script>
import fileManager from './fileManager';
export default fileManager;
</script>
