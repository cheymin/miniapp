// imageViewer — 修复版, 永不黑屏
// 策略: 直接渲染原图 (Falcon resize="contain" 自动缩到容器内),
//       手势: 单指平移 / 双指 pinch / 双击切换 1x ↔ 2.5x
//       所有状态改变都在 mounted 里设置默认值, 保证模板永远有东西渲染

import { defineComponent } from 'vue';
import { Shell } from 'langningchen';
import { showError } from '../../components/ToastMessage';

export type ViewerOptions = {
    initialPath?: string;
    allPaths?: string[];
    directory?: string;
};

const VIEW_DIR = '/tmp/viewer_imgs';
const IMG_AREA_W = 576;   // 640 * 0.9
const IMG_AREA_H = 260;

const imageViewer = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<ViewerOptions>,
            allPaths: [] as string[],
            currentIndex: 0,
            // 渲染相关 (永远有默认值)
            src: '' as string,
            scale: 1.0,
            panX: 0,
            panY: 0,
            // 手势
            touchStartX: 0,
            touchStartY: 0,
            panStartX: 0,
            panStartY: 0,
            startDist: 0,
            startScale: 1.0,
            lastTapTime: 0,
            tapCount: 0,
            // 初始化状态
            shellReady: false,
            initialized: false,
        };
    },

    computed: {
        indexLabel(): string {
            return `${this.currentIndex + 1}/${this.allPaths.length}`;
        },
        percentLabel(): string {
            return Math.round(this.scale * 100) + '%';
        },
        imageStyle(): { [k: string]: any } {
            return {
                transform: 'translate(' + this.panX + 'px, ' + this.panY + 'px) scale(' + this.scale + ')',
                width: IMG_AREA_W + 'px',
                height: IMG_AREA_H + 'px',
            };
        },
    },

    async mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on('backpressed', () => this.close());

        // Shell 可选 (失败也没关系)
        try {
            await Shell.initialize();
            this.shellReady = true;
            try { await Shell.exec('mkdir -p ' + VIEW_DIR); } catch (e) {}
        } catch (e) { /* 静默 */ }

        const opts = this.$page.loadOptions;
        if (opts && opts.allPaths && opts.allPaths.length > 0) {
            this.allPaths = opts.allPaths.slice();
            if (opts.initialPath) {
                const idx = this.allPaths.indexOf(opts.initialPath);
                this.currentIndex = idx >= 0 ? idx : 0;
            }
        } else if (opts && opts.initialPath) {
            this.allPaths = [opts.initialPath];
            this.currentIndex = 0;
        } else if (opts && opts.directory) {
            await this.scanDir(opts.directory, opts.initialPath || '');
        }

        // 设置初始 src (永不空!)
        if (this.allPaths.length > 0) {
            this.src = this.allPaths[this.currentIndex];
            this.initialized = true;
        }
    },

    methods: {
        async scanDir(dir: string, target: string) {
            if (!this.shellReady) { this.allPaths = []; return; }
            try {
                const out = await Shell.exec(
                    `find "${dir}" -type f ` +
                    `\\( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" ` +
                    `-o -iname "*.gif" -o -iname "*.bmp" \\) 2>/dev/null | sort`
                );
                this.allPaths = (out || '').trim().split('\n').filter((s: string) => s);
                if (target) {
                    const idx = this.allPaths.indexOf(target);
                    this.currentIndex = idx >= 0 ? idx : 0;
                }
            } catch (e) { /* 静默 */ }
        },

        resetTransform() {
            this.scale = 1.0;
            this.panX = 0;
            this.panY = 0;
        },

        clampPan() {
            if (this.scale <= 1.05) { this.panX = 0; this.panY = 0; return; }
            const maxPanX = (IMG_AREA_W * (this.scale - 1)) / 2;
            const maxPanY = (IMG_AREA_H * (this.scale - 1)) / 2;
            this.panX = Math.max(-maxPanX, Math.min(maxPanX, this.panX));
            this.panY = Math.max(-maxPanY, Math.min(maxPanY, this.panY));
        },

        clampScale() {
            this.scale = Math.max(0.5, Math.min(6.0, this.scale));
            if (Math.abs(this.scale - 1.0) < 0.02) this.scale = 1.0;
        },

        getDist(a: any, b: any): number {
            const dx = (a.clientX || a.x || 0) - (b.clientX || b.x || 0);
            const dy = (a.clientY || a.y || 0) - (b.clientY || b.y || 0);
            return Math.sqrt(dx * dx + dy * dy);
        },

        onTouchStart(e: any) {
            const t = e.touches || [];
            const now = Date.now();

            // 双击检测 (300ms 内两次)
            if (t.length === 1) {
                if (now - this.lastTapTime < 300 && this.scale === 1.0) {
                    this.scale = 2.5;
                    this.panX = 0;
                    this.panY = 0;
                } else if (now - this.lastTapTime < 300 && this.scale > 1.05) {
                    this.resetTransform();
                }
                this.lastTapTime = now;
            }

            if (t.length >= 2) {
                this.startDist = this.getDist(t[0], t[1]);
                this.startScale = this.scale;
            } else if (t.length === 1) {
                this.touchStartX = t[0].clientX || t[0].x || 0;
                this.touchStartY = t[0].clientY || t[0].y || 0;
                this.panStartX = this.panX;
                this.panStartY = this.panY;
            }
        },

        onTouchMove(e: any) {
            const t = e.touches || [];

            if (t.length >= 2 && this.startDist > 0) {
                // 双指缩放
                const d = this.getDist(t[0], t[1]);
                const ratio = d / this.startDist;
                this.scale = this.startScale * ratio;
                this.clampScale();
                this.$forceUpdate();
            } else if (t.length === 1 && this.scale > 1.02) {
                // 单指平移 (只在放大时)
                const x = t[0].clientX || t[0].x || 0;
                const y = t[0].clientY || t[0].y || 0;
                this.panX = this.panStartX + (x - this.touchStartX);
                this.panY = this.panStartY + (y - this.touchStartY);
                this.clampPan();
                this.$forceUpdate();
            }
        },

        onTouchEnd(e: any) {
            const t = e.touches || [];
            if (t.length < 2) this.startDist = 0;
            if (t.length === 0) this.clampPan();
        },

        zoomIn() {
            this.scale = Math.min(6.0, this.scale * 1.25);
            this.clampScale();
            this.$forceUpdate();
        },
        zoomOut() {
            this.scale = Math.max(0.5, this.scale / 1.25);
            this.clampScale();
            this.clampPan();
            this.$forceUpdate();
        },
        prevImage() {
            if (this.allPaths.length === 0) return;
            this.currentIndex = (this.currentIndex - 1 + this.allPaths.length) % this.allPaths.length;
            this.src = this.allPaths[this.currentIndex];
            this.resetTransform();
        },
        nextImage() {
            if (this.allPaths.length === 0) return;
            this.currentIndex = (this.currentIndex + 1) % this.allPaths.length;
            this.src = this.allPaths[this.currentIndex];
            this.resetTransform();
        },
        close() {
            $page.finish();
        },
    },
});

export default imageViewer;
