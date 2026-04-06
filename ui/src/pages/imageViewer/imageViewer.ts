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

const imageViewer = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<ImageViewerOptions>,
            
            currentImage: '' as string,
            currentImageData: '' as string,
            imageName: '' as string,
            currentDirectory: '/userdisk' as string,
            imageList: [] as string[],
            currentImageIndex: -1 as number,
            
            scale: 1.0,
            rotation: 0,
            translateX: 0,
            translateY: 0,
            
            showControls: true as boolean,
            showSettingsPanel: false as boolean,
            
            shellInitialized: false,
            
            lastTapTime: 0,
            touchStartX: 0,
            touchStartY: 0,
            isSwiping: false,
            
            autoPlayEnabled: false as boolean,
            autoPlayInterval: 3 as number,
            autoPlayTimer: null as any,
            
            isZoomed: false as boolean
        };
    },

    computed: {
        imageStyle(): any {
            return {
                transform: `scale(${this.scale}) rotate(${this.rotation}deg) translate(${this.translateX}px, ${this.translateY}px)`,
                width: '100%',
                height: '100%'
            };
        },
        
        progressText(): string {
            if (this.imageList.length === 0) return '';
            return `${this.currentImageIndex + 1} / ${this.imageList.length}`;
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
        
        setTimeout(() => {
            this.showControls = false;
        }, 3000);
    },
    
    beforeDestroy() {
        this.$page.$npage.off("backpressed", this.handleBackPress);
        this.stopAutoPlay();
    },

    methods: {
        handleBackPress() {
            if (this.showSettingsPanel) {
                this.showSettingsPanel = false;
            } else {
                $falcon.navBack();
            }
        },
        
        toggleControls() {
            this.showControls = !this.showControls;
            
            if (this.showControls) {
                setTimeout(() => {
                    this.showControls = false;
                }, 3000);
            }
        },
        
        toggleSettings() {
            this.showSettingsPanel = !this.showSettingsPanel;
            if (this.showSettingsPanel) {
                this.stopAutoPlay();
            }
        },
        
        handleImageClick(event: any) {
            const currentTime = new Date().getTime();
            const tapInterval = currentTime - this.lastTapTime;
            
            if (tapInterval < 300 && tapInterval > 0) {
                this.handleDoubleTap();
            } else {
                this.toggleControls();
            }
            
            this.lastTapTime = currentTime;
        },
        
        handleDoubleTap() {
            if (this.scale > 1.0) {
                this.resetZoom();
                this.isZoomed = false;
            } else {
                this.scale = 2.5;
                this.isZoomed = true;
            }
        },
        
        handleTouchStart(event: any) {
            this.touchStartX = event.touches ? event.touches[0].clientX : event.clientX;
            this.touchStartY = event.touches ? event.touches[0].clientY : event.clientY;
            this.isSwiping = false;
        },
        
        handleTouchEnd(event: any) {
            if (this.isZoomed) return;
            
            const touchEndX = event.changedTouches ? event.changedTouches[0].clientX : event.clientX;
            const touchEndY = event.changedTouches ? event.changedTouches[0].clientY : event.clientY;
            
            const deltaX = touchEndX - this.touchStartX;
            const deltaY = touchEndY - this.touchStartY;
            
            if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
                this.isSwiping = true;
                if (deltaX > 0) {
                    this.prevImage();
                } else {
                    this.nextImage();
                }
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
                showLoading('加载中...');
                
                const ext = imagePath.split('.').pop()?.toLowerCase() || 'jpg';
                const mimeType = this.getMimeType(ext);
                
                const cmd = `perl -MMIME::Base64 -0777 -ne 'print encode_base64(\$_)' "${imagePath}"`;
                const result = await Shell.exec(cmd);
                
                if (result && result.trim()) {
                    const base64Data = result.trim().replace(/\s/g, '');
                    this.currentImageData = `data:${mimeType};base64,${base64Data}`;
                    this.currentImage = imagePath;
                    this.imageName = imagePath.split('/').pop() || '';
                    this.resetZoom();
                } else {
                    showError('图片加载失败');
                }
            } catch (error: any) {
                console.error('加载图片失败:', error);
                showError('加载图片失败');
            } finally {
                hideLoading();
            }
        },
        
        getMimeType(ext: string): string {
            const mimeTypes: { [key: string]: string } = {
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'gif': 'image/gif',
                'bmp': 'image/bmp',
                'webp': 'image/webp'
            };
            return mimeTypes[ext] || 'image/jpeg';
        },

        async scanImages() {
            if (!this.shellInitialized) {
                showError('Shell未初始化');
                return;
            }
            
            try {
                showLoading('扫描中...');
                
                const cmd = `find "${this.currentDirectory}" -type f \\( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.gif" -o -iname "*.bmp" -o -iname "*.webp" \\) 2>/dev/null | sort`;
                const result = await Shell.exec(cmd);
                
                if (result && result.trim()) {
                    this.imageList = result.trim().split('\n').filter((path: string) => path);
                    
                    if (this.imageList.length > 0) {
                        this.currentImageIndex = 0;
                        await this.loadImage(this.imageList[0]);
                        showSuccess(`找到 ${this.imageList.length} 张图片`);
                    } else {
                        showError('未找到图片');
                    }
                } else {
                    showError('未找到图片');
                }
            } catch (error: any) {
                console.error('扫描图片失败:', error);
                showError('扫描图片失败');
            } finally {
                hideLoading();
            }
        },
        
        async selectDirectory() {
            openSoftKeyboard(
                () => this.currentDirectory,
                async (value: string) => {
                    this.currentDirectory = value;
                    this.showSettingsPanel = false;
                    await this.scanImages();
                }
            );
        },
        
        async nextImage() {
            if (this.imageList.length === 0) return;
            
            this.currentImageIndex = (this.currentImageIndex + 1) % this.imageList.length;
            await this.loadImage(this.imageList[this.currentImageIndex]);
        },
        
        async prevImage() {
            if (this.imageList.length === 0) return;
            
            this.currentImageIndex = (this.currentImageIndex - 1 + this.imageList.length) % this.imageList.length;
            await this.loadImage(this.imageList[this.currentImageIndex]);
        },

        zoomIn() {
            this.scale = Math.min(this.scale * 1.3, 5.0);
            this.isZoomed = this.scale > 1.0;
        },

        zoomOut() {
            this.scale = Math.max(this.scale / 1.3, 0.5);
            this.isZoomed = this.scale > 1.0;
        },

        resetZoom() {
            this.scale = 1.0;
            this.rotation = 0;
            this.translateX = 0;
            this.translateY = 0;
            this.isZoomed = false;
        },

        rotateLeft() {
            this.rotation -= 90;
        },

        rotateRight() {
            this.rotation += 90;
        },
        
        toggleAutoPlay() {
            if (this.autoPlayEnabled) {
                this.stopAutoPlay();
            } else {
                this.startAutoPlay();
            }
        },
        
        startAutoPlay() {
            if (this.imageList.length === 0) return;
            
            this.autoPlayEnabled = true;
            this.showControls = true;
            
            this.autoPlayTimer = setInterval(() => {
                this.nextImage();
            }, this.autoPlayInterval * 1000);
            
            showSuccess(`自动播放已开启 (${this.autoPlayInterval}秒)`);
        },
        
        stopAutoPlay() {
            this.autoPlayEnabled = false;
            
            if (this.autoPlayTimer) {
                clearInterval(this.autoPlayTimer);
                this.autoPlayTimer = null;
            }
        },
        
        setAutoPlayInterval(seconds: number) {
            this.autoPlayInterval = seconds;
            
            if (this.autoPlayEnabled) {
                this.stopAutoPlay();
                this.startAutoPlay();
            }
        }
    }
});

export default imageViewer;
