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
    <div class="terminal-content">
      <scroller 
        class="terminal-scroller"
        ref="scroller"
        scroll-direction="vertical"
        :show-scrollbar="true"
      >
        <div v-for="line in terminalLines" :key="line.id" class="terminal-line">
          <text v-if="line.type === 'command'" class="line-command">{{ line.content }}</text>
          <text v-else-if="line.type === 'output'" class="line-output">{{ line.content }}</text>
          <text v-else-if="line.type === 'error'" class="line-error">{{ line.content }}</text>
          <text v-else class="line-text">{{ line.content }}</text>
        </div>
        
        <div class="command-prompt">
          <text class="prompt">{{ currentDir }} $</text>
          <text class="input-display">{{ inputText }}</text>
          <text v-if="!isExecuting" class="cursor">█</text>
          <text v-else class="loading">⌛</text>
        </div>
      </scroller>
    </div>

    <div class="input-section">
      <div class="input-container" @click="openKeyboard">
        <text class="input-placeholder" v-if="!inputText">点击输入命令...</text>
        <text class="input-text" v-else>{{ inputText }}</text>
      </div>
      <text class="btn btn-execute" @click="executeCommand">发送</text>
      <text class="btn btn-clear" @click="clearTerminal">清空</text>
    </div>
  </div>
</template>

<style lang="less" scoped>
@import url('shell.less');
</style>

<script>
import shell from './shell';
export default shell;
</script>
