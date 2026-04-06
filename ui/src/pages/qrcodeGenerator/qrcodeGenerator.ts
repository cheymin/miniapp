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
import { hideLoading, showLoading } from '../../components/Loading';
import { openSoftKeyboard } from '../../utils/softKeyboardUtils';

export type QRCodeGeneratorOptions = {};

const qrcodeGenerator = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<QRCodeGeneratorOptions>,
            
            inputText: '' as string,
            qrCodePath: '' as string,
            
            history: [] as Array<{ text: string; time: string; path: string }>,
            
            shellInitialized: false
        };
    },

    async mounted() {
        await this.initializeShell();
        await this.loadHistory();
    },

    methods: {
        async initializeShell() {
            try {
                if (!Shell || typeof Shell.initialize !== 'function') {
                    throw new Error('Shell模块不可用');
                }
                
                await Shell.initialize();
                this.shellInitialized = true;
            } catch (error: any) {
                console.error('Shell初始化失败:', error);
                showError('Shell初始化失败');
            }
        },

        async inputFromKeyboard() {
            openSoftKeyboard(
                () => this.inputText,
                (value: string) => {
                    this.inputText = value;
                    showSuccess('输入成功');
                }
            );
        },

        async generateQRCode() {
            if (!this.inputText) {
                showError('请先输入文本');
                return;
            }
            
            if (!this.shellInitialized) {
                showError('Shell未初始化');
                return;
            }
            
            try {
                showLoading('正在生成二维码...');
                
                const timestamp = Date.now();
                const outputPath = `/tmp/qrcode_${timestamp}.png`;
                
                const cmd = `qrencode -o "${outputPath}" -s 6 -m 2 "${this.inputText}"`;
                await Shell.exec(cmd);
                
                const checkResult = await Shell.exec(`test -f "${outputPath}" && echo "exists"`);
                
                if (checkResult && checkResult.includes('exists')) {
                    this.qrCodePath = outputPath;
                    showSuccess('二维码生成成功');
                    
                    this.addToHistory(this.inputText, outputPath);
                } else {
                    showError('二维码生成失败');
                }
            } catch (error: any) {
                console.error('生成二维码失败:', error);
                showError('生成二维码失败: ' + error.message);
            } finally {
                hideLoading();
            }
        },

        async saveQRCode() {
            if (!this.qrCodePath) {
                showError('请先生成二维码');
                return;
            }
            
            try {
                const timestamp = Date.now();
                const savePath = `/userdisk/qrcode_${timestamp}.png`;
                
                await Shell.exec(`cp "${this.qrCodePath}" "${savePath}"`);
                
                showSuccess(`已保存到: ${savePath}`);
            } catch (error: any) {
                console.error('保存失败:', error);
                showError('保存失败: ' + error.message);
            }
        },

        async shareQRCode() {
            if (!this.qrCodePath) {
                showError('请先生成二维码');
                return;
            }
            
            showInfo('分享功能开发中...');
        },

        addToHistory(text: string, path: string) {
            const now = new Date();
            const time = now.toLocaleString();
            
            this.history.unshift({ text, time, path });
            
            if (this.history.length > 20) {
                this.history.pop();
            }
            
            this.saveHistory();
        },

        loadFromHistory(index: number) {
            const item = this.history[index];
            if (item) {
                this.inputText = item.text;
                this.qrCodePath = item.path;
            }
        },

        async loadHistory() {
            try {
                const result = await $falcon.jsapi.storage.getStorage({ key: 'qrcode_history' });
                if (result && result.data) {
                    this.history = JSON.parse(result.data);
                }
            } catch (error) {
                console.error('加载历史失败:', error);
            }
        },

        async saveHistory() {
            try {
                await $falcon.jsapi.storage.setStorage({ 
                    key: 'qrcode_history', 
                    data: JSON.stringify(this.history) 
                });
            } catch (error) {
                console.error('保存历史失败:', error);
            }
        }
    }
});

export default qrcodeGenerator;
