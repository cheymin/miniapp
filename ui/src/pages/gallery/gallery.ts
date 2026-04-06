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

export type GalleryOptions = {};

interface ImageItem {
    path: string;
    name: string;
    thumbnail: string;
}

const gallery = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<GalleryOptions>,
            
            currentDirectory: '/userdisk' as string,
            imageList: [] as ImageItem[],
            showSettingsPanel: false as boolean,
            
            shellInitialized: false
        };
    },

    computed: {
        gridRows(): any[] {
            const rows = [];
            for (let i = 0; i < this.imageList.length; i += 3) {
                rows.push(this.imageList.slice(i, i + 3));
            }
            return rows;
        }
    },

    async mounted() {
        this.$page.$npage.on("backpressed", this.handleBackPress);
        await this.initializeShell();
    },
    
    beforeDestroy() {
        this.$page.$npage.off("backpressed", this.handleBackPress);
    },

    methods: {
        handleBackPress() {
            if (this.showSettingsPanel) {
                this.showSettingsPanel = false;
            } else {
                $falcon.navBack();
            }
        },
        
        toggleSettings() {
            this.showSettingsPanel = !this.showSettingsPanel;
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

        async scanImages() {
            if (!this.shellInitialized) {
                showError('Shell未初始化');
                return;
            }
            
            try {
                showLoading('正在扫描图片...');
                
                const cmd = `find "${this.currentDirectory}" -type f \\( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.gif" -o -iname "*.bmp" -o -iname "*.webp" \\) 2>/dev/null | sort`;
                
                const result = await Shell.exec(cmd);
                
                if (result && result.trim()) {
                    const paths = result.trim().split('\n').filter((path: string) => path);
                    
                    this.imageList = [];
                    
                    for (const path of paths) {
                        const name = path.split('/').pop() || '';
                        this.imageList.push({
                            path: path,
                            name: name,
                            thumbnail: ''
                        });
                    }
                    
                    showSuccess(`找到 ${this.imageList.length} 张图片`);
                    
                    this.loadThumbnails();
                } else {
                    this.imageList = [];
                    showError('未找到图片文件');
                }
            } catch (error: any) {
                console.error('扫描图片失败:', error);
                showError('扫描图片失败: ' + error.message);
            } finally {
                hideLoading();
            }
        },

        async loadThumbnails() {
            if (!this.shellInitialized) return;
            
            for (let i = 0; i < Math.min(this.imageList.length, 20); i++) {
                const item = this.imageList[i];
                try {
                    const thumbnail = await this.generateThumbnail(item.path);
                    if (thumbnail) {
                        this.imageList[i].thumbnail = thumbnail;
                    }
                } catch (e) {
                    console.error('生成缩略图失败:', e);
                }
            }
        },

        async generateThumbnail(imagePath: string): Promise<string> {
            if (!this.shellInitialized) return '';
            
            try {
                const ext = imagePath.split('.').pop()?.toLowerCase() || 'jpg';
                const mimeType = this.getMimeType(ext);
                
                let result = '';
                
                const encodingMethods = [
                    `perl -MMIME::Base64 -0777 -ne 'print encode_base64(\$_)' "${imagePath}"`,
                    `perl -e 'use MIME::Base64; open(F, "<", $ARGV[0]); binmode(F); local $/; print encode_base64(<F>);' "${imagePath}"`
                ];
                
                for (const cmd of encodingMethods) {
                    try {
                        result = await Shell.exec(cmd);
                        if (result && result.trim()) {
                            break;
                        }
                    } catch (e) {
                        continue;
                    }
                }
                
                if (result && result.trim()) {
                    const base64Data = result.trim().replace(/\s/g, '');
                    return `data:${mimeType};base64,${base64Data}`;
                }
            } catch (error: any) {
                console.error('生成缩略图失败:', error);
            }
            
            return '';
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

        openImage(index: number) {
            const item = this.imageList[index];
            if (item) {
                $falcon.navTo("imageViewer", {
                    initialPath: item.path,
                    directory: this.currentDirectory
                });
            }
        }
    }
});

export default gallery;
