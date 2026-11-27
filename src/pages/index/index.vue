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
    <div class="wrapper">
        <div v-if="loading" class="loading-container">
            <text class="loading">正在准备运算模块...</text>
        </div>

        <div v-else class="calculator-container">
            <div class="display">
                <div style="flex: 1"></div>
                <text class="display-text" :style="{ color: textColor }">{{ display }}</text>
            </div>

            <div class="keyboard">
                <div class="line">
                    <div v-for="key in keyMap.line1" :key="key.key" class="key-cell">
                        <div :class="'key-btn' + (pressedKey === key.key ? ' key-btn-press' : '')"
                            :style="{ backgroundColor: key.color[0] }"
                            @touchstart="press(key)" @touchend="release" @click="onKey(key)">
                            <text class="key-text" :style="{ color: key.color[1] }">{{ key.text }}</text>
                        </div>
                    </div>
                </div>

                <div class="line">
                    <div v-for="key in keyMap.line2" :key="key.key" class="key-cell">
                        <div :class="'key-btn' + (pressedKey === key.key ? ' key-btn-press' : '')"
                            :style="{ backgroundColor: key.color[0] }"
                            @touchstart="press(key)" @touchend="release" @click="onKey(key)">
                            <text class="key-text" :style="{ color: key.color[1] }">{{ key.text }}</text>
                        </div>
                    </div>
                </div>

                <div class="line">
                    <div v-for="key in keyMap.line3" :key="key.key" class="key-cell">
                        <div :class="'key-btn' + (pressedKey === key.key ? ' key-btn-press' : '')"
                            :style="{ backgroundColor: key.color[0] }"
                            @touchstart="press(key)" @touchend="release" @click="onKey(key)">
                            <text class="key-text" :style="{ color: key.color[1] }">{{ key.text }}</text>
                        </div>
                    </div>

                    <div class="key-cell key-cell-eq">
                        <div :class="'key-btn' + (pressedKey === 'eq' ? ' key-btn-press' : '')"
                            :style="{ backgroundColor: '#6ada8b' }"
                            @touchstart="pressedKey = 'eq'" @touchend="release" @click="evaluate">
                            <text class="key-text" :style="{ color: '#0a3818' }">=</text>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="less" scoped>
@import url('index.less');
</style>

<script>
import index from './index';
export default index;
</script>
