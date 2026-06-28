import { defineComponent } from 'vue';
import { Penshell } from 'langningchen';
import { showError, showSuccess } from '../../components/ToastMessage';
import { openSoftKeyboard } from '../../utils/softKeyboardUtils';

const penshellPage = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<{}>,
            initialized: false,
            currentInput: '',
            lines: [] as { type: 'prompt' | 'output' | 'error' | 'system' | 'cmd'; text: string }[],
            cwd: '~',
            homeDir: '~',
            history: [] as string[],
            historyIndex: -1,
            shellRunning: false,
            username: 'user',
            hostname: 'pen',
        };
    },

    computed: {
        prompt(): string {
            let displayCwd = this.cwd;
            if (this.homeDir && this.homeDir !== '~' && this.cwd.startsWith(this.homeDir)) {
                displayCwd = '~' + this.cwd.substring(this.homeDir.length);
            }
            return `${this.username}@${this.hostname}:${displayCwd}$ `;
        },
    },

    mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on('backpressed', this.close);
        this.initPenshell();
    },

    methods: {
        async initPenshell() {
            this.addLine('system', 'Penshell v1.3  -  输入 help 查看命令');
            this.$forceUpdate();
            try {
                await Penshell.initialize();
                this.initialized = true;
                this.shellRunning = true;

                Penshell.on('penshell_output', (chunk: string) => {
                    this.handleOutput(chunk);
                });

                try {
                    const pwd = await Penshell.exec('pwd');
                    this.cwd = pwd.trim() || '/';
                    this.homeDir = this.cwd;
                } catch (e) {
                    this.cwd = '/';
                }

                this.$forceUpdate();
            } catch (e: any) {
                this.addLine('error', '初始化失败: ' + (e.message || e));
                this.$forceUpdate();
            }
        },

        addLine(type: 'prompt' | 'output' | 'error' | 'system' | 'cmd', text: string) {
            const parts = text.split('\n');
            for (let i = 0; i < parts.length; i++) {
                this.lines.push({ type, text: parts[i] });
            }
            if (this.lines.length > 300) {
                this.lines.splice(0, this.lines.length - 200);
            }
        },

        handleOutput(chunk: string) {
            if (chunk.includes('__PENSHELL_DONE__')) return;
            const lastLine = this.lines[this.lines.length - 1];
            if (lastLine && lastLine.type === 'output') {
                lastLine.text += chunk;
            } else {
                this.lines.push({ type: 'output', text: chunk });
            }
            this.$forceUpdate();
        },

        executeCommand() {
            if (!this.currentInput.trim()) return;
            const cmd = this.currentInput.trim();
            this.currentInput = '';
            this.history.push(cmd);
            this.historyIndex = this.history.length;

            this.addLine('prompt', this.prompt);
            this.addLine('cmd', cmd);

            if (!this.initialized || !this.shellRunning) {
                this.addLine('error', 'Shell 未就绪');
                this.$forceUpdate();
                return;
            }

            // 内置命令
            if (cmd === 'exit' || cmd === 'quit') { this.close(); return; }
            if (cmd === 'clear' || cmd === 'cls') {
                this.lines = [];
                this.$forceUpdate();
                return;
            }
            if (cmd === 'help') {
                this.addLine('output',
                    '内置命令:\n' +
                    '  help       显示帮助\n' +
                    '  clear      清屏\n' +
                    '  exit       退出\n' +
                    '  pwd        当前目录\n' +
                    '  history    命令历史\n' +
                    '\n支持所有 sh 命令\n' +
                    '交互式命令可用 ^C 中断');
                this.$forceUpdate();
                return;
            }
            if (cmd === 'history') {
                this.addLine('output', this.history.map((h, i) => `  ${i + 1}  ${h}`).join('\n'));
                this.$forceUpdate();
                return;
            }

            // 纯异步：write 发送命令，输出通过事件回调实时显示
            // 不阻塞，随时可以输入新命令或 Ctrl+C
            try {
                Penshell.write(cmd + '\n');
            } catch (e: any) {
                this.addLine('error', e.message || String(e));
            }

            // cd 后异步更新目录（exec 有超时保护，不会卡死）
            if (cmd.startsWith('cd') || cmd === 'cd') {
                setTimeout(async () => {
                    try {
                        const pwd = await Penshell.exec('pwd');
                        this.cwd = pwd.trim() || '/';
                        this.$forceUpdate();
                    } catch (e) {}
                }, 500);
            }

            this.$forceUpdate();
        },

        sendCtrlC() {
            try {
                Penshell.sendCtrlC();
                this.addLine('system', '^C');
                this.$forceUpdate();
            } catch (e) {}
        },

        showInput() {
            if (!this.initialized) return;
            openSoftKeyboard(
                () => this.currentInput,
                (value) => {
                    this.currentInput = value;
                    this.$forceUpdate();
                },
            );
        },

        quickCommand(cmd: string) {
            this.currentInput = cmd;
            this.$forceUpdate();
            if (cmd === 'clear' || cmd === 'ls' || cmd === 'pwd') {
                this.executeCommand();
            } else {
                this.showInput();
            }
        },

        showHistory(direction: number) {
            const newIdx = this.historyIndex + direction;
            if (newIdx >= 0 && newIdx < this.history.length) {
                this.historyIndex = newIdx;
                this.currentInput = this.history[this.historyIndex];
                this.$forceUpdate();
            } else if (newIdx >= this.history.length) {
                this.historyIndex = this.history.length;
                this.currentInput = '';
                this.$forceUpdate();
            }
        },

        async close() {
            if (this.shellRunning) {
                try {
                    await Penshell.close();
                } catch (e) {}
            }
            this.$page.finish();
        },
    },
});

export default penshellPage;
