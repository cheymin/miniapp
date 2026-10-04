import { defineComponent } from 'vue';
import { Shell } from 'langningchen';
import PageShell from '../../components/PageShell.vue';
import { showError, showInfo } from '../../components/ToastMessage';

export type FileManagerOptions = { directory?: string };

type FileItem = {
    name: string;
    path: string;
    isDir: boolean;
    size: string;
};

const VIDEO_EXT = ['mp4', 'mkv', 'avi', 'mov', 'flv', 'webm', '3gp', 'm4v', 'rmvb'];
const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];

const fileManager = defineComponent({
    components: { PageShell },
    data() {
        return {
            $page: {} as FalconPage<FileManagerOptions>,
            shellInitialized: false,
            currentDir: '/userdisk',
            items: [] as FileItem[],
            selectedPath: '',
        };
    },
    async mounted() {
        this.$page.$npage.setSupportBack(true);
        const backFn = () => {
            if (this.currentDir === '/') {
                $falcon.navBack();
            } else {
                const parent = this.currentDir.substring(0, this.currentDir.lastIndexOf('/')) || '/';
                this.currentDir = parent;
                this.scan();
            }
        };
        this.$page.$npage.on('backpressed', backFn);
        try {
            await Shell.initialize();
            this.shellInitialized = true;
        } catch (e) {
            showError('Shell 初始化失败');
            return;
        }
        const opts = this.$page.loadOptions;
        if (opts?.directory) this.currentDir = opts.directory;
        await this.scan();
    },
    methods: {
        async scan() {
            try {
                const out = await Shell.exec('ls -la "' + this.currentDir + '" 2>/dev/null');
                this.items = this.parseLs(out);
            } catch (e: any) {
                showError('扫描失败');
                this.items = [];
            }
        },
        parseLs(out: string): FileItem[] {
            const lines = (out || '').split('\n');
            const result: FileItem[] = [];
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                // 跳过 total/开头的 "." / ".."
                if (line.startsWith('total')) continue;
                const parts = line.split(/\s+/);
                if (parts.length < 9) continue;
                const perm = parts[0];
                const size = parts[4];
                const name = parts.slice(8).join(' ');
                if (name === '.' || name === '..') continue;
                const isDir = perm.startsWith('d');
                const path = this.currentDir === '/' ? '/' + name : this.currentDir + '/' + name;
                result.push({ name, path, isDir, size });
            }
            return result;
        },
        onItemClick(item: FileItem) {
            if (item.isDir) {
                this.currentDir = item.path;
                this.scan();
                return;
            }
            const ext = item.name.split('.').pop()?.toLowerCase() || '';
            if (VIDEO_EXT.indexOf(ext) >= 0) {
                $falcon.navTo('videoPlayer', { initialPath: item.path });
            } else if (IMAGE_EXT.indexOf(ext) >= 0) {
                $falcon.navTo('imageViewer', { initialPath: item.path, directory: this.currentDir });
            } else {
                showInfo('暂不支持此文件类型');
            }
        },
        parentDir() {
            if (this.currentDir === '/') return;
            const p = this.currentDir.substring(0, this.currentDir.lastIndexOf('/')) || '/';
            this.currentDir = p;
            this.scan();
        },
        async quickDir(p: string) {
            this.currentDir = p;
            await this.scan();
        },
        fileIcon(item: FileItem): string {
            if (item.isDir) return '📁';
            const ext = item.name.split('.').pop()?.toLowerCase() || '';
            if (VIDEO_EXT.indexOf(ext) >= 0) return '🎬';
            if (IMAGE_EXT.indexOf(ext) >= 0) return '🖼️';
            return '📄';
        }
    }
});

export default fileManager;
