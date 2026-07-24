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
import { hideLoading, showLoading } from '../../components/Loading';
import { openSoftKeyboard } from '../../utils/softKeyboardUtils';

export type ImageViewerOptions = {
    initialPath?: string;
    directory?: string;
};

// 设备屏幕 320×240（见 PROJECT_GUIDE）
const SCREEN_W = 320;
const SCREEN_H = 240;
const MIN_SCALE = 0.5;
const MAX_SCALE = 6.0;
const DOUBLE_TAP_SCALE = 2.5;
const SWIPE_THRESHOLD = 60;
const TAP_THRESHOLD = 10;
const LONG_PRESS_MS = 550;

const imageViewer = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<ImageViewerOptions>,

            currentImage: '' as string,
            currentImageData: '' as string,
            imageName: '' as string,
            imageSize: 0 as number,
            currentDirectory: '/userdisk' as string,
            imageList: [] as string[],
            currentImageIndex: -1 as number,

            scale: 1.0,
            rotation: 0,

            showControls: true as boolean,
            showMenu: false as boolean,
            showImageInfo: false as boolean,
            isSlideshow: false as boolean,
            slideshowTimer: null as any,
            autoHideTimer: null as any,

            shellInitialized: false,

            // 手势状态(不阻止 scroller 滚动,仅做长按/滑动检测)
            touchStartX: 0,
            touchStartY: 0,
            touchLastX: 0,
            touchLastY: 0,
            isTouching: false,
            hasMoved: false,
            longPressTimer: null as any,
            // 单击/双击(click 触发)
            lastTapTime: 0,
            clickSuppress: false,

            // 缩放滑块拖动
            isDraggingThumb: false,
            thumbStartX: 0,
            thumbStartPercent: 0
        };
    },

    computed: {
        imageStyle(): any {
            const w = Math.round(SCREEN_W * this.scale);
            const h = Math.round(SCREEN_H * this.scale);
            return {
                width: w + 'px',
                height: h + 'px',
                transform: `rotate(${this.rotation}deg)`
            };
        },
        zoomPercent(): number {
            const logMin = Math.log(MIN_SCALE);
            const logMax = Math.log(MAX_SCALE);
            const logVal = Math.log(Math.max(MIN_SCALE, Math.min(MAX_SCALE, this.scale)));
            return ((logVal - logMin) / (logMax - logMin)) * 100;
        },
        hasImage(): boolean {
            return !!this.currentImageData;
        },
        imageCount(): number {
            return this.imageList.length;
        }
    },

    async mounted() {
        this.$page.$npage.on("backpressed", this.handleBackPress);
        await this.initializeShell();

        const options = this.$page.loadOptions;
        if (options.directory) {
            this.currentDirectory = options.directory;
        }
        if (options.initialPath) {
            await this.loadImage(options.initialPath);
            if (options.directory) {
                this.scanImages(true);
            }
        }
        this.scheduleAutoHide();
    },

    beforeDestroy() {
        this.$page.$npage.off("backpressed", this.handleBackPress);
        this.stopSlideshow();
        this.clearTimers();
    },

    methods: {
        handleBackPress() {
            if (this.showMenu) {
                this.showMenu = false;
            } else if (!this.showControls) {
                this.showControls = true;
            } else {
                $falcon.navBack();
            }
        },

        clearTimers() {
            if (this.autoHideTimer) { clearTimeout(this.autoHideTimer); this.autoHideTimer = null; }
            if (this.longPressTimer) { clearTimeout(this.longPressTimer); this.longPressTimer = null; }
        },

        scheduleAutoHide() {
            if (this.autoHideTimer) clearTimeout(this.autoHideTimer);
            this.autoHideTimer = setTimeout(() => {
                if (this.hasImage && !this.showMenu && !this.isSlideshow) {
                    this.showControls = false;
                }
            }, 3500);
        },

        toggleControls() {
            this.showControls = !this.showControls;
            if (this.showControls) this.scheduleAutoHide();
        },

        noop() {},

        // ===== 手势(不阻止 scroller,仅检测长按与水平滑动) =====
        onTouchStart(e: any) {
            const t = this._getTouch(e);
            if (!t) return;
            this.touchStartX = this.touchLastX = t.clientX;
            this.touchStartY = this.touchLastY = t.clientY;
            this.isTouching = true;
            this.hasMoved = false;
            if (this.longPressTimer) clearTimeout(this.longPressTimer);
            this.longPressTimer = setTimeout(() => {
                if (!this.hasMoved && this.isTouching && this.hasImage) {
                    this.showMenu = true;
                    this.isTouching = false;
                }
            }, LONG_PRESS_MS);
        },

        onTouchMove(e: any) {
            const t = this._getTouch(e);
            if (!t || !this.isTouching) return;
            const dx = t.clientX - this.touchStartX;
            const dy = t.clientY - this.touchStartY;
            if (Math.abs(dx) > TAP_THRESHOLD || Math.abs(dy) > TAP_THRESHOLD) {
                this.hasMoved = true;
                if (this.longPressTimer) { clearTimeout(this.longPressTimer); this.longPressTimer = null; }
            }
            this.touchLastX = t.clientX;
            this.touchLastY = t.clientY;
        },

        onTouchEnd() {
            if (this.longPressTimer) { clearTimeout(this.longPressTimer); this.longPressTimer = null; }
            if (!this.isTouching) return;
            this.isTouching = false;
            // 仅在未放大时,水平滑动显著>垂直位移 → 翻页(不阻止 scroller 平移)
            if (this.hasMoved && this.scale <= 1.01) {
                const dx = this.touchLastX - this.touchStartX;
                const dy = this.touchLastY - this.touchStartY;
                if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
                    this.clickSuppress = true;
                    if (dx < 0) this.nextImage();
                    else this.prevImage();
                }
            }
        },

        _getTouch(e: any) {
            if (!e) return null;
            if (e.touches && e.touches.length > 0) return e.touches[0];
            if (e.changedTouches && e.changedTouches.length > 0) return e.changedTouches[0];
            if (typeof e.clientX === 'number') return e;
            return null;
        },

        // click 触发单击/双击(滚动时浏览器不触发 click,不会误触)
        onImageClick() {
            if (this.clickSuppress) { this.clickSuppress = false; return; }
            const now = Date.now();
            if (now - this.lastTapTime < 300) {
                this.lastTapTime = 0;
                this.toggleZoom();
            } else {
                this.lastTapTime = now;
                setTimeout(() => {
                    if (this.lastTapTime && Date.now() - this.lastTapTime >= 280) {
                        this.lastTapTime = 0;
                        this.toggleControls();
                    }
                }, 290);
            }
        },

        toggleZoom() {
            if (this.scale < DOUBLE_TAP_SCALE - 0.1) {
                this.scale = DOUBLE_TAP_SCALE;
            } else {
                this.scale = 1.0;
                this.rotation = 0;
            }
        },

        // ===== 缩放滑块 =====
        onThumbTouchStart(e: any) {
            const t = this._getTouch(e);
            if (!t) return;
            this.isDraggingThumb = true;
            this.thumbStartX = t.clientX;
            this.thumbStartPercent = this.zoomPercent;
            if (this.autoHideTimer) clearTimeout(this.autoHideTimer);
        },

        onThumbTouchMove(e: any) {
            if (!this.isDraggingThumb) return;
            const t = this._getTouch(e);
            if (!t) return;
            const trackWidth = 120;
            const deltaX = t.clientX - this.thumbStartX;
            let newPercent = this.thumbStartPercent + (deltaX / trackWidth) * 100;
            newPercent = Math.max(0, Math.min(100, newPercent));
            const logMin = Math.log(MIN_SCALE);
            const logMax = Math.log(MAX_SCALE);
            this.scale = Math.exp(logMin + (newPercent / 100) * (logMax - logMin));
        },

        onThumbTouchEnd() {
            this.isDraggingThumb = false;
            this.scheduleAutoHide();
        },

        zoomIn() {
            this.scale = Math.min(this.scale * 1.3, MAX_SCALE);
            this.scheduleAutoHide();
        },

        zoomOut() {
            this.scale = Math.max(this.scale / 1.3, MIN_SCALE);
            this.scheduleAutoHide();
        },

        resetView() {
            this.scale = 1.0;
            this.rotation = 0;
            this.scheduleAutoHide();
        },

        rotateLeft() { this.rotation -= 90; this.scheduleAutoHide(); },
        rotateRight() { this.rotation += 90; this.scheduleAutoHide(); },

        // ===== Shell / 加载 =====
        async initializeShell() {
            try {
                if (!Shell || typeof Shell.initialize !== 'function') {
                    throw new Error('Shell模块不可用');
                }
                await Shell.initialize();
                this.shellInitialized = true;
            } catch (error: any) {
                console.error('Shell初始化失败:', error);
                showError('Shell初始化失败');
            }
        },

        async loadImage(imagePath: string) {
            if (!this.shellInitialized) {
                showError('Shell未初始化');
                return;
            }
            try {
                showLoading('正在加载图片...');
                const ext = imagePath.split('.').pop()?.toLowerCase() || 'jpg';
                const mimeType = this.getMimeType(ext);

                let result = '';
                const encodingMethods = [
                    `perl -MMIME::Base64 -0777 -ne 'print encode_base64(\$_)' "${imagePath}"`,
                    `perl -e 'use MIME::Base64; open(F, "<", $ARGV[0]); binmode(F); local $/; print encode_base64(<F>);' "${imagePath}"`,
                    `xxd -p "${imagePath}" | tr -d '\\n' | perl -e 'use MIME::Base64; my $hex = <STDIN>; $hex =~ s/\\s//g; my $bin = pack("H*", $hex); print encode_base64($bin);'`
                ];

                for (const cmd of encodingMethods) {
                    try {
                        result = await Shell.exec(cmd);
                        if (result && result.trim()) break;
                    } catch (e) { continue; }
                }

                if (result && result.trim()) {
                    const base64Data = result.trim().replace(/\s/g, '');
                    this.currentImageData = `data:${mimeType};base64,${base64Data}`;
                    this.currentImage = imagePath;
                    this.imageName = imagePath.split('/').pop() || '';
                    this.resetView();
                    await this.getImageInfo();
                    const idx = this.imageList.indexOf(imagePath);
                    if (idx >= 0) this.currentImageIndex = idx;
                } else {
                    showError('图片加载失败');
                }
            } catch (error: any) {
                console.error('加载图片失败:', error);
                showError('加载图片失败: ' + (error.message || error));
            } finally {
                hideLoading();
            }
        },

        getMimeType(ext: string): string {
            const mimeTypes: { [key: string]: string } = {
                'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
                'gif': 'image/gif', 'bmp': 'image/bmp', 'webp': 'image/webp'
            };
            return mimeTypes[ext] || 'image/jpeg';
        },

        async scanImages(silent: boolean = false) {
            if (!this.shellInitialized) { showError('Shell未初始化'); return; }
            try {
                if (!silent) showLoading('正在扫描目录...');
                const cmd = `find "${this.currentDirectory}" -type f \\( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.gif" -o -iname "*.bmp" -o -iname "*.webp" \\) 2>/dev/null | sort`;
                const result = await Shell.exec(cmd);
                if (result && result.trim()) {
                    this.imageList = result.trim().split('\n').filter((path: string) => path);
                    const idx = this.imageList.indexOf(this.currentImage);
                    this.currentImageIndex = idx >= 0 ? idx : 0;
                    if (!silent && this.imageList.length === 0) showError('未找到图片文件');
                } else {
                    this.imageList = [];
                    if (!silent) showError('未找到图片文件');
                }
            } catch (error: any) {
                showError('扫描图片失败: ' + error.message);
            } finally {
                if (!silent) hideLoading();
            }
        },

        async selectDirectory() {
            openSoftKeyboard(
                () => this.currentDirectory,
                async (value: string) => {
                    this.currentDirectory = value;
                    this.showMenu = false;
                    await this.scanImages();
                    if (this.imageList.length > 0) {
                        await this.loadImage(this.imageList[0]);
                    }
                }
            );
        },

        async nextImage() {
            if (this.imageList.length === 0) return;
            const idx = this.currentImageIndex >= 0
                ? (this.currentImageIndex + 1) % this.imageList.length
                : 0;
            this.currentImageIndex = idx;
            await this.loadImage(this.imageList[idx]);
        },

        async prevImage() {
            if (this.imageList.length === 0) return;
            const idx = this.currentImageIndex >= 0
                ? (this.currentImageIndex - 1 + this.imageList.length) % this.imageList.length
                : 0;
            this.currentImageIndex = idx;
            await this.loadImage(this.imageList[idx]);
        },

        toggleImageInfo() { this.showImageInfo = !this.showImageInfo; },

        async getImageInfo() {
            if (!this.currentImage || !this.shellInitialized) return;
            try {
                const cmd = `stat -c '%s' "${this.currentImage}"`;
                const result = await Shell.exec(cmd);
                if (result && result.trim()) {
                    this.imageSize = parseInt(result.trim(), 10);
                }
            } catch (error) { console.error('获取图片信息失败:', error); }
        },

        formatFileSize(bytes: number): string {
            if (!bytes) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        },

        async deleteImage() {
            if (!this.currentImage || !this.shellInitialized) return;
            try {
                await Shell.exec(`rm "${this.currentImage}"`);
                const removedIdx = this.currentImageIndex;
                if (removedIdx >= 0 && removedIdx < this.imageList.length) {
                    this.imageList.splice(removedIdx, 1);
                }
                this.showMenu = false;
                if (this.imageList.length > 0) {
                    this.currentImageIndex = Math.min(removedIdx < 0 ? 0 : removedIdx, this.imageList.length - 1);
                    await this.loadImage(this.imageList[this.currentImageIndex]);
                } else {
                    this.currentImage = '';
                    this.currentImageData = '';
                    this.imageName = '';
                    this.imageSize = 0;
                }
                showSuccess('图片已删除');
            } catch (error: any) {
                showError('删除失败: ' + error.message);
            }
        },

        async renameImage() {
            if (!this.currentImage || !this.shellInitialized) return;
            const oldName = this.imageName;
            openSoftKeyboard(
                () => this.imageName,
                async (newName: string) => {
                    if (!newName || newName === oldName) return;
                    const dir = this.currentImage.substring(0, this.currentImage.lastIndexOf('/'));
                    const newPath = `${dir}/${newName}`;
                    try {
                        await Shell.exec(`mv "${this.currentImage}" "${newPath}"`);
                        const li = this.imageList.indexOf(this.currentImage);
                        if (li >= 0) this.imageList[li] = newPath;
                        this.currentImage = newPath;
                        this.imageName = newName;
                        this.showMenu = false;
                        showSuccess('重命名成功');
                    } catch (error: any) {
                        showError('重命名失败: ' + error.message);
                    }
                }
            );
        },

        toggleSlideshow() {
            this.isSlideshow = !this.isSlideshow;
            if (this.isSlideshow) {
                this.showMenu = false;
                this.showControls = false;
                this.startSlideshow();
            } else {
                this.stopSlideshow();
                this.showControls = true;
            }
        },

        startSlideshow() {
            if (this.slideshowTimer) clearInterval(this.slideshowTimer);
            this.slideshowTimer = setInterval(() => { this.nextImage(); }, 3500);
        },

        stopSlideshow() {
            this.isSlideshow = false;
            if (this.slideshowTimer) {
                clearInterval(this.slideshowTimer);
                this.slideshowTimer = null;
            }
        }
    }
});

export default imageViewer;
