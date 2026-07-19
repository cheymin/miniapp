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
import { Shell } from 'langningchen';
import { showError, showSuccess, showInfo } from '../../components/ToastMessage';

export type chatKeyboardOptions = {
    initialText: string;
};

const CLIPBOARD_FILE = '/userdisk/.chat_clipboard';

const QUICK_PHRASES = [
    '继续',
    '用中文回答',
    '详细解释',
    '总结一下',
];

const chatKeyboard = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<chatKeyboardOptions>,
            content: '',
            showPhraseMenu: false,
        };
    },

    mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on('backpressed', this.handleBackPress);

        const options = this.$page.loadOptions;
        if (options && options.initialText) {
            this.content = options.initialText;
        }
    },

    beforeDestroy() {
        this.$page.$npage.off('backpressed', this.handleBackPress);
    },

    computed: {
        quickPhrases(): string[] {
            return QUICK_PHRASES;
        }
    },

    methods: {
        handleBackPress() {
            if (this.showPhraseMenu) {
                this.showPhraseMenu = false;
            } else {
                this.cancel();
            }
        },

        cancel() {
            $falcon.trigger<string>('chatKeyboard', this.content);
            this.$page.finish();
        },

        send() {
            $falcon.trigger<any>('chatKeyboard', { text: this.content, send: true });
            this.$page.finish();
        },

        onContentClick() {
            this.openSystemKeyboard();
        },

        openSystemKeyboard() {
            try {
                const NativeSDK = (globalThis as any).NativeSDK;
                if (NativeSDK && NativeSDK.startTextEdit) {
                    const uuid = NativeSDK.startTextEdit({
                        text: this.content,
                        maxlength: 5000,
                        enterButtonText: '发送',
                        inputType: 'text'
                    });

                    const handler = (editUuid: string, jsonData: string) => {
                        if (editUuid !== uuid) return;

                        const result = JSON.parse(jsonData);
                        if (result.editConfirmed) {
                            this.content = result.text || '';
                            this.$forceUpdate();
                            this.send();
                        } else {
                            this.content = result.text || this.content;
                            this.$forceUpdate();
                        }

                        if (NativeSDK.globalModule && NativeSDK.globalModule().closeTextEdit) {
                            NativeSDK.globalModule().closeTextEdit(uuid);
                        }
                    };

                    if (NativeSDK.globalModule && NativeSDK.globalModule().textEditFinished) {
                        NativeSDK.globalModule().textEditFinished.on(handler);
                    }
                    return;
                }
            } catch (e) {
                console.error('系统键盘调用失败:', e);
            }

            this.openSoftKeyboardFallback();
        },

        openSoftKeyboardFallback() {
            $falcon.navTo('softKeyboard', { data: this.content });

            const handler = (e: { data: any }) => {
                let newValue = '';
                if (typeof e.data === 'string') {
                    newValue = e.data;
                } else if (e.data && typeof e.data === 'object') {
                    newValue = e.data.value || e.data.text || e.data.key || '';
                }
                this.content = newValue;
                this.$forceUpdate();
                $falcon.off('softKeyboard', handler);
            };

            $falcon.on('softKeyboard', handler);
        },

        copyToClipboard() {
            try {
                Shell.exec(`echo -n '${this.escapeShell(this.content)}' > ${CLIPBOARD_FILE}`);
                showSuccess('已复制到剪贴板');
            } catch (e) {
                showError('复制失败: ' + (e as string));
            }
        },

        pasteFromClipboard() {
            try {
                const result = Shell.exec(`cat ${CLIPBOARD_FILE} 2>/dev/null || echo ''`);
                const text = result ? result.replace(/\n$/, '') : '';
                if (text) {
                    this.content += text;
                    this.$forceUpdate();
                    showSuccess('已粘贴');
                } else {
                    showInfo('剪贴板为空');
                }
            } catch (e) {
                showError('粘贴失败: ' + (e as string));
            }
        },

        clearContent() {
            this.content = '';
            this.$forceUpdate();
            showInfo('已清空');
        },

        togglePhraseMenu() {
            this.showPhraseMenu = !this.showPhraseMenu;
        },

        insertPhrase(phrase: string) {
            this.content += phrase;
            this.showPhraseMenu = false;
            this.$forceUpdate();
        },

        escapeShell(str: string): string {
            return str.replace(/'/g, "'\\''");
        },
    }
});

export default chatKeyboard;
