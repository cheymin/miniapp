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
        <div class="container term">
            <div class="term-head">
                <text class="term-title">终端</text>
                <text class="term-cwd">{{ cwd }}</text>
                <text @click="clearOutput" class="term-head-btn">清</text>
                <text @click="goBack" class="term-head-btn">返</text>
            </div>

            <scroller ref="outputScroller" class="term-output" scroll-direction="vertical"
                :show-scrollbar="true">
                <text v-for="(line, index) in lines" :key="index"
                    :class="'term-line term-line-' + line.type">{{ line.text }}</text>
            </scroller>

            <div class="term-quick">
                <text v-for="cmd in quickCommands" :key="cmd" class="term-chip"
                    @click="runQuick(cmd)">{{ cmd }}</text>
            </div>

            <div class="term-input-row">
                <text :class="'term-prompt' + (busy ? ' term-prompt-busy' : '')"
                    @click="openCommandInput">{{ busy ? '执行中…' : '输入命令…' }}</text>
                <text class="term-action" @click="repeatLast">↑</text>
                <text :class="'term-action term-action-run' + (busy ? ' term-action-disabled' : '')"
                    @click="openCommandInput">执</text>
            </div>
        </div>
        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('terminal.less');
</style>

<script>
import ToastMessage from '../../components/ToastMessage.vue';
import terminal from './terminal';
export default {
    ...terminal,
    components: {
        ToastMessage
    }
}
</script>
