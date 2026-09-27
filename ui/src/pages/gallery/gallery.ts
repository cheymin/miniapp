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

export type GalleryOptions = {
    directory?: string;
};

interface ImageItem {
    path: string;
    name: string;
    thumbPath: string;   // ffmpeg 生成的缩略图 jpg 路径（文件路径，不走 base64）
    loaded: boolean;
}

// 缩略图输出目录
const THUMB_DIR = '/tmp/gallery_thumbs';
// 缩略图宽度（横屏 640，3 列约 200px，稍大一点保证清晰）
const THUMB_W = 240;
// 缩略图质量（1-31，越小越好）
const THUMB_Q = 5;
// 同时预加载的数量
const BATCH_SIZE = 6;

const gallery = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<GalleryOptions>,

            currentDirectory: '/userdisk/Pictures' as string,
            imageList: [] as ImageItem[],
            showSettings: false as boolean,
            isLoading: false,
            scanProgress: '',
            shellInitialized: false,
        };
    },

    computed: {
        gridRows(): ImageItem[][] {
            const rows: ImageItem[][] = [];
            for (let i = 0; i < this.imageList.length; i += 3) {
                rows.push(this.imageList.slice(i, i + 3));
            }
            return rows;
        },
    },

    async mounted() {
        this.$page.$npage.on('backpressed', () => {
            if (this.showSettings) {
                this.showSettings = false;
            } else {
                $falcon.navBack();
            }
        });

        try {
            await Shell.initialize();
            this.shellInitialized = true;
        } catch (e) {
            showError('Shell 初始化失败');
            return;
        }

        const options = this.$page.loadOptions;
        if (options.directory) {
            this.currentDirectory = options.directory;
        }

        // 初始化缩略图目录
        try { await Shell.exec(`mkdir -p ${THUMB_DIR}`); } catch (e) { /* ignore */ }

        await this.scanImages();
    },

    beforeDestroy() {
        // 清理临时缩略图（可选，保留也行占不了多少空间）
        // try { Shell.exec(`rm -rf ${THUMB_DIR}`); } catch (e) { /* ignore */ }
    },

    methods: {
        async scanImages() {
            if (!this.shellInitialized) return;

            showLoading('扫描目录...');
            this.scanProgress = '扫描文件';

            try {
                // 找到所有图片
                const cmd = `find "${this.currentDirectory}" -type f \\( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.gif" -o -iname "*.bmp" -o -iname "*.webp" \\) 2>/dev/null | sort`;
                const result = await Shell.exec(cmd);

                if (!result || !result.trim()) {
                    this.imageList = [];
                    hideLoading();
                    showInfo('目录下没有图片');
                    return;
                }

                const paths = result.trim().split('\n').filter((p: string) => p);
                this.imageList = [];

                // 先构造列表（thumbPath 先用空，loaded=false）
                for (const p of paths) {
                    const ext = p.split('.').pop()?.toLowerCase() || 'jpg';
                    const name = p.split('/').pop() || p;
                    // 用文件路径 hash 做文件名（防止特殊字符）
                    const hash = this.simpleHash(p);
                    const thumbPath = `${THUMB_DIR}/t_${hash}_${THUMB_W}.jpg`;
                    this.imageList.push({
                        path: p,
                        name,
                        thumbPath,
                        loaded: false,
                    });
                }

                hideLoading();
                showSuccess(`发现 ${this.imageList.length} 张图片`);

                // 后台生成缩略图（异步不阻塞 UI）
                this.generateThumbs();
            } catch (e: any) {
                hideLoading();
                showError('扫描失败: ' + (e.message || e));
            }
        },

        simpleHash(s: string): string {
            let h = 0;
            for (let i = 0; i < s.length; i++) {
                h = ((h << 5) - h + s.charCodeAt(i)) | 0;
            }
            return Math.abs(h).toString(36);
        },

        async generateThumbs() {
            if (!this.shellInitialized) return;
            // 只生成前 12 张（一屏 + 一屏），滚动时再按需生成
            const maxOnScreen = 12;
            const targets = this.imageList.slice(0, maxOnScreen);

            for (let i = 0; i < targets.length; i++) {
                const item = targets[i];
                if (item.loaded) continue;

                // 先检查文件是否已经生成过
                try {
                    const check = await Shell.exec(`test -f "${item.thumbPath}" && echo ok || echo no`);
                    if (check && check.trim() === 'ok') {
                        item.loaded = true;
                        continue;
                    }
                } catch (e) { /* ignore */ }

                try {
                    // ffmpeg 生成缩略图（自动缩到 THUMB_W 宽，高度等比）
                    const ffmpegCmd = `ffmpeg -y -i "${item.path}" -vf "scale=${THUMB_W}:-1" -q:v ${THUMB_Q} "${item.thumbPath}" 2>/dev/null`;
                    await Shell.exec(ffmpegCmd);
                    item.loaded = true;
                } catch (e) {
                    // ffmpeg 失败（可能 gif/webp 不支持），用 perl 兜底生成小图
                    try {
                        const fallback = this.getFallbackCmd(item.path, item.thumbPath);
                        await Shell.exec(fallback);
                        item.loaded = true;
                    } catch (e2) {
                        // 彻底失败
                    }
                }

                // 每 3 张更新一下 UI（让缩略图显现）
                if ((i + 1) % 3 === 0) {
                    this.$forceUpdate();
                }
            }
            this.$forceUpdate();
        },

        getFallbackCmd(src: string, dst: string): string {
            // Perl 用 GD 或 ImageMagick？没有的话直接 cp 原文件，Falcon 自己会缩
            // 这里用最简单的：直接 perl 拷贝
            return `cp "${src}" "${dst}" 2>/dev/null || perl -e 'open(F,"<","${src}");open(G,">","${dst}");binmode F;binmode G;while(read(F,$b,4096)){print G $b}'`;
        },

        async generateMoreThumbs(fromIndex: number, count: number) {
            const targets = this.imageList.slice(fromIndex, fromIndex + count);
            for (const item of targets) {
                if (item.loaded) continue;
                try {
                    const ffmpegCmd = `ffmpeg -y -i "${item.path}" -vf "scale=${THUMB_W}:-1" -q:v ${THUMB_Q} "${item.thumbPath}" 2>/dev/null`;
                    await Shell.exec(ffmpegCmd);
                    item.loaded = true;
                } catch (e) { /* ignore */ }
            }
            this.$forceUpdate();
        },

        toggleSettings() {
            this.showSettings = !this.showSettings;
        },

        async selectDirectory() {
            openSoftKeyboard(
                () => this.currentDirectory,
                async (value: string) => {
                    this.currentDirectory = value;
                    this.showSettings = false;
                    // 清理旧缩略图
                    try { await Shell.exec(`rm -rf ${THUMB_DIR} && mkdir -p ${THUMB_DIR}`); } catch (e) { /* ignore */ }
                    await this.scanImages();
                }
            );
        },

        openImage(index: number) {
            const item = this.imageList[index];
            if (!item) return;
            $falcon.navTo('imageViewer', {
                initialPath: item.path,
                directory: this.currentDirectory,
                allPaths: this.imageList.map((it: ImageItem) => it.path),
            });
        },

        onGridScroll(e: any) {
            if (!e || !e.contentOffset) return;
            // 简单检测：滚到末尾时再生成一批
            const offsetY = e.contentOffset.y || 0;
            const scrollH = e.contentSize ? e.contentSize.height : 0;
            const viewH = 260;

            if (scrollH > 0 && offsetY + viewH >= scrollH - 60) {
                // 找到第一个未加载的索引
                let firstUnloaded = -1;
                for (let i = 0; i < this.imageList.length; i++) {
                    if (!this.imageList[i].loaded) {
                        firstUnloaded = i;
                        break;
                    }
                }
                if (firstUnloaded >= 0) {
                    this.generateMoreThumbs(firstUnloaded, BATCH_SIZE);
                }
            }
        },
    },
});

export default gallery;
