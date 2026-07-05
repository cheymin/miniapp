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
import { Bilibili } from 'langningchen';
import { showError, showSuccess } from '../../components/ToastMessage';
import { hideLoading, showLoading } from '../../components/Loading';
import { openSoftKeyboard } from '../../utils/softKeyboardUtils';

export type biliSettingsOptions = {};

const biliSettings = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<biliSettingsOptions>,
            sessdata: '',
            biliJct: '',
            buvid3: '',
            dedeuserid: '',
            isLoggedIn: false,
        };
    },

    mounted() {
        this.$page.$npage.setSupportBack(true);
        this.isLoggedIn = Bilibili.isLoggedIn();
    },

    methods: {
        editSessdata() {
            openSoftKeyboard(
                () => this.sessdata,
                (value) => { this.sessdata = value.trim(); this.$forceUpdate(); }
            );
        },

        editBiliJct() {
            openSoftKeyboard(
                () => this.biliJct,
                (value) => { this.biliJct = value.trim(); this.$forceUpdate(); }
            );
        },

        editBuvid3() {
            openSoftKeyboard(
                () => this.buvid3,
                (value) => { this.buvid3 = value.trim(); this.$forceUpdate(); }
            );
        },

        editDedeuserid() {
            openSoftKeyboard(
                () => this.dedeuserid,
                (value) => { this.dedeuserid = value.trim(); this.$forceUpdate(); }
            );
        },

        saveCredential() {
            if (!this.sessdata) {
                showError('SESSDATA 不能为空');
                return;
            }
            showLoading();
            Bilibili.setCredential(
                this.sessdata,
                this.biliJct,
                this.buvid3,
                this.dedeuserid
            ).then(() => {
                this.isLoggedIn = Bilibili.isLoggedIn();
                showSuccess('登录凭证已保存');
                this.$page.finish();
            }).catch((e) => {
                showError(e as string || '保存失败');
            }).finally(() => {
                hideLoading();
            });
        },

        logout() {
            Bilibili.clearCredential();
            this.isLoggedIn = false;
            this.sessdata = '';
            this.biliJct = '';
            this.buvid3 = '';
            this.dedeuserid = '';
            showSuccess('已退出登录');
        },
    },
});

export default biliSettings;
