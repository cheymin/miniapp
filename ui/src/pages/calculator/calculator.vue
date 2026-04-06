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
    <div class="display">
      <text class="expression">{{ expression || '0' }}</text>
      <text class="result">{{ result }}</text>
    </div>
    
    <div class="mode-toggle">
      <text :class="['mode-btn', !isScientificMode ? 'active' : '']" @click="isScientificMode = false">标准</text>
      <text :class="['mode-btn', isScientificMode ? 'active' : '']" @click="isScientificMode = true">科学</text>
    </div>
    
    <div v-if="isScientificMode" class="scientific-keypad">
      <div class="key-row">
        <text class="key key-scientific" @click="inputFunction('sin')">sin</text>
        <text class="key key-scientific" @click="inputFunction('cos')">cos</text>
        <text class="key key-scientific" @click="inputFunction('tan')">tan</text>
        <text class="key key-scientific" @click="inputFunction('log')">log</text>
      </div>
      
      <div class="key-row">
        <text class="key key-scientific" @click="inputFunction('ln')">ln</text>
        <text class="key key-scientific" @click="inputFunction('sqrt')">√</text>
        <text class="key key-scientific" @click="inputFunction('pow')">x^y</text>
        <text class="key key-scientific" @click="inputFunction('factorial')">n!</text>
      </div>
      
      <div class="key-row">
        <text class="key key-scientific" @click="inputPi">π</text>
        <text class="key key-scientific" @click="inputE">e</text>
        <text class="key key-scientific" @click="inputNumber('(')">(</text>
        <text class="key key-scientific" @click="inputNumber(')')">)</text>
      </div>
    </div>
    
    <div class="keypad">
      <div class="key-row">
        <text class="key key-function" @click="clear">C</text>
        <text class="key key-function" @click="backspace">⌫</text>
        <text class="key key-function" @click="inputOperator('%')">%</text>
        <text class="key key-operator" @click="inputOperator('/')">÷</text>
      </div>
      
      <div class="key-row">
        <text class="key key-number" @click="inputNumber('7')">7</text>
        <text class="key key-number" @click="inputNumber('8')">8</text>
        <text class="key key-number" @click="inputNumber('9')">9</text>
        <text class="key key-operator" @click="inputOperator('*')">×</text>
      </div>
      
      <div class="key-row">
        <text class="key key-number" @click="inputNumber('4')">4</text>
        <text class="key key-number" @click="inputNumber('5')">5</text>
        <text class="key key-number" @click="inputNumber('6')">6</text>
        <text class="key key-operator" @click="inputOperator('-')">−</text>
      </div>
      
      <div class="key-row">
        <text class="key key-number" @click="inputNumber('1')">1</text>
        <text class="key key-number" @click="inputNumber('2')">2</text>
        <text class="key key-number" @click="inputNumber('3')">3</text>
        <text class="key key-operator" @click="inputOperator('+')">+</text>
      </div>
      
      <div class="key-row">
        <text class="key key-number" @click="inputNumber('0')">0</text>
        <text class="key key-number" @click="inputDecimal">.</text>
        <text class="key key-function" @click="toggleSign">±</text>
        <text class="key key-equals" @click="calculate">=</text>
      </div>
    </div>
    
    <div class="history-section">
      <text class="history-title">计算历史</text>
      <scroller class="history-list" scroll-direction="vertical" :show-scrollbar="true">
        <div v-for="(item, index) in history" :key="index" class="history-item" @click="loadHistoryItem(index)">
          <text class="history-expression">{{ item.expression }}</text>
          <text class="history-result">= {{ item.result }}</text>
        </div>
      </scroller>
    </div>
  </div>
</template>

<style lang="less" scoped>
@import url('calculator.less');
</style>

<script>
import calculator from './calculator';
export default calculator;
</script>
