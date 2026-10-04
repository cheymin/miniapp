import { defineComponent } from 'vue';
import { Shell } from 'langningchen';
import PageShell from '../../components/PageShell.vue';
import { showError, showSuccess } from '../../components/ToastMessage';
import { hideLoading, showLoading } from '../../components/Loading';

export type UpdateOptions = {};

const GITHUB_OWNER = 'cheymin';
const REPO = 'miniapp';
const CURRENT_VERSION = '1.2.58';

const updatePage = defineComponent({
    components: { PageShell },
    data() {
        return {
            $page: {} as FalconPage<UpdateOptions>,
            shellReady: false,
            status: 'idle' as 'idle' | 'checking' | 'available' | 'downloading' | 'installing' | 'updated' | 'error',
            errorMsg: '',
            currentVersion: CURRENT_VERSION,
            latestVersion: '',
            releaseNotes: '',
            downloadUrl: '',
            progress: 0,
        };
    },
    async mounted() {
        this.$page.$npage.setSupportBack(true);
        const backFn = () => $falcon.navBack();
        this.$page.$npage.on('backpressed', backFn);
        try { await Shell.initialize(); this.shellReady = true; } catch (e) {}
    },
    methods: {
        async checkUpdate() {
            this.status = 'checking';
            this.errorMsg = '';
            try {
                // GitHub Releases API — HTTPS 可能 TLS 挂，降级 HTTP 代理
                let apiUrl = 'http://ghproxy.net/https://api.github.com/repos/' + GITHUB_OWNER + '/' + REPO + '/releases/latest';
                let resp: any = null;
                try {
                    resp = await $falcon.jsapi.http.request({ url: apiUrl, timeout: 8 });
                } catch (e) {
                    // fallback: curl 降级
                    const out = await Shell.exec('curl -sL "' + apiUrl + '" 2>/dev/null | head -c 2000');
                    if (!out || !out.trim()) throw new Error('网络请求失败');
                    try { resp = { data: JSON.parse(out) }; } catch (e2) { throw new Error('JSON 解析失败'); }
                }
                const data = resp?.data;
                if (!data || !data.tag_name) throw new Error('未找到 release');
                this.latestVersion = (data.tag_name || '').replace(/^v/, '');
                this.releaseNotes = (data.body || '').substring(0, 200);

                // 找 .amr 资产
                const assets = data.assets || [];
                let amr = null;
                for (let i = 0; i < assets.length; i++) {
                    if ((assets[i].name || '').endsWith('.amr')) { amr = assets[i]; break; }
                }
                if (!amr) throw new Error('未找到 .amr 安装包');
                this.downloadUrl = amr.browser_download_url;
                this.status = this.latestVersion !== this.currentVersion ? 'available' : 'updated';
            } catch (e: any) {
                this.status = 'error';
                this.errorMsg = (e && e.message) ? e.message : String(e);
            }
        },
        async downloadAndInstall() {
            if (!this.downloadUrl) { showError('无下载链接'); return; }
            this.status = 'downloading';
            try {
                const proxyUrl = 'http://ghproxy.net/' + this.downloadUrl;
                const savePath = '/userdisk/Favorite/miniapp_update.amr';
                await Shell.exec('rm -f "' + savePath + '"');
                // 用 curl -L 跟随重定向，-o 输出到文件
                await Shell.exec('curl -sL -o "' + savePath + '" "' + proxyUrl + '"');
                const check = await Shell.exec('ls -la "' + savePath + '"');
                if (!check.trim()) throw new Error('下载后文件不存在');
                this.status = 'installing';
                // 安装
                const instOut = await Shell.exec('miniapp_cli install "' + savePath + '" 2>&1 || true');
                // miniapp_cli 安装后可能自动重启 app
                showSuccess('安装命令已执行');
                this.status = 'updated';
            } catch (e: any) {
                this.status = 'error';
                this.errorMsg = (e && e.message) ? e.message : String(e);
                showError('更新失败: ' + this.errorMsg);
            }
        },
        statusText(): string {
            switch (this.status) {
                case 'idle': return '等待检查';
                case 'checking': return '检查中...';
                case 'available': return '有新版本 ✨';
                case 'downloading': return '下载中...';
                case 'installing': return '安装中...';
                case 'updated': return '已是最新 ✅';
                case 'error': return '❌ ' + this.errorMsg;
                default: return '';
            }
        },
        doTestCurl() {
            Shell.exec('curl -sI "http://ghproxy.net/https://github.com" 2>&1 | head -5');
        }
    }
});

export default updatePage;
