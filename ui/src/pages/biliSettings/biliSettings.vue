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
    <div class="page">
        <scroller class="container" scroll-direction="vertical" :show-scrollbar="true">
            <div class="section">
                <text class="section-title">登录状态</text>
                <div class="item">
                    <text class="item-text">当前状态</text>
                    <text class="status" :class="{ 'status-on': isLoggedIn, 'status-off': !isLoggedIn }">
                        {{ isLoggedIn ? '已登录' : '未登录' }}
                    </text>
                </div>
            </div>

            <div class="section">
                <text class="section-title">B 站登录凭证（可选）</text>
                <text class="hint">登录后可使用收藏夹等功能。凭证仅本地保存，不上传任何服务器。</text>

                <div class="item">
                    <text class="item-text">SESSDATA *</text>
                    <text class="item-input" @click="editSessdata">{{ sessdata ? '已设置' : '点击输入...' }}</text>
                </div>
                <div class="item">
                    <text class="item-text">bili_jct (CSRF)</text>
                    <text class="item-input" @click="editBiliJct">{{ biliJct ? '已设置' : '点击输入...' }}</text>
                </div>
                <div class="item">
                    <text class="item-text">buvid3</text>
                    <text class="item-input" @click="editBuvid3">{{ buvid3 ? '已设置' : '点击输入...' }}</text>
                </div>
                <div class="item">
                    <text class="item-text">DedeUserID</text>
                    <text class="item-input" @click="editDedeuserid">{{ dedeuserid ? '已设置' : '点击输入...' }}</text>
                </div>
            </div>

            <div class="section">
                <text class="section-title">操作</text>
                <div class="item" @click="saveCredential">
                    <text class="btn btn-success">保存凭证</text>
                </div>
                <div v-if="isLoggedIn" class="item" @click="logout">
                    <text class="btn btn-danger">退出登录</text>
                </div>
            </div>

            <div class="section">
                <text class="section-title">如何获取凭证</text>
                <text class="help" :lines="20">1. 用浏览器登录 www.bilibili.com
2. F12 打开开发者工具 → Application → Cookies
3. 复制 SESSDATA / bili_jct / buvid3 / DedeUserID 的值
4. 粘贴到上方输入框，点击保存</text>
            </div>
        </scroller>
        <Loading />
        <ToastMessage />
    </div>
</template>

<style lang="less" scoped>
@import url('biliSettings.less');
</style>

<script>
import biliSettings from './biliSettings';
import Loading from '../../components/Loading.vue';
import ToastMessage from '../../components/ToastMessage.vue';
export default {
    ...biliSettings,
    components: {
        Loading,
        ToastMessage,
    }
};
</script>
