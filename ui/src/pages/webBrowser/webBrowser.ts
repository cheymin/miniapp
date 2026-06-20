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
import { showError } from '../../components/ToastMessage';
import { openSoftKeyboard } from '../../utils/softKeyboardUtils';

export type WebBrowserOptions = {
    initialUrl?: string;
    url?: string;
};

const webBrowser = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<WebBrowserOptions>,

            url: 'https://www.baidu.com',
            tempUrl: '',
            showUrlInput: false,
            history: [] as string[],
            historyIndex: -1,
            webviewKey: 0,
        };
    },

    mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on('backpressed', this.goBack);

        const options = this.$page.loadOptions;
        if (options.url) {
            this.url = options.url;
        } else if (options.initialUrl) {
            this.url = options.initialUrl;
        }
        this.addToHistory(this.url);
    },

    methods: {
        goBack() {
            this.$page.finish();
        },

        showUrlEditor() {
            this.tempUrl = this.url;
            this.showUrlInput = true;
        },

        openUrlKeyboard() {
            openSoftKeyboard(
                () => this.tempUrl,
                (value: string) => { this.tempUrl = value; this.$forceUpdate(); }
            );
        },

        confirmUrlEdit() {
            if (!this.tempUrl.trim()) return;
            let url = this.tempUrl.trim();
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            this.url = url;
            this.showUrlInput = false;
            this.addToHistory(url);
        },

        cancelUrlEdit() {
            this.showUrlInput = false;
        },

        addToHistory(url: string) {
            this.history = this.history.slice(0, this.historyIndex + 1);
            this.history.push(url);
            this.historyIndex = this.history.length - 1;
        },

        goBackPage() {
            if (this.historyIndex > 0) {
                this.historyIndex--;
                this.url = this.history[this.historyIndex];
            }
        },

        goForward() {
            if (this.historyIndex < this.history.length - 1) {
                this.historyIndex++;
                this.url = this.history[this.historyIndex];
            }
        },

        refresh() {
            this.webviewKey++;
        },
    },
});

export default webBrowser;