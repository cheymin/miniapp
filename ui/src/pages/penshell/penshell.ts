import { defineComponent } from 'vue';
import { Penshell } from 'langningchen';
import { showError, showSuccess } from '../../components/ToastMessage';
import { openSoftKeyboard } from '../../utils/softKeyboardUtils';

interface CommandHistory {
    cmd: string;
    output: string;
    timestamp: number;
    isError?: boolean;
}

const penshellPage = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<{}>,
            initialized: false,
            currentInput: '',
            lines: [] as { type: 'prompt' | 'output' | 'error' | 'system' | 'cmd'; text: string }[],
            cwd: '~',
            history: [] as string[],
            historyIndex: -1,
            shellRunning: false,
            username: 'user',
            hostname: 'pen',
        };
    },

    computed: {
        prompt(): string {
            return `${this.username}@${this.hostname}:${this.cwd}$ `;
        },
    },

    mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on('backpressed', this.close);
        this.initPenshell();
    },

    methods: {
        async initPenshell() {
            this.addLine('system', 'Penshell 初始化中...');
            try {
                await Penshell.initialize();
                this.initialized = true;
                this.shellRunning = true;

                // 监听流式输出
                $falcon.on('penshell_output', (chunk: string) => {
                    this.handleOutput(chunk);
                });

                // 获取当前目录
                try {
                    const pwd = await Penshell.exec('pwd');
                    this.cwd = pwd.trim() || '~';
                } catch (e) {
                    this.cwd = '~';
                }

                this.addLine('system', `Penshell ${this.shellVersion()} 就绪`);
                this.addLine('output', '输入 help 查看可用命令');
                this.$forceUpdate();
            } catch (e: any) {
                this.addLine('error', '初始化失败: ' + (e.message || e));
            }
        },

        shellVersion(): string {
            return 'v1.0';
        },

        addLine(type: 'prompt' | 'output' | 'error' | 'system' | 'cmd', text: string) {
            this.lines.push({ type, text });
            // 限制行数防止内存溢出
            if (this.lines.length > 500) {
                this.lines.splice(0, this.lines.length - 300);
            }
        },

        handleOutput(chunk: string) {
            // 过滤掉标记行
            if (chunk.includes('__PENSHELL_DONE__')) return;
            // 显示流式输出的每一段
            const lastLine = this.lines[this.lines.length - 1];
            if (lastLine && lastLine.type === 'output' && !lastLine.text.endsWith('\n')) {
                lastLine.text += chunk;
            } else {
                this.addLine('output', chunk);
            }
            this.$forceUpdate();
        },

        async executeCommand() {
            if (!this.currentInput.trim()) return;
            const cmd = this.currentInput.trim();
            this.currentInput = '';

            // 添加到历史
            this.history.push(cmd);
            this.historyIndex = this.history.length;

            // 显示命令
            this.addLine('prompt', this.prompt);
            this.addLine('cmd', cmd);

            if (!this.initialized || !this.shellRunning) {
                this.addLine('error', 'Shell 未就绪');
                this.$forceUpdate();
                return;
            }

            // 处理内置命令
            if (cmd === 'exit' || cmd === 'quit') {
                this.close();
                return;
            }
            if (cmd === 'clear' || cmd === 'cls') {
                this.lines = [];
                this.$forceUpdate();
                return;
            }
            if (cmd === 'help') {
                this.addLine('output',
                    'Penshell 内置命令:\n' +
                    '  help    - 显示此帮助\n' +
                    '  clear   - 清屏\n' +
                    '  exit    - 退出\n' +
                    '  pwd     - 显示当前目录\n' +
                    '  history - 显示命令历史\n' +
                    '\n其他命令将直接传递给系统 sh');
                this.$forceUpdate();
                return;
            }
            if (cmd === 'history') {
                this.addLine('output', this.history.map((h, i) => `  ${i + 1}  ${h}`).join('\n'));
                this.$forceUpdate();
                return;
            }

            try {
                const result = await Penshell.exec(cmd);
                if (result && result.trim()) {
                    // 判断是否包含错误信息
                    if (result.toLowerCase().includes('error') ||
                        result.toLowerCase().includes('not found') ||
                        result.toLowerCase().includes('no such')) {
                        this.addLine('error', result.trimEnd());
                    } else {
                        this.addLine('output', result.trimEnd());
                    }
                }

                // 更新工作目录
                if (cmd.startsWith('cd ')) {
                    try {
                        const pwd = await Penshell.exec('pwd');
                        this.cwd = pwd.trim() || '~';
                    } catch (e) {}
                }
            } catch (e: any) {
                this.addLine('error', '命令执行失败: ' + (e.message || e));
            }

            this.$forceUpdate();
        },

        showInput() {
            if (!this.initialized) return;
            openSoftKeyboard(
                () => this.currentInput,
                (value) => { this.currentInput = value; this.$forceUpdate(); },
            );
        },

        showHistory(direction: number) {
            const newIdx = this.historyIndex + direction;
            if (newIdx >= 0 && newIdx < this.history.length) {
                this.historyIndex = newIdx;
                this.currentInput = this.history[this.historyIndex];
                this.$forceUpdate();
            }
        },

        async close() {
            if (this.shellRunning) {
                try {
                    $falcon.off('penshell_output');
                    await Penshell.close();
                } catch (e) {}
            }
            this.$page.finish();
        },

        scrollToBottom(scroller: any) {
            if (scroller && scroller.scrollTo) {
                setTimeout(() => scroller.scrollTo(0, 99999), 50);
            }
        },
    },
});

export default penshellPage;