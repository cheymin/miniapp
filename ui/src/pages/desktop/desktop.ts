// Copyright (C) 2025 Langning Chen
// 
// This file is part of miniapp.
// 
// miniapp is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// miniapp is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with miniapp.  If not, see <https://www.gnu.org/licenses/>.

import { defineComponent } from 'vue';
import { getIcon, getIconColor } from '../../utils/icons';
import { database, NotificationItem } from '../../utils/database';

export type DesktopOptions = {};

interface AppItem {
    id: string;
    name: string;
    icon: string;
    iconColor: string;
}

const desktop = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<DesktopOptions>,
            
            currentTime: '',
            currentDate: '',
            clockTime: '',
            clockDate: '',
            calendarDate: '',
            lunarDate: '',
            batteryLevel: 100,
            unreadMessages: 0,
            
            showAppDrawer: false,
            showNotificationCenter: false,
            
            touchStartY: 0,
            touchStartX: 0,
            isSwiping: false,
            
            dockApps: [
                { id: 'ai', name: 'AI助手', icon: getIcon('ai'), iconColor: getIconColor('ai') },
                { id: 'fileManager', name: '文件', icon: getIcon('folder'), iconColor: getIconColor('folder') },
                { id: 'gallery', name: '图库', icon: getIcon('image'), iconColor: getIconColor('image') },
                { id: 'qqchat', name: 'QQ', icon: getIcon('message'), iconColor: getIconColor('message') }
            ] as AppItem[],
            
            allApps: [
                { id: 'ai', name: 'AI助手', icon: getIcon('ai'), iconColor: getIconColor('ai') },
                { id: 'fileManager', name: '文件管理', icon: getIcon('folder'), iconColor: getIconColor('folder') },
                { id: 'gallery', name: '图库', icon: getIcon('image'), iconColor: getIconColor('image') },
                { id: 'imageViewer', name: '图片查看', icon: getIcon('eye'), iconColor: getIconColor('eye') },
                { id: 'musicPlayer', name: '音乐', icon: getIcon('music'), iconColor: getIconColor('music') },
                { id: 'calculator', name: '计算器', icon: getIcon('calculator'), iconColor: getIconColor('calculator') },
                { id: 'qrcodeGenerator', name: '二维码', icon: getIcon('qr-code'), iconColor: getIconColor('qr-code') },
                { id: 'unitConverter', name: '单位转换', icon: getIcon('repeat'), iconColor: getIconColor('repeat') },
                { id: 'browser', name: '浏览器', icon: getIcon('globe'), iconColor: getIconColor('globe') },
                { id: 'qqchat', name: 'QQ聊天', icon: getIcon('message'), iconColor: getIconColor('message') },
                { id: 'shell', name: '终端', icon: getIcon('terminal'), iconColor: getIconColor('terminal') },
                { id: 'update', name: '更新', icon: getIcon('download'), iconColor: getIconColor('download') },
                { id: 'deviceinfo', name: '设备信息', icon: getIcon('smartphone'), iconColor: getIconColor('smartphone') },
                { id: 'misc', name: '设置', icon: getIcon('settings'), iconColor: getIconColor('settings') },
                { id: 'about', name: '关于', icon: getIcon('info'), iconColor: getIconColor('info') }
            ] as AppItem[],
            
            notifications: [] as NotificationItem[]
        };
    },

    async mounted() {
        await database.initialize();
        
        this.updateTime();
        setInterval(() => {
            this.updateTime();
        }, 1000);
        
        await this.loadNotifications();
        this.updateUnreadCount();
    },

    methods: {
        updateTime() {
            const now = new Date();
            
            this.currentTime = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
            this.currentDate = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
            
            this.clockTime = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            this.clockDate = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
            
            this.calendarDate = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
            this.lunarDate = this.getLunarDate(now);
        },
        
        getLunarDate(date: Date): string {
            const lunarMonths = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
            const lunarDays = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
                              '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
                              '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
            
            const baseDate = new Date(2024, 0, 22);
            const diff = Math.floor((date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
            
            const lunarMonth = Math.floor(diff / 30) % 12;
            const lunarDay = diff % 30;
            
            return `农历${lunarMonths[lunarMonth]}${lunarDays[lunarDay]}`;
        },
        
        handleTouchStart(event: any) {
            if (event.touches && event.touches.length > 0) {
                this.touchStartX = event.touches[0].clientX;
                this.touchStartY = event.touches[0].clientY;
                this.isSwiping = true;
            }
        },
        
        handleTouchMove(event: any) {
            if (!this.isSwiping || !event.touches || event.touches.length === 0) return;
            
            const touchY = event.touches[0].clientY;
            const touchX = event.touches[0].clientX;
            const deltaY = touchY - this.touchStartY;
            const deltaX = Math.abs(touchX - this.touchStartX);
            
            if (deltaX < 50 && Math.abs(deltaY) > 80) {
                if (deltaY < 0 && !this.showAppDrawer && !this.showNotificationCenter) {
                    this.showAppDrawer = true;
                    this.isSwiping = false;
                } else if (deltaY > 0 && !this.showAppDrawer && !this.showNotificationCenter) {
                    this.showNotificationCenter = true;
                    this.isSwiping = false;
                }
            }
        },
        
        handleTouchEnd(event: any) {
            this.isSwiping = false;
        },
        
        openApp(appId: string) {
            this.showAppDrawer = false;
            this.showNotificationCenter = false;
            $falcon.navTo(appId, {});
        },
        
        closeAppDrawer() {
            this.showAppDrawer = false;
        },
        
        closeNotificationCenter() {
            this.showNotificationCenter = false;
        },
        
        async loadNotifications() {
            this.notifications = database.getNotifications();
        },
        
        updateUnreadCount() {
            this.unreadMessages = database.getTotalUnreadCount();
        },
        
        async clearNotifications() {
            await database.clearNotifications();
            this.notifications = [];
        },
        
        async markNotificationRead(id: string) {
            await database.markNotificationRead(id);
            this.notifications = database.getNotifications();
        }
    }
});

export default desktop;
