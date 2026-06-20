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
    <div class="kb">
        <!-- 显示区 -->
        <div class="display">
            <scroller class="display-scroll" scroll-direction="horizontal" :show-scrollbar="false">
                <text class="display-text">{{ displayText }}</text>
            </scroller>
        </div>

        <!-- 候选栏（中文拼音候选） -->
        <div v-if="hasCandidates" class="cand-bar">
            <text v-if="hasPrevPage" class="cand-nav" @click="prevCandidates">‹</text>
            <scroller class="cand-scroll" scroll-direction="horizontal" :show-scrollbar="false">
                <div class="cand-row">
                    <div v-for="(c, i) in candidateList" :key="'c'+i" class="cand-item" @click="selectCandidate(c.hanZi)">
                        <text class="cand-text">{{ c.hanZi }}</text>
                    </div>
                </div>
            </scroller>
            <text v-if="hasNextPage" class="cand-nav" @click="nextCandidates">›</text>
        </div>

        <!-- 剪贴板栏 -->
        <div v-if="hasClipboard" class="clipbar">
            <scroller class="clip-scroll" scroll-direction="horizontal" :show-scrollbar="false">
                <div class="clip-row">
                    <div v-for="(item, idx) in clipboard" :key="'cl'+idx" class="clip-item" @click="pasteClip(idx)">
                        <text class="clip-text">{{ item.length > 12 ? item.slice(0, 12) + '…' : item }}</text>
                        <text class="clip-del" @click.stop="deleteClip(idx)">×</text>
                    </div>
                </div>
            </scroller>
        </div>

        <!-- 键盘 -->
        <div class="keys-area">
            <div v-for="(row, ri) in currentKeys" :key="'r'+ri" class="key-row">
                <div
                    v-for="(key, ki) in row"
                    :key="'k'+ri+'-'+ki"
                    :class="keyClass(key)"
                    :style="{ flex: keyWidth(key) }"
                    @click="onKey(key)"
                >
                    <text class="key-lbl">{{ key === 'space' ? '空格' : key }}</text>
                </div>
            </div>
        </div>

        <!-- 操作栏 -->
        <div class="action-bar">
            <div class="action-btn" @click="copyText"><text class="act-lbl">复制</text></div>
            <div class="action-btn" @click="cutText"><text class="act-lbl">剪切</text></div>
            <div class="action-btn" @click="toggleEmoji"><text class="act-lbl">😊</text></div>
            <div class="action-btn" @click="pasteSysClipboard"><text class="act-lbl">粘贴</text></div>
            <div class="action-btn action-ok" @click="confirm"><text class="act-lbl act-lbl-ok">确定</text></div>
        </div>

        <!-- Emoji -->
        <div v-if="showEmoji" class="emoji-overlay" @click="showEmoji = false">
            <div class="emoji-panel" @click.stop>
                <div class="emoji-grid">
                    <div v-for="(e, ei) in EMOJI_LIST" :key="'e'+ei" class="emoji-cell" @click="insertEmoji(e)">
                        <text class="emoji-c">{{ e }}</text>
                    </div>
                </div>
                <div class="emoji-close" @click="showEmoji = false">
                    <text class="emoji-close-text">关闭</text>
                </div>
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