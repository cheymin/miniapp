import { defineComponent } from 'vue';
import { Shell } from 'langningchen';
import PageShell from '../../components/PageShell.vue';
import { showError } from '../../components/ToastMessage';

export type ShellOptions = {};

type Line = { type: string; text: string; key: number };

const PROMPT = '# ';

const shellPage = defineComponent({
    components: { PageShell },
    data() {
        return {
            $page: {} as FalconPage<ShellOptions>,
            shellInitialized: false,
            currentPrompt: PROMPT,
            inputText: '',
            lines: [] as Line[],
            cwd: '/',
            lineKey: 0,
            executing: false,
        };
    },
    async mounted() {
        this.$page.$npage.setSupportBack(true);
        const backFn = () => $falcon.navBack();
        this.$page.$npage.on('backpressed', backFn);
        try {
            await Shell.initialize();
            this.shellInitialized = true;
            this.addLine('system', 'Shell 就绪');
            this.addLine('system', '输入 help 查看可用命令');
        } catch (e) {
            showError('Shell 初始化失败');
        }
    },
    methods: {
        addLine(type: string, text: string) {
            this.lines.push({ type, text, key: this.lineKey++ });
        },
        async run(cmd: string) {
            if (!cmd.trim()) return;
            if (cmd === 'clear' || cmd === 'cls') {
                this.lines = [];
                return;
            }
            if (cmd === 'help') {
                this.addLine('output', '可用命令: help | clear | pwd | ls | cat | echo | cd | 任何 Linux 命令');
                return;
            }
            if (cmd.startsWith('cd ')) {
                const dir = cmd.substring(3).trim();
                const target = dir.startsWith('/') ? dir : (this.cwd + '/' + dir);
                const out = await Shell.exec('cd "' + target + '" && pwd');
                const pwd = (out || '').trim();
                if (pwd) { this.cwd = pwd; this.currentPrompt = pwd + ' # '; }
                return;
            }

            this.addLine('cmd', this.currentPrompt + cmd);
            this.executing = true;
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
            this.executing = false;
            this.inputText = '';
        },
        // 在我们 miniapp 内部输入时用（但其实我们没有 input，靠软键盘）
        onInputConfirm() {
            this.run(this.inputText);
        },
        useExample(cmd: string) {
            this.run(cmd);
        }
    }
});

export default shellPage;
