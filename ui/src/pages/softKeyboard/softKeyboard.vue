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
    <div class="keyboard-container">
        <!-- 顶部显示区 -->
        <div class="display-area">
            <scroller class="display-scroller" scroll-direction="horizontal" :show-scrollbar="false">
                <text class="display-text">{{ displayText }}</text>
            </scroller>
            <div class="display-info">
                <text class="char-count">{{ textBuffer.length }}</text>
                <text class="mode-indicator">{{ keyboardMode === 'letters' ? (capsLock ? '大写' : '小写') : keyboardMode === 'numbers' ? '数字' : '符号' }}</text>
            </div>
        </div>

        <!-- 剪贴板栏 -->
        <div v-if="hasClipboardItems" class="clipboard-bar">
            <scroller class="clipboard-scroller" scroll-direction="horizontal" :show-scrollbar="false">
                <div class="clipboard-items">
                    <div v-for="(item, index) in clipboard" :key="'clip-' + index" class="clipboard-item" @click="pasteClipboardItem(item)">
                        <text class="clipboard-text">{{ item.length > 20 ? item.slice(0, 20) + '…' : item }}</text>
                        <text class="clipboard-del" @click.stop="deleteClipboardItem(index)">×</text>
                    </div>
                </div>
            </scroller>
        </div>

        <!-- 键盘主体 -->
        <div class="keyboard-area">
            <div v-for="(row, rowIndex) in currentLayout" :key="'row-' + rowIndex" class="key-row">
                <div
                    v-for="(key, keyIndex) in row.keys"
                    :key="'key-' + rowIndex + '-' + keyIndex"
                    :class="getActiveClass(key)"
                    :style="{ flex: key.width || 1 }"
                    @touchstart="onKeyDown(key)"
                    @touchend="onKeyUp(key)"
                    @touchcancel="onKeyUp(key)"
                >
                    <text class="key-label">{{ getKeyDisplay(key) }}</text>
                </div>
            </div>
        </div>

        <!-- Emoji 选择器 -->
        <div v-if="showEmojiPicker" class="emoji-picker-overlay" @click="showEmojiPicker = false">
            <div class="emoji-picker" @click.stop>
                <div class="emoji-grid">
                    <div v-for="(emoji, emojiIndex) in emojiList" :key="'emoji-' + emojiIndex" class="emoji-item" @click="insertEmoji(emoji)">
                        <text class="emoji-char">{{ emoji }}</text>
                    </div>
                </div>
                <div class="emoji-close-area" @click="showEmojiPicker = false">
                    <text class="emoji-close-text">关闭</text>
                </div>
            </div>
        </div>

        <!-- 底部操作栏 -->
        <div class="action-bar">
            <div class="action-item" @click="copyToClipboard">
                <text class="action-label">复制</text>
            </div>
            <div class="action-item" @click="cutToClipboard">
                <text class="action-label">剪切</text>
            </div>
            <div class="action-item" @click="pasteFromClipboard">
                <text class="action-label">粘贴</text>
            </div>
            <div class="action-item" @click="selectAll">
                <text class="action-label">全选</text>
            </div>
            <div class="action-item" @click="close">
                <text class="action-label action-confirm">确定</text>
            </div>
        </div>
    </div>
</template>

<style lang="less" scoped>
@import url('softKeyboard.less');
</style>

<script>
import softKeyboard from './softKeyboard';
export default {
    ...softKeyboard,
};
</script>