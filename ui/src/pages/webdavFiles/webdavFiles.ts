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
import { showError, showSuccess } from '../../components/ToastMessage';
import { hideLoading, showLoading } from '../../components/Loading';
import { minConfig } from '../../utils/minConfig';
import { getIcon } from '../../utils/icons';

export type WebdavFilesOptions = {};

interface WebDAVItem {
    name: string;
    href: string;
    isDirectory: boolean;
    size: number;
}

const webdavFiles = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<WebdavFilesOptions>,
            baseUrl: '',
            username: '',
            password: '',
            currentPath: '',      // WebDAV 上的相对路径，如 "" 或 "folder/sub"
            itemList: [] as WebDAVItem[],
            isLoading: false,
            hasConfig: false,
            selectedItem: null as WebDAVItem | null,
            showItemMenu: false,
        };
    },
    async mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on('backpressed', this.handleBackPress);
        await Shell.initialize();
        await this.loadConfig();
        if (this.hasConfig) {
            await this.listDirectory();
        }
    },
    beforeDestroy() {
        this.$page.$npage.off('backpressed', this.handleBackPress);
    },
    computed: {
        canGoBack(): boolean { return this.currentPath !== ''; },
        pathDisplay(): string { return '/' + this.currentPath; },
    },
    methods: {
        handleBackPress() {
            if (this.showItemMenu) { this.showItemMenu = false; return; }
            if (this.canGoBack) { this.goUp(); return; }
            this.$page.finish();
        },
        icon(name: string): string { return getIcon(name); },
        noop() { /* 阻止事件冒泡 */ },

        async loadConfig() {
            await minConfig.loadAll();
            const cfg = minConfig.getWebDAV();
            this.baseUrl = (cfg.url || '').replace(/\/$/, '');
            this.username = cfg.username || '';
            this.password = cfg.password || '';
            this.hasConfig = !!this.baseUrl && !!this.username;
        },

        // 取 URL 的路径部分（去掉 protocol://host），用于比对 PROPFIND 返回的 href
        pathOnly(u: string): string {
            if (!u) return '';
            let s = u;
            const idx = s.indexOf('://');
            if (idx >= 0) {
                const after = s.slice(idx + 3);
                const sl = after.indexOf('/');
                s = sl >= 0 ? after.slice(sl) : '/';
            }
            return s;
        },

        // 拼接完整 URL: baseUrl + remotePath + currentPath + extraPath
        buildUrl(extraPath: string): string {
            const cfg = minConfig.getWebDAV();
            let remote = (cfg.remotePath || '').replace(/^\/+|\/+$/g, '');
            let cur = (this.currentPath || '').replace(/^\/+|\/+$/g, '');
            let extra = (extraPath || '').replace(/^\/+/, '');
            let path = '';
            if (remote) path += '/' + remote;
            if (cur) path += '/' + cur;
            if (extra) path += '/' + extra;
            return this.baseUrl + (path || '/');
        },

        async listDirectory() {
            if (!this.hasConfig) { showError('请先配置WebDAV'); return; }
            this.isLoading = true;
            showLoading();
            try {
                const url = this.buildUrl('').replace(/\/+$/, '') + '/';
                const cmd = `curl -s -u "${this.username}:${this.password}" -X PROPFIND -H "Depth: 1" "${url}"`;
                const result = await Shell.exec(cmd);
                let items = this.parsePropfind(result);

                // 计算当前请求路径，用于过滤“自身”条目
                const reqPath = this.pathOnly(url).replace(/\/+$/, '');

                items = items.filter(it => {
                    if (!it.name) return false;
                    const itPath = this.pathOnly(it.href).replace(/\/+$/, '');
                    if (itPath === reqPath) return false; // 跳过当前目录自身
                    return true;
                });

                // 排序：目录在前，文件在后，按名称排序
                items.sort((a, b) => {
                    if (a.isDirectory && !b.isDirectory) return -1;
                    if (!a.isDirectory && b.isDirectory) return 1;
                    return a.name.localeCompare(b.name);
                });
                this.itemList = items;
            } catch (e: any) {
                showError('加载目录失败: ' + (e.message || e));
                this.itemList = [];
            } finally {
                this.isLoading = false;
                hideLoading();
            }
        },

        // QuickJS 没有 DOM，使用字符串/正则解析 PROPFIND XML
        // 兼容 D: / d: / 无前缀 等不同命名空间前缀，且对缺失字段健壮
        parsePropfind(xml: string): WebDAVItem[] {
            const items: WebDAVItem[] = [];
            if (!xml) return items;
            // 按 <response> 开始标签切分（兼容任意命名空间前缀）
            const responses = xml.split(/<(?:[a-zA-Z0-9]+:)?response[\s>]/i).slice(1);
            for (const resp of responses) {
                const nameMatch = resp.match(/<(?:[a-zA-Z0-9]+:)?displayname[^>]*>([^<]*)<\//i);
                const hrefMatch = resp.match(/<(?:[a-zA-Z0-9]+:)?href[^>]*>([^<]*)<\//i);
                const sizeMatch = resp.match(/<(?:[a-zA-Z0-9]+:)?getcontentlength[^>]*>([^<]*)<\//i);
                const isCollection = /<(?:[a-zA-Z0-9]+:)?collection\s*\/>/i.test(resp);
                if (!hrefMatch) continue;
                const href = decodeURIComponent(hrefMatch[1]);
                let name = nameMatch ? nameMatch[1] : '';
                if (!name) {
                    const seg = href.replace(/\/+$/, '').split('/').filter(Boolean).pop();
                    name = seg || '';
                }
                items.push({
                    name: name,
                    href: href,
                    isDirectory: isCollection,
                    size: sizeMatch ? (parseInt(sizeMatch[1], 10) || 0) : 0,
                });
            }
            return items;
        },

        openItem(item: WebDAVItem) {
            if (item.isDirectory) {
                this.currentPath = (this.currentPath ? this.currentPath + '/' + item.name : item.name).replace(/^\/+/, '');
                this.listDirectory();
            } else {
                this.selectedItem = item;
                this.showItemMenu = true;
            }
        },

        goUp() {
            const parts = this.currentPath.split('/').filter(Boolean);
            parts.pop();
            this.currentPath = parts.join('/');
            this.listDirectory();
        },

        async downloadFile(item: WebDAVItem) {
            showLoading();
            try {
                const url = this.buildUrl(item.name);
                const localPath = '/userdisk/' + item.name;
                const cmd = `curl -s -u "${this.username}:${this.password}" "${url}" -o "${localPath}"`;
                await Shell.exec(cmd);
                showSuccess('已下载到 ' + localPath);
            } catch (e: any) {
                showError('下载失败: ' + (e.message || e));
            } finally {
                hideLoading();
                this.showItemMenu = false;
            }
        },

        uploadFile() {
            // 跳转到文件管理器选择本地文件
            $falcon.navTo('fileManager', { pickerMode: true, returnTo: 'webdavFiles' });
            const handler = (e: { data: string }) => {
                const localPath = e.data;
                $falcon.off('file_selected', handler);
                this.doUpload(localPath);
            };
            $falcon.on('file_selected', handler);
        },

        async doUpload(localPath: string) {
            if (!localPath) return;
            showLoading();
            try {
                const fileName = localPath.split('/').pop() || 'upload';
                const url = this.buildUrl(fileName);
                const cmd = `curl -s -u "${this.username}:${this.password}" -X PUT --data-binary @"${localPath}" "${url}"`;
                await Shell.exec(cmd);
                showSuccess('上传成功');
                await this.listDirectory();
            } catch (e: any) {
                showError('上传失败: ' + (e.message || e));
            } finally {
                hideLoading();
            }
        },

        async deleteItem(item: WebDAVItem) {
            showLoading();
            try {
                const url = this.buildUrl(item.name);
                const cmd = `curl -s -u "${this.username}:${this.password}" -X DELETE "${url}"`;
                await Shell.exec(cmd);
                showSuccess('已删除');
                this.showItemMenu = false;
                await this.listDirectory();
            } catch (e: any) {
                showError('删除失败: ' + (e.message || e));
            } finally {
                hideLoading();
            }
        },

        formatSize(bytes: number): string {
            if (bytes < 1024) return `${bytes} B`;
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        },

        refresh() { this.listDirectory(); },
    }
});
export default webdavFiles;
