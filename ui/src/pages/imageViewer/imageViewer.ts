import { defineComponent } from 'vue';
import { Shell } from 'langningchen';

export type ImageViewerOptions = { file?: string };

const IMG_EXT = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];

const RAIL = [
    { page: 'index', icon: '🏠', label: '首页' },
    { page: 'ai', icon: '🤖', label: 'AI' },
    { page: 'fileManager', icon: '📁', label: '文件' },
    { page: 'videoPlayer', icon: '🎬', label: '视频' },
    { page: 'shell', icon: '⌨️', label: '终端' },
    { page: 'imageViewer', icon: '🖼️', label: '图片' },
    { page: 'update', icon: '⬇️', label: '更新' },
];

const imageViewer = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<ImageViewerOptions>,
            activeKey: 'imageViewer',
            rail: RAIL,
            images: [] as string[],
            index: 0,
            src: '',
            scale: 1,
            panX: 0,
            panY: 0,
        };
    },
    async mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on('backpressed', () => $falcon.navBack());
        await Shell.initialize().catch(() => {});
        const opts = this.$page.$options || (this.$page as any).options || {};
        if (opts.file) {
            this.images = [opts.file]; this.src = opts.file;
        } else {
            await this.scanQuick();
        }
    },
    methods: {
        open(pageName: string) { $falcon.navTo(pageName, {}); },
        indexLabel() { return this.images.length ? (this.index + 1) + '/' + this.images.length : '0/0'; },
        async scanQuick() {
            try {
                const out = await Shell.exec('find /userdisk -maxdepth 4 -type f \\( ' +
                    IMG_EXT.map(e => `-iname '*.${e}'`).join(' -o ') + ' \\) 2>/dev/null | head -20');
                if (!out) return;
                this.images = out.split('\n').map(s => s.trim()).filter(s => s);
                if (this.images.length > 0) this.src = this.images[0];
            } catch (e) {}
        },
        prev() { if (this.images.length === 0) return; this.index = (this.index - 1 + this.images.length) % this.images.length; this.src = this.images[this.index]; this.reset(); },
        next() { if (this.images.length === 0) return; this.index = (this.index + 1) % this.images.length; this.src = this.images[this.index]; this.reset(); },
        zoomIn() { this.scale = Math.min(4, this.scale + 0.25); },
        zoomOut() { this.scale = Math.max(0.5, this.scale - 0.25); },
        reset() { this.scale = 1; this.panX = 0; this.panY = 0; },
    }
});

export default imageViewer;
