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

export type DesktopOptions = {};

interface AppItem {
    id: string;
    name: string;
    icon: string;
    iconColor: string;
}

const APP_ICONS: { [key: string]: { icon: string; color: string } } = {
    ai: { icon: '🤖', color: '#6366f1' },
    fileManager: { icon: '📁', color: '#f59e0b' },
    gallery: { icon: '🖼️', color: '#10b981' },
    imageViewer: { icon: '👁️', color: '#3b82f6' },
    musicPlayer: { icon: '🎵', color: '#ec4899' },
    calculator: { icon: '🔢', color: '#8b5cf6' },
    qrcodeGenerator: { icon: '📱', color: '#06b6d4' },
    unitConverter: { icon: '🔄', color: '#f97316' },
    browser: { icon: '🌐', color: '#3b82f6' },
    qqchat: { icon: '💬', color: '#22c55e' },
    shell: { icon: '⌨️', color: '#1e293b' },
    update: { icon: '⬇️', color: '#0ea5e9' },
    deviceinfo: { icon: '📱', color: '#64748b' },
    misc: { icon: '⚙️', color: '#6b7280' },
    about: { icon: 'ℹ️', color: '#0ea5e9' }
};

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
                { id: 'ai', name: 'AI助手', ...APP_ICONS.ai },
                { id: 'fileManager', name: '文件', ...APP_ICONS.fileManager },
                { id: 'gallery', name: '图库', ...APP_ICONS.gallery },
                { id: 'qqchat', name: 'QQ', ...APP_ICONS.qqchat }
            ] as AppItem[],
            
            allApps: [
                { id: 'ai', name: 'AI助手', ...APP_ICONS.ai },
                { id: 'fileManager', name: '文件管理', ...APP_ICONS.fileManager },
                { id: 'gallery', name: '图库', ...APP_ICONS.gallery },
                { id: 'imageViewer', name: '图片查看', ...APP_ICONS.imageViewer },
                { id: 'musicPlayer', name: '音乐', ...APP_ICONS.musicPlayer },
                { id: 'calculator', name: '计算器', ...APP_ICONS.calculator },
                { id: 'qrcodeGenerator', name: '二维码', ...APP_ICONS.qrcodeGenerator },
                { id: 'unitConverter', name: '单位转换', ...APP_ICONS.unitConverter },
    { id: 'penshell', name: '终端', ...APP_ICONS.shell },
                { id: 'qqchat', name: 'QQ聊天', ...APP_ICONS.qqchat },
                { id: 'shell', name: '终端', ...APP_ICONS.shell },
                { id: 'update', name: '更新', ...APP_ICONS.update },
                { id: 'deviceinfo', name: '设备信息', ...APP_ICONS.deviceinfo },
                { id: 'misc', name: '设置', ...APP_ICONS.misc },
                { id: 'about', name: '关于', ...APP_ICONS.about }
            ] as AppItem[],
            
            notifications: [] as { id: string; text: string; time: string }[]
        };
    },

    mounted() {
        this.updateTime();
        setInterval(() => {
            this.updateTime();
        }, 1000);
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
        
        handleTouchEnd() {
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
        
        clearNotifications() {
            this.notifications = [];
        }
    }
});

export default desktop;
