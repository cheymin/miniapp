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

export type CloudreveOptions = {};

interface CloudreveFile {
    id: string;
    name: string;
    type: string;
    size: string;
    date: string;
    path: string;
}

const cloudreve = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<CloudreveOptions>,
            serverUrl: '' as string,
            username: '' as string,
            password: '' as string,
            token: '' as string,
            isLoggedIn: false as boolean,
            showSettings: false as boolean,
            currentPath: '/' as string,
            files: [] as CloudreveFile[],
            pathHistory: [] as string[],
            shellInitialized: false as boolean
        };
    },

    async mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on("backpressed", this.handleBackPress);
        await this.initializeShell();
        await this.loadConfig();
    },

    beforeDestroy() {
        this.$page.$npage.off("backpressed", this.handleBackPress);
    },

    methods: {
        handleBackPress() {
            if (this.showSettings) {
                this.showSettings = false;
            } else if (this.pathHistory.length > 0) {
                this.goBack();
            } else {
                $falcon.navBack();
            }
        },

        async initializeShell() {
            try {
                if (Shell && typeof Shell.initialize === 'function') {
                    await Shell.initialize();
                    this.shellInitialized = true;
                }
            } catch (e) {
                console.error('Shell初始化失败:', e);
            }
        },

        toggleSettings() {
            this.showSettings = !this.showSettings;
        },

        inputServerUrl() {
            openSoftKeyboard(
                () => this.serverUrl,
                (value: string) => { this.serverUrl = value.trim().replace(/\/+$/, ''); }
            );
        },

        inputUsername() {
            openSoftKeyboard(
                () => this.username,
                (value: string) => { this.username = value; }
            );
        },

        inputPassword() {
            openSoftKeyboard(
                () => this.password,
                (value: string) => { this.password = value; }
            );
        },

        async loadConfig() {
            try {
                const data = await $falcon.storage.get('cloudreve_config');
                if (data) {
                    const config = JSON.parse(data);
                    this.serverUrl = config.serverUrl || '';
                    this.username = config.username || '';
                    this.password = config.password || '';
                    this.token = config.token || '';
                    if (this.token) {
                        this.isLoggedIn = true;
                        await this.refreshFiles();
                    }
                }
            } catch (e) {
                console.error('加载配置失败:', e);
            }
        },

        async saveConfig() {
            try {
                await $falcon.storage.set('cloudreve_config', JSON.stringify({
                    serverUrl: this.serverUrl,
                    username: this.username,
                    password: this.password,
                    token: this.token
                }));
            } catch (e) {
                console.error('保存配置失败:', e);
            }
        },

        async login() {
            if (!this.serverUrl) { showError('请设置服务器地址'); return; }
            if (!this.username) { showError('请设置用户名'); return; }
            if (!this.password) { showError('请设置密码'); return; }
            if (!this.shellInitialized) { showError('Shell未初始化'); return; }

            try {
                showLoading('正在登录...');
                const cmd = `curl -s -X POST "${this.serverUrl}/api/v3/user/session" -H "Content-Type: application/json" -d '{"userName":"${this.username}","Password":"${this.password}"}'`;
                const result = await Shell.exec(cmd);
                const data = JSON.parse(result.trim());
                if (data.code === 0) {
                    this.token = data.data;
                    this.isLoggedIn = true;
                    this.showSettings = false;
                    await this.saveConfig();
                    showSuccess('登录成功');
                    await this.refreshFiles();
                } else {
                    showError('登录失败: ' + (data.msg || '未知错误'));
                }
            } catch (e: any) {
                showError('登录失败: ' + (e.message || e));
            } finally {
                hideLoading();
            }
        },

        async refreshFiles() {
            if (!this.isLoggedIn || !this.shellInitialized) return;
            try {
                showLoading('加载中...');
                const encodedPath = encodeURIComponent(this.currentPath);
                const cmd = `curl -s "${this.serverUrl}/api/v3/directory${encodedPath}" -H "Authorization: Bearer ${this.token}"`;
                const result = await Shell.exec(cmd);
                const data = JSON.parse(result.trim());
                if (data.code === 0) {
                    this.files = (data.data.objects || []).map((obj: any) => ({
                        id: obj.id || '',
                        name: obj.name || '',
                        type: obj.type === 'dir' ? 'dir' : 'file',
                        size: obj.type === 'dir' ? '-' : this.formatSize(obj.size || 0),
                        date: obj.create_date ? obj.create_date.substring(0, 10) : '',
                        path: this.currentPath === '/' ? '/' + obj.name : this.currentPath + '/' + obj.name
                    }));
                } else {
                    showError('加载失败: ' + (data.msg || ''));
                }
            } catch (e: any) {
                showError('加载失败');
            } finally {
                hideLoading();
            }
        },

        async handleFileClick(file: CloudreveFile) {
            if (file.type === 'dir') {
                this.pathHistory.push(this.currentPath);
                this.currentPath = file.path;
                await this.refreshFiles();
            } else {
                showInfo('文件: ' + file.name);
            }
        },

        goBack() {
            if (this.pathHistory.length > 0) {
                this.currentPath = this.pathHistory.pop() || '/';
                this.refreshFiles();
            }
        },

        async uploadFile() {
            if (!this.shellInitialized) { showError('Shell未初始化'); return; }
            openSoftKeyboard(
                () => '/userdisk/',
                async (value: string) => {
                    try {
                        showLoading('正在上传...');
                        const cmd = `curl -s -X POST "${this.serverUrl}/api/v3/file/upload" -H "Authorization: Bearer ${this.token}" -F "file=@${value}" -F "path=${this.currentPath}"`;
                        const result = await Shell.exec(cmd);
                        const data = JSON.parse(result.trim());
                        if (data.code === 0) {
                            showSuccess('上传成功');
                            await this.refreshFiles();
                        } else {
                            showError('上传失败');
                        }
                    } catch (e: any) {
                        showError('上传失败');
                    } finally {
                        hideLoading();
                    }
                }
            );
        },

        async createFolder() {
            openSoftKeyboard(
                () => '新建文件夹',
                async (value: string) => {
                    if (!value.trim()) return;
                    try {
                        showLoading('正在创建...');
                        const encodedPath = encodeURIComponent(this.currentPath);
                        const cmd = `curl -s -X PUT "${this.serverUrl}/api/v3/directory${encodedPath}" -H "Authorization: Bearer ${this.token}" -H "Content-Type: application/json" -d '{"dir_name":"${value.trim()}"}'`;
                        const result = await Shell.exec(cmd);
                        const data = JSON.parse(result.trim());
                        if (data.code === 0) {
                            showSuccess('创建成功');
                            await this.refreshFiles();
                        } else {
                            showError('创建失败');
                        }
                    } catch (e: any) {
                        showError('创建失败');
                    } finally {
                        hideLoading();
                    }
                }
            );
        },

        formatSize(bytes: number): string {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        }
    }
});

export default cloudreve;
