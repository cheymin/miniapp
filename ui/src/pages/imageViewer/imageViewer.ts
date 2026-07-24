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
            panX: 0,
            panY: 0,

            showControls: true as boolean,
            showMenu: false as boolean,
            showImageInfo: false as boolean,
            isSlideshow: false as boolean,
            slideshowTimer: null as any,
            autoHideTimer: null as any,

            shellInitialized: false,

            // 手势状态(仅做长按检测,翻页走菜单图片列表/箭头,不与scroller冲突)
            touchStartX: 0,
            touchStartY: 0,
            isTouching: false,
            hasMoved: false,
            longPressTimer: null as any,
            // 单击/双击
            lastTapTime: 0,
            singleTapTimer: null as any
        };
    },

    computed: {
        imageStyle(): any {
            const w = Math.round(SCREEN_W * this.scale);
            const h = Math.round(SCREEN_H * this.scale);
            return {
                width: w + 'px',
                height: h + 'px',
                transform: `rotate(${this.rotation}deg) translate(${this.panX}px, ${this.panY}px)`
            };
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
            if (this.singleTapTimer) { clearTimeout(this.singleTapTimer); this.singleTapTimer = null; }
        },

        scheduleAutoHide() {
            if (this.autoHideTimer) clearTimeout(this.autoHideTimer);
            this.autoHideTimer = setTimeout(() => {
                if (this.hasImage && !this.showMenu && !this.isSlideshow) {
                    this.showControls = false;
                }
            }, 3500);
        },

        // 持久≡按钮：controls隐藏时也能恢复(解决"隐藏UI回不来")
        restoreControls() {
            this.showControls = true;
            this.scheduleAutoHide();
        },

        toggleControls() {
            this.showControls = !this.showControls;
            if (this.showControls) this.scheduleAutoHide();
        },

        // ===== 手势:仅长按→菜单,单击→显隐控件,双击→缩放(不与scroller平移冲突) =====
        onTouchStart(e: any) {
            const t = this._getTouch(e);
            if (!t) return;
            this.touchStartX = t.clientX;
            this.touchStartY = t.clientY;
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
        },

        onTouchEnd() {
            if (this.longPressTimer) { clearTimeout(this.longPressTimer); this.longPressTimer = null; }
            this.isTouching = false;
        },

        _getTouch(e: any) {
            if (!e) return null;
            if (e.touches && e.touches.length > 0) return e.touches[0];
            if (e.changedTouches && e.changedTouches.length > 0) return e.changedTouches[0];
            if (typeof e.clientX === 'number') return e;
            return null;
        },

        // click触发单击/双击(滚动时浏览器不触发click,平移不会误触)
        onImageClick() {
            const now = Date.now();
            if (now - this.lastTapTime < 300) {
                // 双击:缩放
                this.lastTapTime = 0;
                if (this.singleTapTimer) { clearTimeout(this.singleTapTimer); this.singleTapTimer = null; }
                this.toggleZoom();
            } else {
                this.lastTapTime = now;
                if (this.singleTapTimer) clearTimeout(this.singleTapTimer);
                this.singleTapTimer = setTimeout(() => {
                    this.lastTapTime = 0;
                    this.toggleControls();
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

        zoomIn() {
            this.scale = Math.min(this.scale * 1.3, MAX_SCALE);
        },

        zoomOut() {
            this.scale = Math.max(this.scale / 1.3, MIN_SCALE);
        },

        resetView() {
            this.scale = 1.0;
            this.rotation = 0;
            this.panX = 0;
            this.panY = 0;
        },

        rotateLeft() { this.rotation -= 90; },
        rotateRight() { this.rotation += 90; },

        panLeft() { this.panX -= 20; },
        panRight() { this.panX += 20; },
        panUp() { this.panY -= 20; },
        panDown() { this.panY += 20; },

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

        // 菜单图片列表点击:可靠浏览(替代不可靠的手指滑动)
        async loadImageByIndex(idx: number) {
            if (idx < 0 || idx >= this.imageList.length) return;
            this.showMenu = false;
            this.currentImageIndex = idx;
            await this.loadImage(this.imageList[idx]);
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
