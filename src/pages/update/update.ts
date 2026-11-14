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
import { showError, showInfo, showSuccess } from '../../components/ToastMessage';
import { hideLoading, showLoading } from '../../components/Loading';

export type updateOptions = {};

const GITHUB_OWNER = 'cheymin';
const GITHUB_REPO = 'miniapp';
const DEVICE_MODEL = 'a6p';
// 发布时由 CI 用 package.json 的 version 自动替换
const CURRENT_VERSION = '1.6.0';

const update = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<updateOptions>,
            shellReady: false,
            status: 'idle' as 'idle' | 'checking' | 'available' | 'latest' | 'downloading' | 'installing' | 'error',
            currentVersion: CURRENT_VERSION,
            latestVersion: '',
            downloadUrl: '',
            notes: '',
            message: '',
        };
    },

    computed: {
        busy(): boolean {
            return ['checking', 'downloading', 'installing'].includes(this.status);
        },
    },

    async mounted() {
        try {
            await Shell.initialize();
            this.shellReady = true;
        } catch (e) {
            this.status = 'error';
            this.message = `Shell 初始化失败: ${e}`;
        }
    },

    methods: {
        compareVersion(a: string, b: string): number {
            const pa = a.split('.').map((n) => parseInt(n) || 0);
            const pb = b.split('.').map((n) => parseInt(n) || 0);
            const len = Math.max(pa.length, pb.length);
            for (let i = 0; i < len; i++) {
                const x = pa[i] || 0;
                const y = pb[i] || 0;
                if (x > y) { return 1; }
                if (x < y) { return -1; }
            }
            return 0;
        },

        async checkUpdate() {
            if (!this.shellReady || this.busy) { return; }
            this.status = 'checking';
            this.message = '正在检查更新...';
            this.latestVersion = '';
            this.downloadUrl = '';
            this.notes = '';

            try {
                const api = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
                const raw = await Shell.exec(`curl -k -s --max-time 30 -H "Accept: application/vnd.github+json" "${api}"`);
                const data = JSON.parse(raw);
                if (!data || !data.tag_name) {
                    throw new Error('无法获取版本信息（可能触发了 GitHub 限流）');
                }

                this.latestVersion = String(data.tag_name).replace(/^v/i, '');
                this.notes = data.body || '';

                const assets = data.assets || [];
                const asset = assets.find((item: any) => /^miniapp_a6p.*\.amr$/i.test(item.name));
                if (!asset) {
                    throw new Error(`最新版本中没有 ${DEVICE_MODEL} 安装包`);
                }
                this.downloadUrl = asset.browser_download_url;

                if (this.compareVersion(this.latestVersion, this.currentVersion) > 0) {
                    this.status = 'available';
                    this.message = `发现新版本 v${this.latestVersion}`;
                } else {
                    this.status = 'latest';
                    this.message = `已是最新版本 v${this.currentVersion}`;
                    showInfo(this.message);
                }
            } catch (e) {
                this.status = 'error';
                this.message = `检查更新失败: ${e}`;
                showError(this.message);
            }
        },

        async installUpdate() {
            if (this.status !== 'available' || !this.downloadUrl || this.busy) { return; }

            const savePath = `/userdisk/miniapp_${DEVICE_MODEL}_v${this.latestVersion}_${Date.now()}.amr`;
            this.status = 'downloading';
            this.message = '正在下载更新...';

            try {
                const downloadCmd = (url: string) =>
                    `curl -k -L --max-time 300 "${url}" -o "${savePath}" && wc -c < "${savePath}"`;

                let output = await Shell.exec(downloadCmd(this.downloadUrl));
                let size = parseInt(output) || 0;
                if (size <= 0) {
                    // GitHub 直连失败时走镜像重试
                    this.message = '直连失败，改用镜像下载...';
                    output = await Shell.exec(downloadCmd(`https://ghproxy.net/${this.downloadUrl}`));
                    size = parseInt(output) || 0;
                }
                if (size <= 0) {
                    throw new Error('下载失败，请检查网络');
                }

                this.status = 'installing';
                this.message = `正在安装 v${this.latestVersion}...`;
                showLoading();
                await Shell.exec(`miniapp_cli install "${savePath}"`);
                await Shell.exec(`rm -f "${savePath}" 2>/dev/null || true`);

                this.status = 'latest';
                this.currentVersion = this.latestVersion;
                this.message = '更新完成，应用可能自动重启';
                showSuccess(this.message);
            } catch (e) {
                this.status = 'error';
                this.message = `更新失败: ${e}`;
                showError(this.message);
                showInfo(`可手动下载: ${this.downloadUrl}`);
            } finally {
                hideLoading();
            }
        },

        goBack() {
            this.$page.finish();
        },
    },
});

export default update;
