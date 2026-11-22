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
import { showError, showSuccess, showWarning } from '../../components/ToastMessage';
import { openSystemInput } from '../../utils/systemInput';
import { normalizeImageUrl } from '../../utils/imageUtils';
import type { InstalledApp, RegistrySnapshot } from '../../utils/appRegistry';
import {
    installAmrPackage,
    launchInstalledApp,
    loadInstalledApps,
    setDesktopVisible,
    uninstallInstalledApp,
} from '../../utils/appRegistry';

export type appsManageOptions = {};

const ICON_THEMES = ['am-icon-0', 'am-icon-1', 'am-icon-2', 'am-icon-3', 'am-icon-4', 'am-icon-5'];

const appsManage = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<appsManageOptions>,
            apps: [] as InstalledApp[],
            snapshot: null as RegistrySnapshot | null,
            registryPath: '',
            loading: false,
            showSystem: false,
            busy: false,
            busyText: '',
            confirmApp: null as InstalledApp | null,
        };
    },

    computed: {
        visibleApps(): InstalledApp[] {
            if (this.showSystem) { return this.apps; }
            return this.apps.filter((app) => !app.system);
        },

        thirdCount(): number {
            return this.apps.filter((app) => !app.system).length;
        },

        systemCount(): number {
            return this.apps.filter((app) => app.system).length;
        },

        summary(): string {
            if (this.loading) { return '正在读取应用…'; }
            return `${this.apps.length} 个应用 · 三方 ${this.thirdCount} · 系统 ${this.systemCount}`;
        },
    },

    mounted() {
        this.load();
    },

    methods: {
        goBack() {
            this.$page.finish();
        },

        async load(quiet = false) {
            this.loading = true;
            this.$forceUpdate();
            try {
                const snapshot = await loadInstalledApps();
                this.snapshot = snapshot;
                this.registryPath = snapshot.path;
                this.apps = snapshot.apps;
                if (!quiet && !snapshot.apps.length) {
                    showWarning('没有读到已安装应用');
                }
            } catch (e) {
                showError(String(e || '读取应用列表失败'));
            } finally {
                this.loading = false;
                this.$forceUpdate();
            }
        },

        toggleFilter() {
            this.showSystem = !this.showSystem;
            this.$forceUpdate();
        },

        iconUrl(app: InstalledApp): string {
            return app.icon ? normalizeImageUrl(app.icon) : '';
        },

        glyph(app: InstalledApp): string {
            const name = (app.name || app.appid || '').trim();
            return name ? name.charAt(0).toUpperCase() : '应';
        },

        iconTheme(app: InstalledApp): string {
            const seed = app.appid || app.name || '';
            let sum = 0;
            for (let i = 0; i < seed.length; i++) {
                sum += seed.charCodeAt(i);
            }
            return ICON_THEMES[sum % ICON_THEMES.length];
        },

        versionText(app: InstalledApp): string {
            return app.version && app.version !== '-' ? `v${app.version}` : '版本未知';
        },

        async launch(app: InstalledApp) {
            if (app.self) {
                showSuccess('当前正在运行本应用');
                return;
            }
            try {
                await launchInstalledApp(app.appid);
                showSuccess(`已启动：${app.name}`);
            } catch (e) {
                showError(String(e || '启动失败'));
            }
        },

        canToggleDesktop(app: InstalledApp): boolean {
            if (!this.registryPath) { return false; }
            if (app.desktop && app.protected) { return false; }
            return true;
        },

        async toggleDesktop(app: InstalledApp) {
            if (!this.snapshot || !this.registryPath) {
                showError('未找到可写的 packages.json');
                return;
            }
            const target = !app.desktop;
            if (!target && app.protected) {
                showError('受保护的应用不能隐藏');
                return;
            }
            try {
                await setDesktopVisible(this.snapshot, app.appid, target);
                app.desktop = target;
                this.$forceUpdate();
                showSuccess(`「${app.name}」已${target ? '显示到' : '从'}桌面${target ? '' : '隐藏'}，重启笔后生效`);
            } catch (e) {
                showError(String(e || '修改桌面显示失败'));
            }
        },

        askUninstall(app: InstalledApp) {
            if (app.self) {
                showError('当前应用不可卸载');
                return;
            }
            if (app.protected) {
                showError('受保护的应用不可卸载');
                return;
            }
            this.confirmApp = app;
            this.$forceUpdate();
        },

        cancelUninstall() {
            this.confirmApp = null;
            this.$forceUpdate();
        },

        async confirmUninstall() {
            const app = this.confirmApp;
            if (!app) { return; }
            this.confirmApp = null;
            this.busy = true;
            this.busyText = `正在卸载 ${app.name}…`;
            this.$forceUpdate();

            let output = '';
            try {
                output = await uninstallInstalledApp(app.appid, this.snapshot);
            } catch (e) {
                this.busy = false;
                this.$forceUpdate();
                showError(String(e || '卸载失败'));
                return;
            }

            await this.load(true);
            this.busy = false;
            this.$forceUpdate();

            const stillThere = this.apps.some((item) => item.appid === app.appid);
            if (stillThere) {
                showWarning('卸载命令已执行，但注册表中仍有该应用');
            } else {
                const text = String(output || '').replace(/\s+/g, ' ').trim();
                showSuccess(text && text.length <= 30 ? text : `已卸载：${app.name}`);
            }
        },

        installPackage() {
            if (this.busy) { return; }
            openSystemInput(
                () => '',
                async (value) => {
                    const source = value.trim();
                    if (!source) { return; }
                    this.busy = true;
                    this.busyText = '正在安装…';
                    this.$forceUpdate();
                    try {
                        await installAmrPackage(source);
                        await this.load(true);
                        showSuccess('安装完成');
                    } catch (e) {
                        showError(String(e || '安装失败'));
                    } finally {
                        this.busy = false;
                        this.$forceUpdate();
                    }
                },
                (value) => {
                    if (!value.trim()) { return '请输入 .amr 路径或下载链接'; }
                }
            );
        },
    },
});

export default appsManage;
