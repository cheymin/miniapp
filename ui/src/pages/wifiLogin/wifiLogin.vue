<!--
 Copyright (C) 2025 Langning Chen
-->
<template>
    <div class="wifi-login">
        <div class="header">
            <text class="title">WiFi 认证</text>
        </div>

        <scroller class="body" scroll-direction="vertical" :show-scrollbar="true">
            <div class="status-card">
                <text :class="'status-text status-' + status">{{ statusMsg }}</text>
                <text v-if="serverBase" class="server-text">{{ serverBase }}</text>
            </div>

            <div class="form">
                <div class="field" @click="editUsername">
                    <text class="label">账号</text>
                    <text class="input" :class="{ empty: !username }">{{ username || '点击输入' }}</text>
                </div>

                <div class="field" @click="editPassword">
                    <text class="label">密码</text>
                    <text class="input" :class="{ empty: !password }">{{ password ? '••••••' : '点击输入' }}</text>
                </div>

                <div class="field row" @click="toggleRemember">
                    <text class="label">记住密码</text>
                    <text class="checkbox">{{ remember ? '☑' : '☐' }}</text>
                </div>
            </div>

            <div class="actions">
                <text class="btn btn-primary" @click="login">登录</text>
                <text class="btn" @click="logout">下线</text>
                <text class="btn" @click="detect">检测网络</text>
            </div>
        </scroller>
    </div>
</template>

<style lang="less" scoped>
@import url('wifiLogin.less');
</style>

<script>
import wifiLogin from './wifiLogin';
export default wifiLogin;
</script>
