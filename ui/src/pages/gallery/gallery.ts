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
import { showSuccess, showError } from '../../components/ToastMessage';
import { showLoading, hideLoading } from '../../components/Loading';
import { openSoftKeyboard } from '../../utils/softKeyboardUtils';
import { Shell } from 'langningchen';

export type GalleryOptions = {};

interface ImageItem {
    path: string;
    name: string;
    base64: string;
}

const gallery = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<GalleryOptions>,
            
            currentPath: '/mnt',
            images: [] as ImageItem[],
            shellInitialized: false
        };
    },

    mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on("backpressed", this.handleBackPress);
        this.initShell();
    },

    beforeDestroy() {
        this.$page.$npage.off("backpressed", this.handleBackPress);
    },

    methods: {
        handleBackPress() {
            this.$page.finish();
        },

        async initShell() {
            this.shellInitialized = true;
            this.loadImages();
        },

        async loadImages() {
            if (!this.shellInitialized) {
                showError('Shell未初始化');
                return;
            }

            try {
                showLoading('正在加载图片...');
                
                const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
                const findCmd = `find "${this.currentPath}" -maxdepth 1 -type f \\( ${imageExtensions.map(ext => `-iname "*.${ext}"`).join(' -o ')} \\) 2>/dev/null | head -50`;
                
                const result = await Shell.exec(findCmd);
                const files = result.split('\n').filter(f => f.trim());
                
                this.images = [];
                
                for (const file of files) {
                    try {
                        const base64Cmd = `perl -MMIME::Base64 -e 'open(F, "<", $ARGV[0]) or die; binmode(F); local $/; print encode_base64(<F>);' "${file}"`;
                        const base64 = await Shell.exec(base64Cmd);
                        
                        if (base64 && base64.length > 0) {
                            const ext = file.split('.').pop().toLowerCase();
                            let mimeType = 'image/jpeg';
                            if (ext === 'png') mimeType = 'image/png';
                            else if (ext === 'gif') mimeType = 'image/gif';
                            else if (ext === 'bmp') mimeType = 'image/bmp';
                            else if (ext === 'webp') mimeType = 'image/webp';
                            
                            this.images.push({
                                path: file,
                                name: file.split('/').pop(),
                                base64: `data:${mimeType};base64,${base64.replace(/\n/g, '')}`
                            });
                        }
                    } catch (e) {
                        console.error('加载图片失败:', file, e);
                    }
                }
                
                hideLoading();
                
                if (this.images.length === 0) {
                    showSuccess('此目录没有图片');
                }
            } catch (error: any) {
                hideLoading();
                console.error('加载图片失败:', error);
                showError('加载图片失败: ' + error.message);
            }
        },

        selectDirectory() {
            openSoftKeyboard(
                () => this.currentPath,
                (value) => {
                    this.currentPath = value;
                    this.loadImages();
                    this.$forceUpdate();
                }
            );
        },

        openImage(image: ImageItem) {
            $falcon.navTo("imageViewer", { 
                file: image.path,
                base64: image.base64
            });
        },

        getParentPath(): string {
            const parts = this.currentPath.split('/');
            parts.pop();
            return parts.join('/') || '/';
        },

        goToParent() {
            this.currentPath = this.getParentPath();
            this.loadImages();
        }
    }
});

export default gallery;
