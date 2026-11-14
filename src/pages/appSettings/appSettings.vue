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
            <div class="section">
                <text class="section-title">应用锁</text>

                <div class="item">
                    <text class="item-text">密码状态</text>
                    <text :class="'item-input password-state' + (hasPassword ? ' password-on' : '')">
                        {{ hasPassword ? '已设置' : '未设置' }}
                    </text>
                </div>

                <div class="item settings-buttons">
                    <text class="btn btn-primary" @click="editPassword">{{ hasPassword ? '修改密码' : '设置密码' }}</text>
                    <text v-if="hasPassword" class="btn btn-danger" @click="clearPassword">清除密码</text>
                    <text class="btn btn-info" @click="goBack">返回</text>
                </div>

                <text class="settings-hint">设置后，每次打开应用都需要先输入密码。</text>
            </div>
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
