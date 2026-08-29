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
import { minConfig } from '../../utils/minConfig';
import { getIcon } from '../../utils/icons';

export type MemosOptions = {};

interface MemoItem {
    id: string;
    name: string;
    content: string;
    createTime: string;
    updateTime: string;
}

const memos = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<MemosOptions>,
            memosUrl: '',
            memosUsername: '',
            memosPassword: '',
            memoList: [] as MemoItem[],
            isLoading: false,
            showConfig: false,
            showEditor: false,
            editingMemo: null as MemoItem | null,
            editorContent: '',
            cookieFile: '/tmp/memos_cookie.txt',
            tokenFile: '/tmp/memos_token.txt',
            accessToken: '' as string,
            loggedIn: false,
            lastAuthError: '' as string,
        };
    },

    async mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on('backpressed', this.handleBackPress);
        try { await Shell.initialize(); } catch (e) { /* ignore */ }
        await this.loadConfig();
        if (this.memosUrl && this.memosUsername) {
            await this.loadMemos();
        } else {
            this.showConfig = true;
        }
    },

    beforeDestroy() {
        this.$page.$npage.off('backpressed', this.handleBackPress);
    },

    computed: {
        hasConfig(): boolean { return !!this.memosUrl && !!this.memosUsername; },
    },

    methods: {
        handleBackPress() {
            if (this.showEditor) { this.showEditor = false; return; }
            if (this.showConfig) { this.showConfig = false; return; }
            this.$page.finish();
        },

        icon(name: string): string { return getIcon(name); },

        async loadConfig() {
            await minConfig.loadAll();
            const cfg = minConfig.getMemos();
            this.memosUrl = cfg.url;
            this.memosUsername = cfg.username;
            this.memosPassword = cfg.password;
        },

        async saveConfig() {
            await minConfig.setMemos({ url: this.memosUrl, username: this.memosUsername, password: this.memosPassword });
            this.loggedIn = false;
            this.accessToken = '';
            showSuccess('配置已保存');
            this.showConfig = false;
            await this.loadMemos();
        },

        editUrl() {
            openSoftKeyboard(
                () => this.memosUrl,
                (v) => { this.memosUrl = v; this.$forceUpdate(); }
            );
        },

        editUsername() {
            openSoftKeyboard(
                () => this.memosUsername,
                (v) => { this.memosUsername = v; this.$forceUpdate(); }
            );
        },

        editPassword() {
            openSoftKeyboard(
                () => this.memosPassword,
                (v) => { this.memosPassword = v; this.$forceUpdate(); }
            );
        },

        // 规范化 Memos 服务地址：去掉末尾 / 与可能误填的 /api/v1
        apiBase(): string {
            let url = this.memosUrl.replace(/\s+/g, '').replace(/\/+$/, '');
            url = url.replace(/\/api\/v\d*$/, '').replace(/\/api$/, '').replace(/\/+$/, '');
            return url;
        },

        // 账号密码登录：兼容 memos 经典版(v0.26/v0.30 返回 User + 会话cookie)与新版(v1 返回 {user, accessToken})
        async ensureLogin(): Promise<boolean> {
            if (this.loggedIn) return true;
            this.lastAuthError = '';
            const url = this.apiBase();

            // 新版 memos (passwordCredentials -> accessToken)，先尝试
            {
                const payload = JSON.stringify({ passwordCredentials: { username: this.memosUsername, password: this.memosPassword } });
                const safe = payload.replace(/'/g, "'\\''");
                await Shell.exec(`echo -n '${safe}' > /tmp/memos_login30.json`);
                const r = await this.fetchAuth('/tmp/memos_login30.json', url);
                const tok = this.extractAccessToken(r.body);
                if (tok) {
                    this.accessToken = tok;
                    await Shell.exec(`echo -n '${tok}' > ${this.tokenFile}`);
                    this.loggedIn = true;
                    return true;
                }
                if (this.isAccountResponse(r.body)) { this.loggedIn = true; return true; }
                if (r.http === '401') { this.lastAuthError = this.serverError(r.body) || '密码错误(HTTP 401) 或未启用密码登录'; return false; }
                if (r.curlErr) { this.lastAuthError = '连接失败: ' + r.curlErr; return false; }
                if (r.http && r.http !== '200') { this.lastAuthError = '服务返回 HTTP ' + r.http; return false; }
                // 无法以此格式识别，继续尝试经典版
            }

            // 经典版 memos (username/password + 会话 cookie)
            {
                const payload = JSON.stringify({ username: this.memosUsername, password: this.memosPassword, neverExpire: true });
                const safe = payload.replace(/'/g, "'\\''");
                await Shell.exec(`echo -n '${safe}' > /tmp/memos_login.json`);
                const r = await this.fetchAuth('/tmp/memos_login.json', url);
                const tok = this.extractAccessToken(r.body);
                if (tok) {
                    this.accessToken = tok;
                    await Shell.exec(`echo -n '${tok}' > ${this.tokenFile}`);
                    this.loggedIn = true;
                    return true;
                }
                if (this.isAccountResponse(r.body)) { this.loggedIn = true; return true; }
                if (r.http === '401') { this.lastAuthError = this.serverError(r.body) || '密码错误(HTTP 401) 或未启用密码登录'; return false; }
                if (r.curlErr) { this.lastAuthError = '连接失败: ' + r.curlErr; return false; }
                if (r.http && r.http !== '200') { this.lastAuthError = '服务返回 HTTP ' + r.http; return false; }
                this.lastAuthError = '未知响应: ' + r.body.slice(0, 120);
            }

            return false;
        },

        // 发送一次登录请求，返回响应体/HTTP 状态码/curl 错误，便于区分“密码错误”和“网络失败”
        async fetchAuth(payloadPath: string, url: string): Promise<{ body: string; http: string; curlErr: string }> {
            const cmd = `curl -sS -o /tmp/memos_auth_resp -c ${this.cookieFile} -w '%{http_code}' -X POST -H "Content-Type: application/json" -d @${payloadPath} "${url}/api/v1/auth/signin" 2>/tmp/memos_auth_err`;
            const http = (await Shell.exec(cmd)).trim();
            const body = (await Shell.exec('cat /tmp/memos_auth_resp 2>/dev/null')).trim();
            const curlErr = (await Shell.exec('cat /tmp/memos_auth_err 2>/dev/null')).trim();
            return { body, http, curlErr };
        },

        // 从登录响应中解析服务器给出的可读错误信息
        serverError(body: string): string {
            try {
                const d = JSON.parse(body);
                if (d && typeof d.message === 'string' && d.message) return d.message;
            } catch (e) { /* ignore */ }
            return '';
        },

        // 从 signin 响应中提取 accessToken (新版返回 {user, accessToken})
        extractAccessToken(body: string): string {
            try {
                const data = JSON.parse(body);
                if (data && typeof data.accessToken === 'string' && data.accessToken) return data.accessToken;
            } catch (e) { /* ignore */ }
            return '';
        },

        // 经典版返回 User 对象(json 内有 id/name/username 之一)
        isAccountResponse(body: string): boolean {
            try {
                const data = JSON.parse(body);
                if (data && (data.id || data.name || data.username)) return true;
            } catch (e) { /* ignore */ }
            return false;
        },

        // 构造鉴权正文：优先 Bearer token，其次会话 cookie
        authFlags(): string {
            let flags = `-b ${this.cookieFile}`;
            if (this.accessToken) {
                flags += ` -H "Authorization: Bearer ${this.accessToken}"`;
            }
            return flags;
        },

        async loadMemos() {
            if (!this.hasConfig) { this.showConfig = true; return; }
            this.isLoading = true;
            showLoading();
            try {
                const url = this.apiBase();
                if (!await this.ensureLogin()) {
                    showError('登录失败：' + (this.lastAuthError || '请检查账户密码'));
                    this.memoList = [];
                    this.showConfig = true;
                    return;
                }
                const cmd = `curl -s ${this.authFlags()} "${url}/api/v1/memos?pageSize=100"`;
                const result = await Shell.exec(cmd);
                const data = JSON.parse(result);
                const list = data.memos || [];
                this.memoList = list.map((m: any) => ({
                    id: m.name ? String(m.name).split('/').pop() : '',
                    name: m.name || '',
                    content: m.content || '',
                    createTime: m.createTime || '',
                    updateTime: m.updateTime || '',
                }));
            } catch (e: any) {
                showError('加载失败: ' + (e.message || e));
                this.memoList = [];
            } finally {
                this.isLoading = false;
                hideLoading();
            }
        },

        openNewMemo() {
            this.editingMemo = null;
            this.editorContent = '';
            this.showEditor = true;
            openSoftKeyboard(
                () => this.editorContent,
                (v) => { this.editorContent = v; this.$forceUpdate(); }
            );
        },

        openEditMemo(memo: MemoItem) {
            this.editingMemo = memo;
            this.editorContent = memo.content;
            this.showEditor = true;
            openSoftKeyboard(
                () => this.editorContent,
                (v) => { this.editorContent = v; this.$forceUpdate(); }
            );
        },

        async saveMemo() {
            if (!this.editorContent.trim()) { showInfo('内容不能为空'); return; }
            showLoading();
            try {
                const url = this.apiBase();
                const payload = JSON.stringify({ content: this.editorContent });
                const safePayload = payload.replace(/'/g, "'\\''");
                await Shell.exec(`echo -n '${safePayload}' > /tmp/memos_payload.json`);
                if (this.editingMemo) {
                    const cmd = `curl -s ${this.authFlags()} -X PATCH -H "Content-Type: application/json" -d @/tmp/memos_payload.json "${url}/api/v1/memos/${this.editingMemo.name}"`;
                    await Shell.exec(cmd);
                    showSuccess('已更新');
                } else {
                    const cmd = `curl -s ${this.authFlags()} -X POST -H "Content-Type: application/json" -d @/tmp/memos_payload.json "${url}/api/v1/memos"`;
                    await Shell.exec(cmd);
                    showSuccess('已创建');
                }
                this.showEditor = false;
                await this.loadMemos();
            } catch (e: any) {
                showError('保存失败: ' + (e.message || e));
            } finally {
                hideLoading();
            }
        },

        async deleteMemo(memo: MemoItem) {
            showLoading();
            try {
                const url = this.apiBase();
                const cmd = `curl -s ${this.authFlags()} -X DELETE "${url}/api/v1/memos/${memo.name}"`;
                await Shell.exec(cmd);
                showSuccess('已删除');
                await this.loadMemos();
            } catch (e: any) {
                showError('删除失败: ' + (e.message || e));
            } finally {
                hideLoading();
            }
        },

        formatTime(timeStr: string): string {
            if (!timeStr) return '';
            try {
                return new Date(timeStr).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
            } catch (e) { return timeStr; }
        },

        openConfig() { this.showConfig = true; },
        closeConfig() { this.showConfig = false; },
        closeEditor() { this.showEditor = false; },
    }
});

export default memos;
