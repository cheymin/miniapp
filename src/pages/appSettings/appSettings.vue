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
        <scroller class="container settings" scroll-direction="vertical" :show-scrollbar="true">
            <div class="group">
                <text class="group-title">安全</text>
                <div class="card">
                    <div class="row" @click="editPassword">
                        <div class="row-icon icon-lock"><text class="row-icon-text">锁</text></div>
                        <div class="row-main">
                            <text class="row-title">应用锁</text>
                            <text class="row-desc">{{ hasPassword ? '已开启，启动时需要密码' : '未设置启动密码' }}</text>
                        </div>
                        <text class="row-action">{{ hasPassword ? '修改' : '设置' }}</text>
                    </div>
                    <div v-if="hasPassword" class="row row-line" @click="clearPassword">
                        <div class="row-icon icon-danger"><text class="row-icon-text">清</text></div>
                        <div class="row-main">
                            <text class="row-title">清除密码</text>
                            <text class="row-desc">关闭应用锁</text>
                        </div>
                        <text class="row-action">清除</text>
                    </div>
                </div>
            </div>

            <div class="group">
                <text class="group-title">键盘</text>
                <div class="card">
                    <div class="row" @click="clearKeyboard">
                        <div class="row-icon icon-key"><text class="row-icon-text">键</text></div>
                        <div class="row-main">
                            <text class="row-title">清除输入学习</text>
                            <text class="row-desc">已记录 {{ learnedCount }} 个词，清除后候选恢复默认</text>
                        </div>
                        <text class="row-action">清除</text>
                    </div>
                </div>
            </div>

            <div class="group">
                <text class="group-title">AI 助手</text>
                <div class="card">
                    <div class="row" @click="openAiSettings">
                        <div class="row-icon icon-ai"><text class="row-icon-text">AI</text></div>
                        <div class="row-main">
                            <text class="row-title">模型与接口</text>
                            <text class="row-desc">API 密钥、基础 URL、模型参数</text>
                        </div>
                        <text class="row-action">›</text>
                    </div>
                </div>
            </div>

            <div class="group">
                <text class="group-title">存储</text>
                <div class="card">
                    <div class="row" @click="clearCache">
                        <div class="row-icon icon-cache"><text class="row-icon-text">清</text></div>
                        <div class="row-main">
                            <text class="row-title">清理播放缓存</text>
                            <text class="row-desc">删除临时抽帧与旧版缓存</text>
                        </div>
                        <text class="row-action">清理</text>
                    </div>
                </div>
            </div>

            <div class="group">
                <text class="group-title">关于</text>
                <div class="card">
                    <div class="row">
                        <div class="row-icon icon-info"><text class="row-icon-text">版</text></div>
                        <div class="row-main">
                            <text class="row-title">Cheymin Pen</text>
                            <text class="row-desc">版本 v{{ version }}</text>
                        </div>
                        <text class="row-action" @click="openUpdate">检查更新</text>
                    </div>
                </div>
            </div>

            <text class="footer-hint">设置只保存在本机，不会上传。</text>
        </scroller>
        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('appSettings.less');
</style>

<script>
import ToastMessage from '../../components/ToastMessage.vue';
import appSettings from './appSettings';
export default {
    ...appSettings,
    components: {
        ToastMessage
    }
}
</script>
