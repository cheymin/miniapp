<template>
    <PageShell title="文件管理" activeKey="file">
        <scroller class="content" scroll-direction="vertical" :show-scrollbar="false">
            <!-- 快速目录 -->
            <div class="quick-row">
                <text class="quick-chip" @click="quickDir('/userdisk')">/userdisk</text>
                <text class="quick-chip" @click="quickDir('/tmp')">/tmp</text>
                <text class="quick-chip" @click="quickDir('/')">/</text>
                <text class="quick-chip" @click="quickDir('/etc')">/etc</text>
                <text class="quick-chip" @click="quickDir('/oem')">/oem</text>
            </div>

            <!-- 当前路径 -->
            <div class="dir-header">
                <text class="nav-btn" @click="parentDir">↑</text>
                <text class="dir-path">{{ currentDir }}</text>
            </div>

            <!-- 文件列表 -->
            <div v-if="items.length === 0" class="empty">
                <text class="empty-text">（空目录）</text>
            </div>
            <div
                v-for="(item, i) in items"
                :key="i"
                class="list-item"
                @click="onItemClick(item)">
                <text class="item-icon">{{ fileIcon(item) }}</text>
                <text class="item-name">{{ item.name }}</text>
                <text class="item-size" v-if="!item.isDir">{{ item.size }}</text>
            </div>
        </scroller>
    </PageShell>
</template>

<style lang="less" scoped>
@import url('fileManager.less');
</style>

<script>
import fileManager from './fileManager';
export default fileManager;
</script>
