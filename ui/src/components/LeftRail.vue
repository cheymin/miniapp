<template>
    <div class="left-rail">
        <div
            v-for="(item, i) in items"
            :key="i"
            :class="active === item.key ? 'rail-item rail-item-on' : 'rail-item'"
            @click="onClick(item)">
            <text :class="active === item.key ? 'rail-icon rail-icon-on' : 'rail-icon'">{{ item.icon }}</text>
            <text :class="active === item.key ? 'rail-label rail-label-on' : 'rail-label'">{{ item.label }}</text>
        </div>
        <div class="rail-spacer"></div>
        <div class="rail-item rail-bottom" @click="onSettings" v-if="showSettings">
            <text class="rail-icon">⚙️</text>
            <text class="rail-label">设置</text>
        </div>
    </div>
</template>

<style lang="less" scoped>
@import url('../styles/left-rail.less');
</style>

<script>
export default {
    props: {
        items: { type: Array, default: () => [] },
        active: { type: String, default: '' },
        showSettings: { type: Boolean, default: true }
    },
    methods: {
        onClick(item) {
            if (item.key === this.active && !item.forceNav) {
                // 已经在这个页面了，可选刷新
            }
            $falcon.navTo(item.page, item.options || {});
        },
        onSettings() {
            $falcon.navTo('settings', {});
        }
    }
};
</script>
