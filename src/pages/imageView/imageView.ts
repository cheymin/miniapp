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
import { list, statPath } from '../../utils/nativeShell';

export type imageViewOptions = {
    path?: string;
};

const IMAGE_PATTERN = /\.(jpe?g|png|webp|bmp|gif)$/i;

const imageView = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<imageViewOptions>,
            path: '',
            images: [] as string[],
            index: 0,
            scanning: false,
            autoPlay: false,
            autoPlayTimer: null as number | null,
        };
    },

    computed: {
        current(): string {
            return this.images[this.index] || '';
        },
        currentName(): string {
            const value = this.current;
            return value ? value.split('/').pop() || value : '';
        },
    },

    mounted() {
        const page = this.$page as any;
        const options = (page.loadOptions || page.options || {}) as imageViewOptions;
        if (options.path) {
            this.path = options.path;
            this.scan();
        }
    },

    unmounted() {
        this.stopAutoPlay();
    },

    methods: {
        editPath() {
            openSystemInput(
                () => this.path,
                (value) => {
                    this.path = value.trim();
                    this.$forceUpdate();
                },
                (value) => {
                    if (!value.trim()) { return '请输入目录或图片路径'; }
                }
            );
        },

        async collectImages(dir: string, depth: number, result: string[]) {
            if (depth < 0 || result.length >= 2000) { return; }
            let entries;
            try {
                entries = await list(dir);
            } catch (e) {
                return;
            }
            for (const entry of entries) {
                if (result.length >= 2000) { return; }
                if (entry.dir) {
                    await this.collectImages(entry.path, depth - 1, result);
                } else if (IMAGE_PATTERN.test(entry.name)) {
                    result.push(entry.path);
                }
            }
        },

        async scan() {
            const path = this.path.trim();
            if (!path) {
                showError('请先输入目录或图片路径');
                return;
            }

            this.stopAutoPlay();
            this.scanning = true;
            this.images = [];
            this.index = 0;
            this.$forceUpdate();

            try {
                const info = await statPath(path);
                if (!info) {
                    showError('路径不存在或无法读取');
                    return;
                }

                let files: string[] = [];
                if (info.dir) {
                    await this.collectImages(path, 3, files);
                } else if (IMAGE_PATTERN.test(info.name)) {
                    files = [path];
                } else {
                    showError('该文件不是图片');
                    return;
                }

                files.sort();
                if (!files.length) {
                    showError('该目录下没有找到图片');
                    return;
                }

                this.images = files;
                this.index = 0;
                showSuccess(`找到 ${files.length} 张图片`);
            } catch (e) {
                showError(e as string || '扫描失败');
            } finally {
                this.scanning = false;
                this.$forceUpdate();
            }
        },

        prev() {
            if (this.index > 0) {
                this.index -= 1;
                this.$forceUpdate();
            }
        },

        next() {
            if (this.index < this.images.length - 1) {
                this.index += 1;
                this.$forceUpdate();
            }
        },

        toggleAutoPlay() {
            if (this.autoPlay) {
                this.stopAutoPlay();
                return;
            }
            if (this.images.length < 2) { return; }
            this.autoPlay = true;
            this.autoPlayTimer = setInterval(() => {
                this.index = (this.index + 1) % this.images.length;
                this.$forceUpdate();
            }, 2500) as unknown as number;
            this.$forceUpdate();
        },

        stopAutoPlay() {
            if (this.autoPlayTimer !== null) {
                clearInterval(this.autoPlayTimer);
                this.autoPlayTimer = null;
            }
            this.autoPlay = false;
        },

        goBack() {
            this.stopAutoPlay();
            this.$page.finish();
        },
    },
});

export default imageView;
