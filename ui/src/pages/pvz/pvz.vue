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
    <div class="top-bar">
      <text class="score-text">阳光: {{ sun }}</text>
      <text class="wave-text">波次: {{ wave }}</text>
      <text class="top-btn" @click="togglePause">{{ isPaused ? '继续' : '暂停' }}</text>
      <text class="top-btn" @click="restartGame">重开</text>
    </div>

    <div class="plant-bar">
      <text v-for="(plant, idx) in plantTypes" :key="idx"
            :class="['plant-option', selectedPlant === idx ? 'plant-option-selected' : '', sun >= plant.cost ? '' : 'plant-option-disabled']"
            @click="selectPlant(idx)">
        {{ plant.icon }}{{ plant.cost }}
      </text>
    </div>

    <div class="game-board">
      <div v-for="(row, rowIdx) in grid" :key="rowIdx" class="grid-row">
        <div v-for="(cell, colIdx) in row" :key="colIdx"
             :class="['grid-cell', colIdx === 0 ? 'grid-cell-home' : '']"
             @click="placePlant(rowIdx, colIdx)">
          <text v-if="cell.plant" class="cell-plant">{{ cell.plant }}</text>
          <text v-if="cell.zombie" class="cell-zombie">{{ cell.zombie }}</text>
          <text v-if="cell.bullet" class="cell-bullet">o</text>
        </div>
      </div>
    </div>

    <div v-if="gameOver" class="overlay">
      <text class="overlay-text">{{ gameWon ? '胜利!' : '游戏结束' }}</text>
      <text class="overlay-btn" @click="restartGame">再来一局</text>
    </div>

    <div v-if="isPaused && !gameOver" class="overlay">
      <text class="overlay-text">暂停中</text>
      <text class="overlay-btn" @click="togglePause">继续</text>
    </div>
  </div>
</template>

<style lang="less" scoped>
@import url('pvz.less');
</style>

<script>
import pvz from './pvz';
export default {
  ...pvz
};
</script>
