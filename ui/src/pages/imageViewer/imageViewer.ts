import { defineComponent } from 'vue';
import { Shell } from 'langningchen';
import PageShell from '../../components/PageShell.vue';
import { showError } from '../../components/ToastMessage';

export type ViewerOptions = { initialPath?: string; directory?: string };

const IMG_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];

const imageViewer = defineComponent({
    components: { PageShell },
    data() {
        return {
            $page: {} as FalconPage<ViewerOptions>,
            shellReady: false,
            allPaths: [] as string[],
            currentIndex: 0,
            src: '' as string,
            scale: 1.0,
            panX: 0,
            panY: 0,
            touchStartX: 0,
            touchStartY: 0,
            startPanX: 0,
            startPanY: 0,
            startDist: 0,
            startScale: 1.0,
        };
    },
    async mounted() {
        this.$page.$npage.setSupportBack(true);
        const backFn = () => $falcon.navBack();
        this.$page.$npage.on('backpressed', backFn);
        try {
            await Shell.initialize();
            this.shellReady = true;
        } catch (e) { /* ignore */ }
        const opts = this.$page.loadOptions;
        if (opts?.directory) await this.scanDir(opts.directory);
        if (opts?.initialPath) {
            this.src = opts.initialPath;
            const idx = this.allPaths.indexOf(opts.initialPath);
            if (idx >= 0) this.currentIndex = idx;
        }
    },
    methods: {
        async scanDir(dir: string) {
            try {
                let files: string[] = [];
                for (let i = 0; i < IMG_EXTS.length; i++) {
                    const out = await Shell.exec('find "' + dir + '" -maxdepth 2 -type f -iname "*.' + IMG_EXTS[i] + '" 2>/dev/null');
                    const arr = (out || '').split('\n').filter((s: string) => s.trim());
                    files = files.concat(arr);
                }
                this.allPaths = files;
            } catch (e) { this.allPaths = []; }
        },
        async scanQuick() {
            await this.scanDir('/userdisk');
        },
        prev() {
            if (this.currentIndex > 0) {
                this.currentIndex--;
                this.src = this.allPaths[this.currentIndex];
                this.scale = 1.0;
                this.panX = 0; this.panY = 0;
            }
        },
        next() {
            if (this.currentIndex < this.allPaths.length - 1) {
                this.currentIndex++;
                this.src = this.allPaths[this.currentIndex];
                this.scale = 1.0;
                this.panX = 0; this.panY = 0;
            }
        },
        reset() { this.scale = 1.0; this.panX = 0; this.panY = 0; },
        zoomIn() { if (this.scale < 6.0) { this.scale = Math.min(6.0, this.scale + 0.5); this.$forceUpdate(); } },
        zoomOut() { if (this.scale > 0.5) { this.scale = Math.max(0.5, this.scale - 0.5); this.$forceUpdate(); } },
        getDist(a: any, b: any): number {
            const dx = a.clientX - b.clientX, dy = a.clientY - b.clientY;
            return Math.sqrt(dx * dx + dy * dy);
        },
        onTouchStart(e: any) {
            const t = e.touches;
            if (t && t.length >= 2) {
                this.startDist = this.getDist(t[0], t[1]);
                this.startScale = this.scale;
            } else if (t && t.length === 1) {
                this.touchStartX = t[0].clientX;
                this.touchStartY = t[0].clientY;
                this.startPanX = this.panX;
                this.startPanY = this.panY;
            }
        },
        onTouchMove(e: any) {
            const t = e.touches;
            if (t && t.length >= 2 && this.startDist > 0) {
                const r = this.getDist(t[0], t[1]) / this.startDist;
                this.scale = Math.max(0.5, Math.min(6.0, this.startScale * r));
                this.$forceUpdate();
            } else if (t && t.length === 1) {
                this.panX = this.startPanX + (t[0].clientX - this.touchStartX);
                this.panY = this.startPanY + (t[0].clientY - this.touchStartY);
                this.$forceUpdate();
            }
        },
        onTouchEnd() {
            this.startDist = 0;
        },
        indexLabel(): string {
            if (this.allPaths.length === 0) return '';
            return (this.currentIndex + 1) + '/' + this.allPaths.length;
        }
    }
});

export default imageViewer;
