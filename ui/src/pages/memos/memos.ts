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
            loggedIn: false,
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

        // 账户密码登录，保存 cookie
        async ensureLogin(): Promise<boolean> {
            if (this.loggedIn) return true;
            const url = this.memosUrl.replace(/\/$/, '');
            const payload = JSON.stringify({ username: this.memosUsername, password: this.memosPassword, neverExpire: true });
            const safePayload = payload.replace(/'/g, "'\\''");
            await Shell.exec(`echo -n '${safePayload}' > /tmp/memos_login.json`);
            const cmd = `curl -s -c ${this.cookieFile} -X POST -H "Content-Type: application/json" -d @/tmp/memos_login.json "${url}/api/v1/auth/signin"`;
            const result = await Shell.exec(cmd);
            try {
                const data = JSON.parse(result);
                if (data && (data.id || data.name)) {
                    this.loggedIn = true;
                    return true;
                }
            } catch (e) { /* ignore */ }
            return false;
        },

        async loadMemos() {
            if (!this.hasConfig) { this.showConfig = true; return; }
            this.isLoading = true;
            showLoading();
            try {
                const url = this.memosUrl.replace(/\/$/, '');
                if (!await this.ensureLogin()) {
                    showError('登录失败，请检查账户密码');
                    this.memoList = [];
                    this.showConfig = true;
                    return;
                }
                const cmd = `curl -s -b ${this.cookieFile} "${url}/api/v1/memos?pageSize=100"`;
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
                const url = this.memosUrl.replace(/\/$/, '');
                const payload = JSON.stringify({ content: this.editorContent });
                const safePayload = payload.replace(/'/g, "'\\''");
                await Shell.exec(`echo -n '${safePayload}' > /tmp/memos_payload.json`);
                if (this.editingMemo) {
                    const cmd = `curl -s -b ${this.cookieFile} -X PATCH -H "Content-Type: application/json" -d @/tmp/memos_payload.json "${url}/api/v1/memos/${this.editingMemo.name}"`;
                    await Shell.exec(cmd);
                    showSuccess('已更新');
                } else {
                    const cmd = `curl -s -b ${this.cookieFile} -X POST -H "Content-Type: application/json" -d @/tmp/memos_payload.json "${url}/api/v1/memos"`;
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
                const url = this.memosUrl.replace(/\/$/, '');
                const cmd = `curl -s -b ${this.cookieFile} -X DELETE "${url}/api/v1/memos/${memo.name}"`;
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
