// Copyright (C) 2025 Langning Chen
//
// This file is part of miniapp.
//
// miniapp is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// miniapp is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with miniapp.  If not, see <https://www.gnu.org/licenses/>.

import { defineComponent } from 'vue';
import { showError } from '../../components/ToastMessage';
import { openSystemInput } from '../../utils/systemInput';
import { exec, shellQuote } from '../../utils/nativeShell';

export type terminalOptions = {};

interface TermLine {
    type: 'sys' | 'cmd' | 'out' | 'err';
    text: string;
}

const MAX_OUTPUT = 12000;
const MAX_LINES = 240;

function stripAnsi(value: string): string {
    return String(value || '').replace(/\u001b\[[0-9;]*m/g, '');
}

function resolvePath(base: string, target: string): string {
    if (!target || target === '.') { return base; }
    const start = target.charAt(0) === '/' ? target : `${base}/${target}`;
    const parts: string[] = [];
    start.split('/').forEach((part) => {
        if (!part || part === '.') { return; }
        if (part === '..') {
            parts.pop();
        } else {
            parts.push(part);
        }
    });
    return `/${parts.join('/')}`;
}

const terminal = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<terminalOptions>,
            cwd: '/userdisk',
            busy: false,
            history: [] as string[],
            lines: [] as TermLine[],
            quickCommands: ['pwd', 'ls', 'df -h', 'free', 'ps', 'uname -a'],
        };
    },

    mounted() {
        this.pushLine('sys', 'Cheymin Terminal · 命令通过设备 Shell 执行');
        this.pushLine('sys', `当前目录 ${this.cwd}`);
    },

    methods: {
        goBack() {
            this.$page.finish();
        },

        pushLine(type: TermLine['type'], text: string) {
            const raw = stripAnsi(text);
            const parts = raw.split('\n');
            parts.forEach((part) => {
                if (this.lines.length >= MAX_LINES) {
                    this.lines.shift();
                }
                this.lines.push({ type, text: part.length ? part : ' ' });
            });
            this.$forceUpdate();
            this.scrollToBottom();
        },

        scrollToBottom() {
            const doScroll = () => {
                const scroller = this.$refs.outputScroller as any;
                if (!scroller) { return; }
                try {
                    if (typeof scroller.scrollTo === 'function') {
                        scroller.scrollTo({ offset: 1000000, x: 0, y: 1000000, animated: false });
                    } else if (scroller.$el && typeof scroller.$el.scrollTo === 'function') {
                        scroller.$el.scrollTo({ offset: 1000000, x: 0, y: 1000000, animated: false });
                    }
                } catch {
                    // 忽略滚动异常
                }
            };
            [0, 60, 200].forEach((delay) => setTimeout(doScroll, delay));
        },

        clearOutput() {
            this.lines = [];
            this.$forceUpdate();
        },

        openCommandInput() {
            if (this.busy) { return; }
            openSystemInput(
                () => '',
                (value) => {
                    const command = value.trim();
                    if (command) { this.run(command); }
                }
            );
        },

        repeatLast() {
            if (this.busy) { return; }
            const last = this.history[this.history.length - 1];
            openSystemInput(
                () => last || '',
                (value) => {
                    const command = value.trim();
                    if (command) { this.run(command); }
                }
            );
        },

        runQuick(command: string) {
            if (this.busy) { return; }
            this.run(command);
        },

        async run(command: string) {
            const cmd = command.trim();
            if (!cmd || this.busy) { return; }
            if (this.history[this.history.length - 1] !== cmd) {
                this.history.push(cmd);
                if (this.history.length > 100) { this.history.shift(); }
            }
            this.pushLine('cmd', `${this.cwd} $ ${cmd}`);

            if (cmd === 'clear' || cmd === 'cls') {
                this.clearOutput();
                return;
            }

            if (cmd === 'cd' || cmd.indexOf('cd ') === 0) {
                await this.changeDirectory(cmd.slice(2).trim());
                return;
            }

            this.busy = true;
            this.$forceUpdate();
            try {
                const output = await exec(`cd ${shellQuote(this.cwd)} && (${cmd}) 2>&1`);
                this.pushLine('out', output && output.length ? output : '(无输出)');
            } catch (e) {
                this.pushLine('err', String(e || '命令执行失败'));
                showError('命令执行失败');
            } finally {
                this.busy = false;
                this.$forceUpdate();
            }
        },

        async changeDirectory(target: string) {
            const dest = resolvePath(this.cwd, target || '/userdisk');
            this.busy = true;
            this.$forceUpdate();
            try {
                const output = await exec(`cd ${shellQuote(dest)} 2>/dev/null && pwd`);
                const resolved = (output || '').trim();
                if (resolved.charAt(0) === '/') {
                    this.cwd = resolved.replace(/\/+$/, '') || '/';
                    this.pushLine('sys', `切换到 ${this.cwd}`);
                } else {
                    this.pushLine('err', `目录不存在：${dest}`);
                }
            } catch (e) {
                this.pushLine('err', `目录不存在：${dest}`);
            } finally {
                this.busy = false;
                this.$forceUpdate();
            }
        },
    },
});

export default terminal;
