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
        <text class="section-title">音乐播放器</text>
        
        <div class="player-controls">
          <text class="control-btn" @click="playMusic">▶ 播放</text>
          <text class="control-btn" @click="pauseMusic">⏸ 暂停</text>
          <text class="control-btn" @click="stopMusic">⏹ 停止</text>
        </div>
        
        <div class="player-controls">
          <text class="control-btn" @click="prevTrack">⏮ 上一首</text>
          <text class="control-btn" @click="nextTrack">⏭ 下一首</text>
        </div>
        
        <div class="player-controls">
          <text class="control-btn control-btn-primary" @click="showPlayer">打开播放器</text>
        </div>
      </div>
      
      <div class="section">
        <text class="section-title">歌单列表</text>
        
        <div class="item" @click="addMusic">
          <text class="item-text">添加音乐</text>
          <text class="item-action">+</text>
        </div>
        
        <div v-if="playlist.length === 0" class="empty-container">
          <text class="empty-text">暂无音乐</text>
          <text class="empty-hint">点击上方按钮添加音乐</text>
        </div>
        
        <div v-for="(track, index) in playlist" :key="index" class="track-item">
          <text class="track-number">{{ index + 1 }}</text>
          <text class="track-name">{{ track.name }}</text>
          <text class="track-action" @click="playTrack(index)">▶</text>
          <text class="track-action track-delete" @click="removeTrack(index)">×</text>
        </div>
      </div>
    </scroller>
    
    <ToastMessage />
    <Loading />
  </div>
</template>

<style lang="less" scoped>
@import url('playlist.less');
</style>

<script>
import playlist from './playlist';
import ToastMessage from '../../components/ToastMessage.vue';
import Loading from '../../components/Loading.vue';
export default {
  ...playlist,
  components: {
    ToastMessage,
    Loading
  }
};
</script>
