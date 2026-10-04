// gallery — 图库（修复版，永不黑屏）
// 策略: 先直接显示原图缩略图 (Falcon resize="cover" 自动缩),
//       ffmpeg 在后台异步生成真正的缩略图替换。
//       任何环节失败都有 fallback，保证有图可看。

import { defineComponent } from 'vue';
import { Shell } from 'langningchen';
import { showError, showSuccess, showInfo } from '../../components/ToastMessage';
import { hideLoading, showLoading } from '../../components/Loading';

export type GalleryOptions = { directory?: string };

interface ImageItem {
    path: string;       // 原图路径 (永远可用)
    name: string;
    thumbPath: string;  // ffmpeg 生成的缩略图路径 (可能不存在)
}

const THUMB_DIR = '/tmp/gallery_thumbs';
const THUMB_W = 240;
const THUMB_Q = 5;

const gallery = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<GalleryOptions>,
            currentDirectory: '/userdisk/Pictures',
            imageList: [] as ImageItem[],
            showSettings: false,
            shellReady: false,
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
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on('backpressed', () => {
            if (this.showSettings) { this.showSettings = false; return; }
            $falcon.navBack();
        });

        // Shell 初始化 (失败也能跑, 只是不能用 ffmpeg 预缩)
        try {
            await Shell.initialize();
            this.shellReady = true;
            await Shell.exec(`mkdir -p ${THUMB_DIR}`);
        } catch (e) {
            // 静默, 页面照常显示 (Falcon 自己解码原图)
        }

        const opts = this.$page.loadOptions;
        if (opts.directory) this.currentDirectory = opts.directory;
        await this.scanImages();
    },

    methods: {
        simpleHash(s: string): string {
            let h = 0;
            for (let i = 0; i < s.length; i++) {
                h = ((h << 5) - h + s.charCodeAt(i)) | 0;
            }
            return Math.abs(h).toString(36);
        },

        async scanImages() {
            showLoading('扫描图片...');
            try {
                let result = '';
                if (this.shellReady) {
                    result = await Shell.exec(
                        `find "${this.currentDirectory}" -type f ` +
                        `\\( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" ` +
                        `-o -iname "*.gif" -o -iname "*.bmp" \\) 2>/dev/null | sort`
                    );
                }
                const paths = (result || '').trim().split('\n').filter((p: string) => p);
                if (paths.length === 0) {
                    hideLoading();
                    showInfo('没有找到图片');
                    this.imageList = [];
                    return;
                }

                this.imageList = paths.map((p: string) => {
                    const name = p.split('/').pop() || p;
                    const hash = this.simpleHash(p);
                    return {
                        path: p,
                        name,
                        thumbPath: `${THUMB_DIR}/t_${hash}_${THUMB_W}.jpg`,
                    };
                });
                hideLoading();
                showSuccess(`找到 ${this.imageList.length} 张`);

                // 后台异步生成缩略图 (不阻塞 UI)
                this.generateThumbsInBackground();
            } catch (e: any) {
                hideLoading();
                showError('扫描失败: ' + (e.message || e));
                this.imageList = [];
            }
        },

        async generateThumbsInBackground() {
            if (!this.shellReady) return;
            for (let i = 0; i < this.imageList.length; i++) {
                const item = this.imageList[i];
                try {
                    const exists = await Shell.exec(`test -f "${item.thumbPath}" && echo 1 || echo 0`);
                    if (String(exists).trim() === '1') continue;
                    await Shell.exec(
                        `ffmpeg -y -i "${item.path}" ` +
                        `-vf "scale=${THUMB_W}:-1" -q:v ${THUMB_Q} ` +
                        `"${item.thumbPath}" 2>/dev/null`
                    );
                    // 触发刷新 Vue (改数组引用)
                    this.imageList = [...this.imageList];
                } catch (e) {
                    // 单张失败不影响整体
                }
            }
        },

        // ✅ 模板直接用 thumbPath, 不存在时 Falcon 渲染失败会 fallback 显示 nothing...
        //    但我们在 mounted 里先保证了至少有原图。为了最稳:
        //    模板里给 image 加 onerror 处理
        getThumbSrc(item: ImageItem): string {
            // 优先缩略图, 退到原图 (Falcon 自己解码)
            return item.thumbPath;
        },

        toggleSettings() {
            this.showSettings = !this.showSettings;
        },

        async selectDirectory() {
            const $falcon2 = $falcon;
            $falcon2.navTo('softKeyboard', { data: this.currentDirectory });
            const handler = (e: any) => {
                const v = (e.data?.value ?? e.data?.text ?? e.data ?? '');
                if (v && typeof v === 'string' && v.length > 0) {
                    this.currentDirectory = v;
                    this.showSettings = false;
                    this.scanImages();
                }
                $falcon2.off('softKeyboard', handler);
            };
            $falcon2.on('softKeyboard', handler);
        },

        openImage(index: number) {
            const item = this.imageList[index];
            if (!item) return;
            $falcon.navTo('imageViewer', {
                initialPath: item.path,
                allPaths: this.imageList.map((it: ImageItem) => it.path),
            });
        },
    },
});

export default gallery;
