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
import { loadPassword, savePassword } from '../../utils/password';
import { openSystemInput } from '../../utils/systemInput';
import { exec } from '../../utils/nativeShell';
import { clearLearnedWords, getLearnedWordCount, loadUserWords } from '../../utils/pinyin/engine';

export type appSettingsOptions = {};

const APP_VERSION = '3.0.0';
const LEGACY_CACHE = '/userdisk/.cheymin/player';
const TEMP_CACHE = '/tmp/cheymin-player';

const appSettings = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<appSettingsOptions>,
            hasPassword: false,
            version: APP_VERSION,
            learnedCount: 0,
            activeTab: 'update',
            searchText: '',
            tabs: [
                { key: 'update', name: '软件版本', desc: '检查更新与操作日志', glyph: '版' },
                { key: 'data', name: '数据管理', desc: '本地存储与缓存', glyph: '数' },
                { key: 'prefs', name: '偏好设置', desc: '应用锁与键盘', glyph: '偏' },
                { key: 'about', name: '关于与鸣谢', desc: '版本信息与致谢名单', glyph: '关' },
            ],
            credits: [
                { name: '雪球的小源', role: '赞助资金 k+' },
                { name: '李子', role: 'LoliAPP 创始人 & 主力开发' },
                { name: '洛神赋', role: 'Cvi & Rka 深度适配与长期维护' },
                { name: '小爱', role: '文件搜索、视频播放自适应屏幕' },
                { name: '四夕', role: '网易云贡献值 / 哔哩贡献者' },
                { name: '喵！', role: '旋转竖屏阅读器、双指缩放' },
            ],
        };
    },

    computed: {
        visibleTabs() {
            const query = this.searchText.trim().toLowerCase();
            if (!query) { return this.tabs; }
            return this.tabs.filter((tab: any) =>
                tab.name.toLowerCase().includes(query) ||
                tab.desc.toLowerCase().includes(query));
        },
    },

    mounted() {
        this.refreshPasswordState();
        this.refreshKeyboardState();
    },

    methods: {
        editSearch() {
            openSystemInput(
                () => this.searchText,
                (value) => {
                    this.searchText = value.trim();
                    if (this.visibleTabs.length) {
                        this.activeTab = this.visibleTabs[0].key;
                    }
                }
            );
        },

        async refreshPasswordState() {
            this.hasPassword = !!(await loadPassword());
        },

        async refreshKeyboardState() {
            await loadUserWords();
            this.learnedCount = getLearnedWordCount();
        },

        editPassword() {
            openSystemInput(
                () => '',
                (value) => {
                    savePassword(value).then(() => {
                        this.hasPassword = true;
                        showSuccess('密码已设置');
                    }).catch((e) => {
                        showError(`保存密码失败: ${e}`);
                    });
                },
                (value) => {
                    if (!value) { return '密码不能为空'; }
                    if (value.length < 4) { return '密码至少 4 位'; }
                }
            );
        },

        clearPassword() {
            savePassword('').then(() => {
                this.hasPassword = false;
                showSuccess('密码已清除');
            }).catch((e) => {
                showError(`清除密码失败: ${e}`);
            });
        },

        clearKeyboard() {
            clearLearnedWords().then(() => {
                this.learnedCount = 0;
                showSuccess('输入学习已清除');
            }).catch((e) => {
                showError(`清除失败: ${e}`);
            });
        },

        openAiSettings() {
            $falcon.navTo('aiSettings', {});
        },

        clearCache() {
            exec(`rm -rf ${LEGACY_CACHE} ${TEMP_CACHE} 2>/dev/null; true`).then(() => {
                showSuccess('缓存已清理');
            }).catch((e) => {
                showError(`清理失败: ${e}`);
            });
        },

        openUpdate() {
            $falcon.navTo('update', {});
        },
    },
});

export default appSettings;
