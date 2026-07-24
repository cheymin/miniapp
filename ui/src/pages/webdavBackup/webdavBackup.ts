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
import { minConfig, WebDAVConfig } from '../../utils/minConfig';
import { getIcon } from '../../utils/icons';

export type WebdavBackupOptions = {};

// /userdisk/min/database/ 下需要备份的全部键
const BACKUP_KEYS: string[] = [
    'min/database/webdav',
    'min/database/memos',
    'min/database/background',
    'min/database/voice',
];
const BACKUP_FILE = '/tmp/minapp-backup.json';
const RESTORE_FILE = '/tmp/minapp-restore.json';
const REMOTE_FILENAME = 'backup.json';
const LAST_BACKUP_KEY = 'min/database/lastBackup';

const webdavBackup = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<WebdavBackupOptions>,
            url: '',
            username: '',
            password: '',
            remotePath: '/minapp-backup',
            isBusy: false,
            lastBackupTime: '',
        };
    },

    mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on('backpressed', this.handleBackPress);
        this.loadConfig();
    },

    beforeDestroy() {
        this.$page.$npage.off('backpressed', this.handleBackPress);
    },

    methods: {
        handleBackPress() {
            this.$page.finish();
        },

        icon(name: string): string {
            return getIcon(name);
        },

        // 用单引号包裹字符串并转义内嵌单引号，供 shell 安全使用
        shellQuote(s: string): string {
            return "'" + String(s == null ? '' : s).replace(/'/g, "'\\''") + "'";
        },

        // 拼接远程完整 URL：url + remotePath (+ filename)
        buildRemoteUrl(filename: string): string {
            let base = (this.url || '').trim();
            if (base.endsWith('/')) { base = base.slice(0, -1); }
            let path = (this.remotePath || '').trim();
            if (!path) { path = '/minapp-backup'; }
            if (!path.startsWith('/')) { path = '/' + path; }
            if (path.endsWith('/')) { path = path.slice(0, -1); }
            return filename ? `${base}${path}/${filename}` : `${base}${path}`;
        },

        // 构造 curl 基础认证参数 -u 'user:pass'
        buildAuthArg(): string {
            return `-u ${this.shellQuote(this.username + ':' + this.password)}`;
        },

        formatNow(): string {
            const d = new Date();
            const p = (n: number) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
        },

        async loadConfig() {
            try {
                await minConfig.loadAll();
                const cfg = minConfig.getWebDAV();
                this.url = cfg.url;
                this.username = cfg.username;
                this.password = cfg.password;
                this.remotePath = cfg.remotePath || '/minapp-backup';
            } catch (e) {
                showError(e as string || '加载配置失败');
            }
            try {
                this.lastBackupTime = (await $falcon.storage.get(LAST_BACKUP_KEY)) || '';
            } catch (e) {
                this.lastBackupTime = '';
            }
            this.$forceUpdate();
        },

        async saveConfig() {
            if (!this.url) {
                showError('请先填写服务器 URL');
                return;
            }
            try {
                const cfg: WebDAVConfig = {
                    url: this.url,
                    username: this.username,
                    password: this.password,
                    remotePath: this.remotePath || '/minapp-backup',
                };
                await minConfig.setWebDAV(cfg);
                showSuccess('WebDAV配置已保存');
            } catch (e) {
                showError(e as string || '保存配置失败');
            }
        },

        editUrl() {
            openSoftKeyboard(
                () => this.url,
                (v) => { this.url = v; this.$forceUpdate(); },
                (v) => {
                    if (v && !/^https?:\/\//i.test(v)) { return 'URL 需要以 http 或 https 开头'; }
                }
            );
        },

        editUsername() {
            openSoftKeyboard(
                () => this.username,
                (v) => { this.username = v; this.$forceUpdate(); }
            );
        },

        editPassword() {
            openSoftKeyboard(
                () => this.password,
                (v) => { this.password = v; this.$forceUpdate(); }
            );
        },

        editRemotePath() {
            openSoftKeyboard(
                () => this.remotePath,
                (v) => { this.remotePath = v; this.$forceUpdate(); },
                (v) => {
                    if (v && !v.startsWith('/')) { return '远程路径需要以 / 开头'; }
                }
            );
        },

        async testConnection() {
            if (this.isBusy) { showInfo('操作进行中，请稍候'); return; }
            if (!this.url) { showError('请先填写服务器 URL'); return; }
            this.isBusy = true;
            showLoading();
            try {
                // PROPFIND Depth:0 探测 WebDAV 服务，仅取 HTTP 状态码
                const cmd = `curl -s -o /dev/null -w "%{http_code}" ${this.buildAuthArg()} -X PROPFIND ${this.shellQuote(this.url)} -H "Depth:0"`;
                const out = (await Shell.exec(cmd)).trim();
                const code = parseInt(out, 10);
                if (!isNaN(code) && code > 0 && code < 400) {
                    showSuccess(`连接成功 (HTTP ${code})`);
                } else {
                    showError(`连接失败 (HTTP ${out || '未知'})`);
                }
            } catch (e) {
                showError(`连接测试失败: ${e}`);
            } finally {
                hideLoading();
                this.isBusy = false;
            }
        },

        // 尝试创建远程目录（已存在时 405/409 视为成功）
        async ensureRemoteDir() {
            const cmd = `curl -s -o /dev/null -w "%{http_code}" ${this.buildAuthArg()} -X MKCOL ${this.shellQuote(this.buildRemoteUrl('') + '/')}`;
            const out = (await Shell.exec(cmd)).trim();
            const code = parseInt(out, 10);
            if (isNaN(code) || (code >= 400 && code !== 405 && code !== 409)) {
                throw new Error(`创建远程目录失败 (HTTP ${out || '未知'})`);
            }
        },

        async backupConfig() {
            if (this.isBusy) { showInfo('操作进行中，请稍候'); return; }
            if (!this.url) { showError('请先填写服务器 URL'); return; }
            this.isBusy = true;
            showLoading();
            try {
                // 1. 读取 /userdisk/min/database/ 下的全部配置键
                const data: { [key: string]: string } = {};
                for (const key of BACKUP_KEYS) {
                    try {
                        const val = await $falcon.storage.get(key);
                        data[key] = val || '';
                    } catch (e) {
                        data[key] = '';
                    }
                }
                const stamp = this.formatNow();
                const jsonString = JSON.stringify({
                    version: 1,
                    backupTime: stamp,
                    keys: data,
                });

                // 2. 写入本地临时文件（quoted heredoc 避免 JSON 转义问题）
                const writeCmd = `cat > ${this.shellQuote(BACKUP_FILE)} <<'MINAPP_BACKUP_EOF'\n${jsonString}\nMINAPP_BACKUP_EOF`;
                await Shell.exec(writeCmd);

                // 3. 确保远程目录存在
                await this.ensureRemoteDir();

                // 4. 上传到 WebDAV
                const remoteUrl = this.buildRemoteUrl(REMOTE_FILENAME);
                const putCmd = `curl -s -o /dev/null -w "%{http_code}" ${this.buildAuthArg()} -X PUT --data-binary @${this.shellQuote(BACKUP_FILE)} ${this.shellQuote(remoteUrl)}`;
                const out = (await Shell.exec(putCmd)).trim();
                const code = parseInt(out, 10);
                if (isNaN(code) || code < 200 || code >= 300) {
                    throw new Error(`上传失败 (HTTP ${out || '未知'})`);
                }

                // 5. 记录备份时间
                this.lastBackupTime = stamp;
                await $falcon.storage.set(LAST_BACKUP_KEY, stamp);
                this.$forceUpdate();
                showSuccess(`备份成功 ${stamp}`);
            } catch (e) {
                showError(`备份失败: ${e}`);
            } finally {
                hideLoading();
                this.isBusy = false;
            }
        },

        async restoreConfig() {
            if (this.isBusy) { showInfo('操作进行中，请稍候'); return; }
            if (!this.url) { showError('请先填写服务器 URL'); return; }
            this.isBusy = true;
            showLoading();
            try {
                // 1. 下载远程备份文件
                const remoteUrl = this.buildRemoteUrl(REMOTE_FILENAME);
                const getCmd = `curl -s ${this.buildAuthArg()} ${this.shellQuote(remoteUrl)} -o ${this.shellQuote(RESTORE_FILE)}`;
                await Shell.exec(getCmd);

                // 2. 读取并解析
                const content = (await Shell.exec(`cat ${this.shellQuote(RESTORE_FILE)}`)).trim();
                if (!content) {
                    throw new Error('远程备份文件为空');
                }
                let payload: any;
                try {
                    payload = JSON.parse(content);
                } catch (e) {
                    throw new Error('备份文件解析失败');
                }
                const keys = (payload && payload.keys) ? payload.keys : payload;

                // 3. 写回存储
                let count = 0;
                for (const key of BACKUP_KEYS) {
                    if (keys && Object.prototype.hasOwnProperty.call(keys, key)) {
                        await $falcon.storage.set(key, keys[key] || '');
                        count++;
                    }
                }

                // 4. 用恢复回来的 WebDAV 配置刷新界面
                if (keys && keys['min/database/webdav']) {
                    try {
                        const cfg = JSON.parse(keys['min/database/webdav']);
                        this.url = cfg.url || this.url;
                        this.username = cfg.username || this.username;
                        this.password = cfg.password || this.password;
                        this.remotePath = cfg.remotePath || this.remotePath;
                    } catch (e) {
                        // 解析失败则保留当前界面值
                    }
                }
                this.$forceUpdate();
                showSuccess(`恢复成功，共 ${count} 项`);
            } catch (e) {
                showError(`恢复失败: ${e}`);
            } finally {
                hideLoading();
                this.isBusy = false;
            }
        },
    }
});

export default webdavBackup;
