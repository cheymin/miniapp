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

export type appSettingsOptions = {};

const appSettings = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<appSettingsOptions>,
            hasPassword: false,
        };
    },

    mounted() {
        this.refreshPasswordState();
    },

    methods: {
        async refreshPasswordState() {
            this.hasPassword = !!(await loadPassword());
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

        goBack() {
            this.$page.finish();
        },
    },
});

export default appSettings;
