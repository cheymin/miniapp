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
import { showError, showSuccess, showInfo } from '../../components/ToastMessage';
import { hideLoading, showLoading } from '../../components/Loading';
import { openSoftKeyboard } from '../../utils/softKeyboardUtils';

export type ImageViewerOptions = {
    initialPath?: string;
    directory?: string;
};

const MIN_SCALE = 0.1;
const MAX_SCALE = 5.0;

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
            
            showMenuPanel: false as boolean,
            showImageInfo: false as boolean,
            isSlideshow: false as boolean,
            slideshowTimer: null as any,
            
            shellInitialized: false,

            // Touch gesture state
            touchStartX: 0,
            touchStartY: 0,
            touchStartTime: 0,
            isTouching: false
        };
    },

    computed: {
        imageStyle(): any {
            const width = Math.round(320 * this.scale);
            const height = Math.round(240 * this.scale);
            return {
                width: width + 'px',
                height: height + 'px',
                transform: `rotate(${this.rotation}deg)`
            };
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
            this.currentImage = options.initialPath;
            this.imageName = options.initialPath.split('/').pop() || '';
            await this.loadImage(options.initialPath);
        }
    },
    
    beforeDestroy() {
        this.$page.$npage.off("backpressed", this.handleBackPress);
        this.stopSlideshow();
    },

    methods: {
        handleBackPress() {
            if (this.showMenuPanel) {
                this.showMenuPanel = false;
            } else if (this.showImageInfo) {
                this.showImageInfo = false;
            } else {
                $falcon.navBack();
            }
        },
        
        toggleMenu() {
            this.showMenuPanel = !this.showMenuPanel;
            if (this.showMenuPanel) {
                this.showImageInfo = false;
            }
        },

        // Touch gesture: swipe up/down to zoom, tap to toggle menu
        onTouchStart(e: any) {
            if (this.showMenuPanel || this.showImageInfo) return;
            const touch = (e.touches && e.touches[0]) || (e.touch);
            if (touch) {
                this.touchStartX = touch.clientX;
                this.touchStartY = touch.clientY;
                this.touchStartTime = Date.now();
                this.isTouching = true;
            }
        },

        onTouchMove(e: any) {
            if (!this.isTouching || this.showMenuPanel || this.showImageInfo) return;
            const touch = (e.touches && e.touches[0]) || (e.touch);
            if (!touch) return;

            const deltaY = touch.clientY - this.touchStartY;
            const deltaX = Math.abs(touch.clientX - this.touchStartX);

            // Vertical swipe to zoom (only when mostly vertical)
            if (deltaX < 30 && Math.abs(deltaY) > 20) {
                const zoomDelta = deltaY > 0 ? -0.02 : 0.02;
                this.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, this.scale + zoomDelta));
                this.touchStartY = touch.clientY;
            }
        },

        onTouchEnd(e: any) {
            if (!this.isTouching) return;
            this.isTouching = false;

            const touch = (e.changedTouches && e.changedTouches[0]) || (e.touch);
            if (!touch) return;

            const deltaX = Math.abs(touch.clientX - this.touchStartX);
            const deltaY = Math.abs(touch.clientY - this.touchStartY);
            const elapsed = Date.now() - this.touchStartTime;

            // Quick tap: toggle menu
            if (deltaX < 10 && deltaY < 10 && elapsed < 300) {
                // Don't toggle menu on tap - let scroller handle it
            }
        },

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
                    `xxd -p "${imagePath}" | tr -d '\\n' | perl -e 'use MIME::Base64; my $hex = <STDIN>; $hex =~ s/\\s//g; my $bin = pack("H*", $hex); print encode_base64($bin);'`,
                    `hexdump -ve '1/1 "%.2x"' "${imagePath}" | perl -e 'use MIME::Base64; my $hex = <STDIN>; $hex =~ s/\\s//g; my $bin = pack("H*", $hex); print encode_base64($bin);'`
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
                    await this.getImageInfo();
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

        async scanImages() {
            if (!this.shellInitialized) { showError('Shell未初始化'); return; }
            try {
                showLoading('正在扫描目录...');
                const cmd = `find "${this.currentDirectory}" -type f \\( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.gif" -o -iname "*.bmp" -o -iname "*.webp" \\) 2>/dev/null | sort`;
                const result = await Shell.exec(cmd);
                if (result && result.trim()) {
                    this.imageList = result.trim().split('\n').filter((path: string) => path);
                    if (this.imageList.length > 0) {
                        this.currentImageIndex = 0;
                        await this.loadImage(this.imageList[0]);
                    } else {
                        showError('未找到图片文件');
                    }
                } else {
                    showError('未找到图片文件');
                }
            } catch (error: any) {
                showError('扫描图片失败: ' + error.message);
            } finally {
                hideLoading();
            }
        },
        
        async selectDirectory() {
            openSoftKeyboard(
                () => this.currentDirectory,
                async (value: string) => {
                    this.currentDirectory = value;
                    this.showMenuPanel = false;
                    await this.scanImages();
                }
            );
        },
        
        async nextImage() {
            if (this.imageList.length === 0) return;
            this.currentImageIndex = (this.currentImageIndex + 1) % this.imageList.length;
            await this.loadImage(this.imageList[this.currentImageIndex]);
            this.resetView();
        },
        
        async prevImage() {
            if (this.imageList.length === 0) return;
            this.currentImageIndex = (this.currentImageIndex - 1 + this.imageList.length) % this.imageList.length;
            await this.loadImage(this.imageList[this.currentImageIndex]);
            this.resetView();
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
        },

        rotateLeft() { this.rotation -= 90; },
        rotateRight() { this.rotation += 90; },
        
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
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        },
        
        async deleteImage() {
            if (!this.currentImage || !this.shellInitialized) return;
            try {
                await Shell.exec(`rm "${this.currentImage}"`);
                this.imageList.splice(this.currentImageIndex, 1);
                if (this.imageList.length > 0) {
                    this.currentImageIndex = Math.min(this.currentImageIndex, this.imageList.length - 1);
                    await this.loadImage(this.imageList[this.currentImageIndex]);
                } else {
                    this.currentImage = '';
                    this.currentImageData = '';
                    this.imageName = '';
                }
                showSuccess('图片已删除');
            } catch (error: any) {
                showError('删除失败: ' + error.message);
            }
        },
        
        async renameImage() {
            if (!this.currentImage || !this.shellInitialized) return;
            openSoftKeyboard(
                () => this.imageName,
                async (newName: string) => {
                    if (!newName || newName === this.imageName) return;
                    const dir = this.currentImage.substring(0, this.currentImage.lastIndexOf('/'));
                    const newPath = `${dir}/${newName}`;
                    try {
                        await Shell.exec(`mv "${this.currentImage}" "${newPath}"`);
                        this.imageList[this.currentImageIndex] = newPath;
                        this.currentImage = newPath;
                        this.imageName = newName;
                        showSuccess('重命名成功');
                    } catch (error: any) {
                        showError('重命名失败: ' + error.message);
                    }
                }
            );
        },
        
        toggleSlideshow() {
            this.isSlideshow = !this.isSlideshow;
            if (this.isSlideshow) { this.startSlideshow(); } else { this.stopSlideshow(); }
        },
        
        startSlideshow() {
            if (this.slideshowTimer) clearInterval(this.slideshowTimer);
            this.slideshowTimer = setInterval(() => { this.nextImage(); }, 3000);
        },
        
        stopSlideshow() {
            if (this.slideshowTimer) {
                clearInterval(this.slideshowTimer);
                this.slideshowTimer = null;
            }
        }
    }
});

export default imageViewer;
