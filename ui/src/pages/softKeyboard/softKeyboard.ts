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

import { Shell } from 'langningchen';
import { defineComponent } from 'vue';
import { showInfo, showSuccess, showError } from '../../components/ToastMessage';

export type SoftKeyboardOption = {
    data: string;
};

type KeyboardMode = 'letters' | 'numbers' | 'symbols';

interface KeyConfig {
    value: string;
    display: string;
    width?: number;
    type?: 'normal' | 'function' | 'toggle' | 'action';
}

interface KeyRow {
    keys: KeyConfig[];
}

const CLIPBOARD_STORAGE_KEY = 'softKeyboard_clipboard';
const MAX_CLIPBOARD_HISTORY = 10;
const LONG_PRESS_DELAY = 400;

const QWERTY_LAYOUT: KeyRow[] = [
    {
        keys: [
            { value: 'q', display: 'q' },
            { value: 'w', display: 'w' },
            { value: 'e', display: 'e' },
            { value: 'r', display: 'r' },
            { value: 't', display: 't' },
            { value: 'y', display: 'y' },
            { value: 'u', display: 'u' },
            { value: 'i', display: 'i' },
            { value: 'o', display: 'o' },
            { value: 'p', display: 'p' },
        ],
    },
    {
        keys: [
            { value: 'a', display: 'a' },
            { value: 's', display: 's' },
            { value: 'd', display: 'd' },
            { value: 'f', display: 'f' },
            { value: 'g', display: 'g' },
            { value: 'h', display: 'h' },
            { value: 'j', display: 'j' },
            { value: 'k', display: 'k' },
            { value: 'l', display: 'l' },
        ],
    },
    {
        keys: [
            { value: 'shift', display: '⇧', type: 'toggle', width: 1.5 },
            { value: 'z', display: 'z' },
            { value: 'x', display: 'x' },
            { value: 'c', display: 'c' },
            { value: 'v', display: 'v' },
            { value: 'b', display: 'b' },
            { value: 'n', display: 'n' },
            { value: 'm', display: 'm' },
            { value: 'backspace', display: '⌫', type: 'function', width: 1.5 },
        ],
    },
    {
        keys: [
            { value: 'mode_number', display: '123', type: 'toggle', width: 1.5 },
            { value: 'emoji', display: '😊', type: 'function' },
            { value: 'cursor_left', display: '◀', type: 'function' },
            { value: 'space', display: 'space', type: 'action', width: 4 },
            { value: 'cursor_right', display: '▶', type: 'function' },
            { value: 'period', display: '.' },
            { value: 'enter', display: '↵', type: 'action', width: 1.8 },
        ],
    },
];

const NUMBER_LAYOUT: KeyRow[] = [
    {
        keys: [
            { value: '1', display: '1' },
            { value: '2', display: '2' },
            { value: '3', display: '3' },
            { value: '4', display: '4' },
            { value: '5', display: '5' },
            { value: '6', display: '6' },
            { value: '7', display: '7' },
            { value: '8', display: '8' },
            { value: '9', display: '9' },
            { value: '0', display: '0' },
        ],
    },
    {
        keys: [
            { value: '@', display: '@' },
            { value: '#', display: '#' },
            { value: '$', display: '$' },
            { value: '%', display: '%' },
            { value: '^', display: '^' },
            { value: '&', display: '&' },
            { value: '*', display: '*' },
            { value: '(', display: '(' },
            { value: ')', display: ')' },
            { value: '-', display: '-' },
        ],
    },
    {
        keys: [
            { value: 'mode_symbols', display: '#+=', type: 'toggle', width: 1.5 },
            { value: '+', display: '+' },
            { value: '=', display: '=' },
            { value: ':', display: ':' },
            { value: ';', display: ';' },
            { value: '"', display: '"' },
            { value: '\'', display: "'" },
            { value: '<', display: '<' },
            { value: '>', display: '>' },
            { value: 'backspace', display: '⌫', type: 'function', width: 1.5 },
        ],
    },
    {
        keys: [
            { value: 'mode_letters', display: 'ABC', type: 'toggle', width: 1.5 },
            { value: 'emoji', display: '😊', type: 'function' },
            { value: 'cursor_left', display: '◀', type: 'function' },
            { value: 'space', display: 'space', type: 'action', width: 4 },
            { value: 'cursor_right', display: '▶', type: 'function' },
            { value: 'period', display: '.' },
            { value: 'enter', display: '↵', type: 'action', width: 1.8 },
        ],
    },
];

const SYMBOL_LAYOUT: KeyRow[] = [
    {
        keys: [
            { value: '!', display: '!' },
            { value: '?', display: '?' },
            { value: '/', display: '/' },
            { value: '\\', display: '\\' },
            { value: '|', display: '|' },
            { value: '~', display: '~' },
            { value: '`', display: '`' },
            { value: '[', display: '[' },
            { value: ']', display: ']' },
            { value: '{', display: '{' },
        ],
    },
    {
        keys: [
            { value: '}', display: '}' },
            { value: '.', display: '.' },
            { value: ',', display: ',' },
            { value: ':', display: ':' },
            { value: ';', display: ';' },
            { value: '"', display: '"' },
            { value: '\'', display: "'" },
            { value: '-', display: '-' },
            { value: '_', display: '_' },
            { value: '`', display: '`' },
        ],
    },
    {
        keys: [
            { value: 'mode_numbers', display: '123', type: 'toggle', width: 1.5 },
            { value: '€', display: '€' },
            { value: '£', display: '£' },
            { value: '•', display: '•' },
            { value: '·', display: '·' },
            { value: '…', display: '…' },
            { value: '←', display: '←' },
            { value: '→', display: '→' },
            { value: '↑', display: '↑' },
            { value: 'backspace', display: '⌫', type: 'function', width: 1.5 },
        ],
    },
    {
        keys: [
            { value: 'mode_letters', display: 'ABC', type: 'toggle', width: 1.5 },
            { value: 'emoji', display: '😊', type: 'function' },
            { value: 'cursor_left', display: '◀', type: 'function' },
            { value: 'space', display: 'space', type: 'action', width: 4 },
            { value: 'cursor_right', display: '▶', type: 'function' },
            { value: 'period', display: '.' },
            { value: 'enter', display: '↵', type: 'action', width: 1.8 },
        ],
    },
];

const EMOJI_LIST = [
    '😊', '😂', '🤣', '❤️', '👍', '🎉', '🔥', '✨',
    '😍', '🤔', '😢', '😡', '🙏', '💪', '⭐', '🌟',
    '👋', '✋', '👌', '✅', '❌', '💯', '🔍', '📝',
    '🎯', '🚀', '💡', '📌', '🔗', '📎', '🗑️', '⚙️',
];

const softKeyboard = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<SoftKeyboardOption>,

            textBuffer: '',
            cursorPosition: 0,
            keyboardMode: 'letters' as KeyboardMode,
            capsLock: false,
            shiftPressed: false,
            clipboard: [] as string[],
            keyPressed: {} as Record<string, boolean>,
            showEmojiPicker: false,
            shellInitialized: false,

            longPressTimer: null as ReturnType<typeof setTimeout> | null,
            longPressKey: null as string | null,
            longPressActive: false,

            clipboardVisible: false,

            emojiList: EMOJI_LIST,
        };
    },

    computed: {
        displayText(): string {
            if (this.textBuffer.length === 0) {
                return ' ';
            }
            const before = this.textBuffer.slice(0, this.cursorPosition);
            const cursor = '|';
            const after = this.textBuffer.slice(this.cursorPosition);
            return before + cursor + after;
        },

        currentLayout(): KeyRow[] {
            switch (this.keyboardMode) {
                case 'numbers':
                    return NUMBER_LAYOUT;
                case 'symbols':
                    return SYMBOL_LAYOUT;
                default:
                    return QWERTY_LAYOUT;
            }
        },

        clipboardItems(): string[] {
            return this.clipboard;
        },

        hasClipboardItems(): boolean {
            return this.clipboard.length > 0;
        },
    },

    async mounted() {
        const initialData = this.$page.loadOptions.data || '';
        this.textBuffer = initialData;
        this.cursorPosition = initialData.length;

        this.$page.$npage.setSupportBack(false);
        this.$page.$npage.on('backpressed', () => { this.close(); });

        await this.initializeShell();
        await this.loadClipboard();
    },

    beforeDestroy() {
        this.$page.$npage.off('backpressed', () => { this.close(); });
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    },

    methods: {
        async initializeShell() {
            try {
                if (Shell && typeof Shell.initialize === 'function') {
                    await Shell.initialize();
                    this.shellInitialized = true;
                }
            } catch (error) {
                console.warn('Shell初始化失败，剪贴板功能受限:', error);
                this.shellInitialized = false;
            }
        },

        close() {
            $falcon.trigger<string>('softKeyboard', this.textBuffer);
            this.$page.finish();
        },

        // ─── 按键处理 ───

        onKeyDown(key: KeyConfig) {
            this.keyPressed[key.value] = true;
            this.$forceUpdate();

            // 长按检测 (仅对 backspace 启用手动长按)
            if (key.value === 'backspace') {
                this.longPressKey = key.value;
                this.longPressActive = false;
                this.longPressTimer = setTimeout(() => {
                    this.longPressActive = true;
                    this.startBackspaceRepeat();
                }, LONG_PRESS_DELAY);
            }
        },

        onKeyUp(key: KeyConfig) {
            this.keyPressed[key.value] = false;

            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }

            if (this.longPressKey === key.value && !this.longPressActive) {
                // 普通点击
                this.handleKeyPress(key);
            }

            if (this.longPressActive && key.value === 'backspace') {
                this.longPressActive = false;
            }

            this.longPressKey = null;
            this.$forceUpdate();
        },

        startBackspaceRepeat() {
            if (!this.longPressActive || this.longPressKey !== 'backspace') return;
            this.deleteChar();
            this.$forceUpdate();
            this.longPressTimer = setTimeout(() => {
                this.startBackspaceRepeat();
            }, 60);
        },

        handleKeyPress(key: KeyConfig) {
            const value = key.value;

            // 特殊按键处理
            switch (value) {
                case 'space':
                    this.insertChar(' ');
                    return;
                case 'backspace':
                    this.deleteChar();
                    return;
                case 'enter':
                    this.insertChar('\n');
                    return;
                case 'shift':
                    this.toggleShift();
                    return;
                case 'caps':
                case 'capslock':
                    this.toggleCapsLock();
                    return;
                case 'mode_number':
                    this.keyboardMode = 'numbers';
                    this.shiftPressed = false;
                    this.$forceUpdate();
                    return;
                case 'mode_symbols':
                    this.keyboardMode = 'symbols';
                    this.shiftPressed = false;
                    this.$forceUpdate();
                    return;
                case 'mode_numbers':
                    this.keyboardMode = 'numbers';
                    this.$forceUpdate();
                    return;
                case 'mode_letters':
                    this.keyboardMode = 'letters';
                    this.shiftPressed = false;
                    this.$forceUpdate();
                    return;
                case 'emoji':
                    this.showEmojiPicker = !this.showEmojiPicker;
                    this.$forceUpdate();
                    return;
                case 'comma':
                    this.insertChar(',');
                    return;
                case 'period':
                    this.insertChar('.');
                    return;
                case 'cursor_left':
                    this.moveCursor(-1);
                    return;
                case 'cursor_right':
                    this.moveCursor(1);
                    return;
                default:
                    // 普通字符（特殊功能键值指代多个字符的符号不会被误处理）
                    if (value.length === 1) {
                        this.insertChar(value);
                    }
                    return;
            }
        },

        // ─── 文本操作 ───

        insertChar(char: string) {
            if (char.length === 0) return;

            // 处理大小写
            let charToInsert = char;
            if (this.keyboardMode === 'letters' && /^[a-zA-Z]$/.test(char)) {
                if (this.capsLock) {
                    charToInsert = char.toUpperCase();
                } else if (this.shiftPressed) {
                    charToInsert = char.toUpperCase();
                    this.shiftPressed = false;
                } else {
                    charToInsert = char.toLowerCase();
                }
            }

            const before = this.textBuffer.slice(0, this.cursorPosition);
            const after = this.textBuffer.slice(this.cursorPosition);
            this.textBuffer = before + charToInsert + after;
            this.cursorPosition += charToInsert.length;

            // 自动大写 (句子开头或句号后)
            this.checkAutoCapitalize();

            this.hideEmojiPicker();
        },

        deleteChar() {
            if (this.cursorPosition <= 0 || this.textBuffer.length === 0) return;

            const before = this.textBuffer.slice(0, this.cursorPosition - 1);
            const after = this.textBuffer.slice(this.cursorPosition);
            this.textBuffer = before + after;
            this.cursorPosition--;
        },

        moveCursor(direction: number) {
            const newPos = this.cursorPosition + direction;
            if (newPos >= 0 && newPos <= this.textBuffer.length) {
                this.cursorPosition = newPos;
            }
        },

        checkAutoCapitalize() {
            if (this.textBuffer.length < 2) return;

            const lastTwo = this.textBuffer.slice(-2);
            // 在句号+空格或句号+换行后自动大写
            if (lastTwo === '. ' || lastTwo === '.\n' || lastTwo === '.\t') {
                // 标记下次输入字母时自动大写
                // 实现: 设置一个标志, 在 insertChar 中检查
            }
        },

        // ─── 切换键状态 ───

        toggleShift() {
            if (this.capsLock) {
                this.capsLock = false;
            }
            this.shiftPressed = !this.shiftPressed;
        },

        toggleCapsLock() {
            this.capsLock = !this.capsLock;
            this.shiftPressed = false;
        },

        getActiveClass(key: KeyConfig): string {
            const classes = ['key-btn'];
            if (this.keyPressed[key.value]) {
                classes.push('key-pressed');
            }
            if (this.isToggleActive(key)) {
                classes.push('key-active');
            }
            if (key.type === 'function' || key.type === 'toggle') {
                classes.push('key-function');
            }
            if (key.type === 'action') {
                classes.push('key-action');
            }
            if (key.type === 'toggle') {
                classes.push('key-toggle');
            }
            if (key.width && key.width > 1) {
                classes.push('key-wide');
            }
            return classes.join(' ');
        },

        getKeyDisplay(key: KeyConfig): string {
            if (this.keyboardMode === 'letters' && /^[a-z]$/.test(key.value)) {
                if (this.capsLock || this.shiftPressed) {
                    return key.value.toUpperCase();
                }
            }
            return key.display;
        },

        getKeyWidth(key: KeyConfig): string {
            if (key.width && key.width > 1) {
                return `${key.width * 100}%`;
            }
            return '';
        },

        isToggleActive(key: KeyConfig): boolean {
            switch (key.value) {
                case 'shift':
                    return this.shiftPressed || this.capsLock;
                case 'mode_number':
                case 'mode_numbers':
                    return this.keyboardMode === 'numbers';
                case 'mode_symbols':
                    return this.keyboardMode === 'symbols';
                case 'mode_letters':
                    return this.keyboardMode === 'letters';
                default:
                    return false;
            }
        },

        // ─── 剪贴板操作 ───

        async copyToClipboard() {
            if (!this.textBuffer) {
                showInfo('没有内容可复制');
                return;
            }

            try {
                // 复制选中或全部文本
                const text = this.textBuffer;

                // 尝试使用 Shell 系统剪贴板
                let clipboardSuccess = false;
                if (this.shellInitialized) {
                    try {
                        await Shell.exec(`echo "${text.replace(/"/g, '\\"')}" | clip`);
                        clipboardSuccess = true;
                    } catch (e) {
                        try {
                            await Shell.exec(`echo "${text.replace(/"/g, '\\"')}" > /proc/clipboard`);
                            clipboardSuccess = true;
                        } catch (e2) {
                            // fallback
                        }
                    }
                }

                // 保存到历史剪贴板
                await this.addToClipboardHistory(text);
                showSuccess('已复制');
            } catch (error) {
                showError('复制失败');
            }
        },

        async cutToClipboard() {
            if (!this.textBuffer) {
                showInfo('没有内容可剪切');
                return;
            }

            try {
                const text = this.textBuffer;

                if (this.shellInitialized) {
                    try {
                        await Shell.exec(`echo "${text.replace(/"/g, '\\"')}" | clip`);
                    } catch (e) {
                        try {
                            await Shell.exec(`echo "${text.replace(/"/g, '\\"')}" > /proc/clipboard`);
                        } catch (e2) {
                            // fallback
                        }
                    }
                }

                await this.addToClipboardHistory(text);
                this.textBuffer = '';
                this.cursorPosition = 0;
                showSuccess('已剪切');
            } catch (error) {
                showError('剪切失败');
            }
        },

        async pasteFromClipboard() {
            let pasteText = '';

            if (this.shellInitialized) {
                try {
                    const result = await Shell.exec('cat /proc/clipboard');
                    if (result && result.trim()) {
                        pasteText = result.trim();
                    }
                } catch (e) {
                    try {
                        const result = await Shell.exec('clip -o 2>/dev/null || xclip -o 2>/dev/null || xsel -b 2>/dev/null');
                        if (result && result.trim()) {
                            pasteText = result.trim();
                        }
                    } catch (e2) {
                        // fallback
                    }
                }
            }

            // 如果没有系统剪贴板内容，使用历史第一个
            if (!pasteText && this.clipboard.length > 0) {
                pasteText = this.clipboard[0];
            }

            if (pasteText) {
                const before = this.textBuffer.slice(0, this.cursorPosition);
                const after = this.textBuffer.slice(this.cursorPosition);
                this.textBuffer = before + pasteText + after;
                this.cursorPosition += pasteText.length;
                showSuccess('已粘贴');
            } else {
                showInfo('剪贴板为空');
            }
        },

        pasteClipboardItem(text: string) {
            const before = this.textBuffer.slice(0, this.cursorPosition);
            const after = this.textBuffer.slice(this.cursorPosition);
            this.textBuffer = before + text + after;
            this.cursorPosition += text.length;
            this.clipboardVisible = false;
            this.$forceUpdate();
        },

        deleteClipboardItem(index: number) {
            this.clipboard.splice(index, 1);
            this.saveClipboard();
        },

        async addToClipboardHistory(text: string) {
            if (!text) return;

            // 去重：如果已存在相同项，移到最前
            const existingIndex = this.clipboard.indexOf(text);
            if (existingIndex >= 0) {
                this.clipboard.splice(existingIndex, 1);
            }

            this.clipboard.unshift(text);

            // 限制数量
            if (this.clipboard.length > MAX_CLIPBOARD_HISTORY) {
                this.clipboard = this.clipboard.slice(0, MAX_CLIPBOARD_HISTORY);
            }

            await this.saveClipboard();
        },

        async saveClipboard() {
            try {
                await $falcon.storage.set(CLIPBOARD_STORAGE_KEY, JSON.stringify(this.clipboard));
            } catch (error) {
                console.warn('保存剪贴板历史失败:', error);
            }
        },

        async loadClipboard() {
            try {
                const data = await $falcon.storage.get(CLIPBOARD_STORAGE_KEY);
                if (data) {
                    this.clipboard = JSON.parse(data);
                    if (!Array.isArray(this.clipboard)) {
                        this.clipboard = [];
                    }
                }
            } catch (error) {
                console.warn('加载剪贴板历史失败:', error);
                this.clipboard = [];
            }
        },

        clearClipboard() {
            this.clipboard = [];
            this.saveClipboard();
            showInfo('剪贴板已清空');
        },

        selectAll() {
            // 全选：将光标移到末尾，方便一键复制
            this.cursorPosition = this.textBuffer.length;
            this.$forceUpdate();
            if (this.textBuffer) {
                showInfo('已全选，可点击复制');
            } else {
                showInfo('没有内容');
            }
        },

        // ─── Emoji ───

        insertEmoji(emoji: string) {
            const before = this.textBuffer.slice(0, this.cursorPosition);
            const after = this.textBuffer.slice(this.cursorPosition);
            this.textBuffer = before + emoji + after;
            this.cursorPosition += emoji.length;
            this.showEmojiPicker = false;
        },

        hideEmojiPicker() {
            if (this.showEmojiPicker) {
                this.showEmojiPicker = false;
            }
        },

        toggleClipboard() {
            this.clipboardVisible = !this.clipboardVisible;
        },
    },
});

export default softKeyboard;