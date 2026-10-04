import { defineComponent } from 'vue';
import { Shell } from 'langningchen';

export type FileManagerOptions = {};

type FsItem = { name: string; isDir: boolean; size: string };

const VIDEO_EXT = ['mp4', 'mkv', 'avi', 'mov', 'flv', 'webm', '3gp', 'm4v', 'rmvb'];
const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];

const RAIL = [
    { page: 'index', icon: '🏠', label: '首页' },
    { page: 'ai', icon: '🤖', label: 'AI' },
    { page: 'fileManager', icon: '📁', label: '文件' },
    { page: 'videoPlayer', icon: '🎬', label: '视频' },
    { page: 'shell', icon: '⌨️', label: '终端' },
    { page: 'imageViewer', icon: '🖼️', label: '图片' },
    { page: 'update', icon: '⬇️', label: '更新' },
];

const fileManager = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<FileManagerOptions>,
            activeKey: 'fileManager',
            rail: RAIL,
            shellInitialized: false,
            currentDir: '/userdisk',
            items: [] as FsItem[],
        };
    },
    async mounted() {
        this.$page.$npage.setSupportBack(true);
        const backFn = () => { if (this.currentDir !== '/') this.parentDir(); else $falcon.navBack(); };
        this.$page.$npage.on('backpressed', backFn);
        try { await Shell.initialize(); this.shellInitialized = true; } catch (e) {}
        await this.loadDir(this.currentDir);
    },
    methods: {
        open(pageName: string) { $falcon.navTo(pageName, {}); },
        async loadDir(dir: string) {
            this.currentDir = dir;
            if (!this.shellInitialized) { this.items = []; return; }
            try {
                const out = await Shell.exec('ls -la "' + dir + '" 2>/dev/null || ls "' + dir + '" 2>/dev/null');
                if (!out) { this.items = []; return; }
                const list: FsItem[] = [];
                for (const line of out.split('\n')) {
                    const t = line.trim();
                    if (!t || t.startsWith('total') || t.startsWith('.')) continue;
                    // ls -la 输出: -rw-r--r-- 1 root root 1234 Oct 4 06:47 filename
                    const parts = t.split(/\s+/);
                    if (parts.length < 6) continue;
                    const name = parts.slice(parts.length - 1).join(' ');
                    if (name === '.' || name === '..') continue;
                    const isDir = t.startsWith('d');
                    const size = isDir ? '' : (parts[4] ? this.humanSize(parseInt(parts[4])) : '');
                    list.push({ name, isDir, size });
                }
                list.sort((a, b) => { if (a.isDir !== b.isDir) return a.isDir ? -1 : 1; return a.name.localeCompare(b.name); });
                this.items = list;
            } catch (e) { this.items = []; }
        },
        humanSize(b: number) {
            if (b < 1024) return b + 'B';
            if (b < 1024 * 1024) return (b / 1024).toFixed(1) + 'K';
            return (b / (1024 * 1024)).toFixed(1) + 'M';
        },
        parentDir() {
            if (this.currentDir === '/') return;
            const p = this.currentDir.substring(0, this.currentDir.lastIndexOf('/')) || '/';
            this.loadDir(p);
        },
        quickDir(d: string) { this.loadDir(d); },
        fileIcon(item: FsItem) {
            if (item.isDir) return '📁';
            const ext = (item.name.split('.').pop() || '').toLowerCase();
            if (VIDEO_EXT.includes(ext)) return '🎬';
            if (IMAGE_EXT.includes(ext)) return '🖼️';
            return '📄';
        },
        onItemClick(item: FsItem) {
            if (item.isDir) { this.loadDir(this.currentDir + '/' + item.name); return; }
            const ext = (item.name.split('.').pop() || '').toLowerCase();
            if (VIDEO_EXT.includes(ext)) { $falcon.navTo('videoPlayer', { file: this.currentDir + '/' + item.name }); return; }
            if (IMAGE_EXT.includes(ext)) { $falcon.navTo('imageViewer', { file: this.currentDir + '/' + item.name }); return; }
        }
    }
});

export default fileManager;
