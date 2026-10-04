<template>
    <div class="shell">
        <LeftRail :items="railItems" :active="activeKey" :showSettings="true" />
        <div class="shell-main">
            <div class="shell-title">
                <text class="shell-title-text">{{ title }}</text>
            </div>
            <slot></slot>
        </div>
    </div>
</template>

<style lang="less" scoped>
@import url('../styles/page-shell.less');
</style>

<script>
import LeftRail from './LeftRail.vue';
import { RAIL_ITEMS } from '../constants/nav';
export default {
    components: { LeftRail },
    props: {
        title: { type: String, default: '' },
        activeKey: { type: String, default: '' },
    },
    data() {
        return {
            railItems: RAIL_ITEMS
        };
    }
};
</script>
