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

const imageViewer = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<ImageViewerOptions>,
            
            currentImage: '' as string,
            imageName: '' as string,
            currentDirectory: '/userdisk' as string,
            imageList: [] as string[],
            currentImageIndex: -1 as number,
            
            scale: 1.0,
            rotation: 0,
            translateX: 0,
            translateY: 0,
            
            recentImages: [] as Array<{ name: string; path: string }>,
            
            shellInitialized: false
        };
    },

    computed: {
        imageStyle(): any {
            return {
                transform: `scale(${this.scale}) rotate(${this.rotation}deg) translate(${this.translateX}px, ${this.translateY}px)`,
                width: '100%',
                height: '300px'
            };
        }
    },

    async mounted() {
        await this.initializeShell();
        await this.loadRecentImages();
        
        // 检查是否有初始路径参数
        const options = this.$page.loadOptions;
        if (options.directory) {
            this.currentDirectory = options.directory;
        }
        if (options.initialPath) {
            this.currentImage = options.initialPath;
            this.imageName = options.initialPath.split('/').pop() || '';
            await this.selectImage();
        }
    },

    methods: {
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

        async selectImage() {
            if (!this.shellInitialized) {
                showError('Shell未初始化');
                return;
            }
            
            try {
                showLoading('正在扫描目录...');
                
                const cmd = `find "${this.currentDirectory}" -type f \\( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.gif" -o -iname "*.bmp" -o -iname "*.webp" \\) 2>/dev/null | sort`;
                
                const result = await Shell.exec(cmd);
                
                if (result && result.trim()) {
                    this.imageList = result.trim().split('\n').filter((path: string) => path);
                    
                    if (this.imageList.length > 0) {
                        this.currentImageIndex = 0;
                        this.currentImage = this.imageList[0];
                        this.imageName = this.imageList[0].split('/').pop() || '';
                        showSuccess(`找到 ${this.imageList.length} 张图片`);
                        
                        this.addToRecent(this.imageName, this.currentImage);
                    } else {
                        showError('未找到图片文件');
                    }
                } else {
                    showError('未找到图片文件');
                }
            } catch (error: any) {
                console.error('选择图片失败:', error);
                showError('选择图片失败: ' + error.message);
            } finally {
                hideLoading();
            }
        },
        
        async selectDirectory() {
            openSoftKeyboard(
                () => this.currentDirectory,
                async (value: string) => {
                    this.currentDirectory = value;
                    await this.selectImage();
                }
            );
        },
        
        nextImage() {
            if (this.imageList.length === 0) return;
            
            this.currentImageIndex = (this.currentImageIndex + 1) % this.imageList.length;
            this.currentImage = this.imageList[this.currentImageIndex];
            this.imageName = this.currentImage.split('/').pop() || '';
            this.resetZoom();
        },
        
        prevImage() {
            if (this.imageList.length === 0) return;
            
            this.currentImageIndex = (this.currentImageIndex - 1 + this.imageList.length) % this.imageList.length;
            this.currentImage = this.imageList[this.currentImageIndex];
            this.imageName = this.currentImage.split('/').pop() || '';
            this.resetZoom();
        },

        zoomIn() {
            this.scale = Math.min(this.scale + 0.2, 5.0);
        },

        zoomOut() {
            this.scale = Math.max(this.scale - 0.2, 0.1);
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
        },

        addToRecent(name: string, path: string) {
            const exists = this.recentImages.find(img => img.path === path);
            if (!exists) {
                this.recentImages.unshift({ name, path });
                if (this.recentImages.length > 10) {
                    this.recentImages.pop();
                }
                this.saveRecentImages();
            }
        },

        loadRecentImage(index: number) {
            const img = this.recentImages[index];
            if (img) {
                this.currentImage = img.path;
                this.imageName = img.name;
                this.resetZoom();
            }
        },

        async loadRecentImages() {
            try {
                const data = await $falcon.storage.get('recent_images');
                if (data) {
                    this.recentImages = JSON.parse(data);
                }
            } catch (error) {
                console.error('加载最近图片失败:', error);
            }
        },

        async saveRecentImages() {
            try {
                await $falcon.storage.set('recent_images', JSON.stringify(this.recentImages));
            } catch (error) {
                console.error('保存最近图片失败:', error);
            }
        }
    }
});

export default imageViewer;
