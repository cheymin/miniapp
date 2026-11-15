<!--
 Copyright (C) 2025 Langning Chen
 
 This file is part of miniapp.
 
 miniapp is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.
 
 miniapp is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.
 
 You should have received a copy of the GNU General Public License
 along with miniapp.  If not, see <https://www.gnu.org/licenses/>.
-->

<template>
    <div>
        <div class="container home">
            <div v-if="checking" class="center-box">
                <text class="hint">正在启动...</text>
            </div>

            <div v-else-if="locked" class="center-box">
                <div class="lock-card">
                    <image class="lock-icon" :src="icons.lock" :width="22" :height="22" />
                    <text class="lock-title">应用已锁定</text>
                    <text class="lock-hint">输入密码后继续使用</text>
                    <text class="unlock-btn" @click="unlock">解锁</text>
                </div>
            </div>

            <div v-else class="home-body">
                <div class="home-header">
                    <text class="home-title">Cheymin Pen</text>
                    <text class="home-subtitle">工具中心</text>
                </div>

                <div class="feature-grid">
                    <div class="feature-card" @click="openAi">
                        <div class="icon-box icon-ai">
                            <image class="feature-icon" :src="icons.ai" :width="22" :height="22" />
                        </div>
                        <text class="feature-title">AI 助手</text>
                        <text class="feature-desc">对话与写作</text>
                    </div>

                    <div class="feature-card" @click="openImageView">
                        <div class="icon-box icon-image">
                            <image class="feature-icon" :src="icons.image" :width="22" :height="22" />
                        </div>
                        <text class="feature-title">图片查看</text>
                        <text class="feature-desc">扫描本地图片</text>
                    </div>

                    <div class="feature-card" @click="openFileManager">
                        <div class="icon-box icon-file">
                            <image class="feature-icon" :src="icons.file" :width="22" :height="22" />
                        </div>
                        <text class="feature-title">文件管理</text>
                        <text class="feature-desc">浏览与操作</text>
                    </div>

                    <div class="feature-card" @click="openVideoPlayer">
                        <div class="icon-box icon-video">
                            <image class="feature-icon" :src="icons.video" :width="22" :height="22" />
                        </div>
                        <text class="feature-title">视频播放</text>
                        <text class="feature-desc">路径或链接</text>
                    </div>

                    <div class="feature-card" @click="openUpdate">
                        <div class="icon-box icon-update">
                            <image class="feature-icon" :src="icons.update" :width="22" :height="22" />
                        </div>
                        <text class="feature-title">检查更新</text>
                        <text class="feature-desc">获取最新版本</text>
                    </div>

                    <div class="feature-card" @click="openSettings">
                        <div class="icon-box icon-settings">
                            <image class="feature-icon" :src="icons.settings" :width="22" :height="22" />
                        </div>
                        <text class="feature-title">设置</text>
                        <text class="feature-desc">密码与偏好</text>
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
