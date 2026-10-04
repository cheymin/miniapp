<template>
    <div class="app-root">
        <div class="left-rail">
            <text v-for="(r, i) in rail" :key="i" class="rail-item" @click="open(r.page)">
                <text :class="activeKey === r.page ? 'rail-icon rail-icon-on' : 'rail-icon'">{{ r.icon }}</text>
                <text :class="activeKey === r.page ? 'rail-label rail-label-on' : 'rail-label'">{{ r.label }}</text>
            </text>
            <text class="rail-item" style="flex:1"></text>
            <text class="rail-item" @click="open('settings')">
                <text class="rail-icon">⚙️</text><text class="rail-label">设置</text>
            </text>
        </div>
        <div class="main-area">
            <div class="title-bar"><text class="title-text">系统更新</text></div>
            <div class="content">
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
                <div class="btn-row">
                    <text class="btn" @click="checkUpdate" v-if="status === 'idle' || status === 'error' || status === 'updated'">🔍 检查更新</text>
                    <text class="btn" :class="status === 'available' ? '' : 'btn-disabled'" @click="status === 'available' && downloadAndInstall()">⬇️ 下载并安装</text>
                    <text class="btn btn-sec" @click="doTestCurl" v-if="status === 'error'">🧪 测试网络</text>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="less" scoped>
@import url('update.less');
</style>

<script>
import updatePage from './update';
export default updatePage;
</script>
