<template>
    <div>
        <div class="app">
            <div class="tabband">
                <div class="tb-iconbtn" @click="goBack">
                    <text class="tb-ic-lg">‹</text>
                </div>
                <scroller class="tab-strip" scroll-direction="horizontal" :show-scrollbar="false">
                    <div class="tab-strip-inner">
                        <div class="tab tab-active">
                            <text class="tab-txt tab-txt-active">{{ currentPath }}</text>
                        </div>
                    </div>
                </scroller>
                <div class="tb-iconbtn" @click="load(currentPath)">
                    <text class="tb-ic-lg">⟳</text>
                </div>
            </div>

            <div class="files-page">
                <div class="path-row">
                    <div class="nav-ic-btn" @click="goUp">
                        <text class="nav-ic">↑</text>
                    </div>
                    <div class="nav-ic-btn" @click="load(currentPath)">
                        <text class="nav-ic">⟳</text>
                    </div>
                    <div class="path-box" @click="editPath">
                        <text class="path-txt">{{ currentPath }}</text>
                    </div>
                    <div class="sort-btn" @click="load(currentPath)">
                        <text class="sort-btn-txt">{{ loading ? '读取中' : '名称' }}</text>
                    </div>
                </div>

                <scroller class="file-scroller" scroll-direction="vertical" :show-scrollbar="true">
                    <div v-for="item in entries" :key="item.path"
                        :class="'file-item' + (selected && selected.path === item.path ? ' file-selected' : '')"
                        @click="select(item)">
                        <text class="tag-ic">{{ item.dir ? '▣' : '▤' }}</text>
                        <text class="file-name">{{ item.name }}</text>
                        <text class="file-size">{{ item.dir ? '目录' : formatSize(item.size) }}</text>
                    </div>
                    <div v-if="!entries.length" class="pick-hint">
                        <text class="pick-hint-txt">{{ loading ? '读取中...' : '当前目录为空' }}</text>
                    </div>
                </scroller>

                <div class="dock">
                    <scroller class="dock-actions" scroll-direction="horizontal" :show-scrollbar="false">
                        <div class="dock-actions-inner">
                            <div class="dock-btn-primary dock-btn" @click="createFolder">
                                <text class="dock-btn-txt dock-btn-txt-dark">新建</text>
                            </div>
                            <div class="dock-btn dock-btn-tonal" @click="openSelected">
                                <text class="dock-btn-txt dock-btn-txt-light">打开</text>
                            </div>
                            <div class="dock-btn dock-btn-tonal" @click="goUp">
                                <text class="dock-btn-txt dock-btn-txt-light">上级</text>
                            </div>
                            <div class="dock-btn" @click="renameSelected">
                                <text class="dock-btn-txt">重命名</text>
                            </div>
                            <div class="dock-btn" @click="copySelected">
                                <text class="dock-btn-txt">复制</text>
                            </div>
                            <div class="dock-btn" @click="paste">
                                <text class="dock-btn-txt">粘贴</text>
                            </div>
                            <div class="dock-btn dock-btn-red" @click="askDelete">
                                <text class="dock-btn-txt red-text">删除</text>
                            </div>
                        </div>
                    </scroller>
                </div>
            </div>

            <div v-if="previewVisible" class="preview-mask">
                <div class="fm-preview-box">
                    <text class="fm-preview-title">{{ previewTitle }}</text>
                    <scroller class="fm-preview-scroll" scroll-direction="vertical">
                        <text class="fm-preview-text">{{ previewText }}</text>
                    </scroller>
                    <div class="confirm-actions">
                        <div class="confirm-btn" @click="previewVisible = false">
                            <text class="confirm-btn-text">关闭</text>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="deleteVisible" class="confirm-mask">
                <div class="confirm-box">
                    <text class="confirm-title">确认删除</text>
                    <text class="confirm-msg">{{ selected ? selected.name : '' }}</text>
                    <div class="confirm-actions">
                        <div class="confirm-btn" @click="deleteVisible = false">
                            <text class="confirm-btn-text">取消</text>
                        </div>
                        <div class="confirm-btn confirm-btn-danger" @click="confirmDelete">
                            <text class="confirm-btn-danger-text">删除</text>
                        </div>
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
