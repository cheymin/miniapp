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
import { loadPassword, verifyPassword } from '../../utils/password';
import { openSystemInput } from '../../utils/systemInput';
import { exec } from '../../utils/nativeShell';
import aiIcon from '../../../images/home/ai.png';
import imageIcon from '../../../images/home/image.png';
import fileIcon from '../../../images/home/file.png';
import videoIcon from '../../../images/home/video.png';
import updateIcon from '../../../images/home/update.png';
import settingsIcon from '../../../images/home/settings.png';

export type indexOptions = {};

const APP_VERSION = '2.4.4';
const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const SWIPE_THRESHOLD = 28;

const index = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<indexOptions>,
            checking: true,
            locked: false,
            passwordHash: '',
            version: APP_VERSION,
            clockTime: '00:00',
            clockDate: '',
            clockTimer: null as number | null,

            page: 0,
            animClass: '',
            touchStartY: 0,
            touchLastY: 0,
            swiping: false,

            apps: [
                { key: 'ai', name: 'AI 助手', icon: aiIcon, theme: 'theme-ai' },
                { key: 'gallery', name: '图库', icon: imageIcon, theme: 'theme-image' },
                { key: 'file', name: '文件', icon: fileIcon, theme: 'theme-file' },
                { key: 'video', name: '视频', icon: videoIcon, theme: 'theme-video' },
                { key: 'terminal', name: '终端', glyph: '>_', theme: 'theme-terminal' },
                { key: 'appsManage', name: '应用', glyph: '应', theme: 'theme-apps' },
                { key: 'update', name: '更新', icon: updateIcon, theme: 'theme-update' },
                { key: 'settings', name: '设置', icon: settingsIcon, theme: 'theme-settings' },
                { key: 'lock', name: '锁屏', glyph: '锁', theme: 'theme-lock' },
            ],
        };
    },

    mounted() {
        // 旧版本把抽帧写在 /userdisk，这里主动清掉，避免占用用户空间。
        try {
            exec('rm -rf /userdisk/.cheymin/player 2>/dev/null; true').catch(() => undefined);
        } catch {
            // Shell 不可用时忽略
        }
        this.checkLock();
        this.updateClock();
        this.clockTimer = setInterval(() => this.updateClock(), 1000);
    },

    unmounted() {
        if (this.clockTimer !== null) {
            clearInterval(this.clockTimer);
            this.clockTimer = null;
        }
    },

    methods: {
        updateClock() {
            const now = new Date();
            this.clockTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            this.clockDate = `${now.getMonth() + 1} 月 ${now.getDate()} 日 ${WEEKDAYS[now.getDay()]}`;
        },

        async checkLock() {
            this.passwordHash = await loadPassword();
            this.locked = !!this.passwordHash;
            this.checking = false;
        },

        unlock() {
            openSystemInput(
                () => '',
                (value) => {
                    if (verifyPassword(value, this.passwordHash)) {
                        this.locked = false;
                        showSuccess('已解锁');
                    } else {
                        showError('密码错误');
                    }
                },
                (value) => {
                    if (!value) { return '请输入密码'; }
                }
            );
        },

        goPage(target: number) {
            if (this.page === target) { return; }
            this.page = target;
            this.animClass = target === 1 ? 'page-up' : 'page-down';
            this.$forceUpdate();
        },

        touchY(event: any): number {
            const list = (event && (event.touches || event.changedTouches)) || [];
            const point = list[0] || (event && event.detail) || {};
            const value = point.clientY !== undefined ? point.clientY : (point.pageY !== undefined ? point.pageY : point.screenY);
            return Number(value) || 0;
        },

        onTouchStart(event: any) {
            if (this.locked || this.checking) { return; }
            this.touchStartY = this.touchY(event);
            this.touchLastY = this.touchStartY;
            this.swiping = true;
        },

        onTouchMove(event: any) {
            if (!this.swiping) { return; }
            this.touchLastY = this.touchY(event);
        },

        onTouchEnd(event: any) {
            if (!this.swiping) { return; }
            this.swiping = false;
            const endY = this.touchY(event) || this.touchLastY;
            const delta = endY - this.touchStartY;
            if (delta <= -SWIPE_THRESHOLD && this.page === 0) {
                this.goPage(1);
            } else if (delta >= SWIPE_THRESHOLD && this.page === 1) {
                this.goPage(0);
            }
        },

        openApp(key: string) {
            switch (key) {
                case 'ai':
                    $falcon.navTo('ai', {});
                    break;
                case 'gallery':
                    $falcon.navTo('gallery', {});
                    break;
                case 'file':
                    $falcon.navTo('fileManager', {});
                    break;
                case 'video':
                    this.openVideoPlayer();
                    break;
                case 'terminal':
                    $falcon.navTo('terminal', {});
                    break;
                case 'appsManage':
                    $falcon.navTo('appsManage', {});
                    break;
                case 'lock':
                    this.lockNow();
                    break;
                case 'update':
                    $falcon.navTo('update', {});
                    break;
                case 'settings':
                    $falcon.navTo('appSettings', {});
                    break;
            }
        },

        lockNow() {
            if (!this.passwordHash) {
                showError('请先在设置中创建应用锁密码');
                $falcon.navTo('appSettings', {});
                return;
            }
            this.locked = true;
            this.$forceUpdate();
        },

        openVideoPlayer() {
            openSystemInput(
                () => '',
                (value) => {
                    const target = value.trim();
                    if (!target) { return; }
                    $falcon.navTo('videoPlayer', { path: target });
                },
                (value) => {
                    if (!value.trim()) { return '请输入视频路径或链接'; }
                }
            );
        },
    },
});

export default index;
