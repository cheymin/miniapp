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
import { openSystemInput } from '../../utils/systemInput';

export type imageViewOptions = {};

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
                const escaped = path.replace(/'/g, `'\\''`);
                const output = await Shell.exec(
                    `if [ -d '${escaped}' ]; then echo '__DIR__'; find '${escaped}' -maxdepth 3 -type f 2>/dev/null; ` +
                    `elif [ -f '${escaped}' ]; then echo '__FILE__'; echo '${escaped}'; ` +
                    `else echo '__MISSING__'; fi`
                );
                const lines = output.replace(/\r/g, '').split('\n')
                    .map((line) => line.trim())
                    .filter((line) => line.length > 0);

                if (!lines.length || lines[0] === '__MISSING__') {
                    showError('路径不存在或无法读取');
                    return;
                }

                let files: string[] = [];
                if (lines[0] === '__DIR__') {
                    files = lines.slice(1);
                } else if (lines[0] === '__FILE__') {
                    files = [lines[1]];
                }

                files = files.filter((file) => IMAGE_PATTERN.test(file)).sort();
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
