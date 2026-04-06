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

export type ClockOptions = {};

const clock = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<ClockOptions>,
            
            currentTime: '',
            currentDate: '',
            currentWeekday: '',
            currentYear: 0,
            currentMonth: 0,
            currentDay: 0,
            
            calendarDays: [] as { day: number; isCurrentMonth: boolean; isToday: boolean; weekday: number }[],
            calendarMonth: 0,
            calendarYear: 0,
            
            timer: null as any
        };
    },

    mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on("backpressed", this.handleBackPress);
        this.updateTime();
        this.generateCalendar();
        this.timer = setInterval(this.updateTime, 1000);
    },

    beforeDestroy() {
        this.$page.$npage.off("backpressed", this.handleBackPress);
        if (this.timer) {
            clearInterval(this.timer);
        }
    },

    methods: {
        handleBackPress() {
            $falcon.navBack();
        },
        
        updateTime() {
            const now = new Date();
            
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const seconds = now.getSeconds().toString().padStart(2, '0');
            this.currentTime = `${hours}:${minutes}:${seconds}`;
            
            const year = now.getFullYear();
            const month = now.getMonth() + 1;
            const day = now.getDate();
            this.currentDate = `${year}年${month.toString().padStart(2, '0')}月${day.toString().padStart(2, '0')}日`;
            this.currentYear = year;
            this.currentMonth = month;
            this.currentDay = day;
            
            const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
            this.currentWeekday = weekdays[now.getDay()];
            
            if (this.calendarYear === 0) {
                this.calendarYear = year;
                this.calendarMonth = month;
                this.generateCalendar();
            }
        },

        generateCalendar() {
            const year = this.calendarYear;
            const month = this.calendarMonth;
            
            const firstDay = new Date(year, month - 1, 1);
            const lastDay = new Date(year, month, 0);
            const daysInMonth = lastDay.getDate();
            const startWeekday = firstDay.getDay();
            
            const prevMonth = new Date(year, month - 1, 0);
            const daysInPrevMonth = prevMonth.getDate();
            
            this.calendarDays = [];
            
            for (let i = startWeekday - 1; i >= 0; i--) {
                this.calendarDays.push({
                    day: daysInPrevMonth - i,
                    isCurrentMonth: false,
                    isToday: false,
                    weekday: (startWeekday - i - 1 + 7) % 7
                });
            }
            
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month - 1, day);
                this.calendarDays.push({
                    day: day,
                    isCurrentMonth: true,
                    isToday: year === this.currentYear && month === this.currentMonth && day === this.currentDay,
                    weekday: date.getDay()
                });
            }
            
            const remainingDays = 42 - this.calendarDays.length;
            for (let day = 1; day <= remainingDays; day++) {
                this.calendarDays.push({
                    day: day,
                    isCurrentMonth: false,
                    isToday: false,
                    weekday: (this.calendarDays[this.calendarDays.length - 1].weekday + day) % 7
                });
            }
        },

        prevMonth() {
            if (this.calendarMonth === 1) {
                this.calendarMonth = 12;
                this.calendarYear--;
            } else {
                this.calendarMonth--;
            }
            this.generateCalendar();
        },

        nextMonth() {
            if (this.calendarMonth === 12) {
                this.calendarMonth = 1;
                this.calendarYear++;
            } else {
                this.calendarMonth++;
            }
            this.generateCalendar();
        },

        goToToday() {
            this.calendarYear = this.currentYear;
            this.calendarMonth = this.currentMonth;
            this.generateCalendar();
        },

        getMonthName(month: number): string {
            const months = ['一月', '二月', '三月', '四月', '五月', '六月', 
                           '七月', '八月', '九月', '十月', '十一月', '十二月'];
            return months[month - 1] || '';
        },

        getWeekdayName(weekday: number): string {
            const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
            return weekdays[weekday] || '';
        }
    }
});

export default clock;
