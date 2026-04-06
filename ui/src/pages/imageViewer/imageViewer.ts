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
            
            showSettingsPanel: false as boolean,
            isFullscreen: false as boolean,
            
            shellInitialized: false
        };
    },

    computed: {
        imageStyle(): any {
            return {
                transform: `scale(${this.scale}) rotate(${this.rotation}deg) translate(${this.translateX}px, ${this.translateY}px)`,
                width: '100%',
                height: '100%'
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
    },

    methods: {
        handleBackPress() {
            if (this.showSettingsPanel) {
                this.showSettingsPanel = false;
            } else if (this.isFullscreen) {
                this.isFullscreen = false;
            } else {
                $falcon.navBack();
            }
        },
        
        toggleSettings() {
            this.showSettingsPanel = !this.showSettingsPanel;
        },
        
        toggleFullscreen() {
            this.isFullscreen = !this.isFullscreen;
            if (this.isFullscreen) {
                this.showSettingsPanel = false;
            }
        },
        
        handleImageClick(event: any) {
            if (this.isFullscreen) {
                this.isFullscreen = false;
                return;
            }
            
            const imageWidth = 172;
            const clickX = event.offsetX || event.clientX || 86;
            
            if (clickX < imageWidth / 3) {
                this.prevImage();
            } else if (clickX > imageWidth * 2 / 3) {
                this.nextImage();
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
            this.resetZoom();
        },
        
        async prevImage() {
            if (this.imageList.length === 0) return;
            
            this.currentImageIndex = (this.currentImageIndex - 1 + this.imageList.length) % this.imageList.length;
            await this.loadImage(this.imageList[this.currentImageIndex]);
            this.resetZoom();
        },

        zoomIn() {
            this.scale = Math.min(this.scale * 1.3, 5.0);
        },

        zoomOut() {
            this.scale = Math.max(this.scale / 1.3, 0.5);
        },

        resetZoom() {
            this.scale = 1.0;
            this.rotation = 0;
            this.translateX = 0;
            this.translateY = 0;
        },

        rotateLeft() {
            this.rotation -= 90;
        },

        rotateRight() {
            this.rotation += 90;
        },

        moveUp() {
            this.translateY -= 20;
        },

        moveDown() {
            this.translateY += 20;
        },

        moveLeft() {
            this.translateX -= 20;
        },

        moveRight() {
            this.translateX += 20;
        }
    }
});

export default imageViewer;
