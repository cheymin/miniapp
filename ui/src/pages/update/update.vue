<template>
    <PageShell title="系统更新" activeKey="upd">
        <div class="content" style="padding-left: @content-left;">
            <!-- 当前状态卡 -->
            <div class="card">
                <div class="status-row">
                    <text class="status-text">{{ statusText() }}</text>
                    <text :class="['status-chip', 'chip-' + status]">{{ status }}</text>
                </div>
                <div class="version-row">
                    <text class="version-label">当前:</text>
                    <text class="version-val">v{{ currentVersion }}</text>
                </div>
                <div class="version-row" v-if="latestVersion">
                    <text class="version-label">最新:</text>
                    <text class="version-val">v{{ latestVersion }}</text>
                </div>
                <div class="notes" v-if="releaseNotes">
                    <text>{{ releaseNotes }}</text>
                </div>
            </div>

            <!-- 操作按钮 -->
            <div class="btn-row">
                <text class="btn" @click="checkUpdate" v-if="status === 'idle' || status === 'error' || status === 'updated'">🔍 检查更新</text>
                <text class="btn" :class="status === 'available' ? '' : 'btn-disabled'" @click="status === 'available' && downloadAndInstall()">⬇️ 下载并安装</text>
                <text class="btn btn-sec" @click="doTestCurl" v-if="status === 'error'">🧪 测试网络</text>
            </div>

            <!-- 提示 -->
            <text class="text-tertiary" style="font-size: 8px; margin-top: @s4;">
                更新源: ghproxy.net · 若网络不工作请确认设备能访问 GitHub 代理
            </text>
        </div>
    </PageShell>
</template>

<style lang="less" scoped>
@import url('update.less');
</style>

<script>
import updatePage from './update';
export default updatePage;
</script>
