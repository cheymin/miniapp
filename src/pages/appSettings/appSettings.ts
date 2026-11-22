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

const APP_VERSION = '2.4.4';
const LEGACY_CACHE = '/userdisk/.cheymin/player';
const TEMP_CACHE = '/tmp/cheymin-player';

const appSettings = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<appSettingsOptions>,
            hasPassword: false,
            version: APP_VERSION,
            learnedCount: 0,
        };
    },

    mounted() {
        this.refreshPasswordState();
        this.refreshKeyboardState();
    },

    methods: {
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
