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
      <div v-if="!isEditing" class="section">
        <text class="section-title">备忘录</text>
        
        <div class="item">
          <text class="item-text">搜索:</text>
          <text class="item-input" @click="searchMemo">{{ searchText || '点击搜索...' }}</text>
          <text v-if="searchText" class="btn btn-danger" @click="searchText = ''">清除</text>
        </div>
        
        <div class="operations-row">
          <text class="btn btn-primary" @click="createNewMemo">新建备忘录</text>
        </div>
      </div>
      
      <div v-if="!isEditing" class="section">
        <text class="section-title">备忘录列表 ({{ filteredMemos.length }})</text>
        
        <div v-if="filteredMemos.length === 0" class="empty-state">
          <text class="empty-text">{{ searchText ? '没有找到匹配的备忘录' : '暂无备忘录' }}</text>
        </div>
        
        <div v-for="memo in filteredMemos" :key="memo.id" class="memo-item" @click="editMemo(memo)">
          <text class="memo-title">{{ memo.title || '无标题' }}</text>
          <text class="memo-content">{{ memo.content || '无内容' }}</text>
          <text class="memo-time">{{ formatTime(memo.updateTime) }}</text>
          <text class="btn btn-danger btn-small" @click.stop="deleteMemo(memo)">删除</text>
        </div>
      </div>
      
      <div v-if="isEditing && currentMemo" class="section">
        <text class="section-title">{{ currentMemo.id.startsWith('memo_') && memos.find(m => m.id === currentMemo.id) ? '编辑备忘录' : '新建备忘录' }}</text>
        
        <div class="item">
          <text class="item-text">标题:</text>
          <text class="item-input" @click="editTitle">{{ currentMemo.title || '点击输入标题...' }}</text>
        </div>
        
        <div class="item">
          <text class="item-text">内容:</text>
          <text class="item-textarea" @click="editContent">{{ currentMemo.content || '点击输入内容...' }}</text>
        </div>
        
        <div class="operations-row">
          <text class="btn btn-success" @click="saveCurrentMemo">保存</text>
          <text class="btn" @click="cancelEdit">取消</text>
        </div>
      </div>
    </scroller>
    
    <ToastMessage />
  </div>
</template>

<style lang="less" scoped>
@import url('memo.less');
</style>

<script>
import memo from './memo';
import ToastMessage from '../../components/ToastMessage.vue';
export default {
  ...memo,
  components: {
    ToastMessage
  }
};
</script>
