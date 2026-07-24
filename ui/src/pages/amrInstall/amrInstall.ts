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
import { getIcon } from '../../utils/icons';

export type AmrInstallOptions = {
    filePath: string;
};

const amrInstall = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<AmrInstallOptions>,
            filePath: '',
            fileName: '',
            fileSize: 0,
            fileSizeFormatted: '',
            isInstalling: false,
            installStatus: 'idle' as 'idle' | 'installing' | 'success' | 'error',
            statusMessage: '',
        };
    },
    async mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on('backpressed', this.handleBackPress);
        await Shell.initialize();
        this.filePath = this.$page.loadOptions.filePath || '';
        this.loadFileInfo();
    },
    beforeDestroy() {
        this.$page.$npage.off('backpressed', this.handleBackPress);
    },
    computed: {
        canInstall(): boolean {
            return !this.isInstalling && !!this.filePath && this.installStatus !== 'success';
        },
    },
    methods: {
        handleBackPress() { this.$page.finish(); },
        icon(name: string): string { return getIcon(name); },
        async loadFileInfo() {
            if (!this.filePath) { showError('未指定文件'); return; }
            this.fileName = this.filePath.split('/').pop() || this.filePath;
            try {
                const sizeStr = await Shell.exec(`stat -c "%s" "${this.filePath}" 2>/dev/null || echo "0"`);
                this.fileSize = parseInt(sizeStr.trim(), 10) || 0;
                this.fileSizeFormatted = this.formatSize(this.fileSize);
                this.$forceUpdate();
            } catch (e) { /* ignore */ }
        },
        formatSize(bytes: number): string {
            if (bytes < 1024) return `${bytes} B`;
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        },
        async doInstall() {
            if (this.isInstalling) return;
            this.isInstalling = true;
            this.installStatus = 'installing';
            this.statusMessage = '正在安装...';
            showLoading('正在安装应用...');
            try {
                const cmd = `miniapp_cli install "${this.filePath}"`;
                console.log('执行安装命令:', cmd);
                const result = await Shell.exec(cmd);
                console.log('安装结果:', result);
                this.installStatus = 'success';
                this.statusMessage = '安装成功！请重启应用';
                showSuccess('安装成功！请重启应用');
            } catch (error: any) {
                console.error('安装失败:', error);
                this.installStatus = 'error';
                this.statusMessage = error.message || '安装失败';
                showError(`安装失败: ${error.message || error}`);
            } finally {
                this.isInstalling = false;
                hideLoading();
            }
        },
        cancelInstall() {
            this.$page.finish();
        },
    }
});
export default amrInstall;
