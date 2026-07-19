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
        <div class="keyboard-container">
            <div class="top-bar">
                <text class="top-btn" @click="cancel">←</text>
                <text class="top-title">输入消息</text>
                <text class="top-btn-placeholder"></text>
            </div>

            <scroller class="input-scroller" scroll-direction="vertical" :show-scrollbar="true">
                <div class="input-area" @click="onContentClick">
                    <text class="input-text">{{ content || '点击开始输入...' }}</text>
                </div>
            </scroller>

            <div class="toolbar">
                <text class="tool-btn" @click="copyToClipboard">复制</text>
                <text class="tool-btn" @click="pasteFromClipboard">粘贴</text>
                <text class="tool-btn" @click="clearContent">清空</text>
                <text class="tool-btn" @click="togglePhraseMenu">短语</text>
                <text class="send-btn" @click="send">发送</text>
            </div>
        </div>

        <div v-if="showPhraseMenu" class="phrase-overlay" @click="togglePhraseMenu">
            <div class="phrase-panel" @click.stop>
                <text class="phrase-title">快捷短语</text>
                <div class="phrase-list">
                    <div v-for="phrase in quickPhrases" :key="phrase" class="phrase-item"
                        @click="insertPhrase(phrase)">
                        <text class="phrase-text">{{ phrase }}</text>
                    </div>
                </div>
                <div class="phrase-footer">
                    <text class="phrase-close-btn" @click="togglePhraseMenu">关闭</text>
                </div>
            </div>
        </div>

        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('chatKeyboard.less');
</style>

<script>
import ToastMessage from '../../components/ToastMessage.vue';
import chatKeyboard from './chatKeyboard';
export default {
    ...chatKeyboard,
    components: {
        ToastMessage
    }
};
</script>
