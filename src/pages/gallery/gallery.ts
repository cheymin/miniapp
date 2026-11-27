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
import { list } from '../../utils/nativeShell';
import { normalizeImageUrl } from '../../utils/imageUtils';

export type galleryOptions = {
    path?: string;
};

const IMAGE_PATTERN = /\.(jpe?g|png|webp|bmp|gif)$/i;
const MAX_IMAGES = 240;

const gallery = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<galleryOptions>,
            root: '/userdisk',
            images: [] as string[],
            loading: false,
            cellW: 176,
            cellH: 96,
        };
    },

    computed: {
        rows() {
            const result: { path: string; index: number }[][] = [];
            const items = this.images.map((path, index) => ({ path, index }));
            for (let i = 0; i < items.length; i += 3) {
                result.push(items.slice(i, i + 3));
            }
            return result;
        },
    },

    mounted() {
        const page = this.$page as any;
        const options = (page.loadOptions || page.options || {}) as galleryOptions;
        this.root = (options.path || '/userdisk').trim() || '/userdisk';
        this.scan();
    },

    methods: {
        editPath() {
            openSystemInput(
                () => this.root,
                (value) => {
                    this.root = value.trim() || '/userdisk';
                    this.scan();
                },
                (value) => {
                    if (!value.trim()) { return '请输入目录路径'; }
                }
            );
        },

        async collect(dir: string, depth: number, result: string[]) {
            if (depth < 0 || result.length >= MAX_IMAGES) { return; }
            let entries;
            try {
                entries = await list(dir);
            } catch {
                return;
            }
            for (const entry of entries) {
                if (result.length >= MAX_IMAGES) { return; }
                if (entry.dir) {
                    if (entry.name.charAt(0) === '.') { continue; }
                    await this.collect(entry.path, depth - 1, result);
                } else if (IMAGE_PATTERN.test(entry.name)) {
                    result.push(entry.path);
                }
            }
        },

        async scan() {
            const root = this.root.trim();
            if (!root) { return; }
            this.loading = true;
            this.images = [];
            this.$forceUpdate();

            try {
                const result: string[] = [];
                await this.collect(root, 2, result);
                result.sort();
                this.images = result.map((path) => normalizeImageUrl(path));
                if (!result.length) {
                    showError('该目录下没有图片');
                }
            } catch (e) {
                showError(e as string || '扫描失败');
            } finally {
                this.loading = false;
                this.$forceUpdate();
            }
        },

        shortName(path: string): string {
            const normalized = path.replace('file://', '');
            const parts = normalized.split('/');
            return parts[parts.length - 1] || normalized;
        },

        openImage(index: number) {
            const path = this.images[index];
            if (!path) { return; }
            $falcon.navTo('imageView', { path: path.replace('file://', ''), index });
        },

        goBack() {
            this.$page.finish();
        },
    },
});

export default gallery;
