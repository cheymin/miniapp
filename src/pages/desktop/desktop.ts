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
import { showError, showSuccess } from '../../components/ToastMessage';

// 复刻自 1.15.5 包 desktop.js：三页式桌面（应用 / 时钟 / 播控）。
// 原包通过 slider 实现纵向翻页，这里用触摸手势 + 条件渲染实现同样的交互。

const APP_VERSION = '1.15.5';
const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const SWIPE_THRESHOLD = 30;

interface DesktopApp {
    key: string;
    name: string;
    glyph: string;
    color: string;
}

interface DesktopMessage {
    id: string;
    title: string;
    desc: string;
    time: string;
    count: number;
    glyph: string;
    color: string;
}

const APPS: DesktopApp[] = [
    { key: 'music', name: 'QQ 音乐', glyph: '♫', color: '#1db954' },
    { key: 'claude', name: 'Ai 聊天', glyph: 'Ai', color: '#5b5bd6' },
    { key: 'qq', name: '笔上 QQ', glyph: 'Q', color: '#12b7f5' },
    { key: 'chaty', name: 'Chaty', glyph: 'C', color: '#7c3aed' },
    { key: 'bilibili', name: '哔哩', glyph: 'B', color: '#fb7299' },
    { key: 'fanqie', name: '番茄', glyph: '番', color: '#ff6b35' },
    { key: 'wyyyy', name: '网易云', glyph: '网', color: '#e60026' },
    { key: 'shop', name: '应用商店', glyph: '店', color: '#f59e0b' },
    { key: 'assis', name: '千问助手', glyph: '千', color: '#4f46e5' },
    { key: 'tools', name: '工具箱', glyph: '具', color: '#0f766e' },
    { key: 'shell', name: '终端', glyph: '>_', color: '#12603e' },
    { key: 'timetable', name: '课程表', glyph: '课', color: '#2563eb' },
    { key: 'foods', name: '外卖', glyph: '食', color: '#dc2626' },
    { key: 'camera', name: '拍照', glyph: '拍', color: '#374151' },
    { key: 'gallery', name: '相册', glyph: '相', color: '#0891b2' },
    { key: 'files', name: '文件管理', glyph: '件', color: '#a16207' },
    { key: 'settings', name: '系统设置', glyph: '设', color: '#c4663f' },
];

const ROUTES: Record<string, string> = {
    claude: 'ai',
    assis: 'ai',
    shop: 'appsManage',
    tools: 'appsManage',
    shell: 'terminal',
    gallery: 'gallery',
    files: 'fileManager',
    settings: 'appSettings',
};

const desktop = defineComponent({
    data() {
        return {
            appVersion: APP_VERSION,
            page: 1,
            animClass: '',
            touchStartY: 0,
            touchLastY: 0,
            swiping: false,

            showStartupCover: true,
            startupStatusText: '正在启动...',
            startupIconScale: 0.5,
            startupCoverOpacity: 1,

            time: '12:00',
            date: '10 月 24 日 星期四',
            timer: null as number | null,

            isLoggedIn: false,
            userInfo: { nick: '本地模式', money: 0 },
            accountStatusText: '未登录',

            lockDesktop: false,
            showControlPanel: false,
            controlPanelAnimClass: '',

            apps: APPS,
            desktopMessages: [] as DesktopMessage[],

            updateStep: 'idle' as 'idle' | 'checking' | 'latest',
            updateProgress: 0,
            showUpdatePopup: false,
            latestVersion: APP_VERSION,

            nowPlaying: null as { title: string; singer_text: string; cover: string } | null,
            audioPlaying: false,
            audioPosition: 0,
            audioDuration: 0,
            playQueue: [] as any[],
            drawerVisible: false,
            showPlaylistDrawer: false,
            playlistDrawerVisible: false,
            playlistViewMode: 'list',
        };
    },

    computed: {
        songTitle(): string {
            return (this.nowPlaying && this.nowPlaying.title) || '听你想听的音乐';
        },
        songSubtitle(): string {
            return (this.nowPlaying && this.nowPlaying.singer_text) || 'QQ音乐 - 桌面播控';
        },
        accountName(): string {
            return this.isLoggedIn ? (this.userInfo.nick || '已登录') : '未登录';
        },
        audioTimeText(): string {
            return this.formatMs(this.audioPosition);
        },
        audioDurationText(): string {
            return this.formatMs(this.audioDuration);
        },
    },

    mounted() {
        this.updateTime();
        this.timer = setInterval(() => this.updateTime(), 1000);
        this.loadMessages();
        this.runStartup();
    },

    unmounted() {
        if (this.timer !== null) {
            clearInterval(this.timer);
            this.timer = null;
        }
        const scaleTimer = (this as any).startupScaleTimer;
        if (scaleTimer) {
            clearInterval(scaleTimer);
        }
    },

    methods: {
        noop() {
            // 阻止面板内部点击穿透到遮罩。
        },

        updateTime() {
            const now = new Date();
            const hh = String(now.getHours()).padStart(2, '0');
            const mm = String(now.getMinutes()).padStart(2, '0');
            this.time = `${hh}:${mm}`;
            this.date = `${now.getMonth() + 1} 月 ${now.getDate()} 日 ${WEEKDAYS[now.getDay()]}`;
        },

        runStartup() {
            const scaleTimer = setInterval(() => {
                this.startupIconScale = Math.min(1, this.startupIconScale + 0.1);
            }, 24);
            (this as any).startupScaleTimer = scaleTimer;
            setTimeout(() => {
                clearInterval(scaleTimer);
                this.startupIconScale = 1;
                this.showStartupCover = false;
            }, 900);
        },

        loadMessages() {
            this.desktopMessages = [
                {
                    id: 'sys',
                    title: '系统通知',
                    desc: '你有一条新的消息',
                    time: this.time,
                    count: 1,
                    glyph: '系',
                    color: '#3a3a3c',
                },
                {
                    id: 'group',
                    title: '群消息',
                    desc: '收到一条群聊@',
                    time: '刚刚',
                    count: 3,
                    glyph: '群',
                    color: '#1f7ad4',
                },
                {
                    id: 'app',
                    title: '应用通知',
                    desc: '桌面后台播放引擎已就绪',
                    time: '刚刚',
                    count: 0,
                    glyph: '应',
                    color: '#7c3aed',
                },
            ];
        },

        touchY(event: any): number {
            const list = (event && (event.touches || event.changedTouches)) || [];
            const point = list[0] || (event && event.detail) || {};
            const value = point.clientY !== undefined ? point.clientY
                : (point.pageY !== undefined ? point.pageY : point.screenY);
            return Number(value) || 0;
        },

        onTouchStart(event: any) {
            this.touchStartY = this.touchY(event);
            this.touchLastY = this.touchStartY;
            this.swiping = true;
        },

        onTouchMove(event: any) {
            if (!this.swiping) {
                return;
            }
            this.touchLastY = this.touchY(event);
        },

        onTouchEnd(event: any) {
            if (!this.swiping) {
                return;
            }
            this.swiping = false;
            const endY = this.touchY(event) || this.touchLastY;
            const delta = endY - this.touchStartY;
            if (delta <= -SWIPE_THRESHOLD) {
                this.goPage(this.page + 1, 1);
            } else if (delta >= SWIPE_THRESHOLD) {
                this.goPage(this.page - 1, -1);
            }
        },

        goPage(target: number, direction: number) {
            if (this.lockDesktop && target !== 2) {
                return;
            }
            if (target < 0 || target > 2 || target === this.page) {
                return;
            }
            this.page = target;
            this.animClass = direction > 0 ? 'page-up' : 'page-down';
            this.$forceUpdate();
        },

        openApp(key: string) {
            if (key === 'calculator') {
                $falcon.navTo('index', {});
                return;
            }
            const route = ROUTES[key];
            if (!route) {
                showError('应用未安装');
                return;
            }
            $falcon.navTo(route, {});
        },

        exitToCalculator() {
            $falcon.navTo('index', {});
        },

        checkUpdate() {
            if (this.updateStep === 'checking') {
                return;
            }
            this.updateStep = 'checking';
            setTimeout(() => {
                this.updateStep = 'latest';
                this.latestVersion = APP_VERSION;
                this.showUpdatePopup = true;
            }, 600);
        },

        closeUpdatePopup() {
            this.showUpdatePopup = false;
            this.updateStep = 'idle';
        },

        toggleControlPanel() {
            if (this.showControlPanel) {
                this.controlPanelAnimClass = 'panel-leave';
                setTimeout(() => {
                    this.showControlPanel = false;
                }, 300);
                return;
            }
            this.showControlPanel = true;
            this.controlPanelAnimClass = 'panel-enter';
        },

        togglePlay() {
            if (!this.nowPlaying) {
                showError('暂无播放内容');
                return;
            }
            this.audioPlaying = !this.audioPlaying;
        },

        doNext() {
            if (!this.playQueue.length) {
                showError('队列为空');
                return;
            }
            this.playQueue.push(this.playQueue.shift());
        },

        doScreenshot() {
            showSuccess('截屏已触发');
        },

        doCamera() {
            showError('相机不可用');
        },

        toggleQueueDrawer() {
            this.drawerVisible = !this.drawerVisible;
        },

        togglePlaylistDrawer() {
            this.showPlaylistDrawer = !this.showPlaylistDrawer;
            setTimeout(() => {
                this.playlistDrawerVisible = this.showPlaylistDrawer;
            }, 10);
        },

        formatMs(value: number): string {
            const total = Math.max(0, Math.round(Number(value) || 0));
            const minutes = Math.floor(total / 60000);
            const seconds = Math.floor((total % 60000) / 1000);
            return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        },
    },
});

export default desktop;
