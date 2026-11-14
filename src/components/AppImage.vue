<template>
    <image v-if="resolvedSrc" class="app-image" :src="resolvedSrc" :width="width" :height="height" :resize="resize"
        :style="imageStyle" />
    <div v-else class="app-image app-image-empty" :style="imageStyle">
        <text class="app-image-empty-text">无图</text>
    </div>
</template>

<style scoped>
.app-image {
    background-color: #1a1a2e;
}

.app-image-empty {
    display: flex;
    align-items: center;
    justify-content: center;
}

.app-image-empty-text {
    color: #666666;
    font-size: 12px;
}
</style>

<script>
import AppImage from './AppImage';
export default AppImage;
</script>
