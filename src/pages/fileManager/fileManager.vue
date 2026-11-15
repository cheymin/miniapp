<template>
    <div>
        <div class="container fm">
            <div class="fm-top">
                <text class="fm-btn" @click="goBack">返回</text>
                <text class="fm-path" @click="editPath">{{ currentPath }}</text>
                <text class="fm-btn" @click="load(currentPath)">刷新</text>
            </div>

            <div class="fm-toolbar">
                <text class="fm-btn" @click="openSelected">打开</text>
                <text class="fm-btn" @click="goUp">上级</text>
                <text class="fm-btn" @click="createFolder">新建</text>
                <text class="fm-btn" @click="renameSelected">改名</text>
                <text class="fm-btn" @click="copySelected">复制</text>
                <text class="fm-btn" @click="paste">粘贴</text>
                <text class="fm-btn fm-btn-danger" @click="askDelete">删除</text>
            </div>

            <scroller class="fm-list" scroll-direction="vertical">
                <div v-for="item in entries" :key="item.path" :class="'fm-row' + rowClass(item)" @click="select(item)">
                    <text :class="'fm-badge ' + (item.dir ? 'fm-badge-dir' : 'fm-badge-file')">{{ item.dir ? '夹' : '文' }}</text>
                    <text class="fm-name">{{ item.name }}</text>
                    <text class="fm-size">{{ item.dir ? '目录' : formatSize(item.size) }}</text>
                </div>
                <text v-if="!entries.length" class="fm-empty">{{ loading ? '读取中...' : '当前目录为空' }}</text>
            </scroller>

            <div v-if="previewVisible" class="fm-mask">
                <div class="fm-dialog">
                    <text class="fm-dialog-title">{{ previewTitle }}</text>
                    <scroller class="fm-preview" scroll-direction="vertical">
                        <text class="fm-preview-text">{{ previewText }}</text>
                    </scroller>
                    <text class="fm-btn fm-dialog-btn" @click="previewVisible = false">关闭</text>
                </div>
            </div>

            <div v-if="deleteVisible" class="fm-mask">
                <div class="fm-dialog fm-dialog-small">
                    <text class="fm-dialog-title">确认删除</text>
                    <text class="fm-dialog-text">{{ selected ? selected.name : '' }}</text>
                    <div class="fm-dialog-actions">
                        <text class="fm-btn" @click="deleteVisible = false">取消</text>
                        <text class="fm-btn fm-btn-danger" @click="confirmDelete">删除</text>
                    </div>
                </div>
            </div>
        </div>
        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('fileManager.less');
</style>

<script>
import ToastMessage from '../../components/ToastMessage.vue';
import fileManager from './fileManager';
export default {
    ...fileManager,
    components: {
        ToastMessage
    }
}
</script>
