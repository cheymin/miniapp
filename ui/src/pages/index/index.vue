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
    <scroller class="container" scroll-direction="vertical" :show-scrollbar="true">
        <div class="section">
            <text class="section-title">核心功能</text>
            
            <div class="item"><text class="item-text" @click="openAi">AI 助手</text></div>
            <div class="item"><text class="item-text" @click="FileEditor">文本编辑器</text></div>
            <div class="item"><text class="item-text" @click="FileManager">文件管理器</text></div>
            <div class="item"><text class="item-text" @click="PenTerm">PenTerm</text></div>
        </div>
        
        <div class="section">
            <text class="section-title">实用工具</text>
            
            <div class="item"><text class="item-text" @click="UnitConverter">单位转换器</text></div>
        </div>
        
        <div class="section">
            <text class="section-title">媒体功能</text>
            
            <div class="item"><text class="item-text" @click="ImageViewer">图片查看器</text></div>
            <div class="item"><text class="item-text" @click="Gallery">图库</text></div>
            <div class="item"><text class="item-text" @click="Recorder">录音机</text></div>
        </div>
        
        <div class="section">
            <text class="section-title">系统设置</text>
            
            <div class="item"><text class="item-text" @click="Deviceinfo">设备信息</text></div>
            <div class="item"><text class="item-text" @click="Misc">杂项设置</text></div>
            <div class="item"><text class="item-text" @click="About">关于我们</text></div>       
        </div>
    </scroller>
</template>

<style lang="less" scoped>
@import url('index.less');
</style>

<script>
import index from './index';
export default index;
</script>

