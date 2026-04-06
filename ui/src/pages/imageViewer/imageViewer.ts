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

export type ImageViewerOptions = {
    file?: string;
    base64?: string;
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
            
            shellInitialized: false
        };
    },

    async mounted() {
        await this.initializeShell();
        
        const options = this.$page.loadOptions;
        if (options.directory) {
            this.currentDirectory = options.directory;
        }
        if (options.file && options.base64) {
            this.currentImage = options.file;
            this.currentImageData = options.base64;
            this.imageName = options.file.split('/').pop() || '';
            
            await this.loadImageList();
        }
    },

    methods: {
        async initializeShell() {
            this.shellInitialized = true;
        },

        async loadImageList() {
            if (!this.shellInitialized) {
                return;
            }
            
            try {
                const dir = this.currentImage.substring(0, this.currentImage.lastIndexOf('/'));
                const cmd = `find "${dir}" -maxdepth 1 -type f \\( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.gif" -o -iname "*.bmp" -o -iname "*.webp" \\) 2>/dev/null | sort`;
                
                const result = await Shell.exec(cmd);
                
                if (result && result.trim()) {
                    this.imageList = result.trim().split('\n').filter((path: string) => path);
                    this.currentImageIndex = this.imageList.indexOf(this.currentImage);
                }
            } catch (error) {
                console.error('加载图片列表失败:', error);
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
                
                const cmd = `perl -MMIME::Base64 -e 'open(F, "<", $ARGV[0]) or die; binmode(F); local $/; print encode_base64(<F>);' "${imagePath}"`;
                const result = await Shell.exec(cmd);
                
                if (result && result.trim()) {
                    const base64Data = result.trim().replace(/\s/g, '');
                    this.currentImageData = `data:${mimeType};base64,${base64Data}`;
                    this.currentImage = imagePath;
                    this.imageName = imagePath.split('/').pop() || '';
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
        
        async nextImage() {
            if (this.imageList.length === 0) return;
            
            this.currentImageIndex = (this.currentImageIndex + 1) % this.imageList.length;
            await this.loadImage(this.imageList[this.currentImageIndex]);
        },
        
        async prevImage() {
            if (this.imageList.length === 0) return;
            
            this.currentImageIndex = (this.currentImageIndex - 1 + this.imageList.length) % this.imageList.length;
            await this.loadImage(this.imageList[this.currentImageIndex]);
        }
    }
});

export default imageViewer;
