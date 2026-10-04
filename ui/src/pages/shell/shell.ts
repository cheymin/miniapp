import { defineComponent } from 'vue';
import { Shell } from 'langningchen';

export type ShellOptions = {};

type Line = { type: string; text: string; key: number };

const PROMPT = '# ';
const RAIL = [
    { page: 'index',       icon: '🏠', label: '首页' },
    { page: 'ai',          icon: '🤖', label: 'AI' },
    { page: 'fileManager', icon: '📁', label: '文件' },
    { page: 'videoPlayer', icon: '🎬', label: '视频' },
    { page: 'shell',       icon: '⌨️', label: '终端' },
    { page: 'imageViewer', icon: '🖼️', label: '图片' },
    { page: 'update',      icon: '⬇️', label: '更新' },
];

const shellPage = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<ShellOptions>,
            rail: RAIL,
            shellInitialized: false,
            currentPrompt: PROMPT,
            lines: [] as Line[],
            cwd: '/',
            lineKey: 0,
        };
    },
    async mounted() {
        this.$page.$npage.setSupportBack(true);
        const backFn = () => $falcon.navBack();
        this.$page.$npage.on('backpressed', backFn);
        try {
            await Shell.initialize();
            this.shellInitialized = true;
            this.addLine('system', 'Shell 就绪 · 点击下方命令执行');
        } catch (e) {
            this.addLine('error', 'Shell 初始化失败');
        }
    },
    methods: {
        open(pageName: string) { $falcon.navTo(pageName, {}); },
        addLine(type: string, text: string) {
            this.lines.push({ type, text, key: this.lineKey++ });
        },
        async run(cmd: string) {
            if (!cmd.trim()) return;
            if (cmd === 'clear' || cmd === 'cls') { this.lines = []; return; }
            if (cmd === 'help') { this.addLine('output', '可用: help/clear/pwd/ls/cat/echo/cd + 任何 Linux 命令'); return; }
            if (cmd.startsWith('cd ')) {
                const dir = cmd.substring(3).trim();
                const target = dir.startsWith('/') ? dir : (this.cwd + '/' + dir);
                const out = await Shell.exec('cd "' + target + '" && pwd');
                const pwd = (out || '').trim();
                if (pwd) { this.cwd = pwd; this.currentPrompt = pwd + ' # '; }
                return;
            }
            this.addLine('cmd', this.currentPrompt + cmd);
            try {
                const out = await Shell.exec(cmd);
                if (out && out.trim()) {
                    const parts = out.split('\n');
                    for (let i = 0; i < parts.length; i++) {
                        if (parts[i].trim()) this.addLine('output', parts[i]);
                    }
                }
            } catch (e: any) {
                this.addLine('error', (e && e.message) ? e.message : String(e));
            }
        },
        useExample(cmd: string) { this.run(cmd); }
    }
});

export default shellPage;
