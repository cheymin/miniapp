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
        <scroller class="container" scroll-direction="vertical" :show-scrollbar="true">
            <div class="section">
                <text class="section-title">提示词</text>
                <text class="item-textarea prompt-display" @click="editPrompt">{{ prompt || '点击输入提示词' }}</text>
            </div>

            <div class="section">
                <text class="section-title">参数</text>

                <div class="item">
                    <text class="item-text">图片模型</text>
                    <text class="item-input" @click="editImageModel">{{ imageModel || '点击输入模型' }}</text>
                </div>

                <div class="item">
                    <text class="item-text">尺寸</text>
                    <text class="item-input" @click="cycleSize">{{ size }} (点击切换)</text>
                </div>
            </div>

            <div class="btn-area generate-area">
                <text @click="generate" :class="'btn btn-primary ' + (canGenerate ? '' : 'btn-disabled')">{{ isGenerating ? '生成中...' : '生成图片' }}</text>
                <text @click="openSettings" class="btn btn-info">配置</text>
            </div>

            <div v-if="generatedImage" class="section">
                <text class="section-title">预览</text>
                <div class="image-preview-area">
                    <image v-if="generatedImage.startsWith('data:')" :src="generatedImage" class="image-preview" resize="contain" />
                    <text v-else class="item-text small-text">图片为 URL 形式（{{ generatedImage }}），不支持直接预览，请保存到本地后查看。</text>
                </div>
                <div class="btn-area preview-actions">
                    <text @click="saveToGallery" class="btn btn-success">保存到图库</text>
                    <text @click="clearImage" class="btn btn-danger">清除</text>
                </div>
                <text v-if="lastPrompt" class="item-text small-text last-prompt">提示词：{{ lastPrompt }}</text>
            </div>
        </scroller>
        <Loading />
        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('imageGen.less');
</style>

<script>
import imageGen from './imageGen';
import Loading from '../../components/Loading.vue';
import ToastMessage from '../../components/ToastMessage.vue';
export default {
    ...imageGen,
    components: {
        Loading,
        ToastMessage
    }
};
</script>
