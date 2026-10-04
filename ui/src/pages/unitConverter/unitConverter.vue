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
        <text class="section-title">单位转换器</text>
        
        <div class="type-selector">
          <text 
            v-for="(type, index) in unitTypes" 
            :key="index" 
            :class="['type-btn', currentType === index ? 'type-btn-active' : '']"
            @click="selectType(index)">
            {{ type.name }}
          </text>
        </div>
      </div>
      
      <div class="section">
        <text class="section-title">转换设置</text>
        
        <div class="item">
          <text class="item-text">输入值:</text>
          <text class="item-input" @click="inputValueChanged">{{ inputValue || '点击输入数值...' }}</text>
        </div>
        
        <div class="item">
          <text class="item-text">从:</text>
          <div class="unit-selector">
            <text 
              v-for="(unit, index) in currentUnits" 
              :key="index"
              :class="['unit-btn', fromUnit === index ? 'unit-btn-active' : '']"
              @click="fromUnit = index; convert()">
              {{ unit.name }}
            </text>
          </div>
        </div>
        
        <div class="swap-row">
          <text class="btn btn-primary" @click="swapUnits">⇅ 交换</text>
        </div>
        
        <div class="item">
          <text class="item-text">到:</text>
          <div class="unit-selector">
            <text 
              v-for="(unit, index) in currentUnits" 
              :key="index"
              :class="['unit-btn', toUnit === index ? 'unit-btn-active' : '']"
              @click="toUnit = index; convert()">
              {{ unit.name }}
            </text>
          </div>
        </div>
      </div>
      
      <div v-if="result" class="section">
        <text class="section-title">转换结果</text>
        
        <div class="result-box">
          <text class="result-value">{{ result }}</text>
          <text class="result-unit">{{ currentUnits[toUnit] ? currentUnits[toUnit].name : '' }}</text>
        </div>
      </div>
    </scroller>
    
    <ToastMessage />
  </div>
</template>

<style lang="less" scoped>
@import url('unitConverter.less');
</style>

<script>
import unitConverter from './unitConverter';
import ToastMessage from '../../components/ToastMessage.vue';
export default {
  ...unitConverter,
  components: {
    ToastMessage
  }
};
</script>
