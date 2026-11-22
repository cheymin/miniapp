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
import { showError } from '../../components/ToastMessage';
import { list, statPath, parentPath, baseName } from '../../utils/nativeShell';
import { normalizeImageUrl } from '../../utils/imageUtils';

export type imageViewOptions = {
    path?: string;
    index?: number;
};

const IMAGE_PATTERN = /\.(jpe?g|png|webp|bmp|gif)$/i;
const STAGE_WIDTH = 518;
const STAGE_HEIGHT = 168;
const MAX_SCALE = 4;
const MIN_SCALE = 1;
const SCALE_STEP = 0.5;

const imageView = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<imageViewOptions>,
            path: '',
            images: [] as string[],
            index: 0,
            scanning: false,

            scale: 1,
            offsetX: 0,
            offsetY: 0,

            dragging: false,
            dragStartX: 0,
            dragStartY: 0,
            dragOriginX: 0,
            dragOriginY: 0,
        };
    },

    computed: {
        current(): string {
            return this.images[this.index] || '';
        },
        currentUrl(): string {
            return this.current ? normalizeImageUrl(this.current) : '';
        },
        currentName(): string {
            return this.current ? baseName(this.current) : '';
        },
        zoomPercent(): number {
            return Math.round(this.scale * 100);
        },
        boxWidth(): number {
            return Math.round(STAGE_WIDTH * this.scale);
        },
        boxHeight(): number {
            return Math.round(STAGE_HEIGHT * this.scale);
        },
        imageStyle(): any {
            const baseX = -(this.boxWidth - STAGE_WIDTH) / 2;
            const baseY = -(this.boxHeight - STAGE_HEIGHT) / 2;
            return {
                left: `${Math.round(baseX + this.offsetX)}px`,
                top: `${Math.round(baseY + this.offsetY)}px`,
            };
        },
    },

    mounted() {
        const page = this.$page as any;
        const options = (page.loadOptions || page.options || {}) as imageViewOptions;
        this.path = (options.path || '/userdisk').trim() || '/userdisk';
        this.scan(options.index || 0);
    },

    methods: {
        maxOffsetX(): number {
            return Math.max(0, (this.boxWidth - STAGE_WIDTH) / 2);
        },
        maxOffsetY(): number {
            return Math.max(0, (this.boxHeight - STAGE_HEIGHT) / 2);
        },

        resetView() {
            this.scale = 1;
            this.offsetX = 0;
            this.offsetY = 0;
        },

        async collectImages(dir: string, depth: number, result: string[]) {
            if (depth < 0 || result.length >= 2000) { return; }
            let entries;
            try {
                entries = await list(dir);
            } catch {
                return;
            }
            for (const entry of entries) {
                if (result.length >= 2000) { return; }
                if (entry.dir) {
                    if (entry.name.charAt(0) === '.') { continue; }
                    await this.collectImages(entry.path, depth - 1, result);
                } else if (IMAGE_PATTERN.test(entry.name)) {
                    result.push(entry.path);
                }
            }
        },

        async scan(initialIndex: number) {
            const path = this.path.trim();
            if (!path) {
                showError('请先选择图片');
                return;
            }

            this.scanning = true;
            this.images = [];
            this.index = 0;
            this.resetView();
            this.$forceUpdate();

            try {
                const info = await statPath(path);
                if (!info) {
                    showError('路径不存在或无法读取');
                    return;
                }

                let files: string[] = [];
                if (info.dir) {
                    await this.collectImages(path, 2, files);
                    files.sort();
                } else if (IMAGE_PATTERN.test(info.name)) {
                    this.collectImages(parentPath(path), 0, files).then(() => {
                        files.sort();
                        const found = files.indexOf(path);
                        this.images = files;
                        this.index = found >= 0 ? found : 0;
                        this.resetView();
                        this.$forceUpdate();
                    });
                    return;
                } else {
                    showError('该文件不是图片');
                    return;
                }

                if (!files.length) {
                    showError('该目录下没有找到图片');
                    return;
                }

                this.images = files;
                this.index = Math.min(Math.max(initialIndex, 0), files.length - 1);
                this.resetView();
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
                this.resetView();
                this.$forceUpdate();
            }
        },

        next() {
            if (this.index < this.images.length - 1) {
                this.index += 1;
                this.resetView();
                this.$forceUpdate();
            }
        },

        zoomIn() {
            if (this.scale >= MAX_SCALE) { return; }
            this.scale = Math.min(MAX_SCALE, this.scale + SCALE_STEP);
            this.clampOffsets();
            this.$forceUpdate();
        },

        zoomOut() {
            if (this.scale <= MIN_SCALE) { return; }
            this.scale = Math.max(MIN_SCALE, this.scale - SCALE_STEP);
            this.clampOffsets();
            this.$forceUpdate();
        },

        clampOffsets() {
            const maxX = this.maxOffsetX();
            const maxY = this.maxOffsetY();
            this.offsetX = Math.min(maxX, Math.max(-maxX, this.offsetX));
            this.offsetY = Math.min(maxY, Math.max(-maxY, this.offsetY));
        },

        point(event: any): { x: number; y: number } {
            const list = (event && (event.touches || event.changedTouches)) || [];
            const item = list[0] || (event && event.detail) || {};
            const x = item.clientX !== undefined ? item.clientX : (item.pageX !== undefined ? item.pageX : item.screenX);
            const y = item.clientY !== undefined ? item.clientY : (item.pageY !== undefined ? item.pageY : item.screenY);
            return { x: Number(x) || 0, y: Number(y) || 0 };
        },

        onTouchStart(event: any) {
            if (!this.current) { return; }
            const start = this.point(event);
            this.dragging = true;
            this.dragStartX = start.x;
            this.dragStartY = start.y;
            this.dragOriginX = this.offsetX;
            this.dragOriginY = this.offsetY;
        },

        onTouchMove(event: any) {
            if (!this.dragging) { return; }
            const now = this.point(event);
            this.offsetX = this.dragOriginX + (now.x - this.dragStartX);
            this.offsetY = this.dragOriginY + (now.y - this.dragStartY);
            this.clampOffsets();
            this.$forceUpdate();
        },

        onTouchEnd() {
            this.dragging = false;
        },

        goBack() {
            this.$page.finish();
        },
    },
});

export default imageView;
