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
  <div class="desktop-container" @touchstart="handleTouchStart" @touchmove="handleTouchMove" @touchend="handleTouchEnd">
    <div class="status-bar">
      <text class="time">{{ currentTime }}</text>
      <text class="date">{{ currentDate }}</text>
      <text class="battery">{{ batteryLevel }}%</text>
    </div>
    
    <div class="desktop-content">
      <div class="clock-section">
        <text class="clock-time">{{ clockTime }}</text>
        <text class="clock-date">{{ clockDate }}</text>
      </div>
      
      <div class="calendar-section">
        <text class="calendar-title">📅 日历</text>
        <text class="calendar-date">{{ calendarDate }}</text>
        <text class="calendar-lunar">{{ lunarDate }}</text>
      </div>
      
      <div class="message-section" @click="openApp('qqchat')">
        <text class="message-title">💬 快捷消息</text>
        <div v-if="unreadMessages > 0" class="message-badge">
          <text class="badge-count">{{ unreadMessages }}</text>
        </div>
      </div>
    </div>
    
    <div class="dock">
      <div class="dock-item" v-for="(app, index) in dockApps" :key="index" @click="openApp(app.id)">
        <div class="dock-icon-wrapper" :style="{ backgroundColor: app.iconColor }">
          <text class="dock-icon">{{ app.icon }}</text>
        </div>
        <text class="dock-label">{{ app.name }}</text>
      </div>
    </div>
    
    <div v-if="showAppDrawer" class="app-drawer" @click="closeAppDrawer">
      <div class="app-drawer-content" @click.stop>
        <text class="drawer-title">应用</text>
        <scroller class="app-scroller" scroll-direction="vertical" :show-scrollbar="true">
          <div class="app-grid">
            <div class="app-item" v-for="(app, index) in allApps" :key="index" @click="openApp(app.id)">
              <div class="app-icon-wrapper" :style="{ backgroundColor: app.iconColor }">
                <text class="app-icon">{{ app.icon }}</text>
              </div>
              <text class="app-label">{{ app.name }}</text>
            </div>
          </div>
        </scroller>
      </div>
    </div>
    
    <div v-if="showNotificationCenter" class="notification-center" @click="closeNotificationCenter">
      <div class="notification-content" @click.stop>
        <div class="notification-header">
          <text class="notification-title">🔔 通知中心</text>
          <text v-if="notifications.length > 0" class="clear-btn" @click="clearNotifications">清空</text>
        </div>
        <scroller class="notification-scroller" scroll-direction="vertical" :show-scrollbar="true">
          <div v-if="notifications.length > 0">
            <div class="notification-item" v-for="(notification, index) in notifications" :key="index" @click="markNotificationRead(notification.id)">
              <text class="notification-text">{{ notification.text }}</text>
              <text class="notification-time">{{ notification.time }}</text>
            </div>
          </div>
          <div v-else class="empty-notifications">
            <text class="empty-icon">📭</text>
            <text class="empty-text">暂无通知</text>
          </div>
        </scroller>
      </div>
    </div>
    
    <ToastMessage />
  </div>
</template>

<style lang="less" scoped>
@import url('desktop.less');
</style>

<script>
import desktop from './desktop';
import ToastMessage from '../../components/ToastMessage.vue';
export default {
  ...desktop,
  components: {
    ToastMessage
  }
};
</script>
