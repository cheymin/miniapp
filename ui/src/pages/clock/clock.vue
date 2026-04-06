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
        <div class="calendar-header">
          <text class="btn btn-small" @click="prevMonth">&lt;</text>
          <text class="calendar-title">{{ calendarYear }}年 {{ getMonthName(calendarMonth) }}</text>
          <text class="btn btn-small" @click="nextMonth">&gt;</text>
        </div>
        
        <div class="calendar-weekdays">
          <text v-for="i in 7" :key="i" class="weekday-label">{{ getWeekdayName(i - 1) }}</text>
        </div>
        
        <div class="calendar-grid">
          <text 
            v-for="(day, index) in calendarDays" 
            :key="index"
            :class="['calendar-day', 
                     day.isCurrentMonth ? '' : 'calendar-day-other',
                     day.isToday ? 'calendar-day-today' : '',
                     day.weekday === 0 || day.weekday === 6 ? 'calendar-day-weekend' : '']">
            {{ day.day }}
          </text>
        </div>
        
        <div class="calendar-actions">
          <text class="btn btn-primary" @click="goToToday">回到今天</text>
        </div>
      </div>
    </scroller>
    
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
