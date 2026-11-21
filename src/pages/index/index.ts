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
import aiIcon from '../../../images/home/ai.png';
import imageIcon from '../../../images/home/image.png';
import fileIcon from '../../../images/home/file.png';
import videoIcon from '../../../images/home/video.png';
import updateIcon from '../../../images/home/update.png';
import settingsIcon from '../../../images/home/settings.png';
import lockIcon from '../../../images/home/lock.png';

export type indexOptions = {};

const APP_VERSION = '2.4.4';
const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

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
            icons: {
                ai: aiIcon,
                image: imageIcon,
                file: fileIcon,
                video: videoIcon,
                update: updateIcon,
                settings: settingsIcon,
                lock: lockIcon,
            },
            apps: [
                { key: 'ai', name: 'AI 助手', icon: aiIcon, theme: 'theme-ai' },
                { key: 'image', name: '图片', icon: imageIcon, theme: 'theme-image' },
                { key: 'file', name: '文件', icon: fileIcon, theme: 'theme-file' },
                { key: 'video', name: '视频', icon: videoIcon, theme: 'theme-video' },
                { key: 'update', name: '更新', icon: updateIcon, theme: 'theme-update' },
                { key: 'settings', name: '设置', icon: settingsIcon, theme: 'theme-settings' },
            ],
        };
    },

    mounted() {
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

        openApp(key: string) {
            switch (key) {
                case 'ai':
                    this.openAi();
                    break;
                case 'image':
                    this.openImageView();
                    break;
                case 'file':
                    this.openFileManager();
                    break;
                case 'video':
                    this.openVideoPlayer();
                    break;
                case 'update':
                    this.openUpdate();
                    break;
                case 'settings':
                    this.openSettings();
                    break;
            }
        },

        openAi() {
            $falcon.navTo("ai", {});
        },

        openImageView() {
            $falcon.navTo("imageView", {});
        },

        openFileManager() {
            $falcon.navTo("fileManager", {});
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

        openUpdate() {
            $falcon.navTo("update", {});
        },

        openSettings() {
            $falcon.navTo("appSettings", {});
        }
    }
});

export default index;
