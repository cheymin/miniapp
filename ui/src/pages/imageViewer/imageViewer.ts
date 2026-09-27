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
import { showError, showInfo } from '../../components/ToastMessage';
import { hideLoading, showLoading } from '../../components/Loading';

export type ImageViewerOptions = {
    initialPath?: string;
    directory?: string;
    allPaths?: string[];
};

// 横屏 640×260，左 9/10 ≈ 576px，按钮条 64px
const SCREEN_W = 640;
const SCREEN_H = 260;
const IMG_AREA_W = 576;   // 图片容器宽度
const IMG_AREA_H = 260;   // 图片容器高度

const MIN_SCALE = 0.5;
const MAX_SCALE = 6.0;
const DOUBLE_TAP_SCALE = 2.5;

// 图片预处理：ffmpeg 缩到最大这个宽度（保证清晰度 + 不爆内存）
const VIEW_MAX_W = 1280;
const VIEW_MAX_H = 640;
const VIEW_Q = 6;
const VIEW_DIR = '/tmp/viewer_imgs';

const imageViewer = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<ImageViewerOptions>,

            currentPath: '' as string,       // 原始路径
            currentDisplayPath: '' as string, // ffmpeg 缩过的文件路径
            currentName: '' as string,
            allPaths: [] as string[],
            currentIndex: -1,

            scale: 1.0,
            panX: 0,
            panY: 0,

            shellInitialized: false,
            imageReady: false,

            // 手势状态
            touchStartX: 0,
            touchStartY: 0,
            panStartX: 0,
            panStartY: 0,
            startDist: 0,        // 双指距离
            startScale: 1.0,
            isTwoFinger: false,
            lastTapTime: 0,
        };
    },

    computed: {
        imageStyle(): any {
            const w = Math.round(IMG_AREA_W * this.scale);
            const h = Math.round(IMG_AREA_H * this.scale);
            return {
                width: w + 'px',
                height: h + 'px',
                transform: `translate(${this.panX}px, ${this.panY}px)`
            };
        },
        imageCount(): number {
            return this.allPaths.length;
        },
    },

    async mounted() {
        this.$page.$npage.on('backpressed', () => this.close());
        this.$page.$npage.setSupportBack(true);

        try {
            await Shell.initialize();
            this.shellInitialized = true;
        } catch (e) {
            showError('Shell 初始化失败');
            return;
        }

        // 创建临时目录
        try { await Shell.exec(`mkdir -p ${VIEW_DIR}`); } catch (e) { /* ignore */ }

        const options = this.$page.loadOptions;
        if (options && options.allPaths && options.allPaths.length > 0) {
            this.allPaths = options.allPaths.slice();
            if (options.initialPath) {
                this.currentIndex = this.allPaths.indexOf(options.initialPath);
                if (this.currentIndex < 0) this.currentIndex = 0;
            } else {
                this.currentIndex = 0;
            }
        } else if (options && options.directory) {
            await this.scanDirectory(options.directory, options.initialPath || '');
        } else if (options && options.initialPath) {
            this.allPaths = [options.initialPath];
            this.currentIndex = 0;
        }

        if (this.allPaths.length > 0) {
            await this.loadImageAt(this.currentIndex);
        }
    },

    beforeDestroy() {
        // try { Shell.exec(`rm -rf ${VIEW_DIR}`); } catch (e) { /* ignore */ }
    },

    methods: {
        close() {
            $falcon.navBack();
        },

        async scanDirectory(dir: string, initial: string) {
            try {
                const cmd = `find "${dir}" -type f \\( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.gif" -o -iname "*.bmp" -o -iname "*.webp" \\) 2>/dev/null | sort`;
                const result = await Shell.exec(cmd);
                if (result && result.trim()) {
                    this.allPaths = result.trim().split('\n').filter((p: string) => p);
                    if (initial) {
                        this.currentIndex = this.allPaths.indexOf(initial);
                    }
                    if (this.currentIndex < 0) this.currentIndex = 0;
                }
            } catch (e) { /* ignore */ }
        },

        async loadImageAt(index: number) {
            if (index < 0 || index >= this.allPaths.length) return;
            if (!this.shellInitialized) return;

            this.currentIndex = index;
            this.currentPath = this.allPaths[index];
            this.currentName = this.currentPath.split('/').pop() || '';
            this.imageReady = false;
            this.resetView();

            showLoading('加载图片...');

            // 先算预处理输出路径
            const hash = this.simpleHash(this.currentPath);
            const viewPath = `${VIEW_DIR}/v_${hash}_${VIEW_MAX_W}.jpg`;

            try {
                // 先看是不是已经预处理过（同一个文件、同一个尺寸）
                let needProcess = true;
                try {
                    const mtimeCheck = await Shell.exec(`test -f "${viewPath}" && echo ok || echo no`);
                    if (mtimeCheck && mtimeCheck.trim() === 'ok') {
                        needProcess = false;
                    }
                } catch (e) { /* ignore */ }

                if (needProcess) {
                    // ffmpeg 预处理：等比缩到 max VIEW_MAX_W×VIEW_MAX_H
                    // scale=1280:-2 保持宽高比且偶数（避免某些编码器报错）
                    const ffmpegCmd = `ffmpeg -y -i "${this.currentPath}" -vf "scale=${VIEW_MAX_W}:-2:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2" -q:v ${VIEW_Q} "${viewPath}" 2>/dev/null`;
                    await Shell.exec(ffmpegCmd);
                }

                this.currentDisplayPath = viewPath;
                this.imageReady = true;
            } catch (e: any) {
                // ffmpeg 失败，直接尝试用原路径（Falcon 可能也能处理）
                this.currentDisplayPath = this.currentPath;
                this.imageReady = true;
                showInfo('图片加载较慢');
            } finally {
                hideLoading();
            }

            this.$forceUpdate();
        },

        simpleHash(s: string): string {
            let h = 0;
            for (let i = 0; i < s.length; i++) {
                h = ((h << 5) - h + s.charCodeAt(i)) | 0;
            }
            return Math.abs(h).toString(36);
        },

        resetView() {
            this.scale = 1.0;
            this.panX = 0;
            this.panY = 0;
        },

        zoomIn() {
            this.scale = Math.min(this.scale * 1.3, MAX_SCALE);
            this.$forceUpdate();
        },

        zoomOut() {
            this.scale = Math.max(this.scale / 1.3, MIN_SCALE);
            this.$forceUpdate();
        },

        prevImage() {
            if (this.allPaths.length === 0) return;
            const idx = (this.currentIndex - 1 + this.allPaths.length) % this.allPaths.length;
            this.loadImageAt(idx);
        },

        nextImage() {
            if (this.allPaths.length === 0) return;
            const idx = (this.currentIndex + 1) % this.allPaths.length;
            this.loadImageAt(idx);
        },

        // ===== 手势处理 =====
        onImageClick() {
            const now = Date.now();
            if (now - this.lastTapTime < 300) {
                // 双击：在 1x 和 2.5x 之间切换
                this.lastTapTime = 0;
                if (this.scale < DOUBLE_TAP_SCALE - 0.1) {
                    this.scale = DOUBLE_TAP_SCALE;
                } else {
                    this.scale = 1.0;
                    this.panX = 0;
                    this.panY = 0;
                }
                this.$forceUpdate();
            } else {
                this.lastTapTime = now;
            }
        },

        onTouchStart(e: any) {
            if (!e) return;
            const touches = e.touches;
            if (!touches) return;

            if (touches.length >= 2) {
                // 双指：准备缩放
                this.isTwoFinger = true;
                this.startDist = this.getDist(touches[0], touches[1]);
                this.startScale = this.scale;
            } else if (touches.length === 1) {
                // 单指：准备平移
                this.isTwoFinger = false;
                this.touchStartX = touches[0].clientX;
                this.touchStartY = touches[0].clientY;
                this.panStartX = this.panX;
                this.panStartY = this.panY;
            }
        },

        onTouchMove(e: any) {
            if (!e) return;
            const touches = e.touches;
            if (!touches) return;

            if (touches.length >= 2) {
                // 双指缩放
                const d = this.getDist(touches[0], touches[1]);
                if (this.startDist > 0) {
                    const ratio = d / this.startDist;
                    this.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, this.startScale * ratio));
                    this.$forceUpdate();
                }
            } else if (touches.length === 1 && !this.isTwoFinger) {
                // 单指平移（只有放大了才有意义）
                if (this.scale > 1.05) {
                    const dx = touches[0].clientX - this.touchStartX;
                    const dy = touches[0].clientY - this.touchStartY;
                    this.panX = this.panStartX + dx;
                    this.panY = this.panStartY + dy;
                    this.$forceUpdate();
                }
            }
        },

        onTouchEnd(e: any) {
            this.isTwoFinger = false;
            this.startDist = 0;
            // 边界 clamp
            this.clampPan();
            this.$forceUpdate();
        },

        clampPan() {
            // 只有缩放 > 1.0 时才需要 clamp（放大了才能看细节）
            if (this.scale <= 1.0) {
                this.panX = 0;
                this.panY = 0;
                return;
            }
            // 简单 clamp：让放大的图片至少有一部分留在容器内
            const extraW = (IMG_AREA_W * this.scale - IMG_AREA_W) / 2;
            const extraH = (IMG_AREA_H * this.scale - IMG_AREA_H) / 2;
            this.panX = Math.max(-extraW * 2, Math.min(extraW * 2, this.panX));
            this.panY = Math.max(-extraH * 2, Math.min(extraH * 2, this.panY));
        },

        getDist(a: any, b: any): number {
            const dx = a.clientX - b.clientX;
            const dy = a.clientY - b.clientY;
            return Math.sqrt(dx * dx + dy * dy);
        },
    },
});

export default imageViewer;
