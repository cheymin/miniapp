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
import { showSuccess, showError, showInfo } from '../../components/ToastMessage';
import { openSoftKeyboard } from '../../utils/softKeyboardUtils';

export type ClockOptions = {};

interface Alarm {
    id: string;
    hour: number;
    minute: number;
    enabled: boolean;
    label: string;
}

const clock = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<ClockOptions>,
            
            currentTime: '',
            currentDate: '',
            currentWeekday: '',
            currentYear: '',
            currentMonth: '',
            currentDay: '',
            
            alarms: [] as Alarm[],
            showAlarmModal: false,
            editingAlarm: null as Alarm | null,
            newAlarmHour: 8,
            newAlarmMinute: 0,
            newAlarmLabel: '',
            
            timer: null as any
        };
    },

    mounted() {
        this.updateTime();
        this.timer = setInterval(this.updateTime, 1000);
        this.loadAlarms();
    },

    beforeDestroy() {
        if (this.timer) {
            clearInterval(this.timer);
        }
    },

    methods: {
        updateTime() {
            const now = new Date();
            
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const seconds = now.getSeconds().toString().padStart(2, '0');
            this.currentTime = `${hours}:${minutes}:${seconds}`;
            
            const year = now.getFullYear();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const day = now.getDate().toString().padStart(2, '0');
            this.currentDate = `${year}年${month}月${day}日`;
            this.currentYear = year.toString();
            this.currentMonth = month;
            this.currentDay = day;
            
            const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
            this.currentWeekday = weekdays[now.getDay()];
            
            this.checkAlarms(now);
        },

        async loadAlarms() {
            try {
                const data = await $falcon.storage.get('alarms');
                if (data) {
                    this.alarms = JSON.parse(data);
                }
            } catch (error) {
                console.error('加载闹钟失败:', error);
            }
        },

        async saveAlarms() {
            try {
                await $falcon.storage.set('alarms', JSON.stringify(this.alarms));
            } catch (error) {
                console.error('保存闹钟失败:', error);
            }
        },

        checkAlarms(now: Date) {
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            
            this.alarms.forEach(alarm => {
                if (alarm.enabled && alarm.hour === currentHour && alarm.minute === currentMinute) {
                    showInfo(`闹钟: ${alarm.label || '时间到了！'}`);
                }
            });
        },

        showAddAlarmModal() {
            this.newAlarmHour = 8;
            this.newAlarmMinute = 0;
            this.newAlarmLabel = '';
            this.showAlarmModal = true;
        },

        hideAlarmModal() {
            this.showAlarmModal = false;
        },

        async addAlarm() {
            const alarm: Alarm = {
                id: `alarm_${Date.now()}`,
                hour: this.newAlarmHour,
                minute: this.newAlarmMinute,
                enabled: true,
                label: this.newAlarmLabel || '闹钟'
            };
            
            this.alarms.push(alarm);
            await this.saveAlarms();
            showSuccess('闹钟已添加');
            this.hideAlarmModal();
        },

        async toggleAlarm(alarm: Alarm) {
            alarm.enabled = !alarm.enabled;
            await this.saveAlarms();
        },

        async deleteAlarm(alarm: Alarm) {
            const index = this.alarms.findIndex(a => a.id === alarm.id);
            if (index >= 0) {
                this.alarms.splice(index, 1);
                await this.saveAlarms();
                showSuccess('闹钟已删除');
            }
        },

        editHour() {
            openSoftKeyboard(
                () => this.newAlarmHour.toString(),
                (value) => {
                    const num = parseInt(value);
                    if (num >= 0 && num <= 23) {
                        this.newAlarmHour = num;
                        this.$forceUpdate();
                    }
                }
            );
        },

        editMinute() {
            openSoftKeyboard(
                () => this.newAlarmMinute.toString(),
                (value) => {
                    const num = parseInt(value);
                    if (num >= 0 && num <= 59) {
                        this.newAlarmMinute = num;
                        this.$forceUpdate();
                    }
                }
            );
        },

        editLabel() {
            openSoftKeyboard(
                () => this.newAlarmLabel,
                (value) => {
                    this.newAlarmLabel = value;
                    this.$forceUpdate();
                }
            );
        },

        formatTime(hour: number, minute: number): string {
            return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        },

        getMonthName(month: string): string {
            const months = ['一月', '二月', '三月', '四月', '五月', '六月', 
                           '七月', '八月', '九月', '十月', '十一月', '十二月'];
            return months[parseInt(month) - 1] || month;
        }
    }
});

export default clock;
