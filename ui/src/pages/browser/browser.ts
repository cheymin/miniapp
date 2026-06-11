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
import { openSoftKeyboard } from '../../utils/softKeyboardUtils';

export type BrowserOptions = {};

const browser = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<BrowserOptions>,
            currentUrl: '' as string
        };
    },

    mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on("backpressed", () => {
            if (this.currentUrl) {
                this.currentUrl = '';
            } else {
                $falcon.navBack();
            }
        });
    },

    methods: {
        editUrl() {
            openSoftKeyboard(
                () => this.currentUrl,
                (value: string) => {
                    this.currentUrl = value;
                }
            );
        },

        goUrl() {
            if (!this.currentUrl.trim()) return;
            let url = this.currentUrl.trim();
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'http://' + url;
            }
            this.currentUrl = url;
        },

        loadUrl(url: string) {
            this.currentUrl = url;
        },

        goBack() {
            if (this.currentUrl) {
                this.currentUrl = '';
            }
        }
    }
});

export default browser;