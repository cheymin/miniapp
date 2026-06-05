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

const DB_PATH = '/userdisk/database/cloudreve.json';

const cloudreve = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<CloudreveOptions>,
            serverUrl: '' as string,
            username: '' as string,
            password: '' as string,
            token: '' as string,
            isLoggedIn: false as boolean,
            showMenu: false as boolean,
            showLoginPanel: false as boolean,
            loginError: '' as string,
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
        await this.loadFromDB();
    },

    beforeDestroy() {
        this.$page.$npage.off("backpressed", this.handleBackPress);
    },

    methods: {
        handleBackPress() {
            if (this.showMenu) {
                this.showMenu = false;
            } else if (this.showLoginPanel) {
                this.showLoginPanel = false;
            } else if (this.pathHistory.length > 0) {
                this.goBack();
            } else {
                $falcon.navBack();
            }
        },

        goBack() {
            if (this.pathHistory.length > 0) {
                this.currentPath = this.pathHistory.pop() || '/';
                this.refreshFiles();
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

        async loadFromDB() {
            try {
                const data = await $falcon.storage.get(DB_PATH);
                if (data) {
                    const config = JSON.parse(data);
                    this.serverUrl = config.serverUrl || '';
                    this.username = config.username || '';
                    this.password = config.password || '';
                    this.token = config.token || '';
                    if (this.token && this.serverUrl) {
                        // 验证 token 是否仍然有效
                        const valid = await this.verifyToken();
                        if (valid) {
                            this.isLoggedIn = true;
                            await this.refreshFiles();
                        } else {
                            // token 过期，尝试重新登录
                            if (this.username && this.password) {
                                await this.silentLogin();
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('加载配置失败:', e);
            }
        },

        async saveToDB() {
            try {
                await $falcon.storage.set(DB_PATH, JSON.stringify({
                    serverUrl: this.serverUrl,
                    username: this.username,
                    password: this.password,
                    token: this.token
                }));
            } catch (e) {
                console.error('保存配置失败:', e);
            }
        },

        async verifyToken(): Promise<boolean> {
            if (!this.shellInitialized || !this.serverUrl || !this.token) return false;
            try {
                const cmd = `curl -s -m 5 "${this.serverUrl}/api/v3/user/me" -H "Authorization: Bearer ${this.token}"`;
                const result = await Shell.exec(cmd);
                const data = JSON.parse(result.trim());
                return data.code === 0;
            } catch (e) {
                return false;
            }
        },

        async silentLogin(): Promise<boolean> {
            if (!this.shellInitialized) return false;
            try {
                const cmd = `curl -s -m 5 -X POST "${this.serverUrl}/api/v3/user/session" -H "Content-Type: application/json" -d '{"userName":"${this.username}","Password":"${this.password}"}'`;
                const result = await Shell.exec(cmd);
                const data = JSON.parse(result.trim());
                if (data.code === 0) {
                    this.token = data.data;
                    this.isLoggedIn = true;
                    await this.saveToDB();
                    await this.refreshFiles();
                    return true;
                }
                return false;
            } catch (e) {
                return false;
            }
        },

        inputServerUrl() {
            openSoftKeyboard(
                () => this.serverUrl,
                (value: string) => {
                    this.serverUrl = value.trim().replace(/\/+$/, '');
                    this.loginError = '';
                }
            );
        },

        inputUsername() {
            openSoftKeyboard(
                () => this.username,
                (value: string) => {
                    this.username = value;
                    this.loginError = '';
                }
            );
        },

        inputPassword() {
            openSoftKeyboard(
                () => this.password,
                (value: string) => {
                    this.password = value;
                    this.loginError = '';
                }
            );
        },

        async doLogin() {
            if (!this.serverUrl) { this.loginError = '请输入服务器地址'; return; }
            if (!this.username) { this.loginError = '请输入用户名'; return; }
            if (!this.password) { this.loginError = '请输入密码'; return; }
            if (!this.shellInitialized) { this.loginError = 'Shell未初始化，无法连接'; return; }

            this.loginError = '';
            try {
                showLoading('正在连接...');
                const cmd = `curl -s -m 10 -X POST "${this.serverUrl}/api/v3/user/session" -H "Content-Type: application/json" -d '{"userName":"${this.username}","Password":"${this.password}"}'`;
                const result = await Shell.exec(cmd);
                const data = JSON.parse(result.trim());
                if (data.code === 0) {
                    this.token = data.data;
                    this.isLoggedIn = true;
                    await this.saveToDB();
                    showSuccess('登录成功');
                    await this.refreshFiles();
                } else {
                    this.loginError = data.msg || '登录失败，请检查信息';
                }
            } catch (e: any) {
                this.loginError = '连接失败: ' + (e.message || '请检查服务器地址');
            } finally {
                hideLoading();
            }
        },

        async doLogout() {
            this.token = '';
            this.isLoggedIn = false;
            this.showMenu = false;
            this.showLoginPanel = false;
            this.files = [];
            this.pathHistory = [];
            this.currentPath = '/';
            await this.saveToDB();
            showSuccess('已退出登录');
        },

        async refreshFiles() {
            if (!this.isLoggedIn || !this.shellInitialized) return;
            try {
                showLoading('加载中...');
                const encodedPath = encodeURIComponent(this.currentPath);
                const cmd = `curl -s -m 10 "${this.serverUrl}/api/v3/directory${encodedPath}" -H "Authorization: Bearer ${this.token}"`;
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
                } else if (data.code === 401) {
                    // token 过期
                    this.isLoggedIn = false;
                    this.token = '';
                    await this.saveToDB();
                    showError('登录已过期，请重新登录');
                } else {
                    showError('加载失败: ' + (data.msg || ''));
                }
            } catch (e: any) {
                showError('加载失败: ' + (e.message || '网络错误'));
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

        async uploadFile() {
            if (!this.shellInitialized) { showError('Shell未初始化'); return; }
            openSoftKeyboard(
                () => '/userdisk/',
                async (value: string) => {
                    try {
                        showLoading('正在上传...');
                        const cmd = `curl -s -m 60 -X POST "${this.serverUrl}/api/v3/file/upload" -H "Authorization: Bearer ${this.token}" -F "file=@${value}" -F "path=${this.currentPath}"`;
                        const result = await Shell.exec(cmd);
                        const data = JSON.parse(result.trim());
                        if (data.code === 0) {
                            showSuccess('上传成功');
                            await this.refreshFiles();
                        } else {
                            showError('上传失败: ' + (data.msg || ''));
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
                        const cmd = `curl -s -m 10 -X PUT "${this.serverUrl}/api/v3/directory${encodedPath}" -H "Authorization: Bearer ${this.token}" -H "Content-Type: application/json" -d '{"dir_name":"${value.trim()}"}'`;
                        const result = await Shell.exec(cmd);
                        const data = JSON.parse(result.trim());
                        if (data.code === 0) {
                            showSuccess('创建成功');
                            await this.refreshFiles();
                        } else {
                            showError('创建失败: ' + (data.msg || ''));
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
