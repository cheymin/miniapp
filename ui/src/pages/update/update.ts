import { defineComponent } from 'vue';
import { Shell } from 'langningchen';

export type UpdateOptions = {};

const CURRENT_VERSION = '1.2.58';
const REPO_OWNER = 'min';
const REPO_NAME = 'miniapp';

const RAIL = [
    { page: 'index', icon: '🏠', label: '首页' },
    { page: 'ai', icon: '🤖', label: 'AI' },
    { page: 'fileManager', icon: '📁', label: '文件' },
    { page: 'videoPlayer', icon: '🎬', label: '视频' },
    { page: 'shell', icon: '⌨️', label: '终端' },
    { page: 'imageViewer', icon: '🖼️', label: '图片' },
    { page: 'update', icon: '⬇️', label: '更新' },
];

type Status = 'idle' | 'checking' | 'available' | 'downloading' | 'installing' | 'updated' | 'error';

const updatePage = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<UpdateOptions>,
            activeKey: 'update',
            rail: RAIL,
            currentVersion: CURRENT_VERSION,
            latestVersion: '',
            releaseNotes: '',
            assetUrl: '',
            status: 'idle' as Status,
        };
    },
    async mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on('backpressed', () => $falcon.navBack());
        await Shell.initialize().catch(() => {});
    },
    methods: {
        open(pageName: string) { $falcon.navTo(pageName, {}); },
        statusText() {
            switch (this.status) {
                case 'idle': return '等待检查';
                case 'checking': return '正在检查...';
                case 'available': return '有新版本可用！';
                case 'downloading': return '正在下载...';
                case 'installing': return '正在安装...';
                case 'updated': return '已是最新版本';
                case 'error': return '检查失败，请稍后重试';
            }
            return '';
        },
        async checkUpdate() {
            this.status = 'checking';
            try {
                const proxy = 'https://ghproxy.net/';
                const apiUrl = proxy + 'https://api.github.com/repos/' + REPO_OWNER + '/' + REPO_NAME + '/releases/latest';
                let body = '';
                try {
                    body = await $falcon.jsapi.http.get(apiUrl);
                } catch (e) {
                    // try curl fallback
                    body = await Shell.exec('curl -sL "' + apiUrl + '" 2>/dev/null | head -c 4096');
                }
                if (!body) throw new Error('no response');
                const json = JSON.parse(body);
                const ver = (json.tag_name || '').replace(/^v/, '');
                const notes = json.body || '';
                const asset = (json.assets || []).find((a: any) => a.name && a.name.endsWith('.amr'));
                this.latestVersion = ver;
                this.releaseNotes = notes;
                if (asset) this.assetUrl = proxy + asset.browser_download_url;
                if (this.compareVer(ver, this.currentVersion) > 0) {
                    this.status = 'available';
                } else {
                    this.status = 'updated';
                }
            } catch (e: any) {
                this.status = 'error';
                this.releaseNotes = '错误: ' + (e.message || String(e));
            }
        },
        compareVer(a: string, b: string) {
            const pa = a.split('.').map(n => parseInt(n, 10));
            const pb = b.split('.').map(n => parseInt(n, 10));
            for (let i = 0; i < 3; i++) {
                const va = pa[i] || 0, vb = pb[i] || 0;
                if (va !== vb) return va - vb;
            }
            return 0;
        },
        async downloadAndInstall() {
            if (!this.assetUrl) return;
            this.status = 'downloading';
            const dest = '/userdisk/update.amr';
            try {
                await Shell.exec('curl -sL -o "' + dest + '" "' + this.assetUrl + '"');
                this.status = 'installing';
                await Shell.exec('aiot install "' + dest + '"');
                this.status = 'updated';
            } catch (e: any) {
                this.status = 'error';
                this.releaseNotes = '安装失败: ' + (e.message || String(e));
            }
        },
        async doTestCurl() {
            try {
                const out = await Shell.exec('curl -sI https://github.com 2>&1 | head -3');
                this.releaseNotes = 'curl 测试:\n' + out;
            } catch (e: any) {
                this.releaseNotes = 'curl 失败: ' + (e.message || String(e));
            }
        }
    }
});

export default updatePage;
