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
import updateIcon from '../../../images/home/update.png';
import settingsIcon from '../../../images/home/settings.png';
import lockIcon from '../../../images/home/lock.png';

export type indexOptions = {};

const index = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<indexOptions>,
            checking: true,
            locked: false,
            passwordHash: '',
            icons: {
                ai: aiIcon,
                image: imageIcon,
                file: fileIcon,
                update: updateIcon,
                settings: settingsIcon,
                lock: lockIcon,
            },
        };
    },

    mounted() {
        this.checkLock();
    },

    methods: {
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

        openAi() {
            $falcon.navTo("ai", {});
        },

        openImageView() {
            $falcon.navTo("imageView", {});
        },

        openFileManager() {
            $falcon.navTo("fileManager", {});
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
