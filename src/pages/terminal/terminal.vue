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
        <div class="wrapper">
            <div class="left-panel">
                <div class="action-bar">
                    <div class="action-btn cancel" @click="goBack">
                        <text class="action-btn-text cancel-text">返回</text>
                    </div>
                    <div class="action-bar-spacer"></div>
                    <div class="action-btn confirm" @click="openCommandInput">
                        <text class="action-btn-text confirm-text">回车</text>
                    </div>
                </div>

                <scroller ref="outputScroller" class="display-screen" scroll-direction="vertical"
                    :show-scrollbar="true">
                    <div class="display-inner">
                        <text v-for="(line, index) in lines" :key="index"
                            :class="'terminal-output-line term-' + line.type">{{ line.text }}</text>
                        <text class="terminal-status-line">{{ busy ? '执行中…' : cwd + ' · 点击回车输入命令' }}</text>
                    </div>
                </scroller>

                <div class="nav-toolbar">
                    <div class="nav-btn" @click="clearOutput">
                        <text class="nav-icon">清</text>
                    </div>
                    <div class="nav-btn" @click="repeatLast">
                        <text class="nav-icon">↑</text>
                    </div>
                    <div class="nav-btn" @click="openCommandInput">
                        <text class="nav-icon">$</text>
                    </div>
                    <div class="nav-btn" @click="goBack">
                        <text class="nav-icon">返</text>
                    </div>
                </div>
            </div>

            <div class="keyboard-panel">
                <div class="top-bar-container">
                    <div class="tabs">
                        <div class="tab-item tab-active">
                            <text class="tab-text">快捷命令</text>
                        </div>
                    </div>
                </div>

                <div class="term-shortcut-row">
                    <div v-for="cmd in quickCommands" :key="cmd" class="term-shortcut-btn" @click="runQuick(cmd)">
                        <text class="term-shortcut-text">{{ cmd }}</text>
                    </div>
                </div>

                <div class="sys-kb-area">
                    <text class="sys-kb-hint">系统键盘输入中…</text>
                    <text class="sys-kb-preview">{{ cwd }} $ 点击“回车”打开系统键盘</text>
                </div>
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
