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
  <div class="container">
    <scroller class="scroll-area" scroll-direction="vertical" :show-scrollbar="true">
      <div class="section">
        <text class="section-title">键盘设置</text>
        
        <div class="item" @click="selectKeyboard('soft')">
          <text class="item-text">输入方式</text>
          <text class="item-value">{{ keyboardType === 'soft' ? '软键盘' : '系统键盘' }}</text>
        </div>
        
        <div class="keyboard-options">
          <text 
            :class="['option-btn', keyboardType === 'soft' ? 'option-btn-active' : '']"
            @click="selectKeyboard('soft')">
            软键盘
          </text>
          <text 
            :class="['option-btn', keyboardType === 'system' ? 'option-btn-active' : '']"
            @click="selectKeyboard('system')">
            系统键盘
          </text>
        </div>
        
        <text class="hint-text">
          {{ keyboardType === 'soft' ? '使用应用内置的软键盘，支持中文拼音输入' : '使用设备系统输入法，需要设备支持' }}
        </text>
      </div>
      
      <div class="section">
        <text class="section-title">关于</text>
        
        <div class="item">
          <text class="item-text">应用版本</text>
          <text class="item-value">v1.2.11</text>
        </div>
        
        <div class="item" @click="clearCache">
          <text class="item-text">清除缓存</text>
          <text class="item-action">清除</text>
        </div>
      </div>
    </scroller>
    
    <ToastMessage />
  </div>
</template>

<style lang="less" scoped>
@import url('settings.less');
</style>

<script>
import settings from './settings';
import ToastMessage from '../../components/ToastMessage.vue';
export default {
  ...settings,
  components: {
    ToastMessage
  }
};
</script>
