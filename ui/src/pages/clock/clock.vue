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
        <text class="section-title">时钟</text>
        
        <div class="clock-display">
          <text class="time-text">{{ currentTime }}</text>
          <text class="date-text">{{ currentDate }}</text>
          <text class="weekday-text">{{ currentWeekday }}</text>
        </div>
      </div>
      
      <div class="section">
        <text class="section-title">日历</text>
        
        <div class="calendar-display">
          <text class="year-text">{{ currentYear }}年</text>
          <text class="month-text">{{ getMonthName(currentMonth) }}</text>
          <text class="day-text">{{ currentDay }}</text>
          <text class="weekday-small">{{ currentWeekday }}</text>
        </div>
      </div>
      
      <div class="section">
        <text class="section-title">闹钟 ({{ alarms.length }})</text>
        
        <div class="operations-row">
          <text class="btn btn-primary" @click="showAddAlarmModal">添加闹钟</text>
        </div>
        
        <div v-if="alarms.length === 0" class="empty-state">
          <text class="empty-text">暂无闹钟</text>
        </div>
        
        <div v-for="alarm in alarms" :key="alarm.id" class="alarm-item">
          <text class="alarm-time">{{ formatTime(alarm.hour, alarm.minute) }}</text>
          <text class="alarm-label">{{ alarm.label }}</text>
          <text 
            :class="['btn', 'btn-small', alarm.enabled ? 'btn-success' : '']"
            @click="toggleAlarm(alarm)">
            {{ alarm.enabled ? '开' : '关' }}
          </text>
          <text class="btn btn-danger btn-small" @click="deleteAlarm(alarm)">删除</text>
        </div>
      </div>
    </scroller>
    
    <div v-if="showAlarmModal" class="modal-overlay">
      <div class="modal-content">
        <text class="modal-title">添加闹钟</text>
        
        <div class="time-picker">
          <text class="time-input" @click="editHour">{{ newAlarmHour.toString().padStart(2, '0') }}</text>
          <text class="time-separator">:</text>
          <text class="time-input" @click="editMinute">{{ newAlarmMinute.toString().padStart(2, '0') }}</text>
        </div>
        
        <div class="item">
          <text class="item-text">标签:</text>
          <text class="item-input" @click="editLabel">{{ newAlarmLabel || '点击输入标签...' }}</text>
        </div>
        
        <div class="modal-buttons">
          <text class="btn btn-success" @click="addAlarm">确定</text>
          <text class="btn" @click="hideAlarmModal">取消</text>
        </div>
      </div>
    </div>
    
    <ToastMessage />
  </div>
</template>

<style lang="less" scoped>
@import url('clock.less');
</style>

<script>
import clock from './clock';
import ToastMessage from '../../components/ToastMessage.vue';
export default {
  ...clock,
  components: {
    ToastMessage
  }
};
</script>
