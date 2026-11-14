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
            <div v-if="checking" class="section">
                <text class="section-title">正在启动...</text>
            </div>

            <div v-else-if="locked" class="section lock-section">
                <text class="section-title">应用已锁定</text>
                <text class="lock-hint">需要输入密码才能继续使用</text>
                <div class="btn-area">
                    <text class="btn btn-primary lock-btn" @click="unlock">输入密码解锁</text>
                </div>
            </div>

            <div v-else class="section">
                <text class="section-title">可用功能</text>

                <div class="item"><text class="item-text" @click="openAi">AI 助手</text></div>
                <div class="item"><text class="item-text" @click="openImageView">图片查看</text></div>
                <div class="item"><text class="item-text" @click="openUpdate">检查更新</text></div>
                <div class="item"><text class="item-text" @click="openSettings">设置</text></div>
            </div>
        </scroller>
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
