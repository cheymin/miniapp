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
import { showError, showSuccess } from '../../components/ToastMessage';
import { openSystemInput } from '../../utils/systemInput';
import type { FileEntry } from '../../utils/nativeShell';
import {
    baseName,
    copy,
    exists,
    joinPath,
    list,
    mkdir,
    parentPath,
    readText,
    remove,
    rename,
} from '../../utils/nativeShell';

export type fileManagerOptions = {
    path?: string;
};

const IMAGE_PATTERN = /\.(jpe?g|png|webp|bmp|gif|heic|avif)$/i;
const TEXT_PATTERN = /\.(txt|md|json|log|ini|conf|cfg|xml|html|css|js|ts|vue|yaml|yml|sh|csv)$/i;
const VIDEO_PATTERN = /\.(mp4|mkv|mov|avi|webm|flv|ts|m3u8)$/i;

const fileManager = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<fileManagerOptions>,
            currentPath: '/userdisk',
            entries: [] as FileEntry[],
            selected: null as FileEntry | null,
            loading: false,
            clipPath: '',
            previewVisible: false,
            previewTitle: '',
            previewText: '',
            deleteVisible: false,
        };
    },

    mounted() {
        const page = this.$page as any;
        const options = (page.loadOptions || page.options || {}) as fileManagerOptions;
        this.currentPath = (options.path || '/userdisk').trim() || '/userdisk';
        this.load(this.currentPath);
    },

    methods: {
        rowClass(item: FileEntry): string {
            return this.selected && this.selected.path === item.path ? ' fm-row-active' : '';
        },

        formatSize(size: number): string {
            if (!size) { return '0 B'; }
            if (size < 1024) { return `${size} B`; }
            if (size < 1024 * 1024) { return `${(size / 1024).toFixed(1)} K`; }
            if (size < 1024 * 1024 * 1024) { return `${(size / 1024 / 1024).toFixed(1)} M`; }
            return `${(size / 1024 / 1024 / 1024).toFixed(1)} G`;
        },

        async load(path: string) {
            this.loading = true;
            this.selected = null;
            this.$forceUpdate();
            try {
                this.entries = await list(path);
                this.currentPath = path;
            } catch (e) {
                showError(String(e || '目录读取失败'));
            } finally {
                this.loading = false;
                this.$forceUpdate();
            }
        },

        select(item: FileEntry) {
            this.selected = item;
            this.$forceUpdate();
        },

        editPath() {
            openSystemInput(
                () => this.currentPath,
                (value) => {
                    const target = value.trim();
                    if (target) { this.load(target); }
                },
                (value) => {
                    if (!value.trim()) { return '请输入路径'; }
                }
            );
        },

        goUp() {
            this.load(parentPath(this.currentPath));
        },

        goBack() {
            this.$page.finish();
        },

        requireSelected(): FileEntry | null {
            if (!this.selected) {
                showError('请先选择一个文件');
                return null;
            }
            return this.selected;
        },

        async openSelected() {
            const item = this.requireSelected();
            if (!item) { return; }

            if (item.dir) {
                this.load(item.path);
                return;
            }
            if (IMAGE_PATTERN.test(item.name)) {
                $falcon.navTo('imageView', { path: item.path });
                return;
            }
            if (TEXT_PATTERN.test(item.name)) {
                try {
                    this.previewText = await readText(item.path);
                    this.previewTitle = item.name;
                    this.previewVisible = true;
                    this.$forceUpdate();
                } catch (e) {
                    showError(String(e || '文件读取失败'));
                }
                return;
            }
            if (VIDEO_PATTERN.test(item.name)) {
                showError('视频播放器正在接入解码器，暂不支持直接打开');
                return;
            }

            showSuccess(`${item.name}  ${this.formatSize(item.size)}`);
        },

        createFolder() {
            openSystemInput(
                () => '',
                async (value) => {
                    const name = value.trim();
                    if (!name) { return; }
                    try {
                        await mkdir(joinPath(this.currentPath, name));
                        showSuccess('已创建');
                        this.load(this.currentPath);
                    } catch (e) {
                        showError(String(e || '创建失败'));
                    }
                },
                (value) => {
                    if (!value.trim()) { return '请输入目录名'; }
                    if (value.includes('/')) { return '目录名不能包含 /'; }
                }
            );
        },

        renameSelected() {
            const item = this.requireSelected();
            if (!item) { return; }
            openSystemInput(
                () => item.name,
                async (value) => {
                    const name = value.trim();
                    if (!name || name === item.name) { return; }
                    try {
                        await rename(item.path, joinPath(this.currentPath, name));
                        showSuccess('已重命名');
                        this.load(this.currentPath);
                    } catch (e) {
                        showError(String(e || '重命名失败'));
                    }
                },
                (value) => {
                    if (!value.trim()) { return '请输入新名称'; }
                    if (value.includes('/')) { return '名称不能包含 /'; }
                }
            );
        },

        copySelected() {
            const item = this.requireSelected();
            if (!item) { return; }
            this.clipPath = item.path;
            showSuccess(`已复制：${item.name}`);
        },

        async paste() {
            if (!this.clipPath) {
                showError('剪贴板为空');
                return;
            }
            const name = baseName(this.clipPath);
            let target = joinPath(this.currentPath, name);
            let index = 1;
            while (await exists(target)) {
                target = joinPath(this.currentPath, `${name}_copy${index}`);
                index += 1;
            }
            try {
                await copy(this.clipPath, target);
                showSuccess('已粘贴');
                this.load(this.currentPath);
            } catch (e) {
                showError(String(e || '粘贴失败'));
            }
        },

        askDelete() {
            if (!this.requireSelected()) { return; }
            this.deleteVisible = true;
        },

        async confirmDelete() {
            const item = this.selected;
            this.deleteVisible = false;
            if (!item) { return; }
            try {
                await remove(item.path);
                showSuccess('已删除');
                this.load(this.currentPath);
            } catch (e) {
                showError(String(e || '删除失败'));
            }
        },
    },
});

export default fileManager;
