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
import { showError, showSuccess, showInfo } from '../../components/ToastMessage';
import { openSoftKeyboard } from '../../utils/softKeyboardUtils';

export type WebdavManagerOptions = {};

interface WebDAVFile {
    name: string;
    href: string;
    isDirectory: boolean;
    size: string;
    modified: string;
}

const DB_PATH = '/userdisk/min/db';
const DB_FILE = DB_PATH + '/webdav.db';

export default defineComponent({
    data() {
        return {
            $page: {} as FalconPage<WebdavManagerOptions>,
            serverUrl: '' as string,
            username: '' as string,
            password: '' as string,
            currentPath: '' as string,
            files: [] as WebDAVFile[],
            isConnected: false as boolean,
            isLoading: false as boolean,
            showSettings: false as boolean,
        };
    },

    async mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on("backpressed", () => { $falcon.navBack(); });
        
        await this.loadSettings();
    },

    methods: {
        // 加载设置
        async loadSettings() {
            try {
                const data = await this.readDB();
                if (data) {
                    const settings = JSON.parse(data);
                    this.serverUrl = settings.serverUrl || '';
                    this.username = settings.username || '';
                    this.password = settings.password || '';
                    
                    if (this.serverUrl) {
                        await this.connect();
                    }
                }
            } catch (e) {
                console.log('加载设置失败:', e);
            }
        },

        // 保存设置
        async saveSettings() {
            if (!this.serverUrl.trim()) {
                showError('请输入服务器地址');
                return;
            }

            try {
                const settings = {
                    serverUrl: this.serverUrl,
                    username: this.username,
                    password: this.password
                };
                await this.writeDB(JSON.stringify(settings));
                showSuccess('设置已保存');
                this.showSettings = false;
                await this.connect();
            } catch (e) {
                showError('保存设置失败');
            }
        },

        // 读取DB文件
        async readDB(): Promise<string> {
            try {
                const result = await $falcon.storage.read(DB_FILE);
                return result || '';
            } catch (e) {
                return '';
            }
        },

        // 写入DB文件
        async writeDB(data: string) {
            try {
                // 确保目录存在
                await $falcon.storage.mkdir(DB_PATH);
            } catch (e) {
                // 目录可能已存在
            }
            await $falcon.storage.write(DB_FILE, data);
        },

        // 连接WebDAV服务器
        async connect() {
            if (!this.serverUrl) {
                showError('请先配置服务器地址');
                return;
            }

            this.isLoading = true;
            try {
                await this.listDirectory('/');
                this.isConnected = true;
                showSuccess('连接成功');
            } catch (e) {
                this.isConnected = false;
                showError('连接失败: ' + (e as string));
            } finally {
                this.isLoading = false;
            }
        },

        // 测试连接
        async testConnection() {
            if (!this.serverUrl.trim()) {
                showError('请输入服务器地址');
                return;
            }

            this.isLoading = true;
            try {
                await this.makeRequest('PROPFIND', '/', null, { 'Depth': '0' });
                showSuccess('连接测试成功');
            } catch (e) {
                showError('连接测试失败: ' + (e as string));
            } finally {
                this.isLoading = false;
            }
        },

        // 列出目录
        async listDirectory(path: string) {
            this.isLoading = true;
            try {
                const response = await this.makeRequest('PROPFIND', path, null, { 'Depth': '1' });
                this.files = this.parseWebDAVResponse(response, path);
                this.currentPath = path;
            } catch (e) {
                showError('获取目录失败: ' + (e as string));
            } finally {
                this.isLoading = false;
            }
        },

        // 发送WebDAV请求
        async makeRequest(method: string, path: string, body: string | null, headers: Record<string, string> = {}): Promise<string> {
            const url = this.serverUrl.replace(/\/$/, '') + path;
            
            const requestHeaders: Record<string, string> = {
                'Content-Type': 'application/xml',
                ...headers
            };

            if (this.username && this.password) {
                const auth = btoa(this.username + ':' + this.password);
                requestHeaders['Authorization'] = 'Basic ' + auth;
            }

            const response = await $falcon.jsapi.http.request({
                method: method,
                url: url,
                headers: requestHeaders,
                body: body || ''
            });

            if (response.statusCode >= 400) {
                throw new Error(`HTTP ${response.statusCode}`);
            }

            return response.data || '';
        },

        // 解析WebDAV响应
        parseWebDAVResponse(xml: string, currentPath: string): WebDAVFile[] {
            const files: WebDAVFile[] = [];
            
            // 简单解析XML响应
            const hrefRegex = /<d:href>([^<]+)<\/d:href>/gi;
            const propstatRegex = /<d:propstat>([\s\S]*?)<\/d:propstat>/gi;
            
            const hrefs: string[] = [];
            let match;
            
            while ((match = hrefRegex.exec(xml)) !== null) {
                hrefs.push(decodeURIComponent(match[1]));
            }

            // 解析每个文件/目录
            const responses = xml.split('<d:response>');
            for (let i = 1; i < responses.length; i++) {
                const resp = responses[i];
                const hrefMatch = resp.match(/<d:href>([^<]+)<\/d:href>/i);
                if (!hrefMatch) continue;

                const href = decodeURIComponent(hrefMatch[1]);
                const name = href.split('/').filter(p => p).pop() || '';
                
                // 跳过当前目录本身
                if (href.replace(/\/$/, '') === currentPath.replace(/\/$/, '') ||
                    href.replace(/\/$/, '') === this.serverUrl.replace(/\/$/, '') + currentPath.replace(/\/$/, '')) {
                    continue;
                }

                const isDirectory = resp.includes('<d:resourcetype><d:collection/></d:resourcetype>') || 
                                    resp.includes('<d:collection/>') ||
                                    href.endsWith('/');
                
                const sizeMatch = resp.match(/<d:getcontentlength>(\d+)<\/d:getcontentlength>/i);
                const size = sizeMatch ? this.formatSize(parseInt(sizeMatch[1])) : (isDirectory ? '-' : '0 B');
                
                const modifiedMatch = resp.match(/<d:getlastmodified>([^<]+)<\/d:getlastmodified>/i);
                const modified = modifiedMatch ? this.formatDate(modifiedMatch[1]) : '-';

                files.push({
                    name: name,
                    href: href,
                    isDirectory: isDirectory,
                    size: size,
                    modified: modified
                });
            }

            // 排序：目录在前
            files.sort((a, b) => {
                if (a.isDirectory && !b.isDirectory) return -1;
                if (!a.isDirectory && b.isDirectory) return 1;
                return a.name.localeCompare(b.name);
            });

            return files;
        },

        // 格式化大小
        formatSize(bytes: number): string {
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
            return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
        },

        // 格式化日期
        formatDate(dateStr: string): string {
            try {
                const date = new Date(dateStr);
                return date.toLocaleDateString();
            } catch (e) {
                return dateStr.substring(0, 10);
            }
        },

        // 打开文件/目录
        async openItem(file: WebDAVFile) {
            if (file.isDirectory) {
                let newPath = file.href;
                // 处理相对路径和绝对路径
                if (newPath.startsWith(this.serverUrl)) {
                    newPath = newPath.replace(this.serverUrl, '');
                }
                await this.listDirectory(newPath);
            } else {
                // 下载文件
                await this.downloadFile(file);
            }
        },

        // 下载文件
        async downloadFile(file: WebDAVFile) {
            showInfo('正在下载: ' + file.name);
            try {
                const content = await this.makeRequest('GET', file.href, null, {});
                // 保存到本地
                const localPath = '/userdisk/min/downloads/' + file.name;
                await $falcon.storage.mkdir('/userdisk/min/downloads');
                await $falcon.storage.write(localPath, content);
                showSuccess('下载完成: ' + file.name);
            } catch (e) {
                showError('下载失败: ' + (e as string));
            }
        },

        // 返回上级
        async goBack() {
            if (this.currentPath === '/' || !this.currentPath) return;
            
            const parts = this.currentPath.split('/').filter(p => p);
            parts.pop();
            const parentPath = parts.length > 0 ? '/' + parts.join('/') : '/';
            await this.listDirectory(parentPath);
        },

        // 刷新列表
        async refreshList() {
            if (this.isConnected) {
                await this.listDirectory(this.currentPath);
            }
        },

        // 创建目录
        async createFolder() {
            if (!this.isConnected) {
                showError('请先连接服务器');
                return;
            }

            openSoftKeyboard(
                () => '',
                async (name) => {
                    if (!name.trim()) return;
                    
                    const folderPath = this.currentPath.replace(/\/$/, '') + '/' + name.trim();
                    try {
                        await this.makeRequest('MKCOL', folderPath, null, {});
                        showSuccess('目录创建成功');
                        await this.refreshList();
                    } catch (e) {
                        showError('创建目录失败: ' + (e as string));
                    }
                }
            );
        },

        // 上传文件
        async uploadFile() {
            if (!this.isConnected) {
                showError('请先连接服务器');
                return;
            }

            showInfo('上传功能开发中...');
        },

        // 编辑服务器地址
        editServerUrl() {
            openSoftKeyboard(
                () => this.serverUrl,
                (value) => { this.serverUrl = value; }
            );
        },

        // 编辑用户名
        editUsername() {
            openSoftKeyboard(
                () => this.username,
                (value) => { this.username = value; }
            );
        },

        // 编辑密码
        editPassword() {
            openSoftKeyboard(
                () => this.password,
                (value) => { this.password = value; }
            );
        }
    }
});
