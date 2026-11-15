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
    <div v-if="isVisible" class="loading">
        <image-frame ref="images" class="loading-image" interval="50" auto-play="true" :src="frames" />
    </div>
</template>

<style lang="less" scoped>
.loading {
    position: absolute;
    width: 50px;
    height: 50px;
    left: 255px;
    top: 60px;
}

.loading-image {
    position: absolute;
    left: 0px;
    top: 0px;
    width: 50px;
    height: 50px;
    z-index: 11;
}
</style>

<script>
import LoadingComponent from './Loading';
export default LoadingComponent;
</script>
