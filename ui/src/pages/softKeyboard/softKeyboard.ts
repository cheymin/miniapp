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

import { IME, Shell } from 'langningchen';
import { defineComponent } from 'vue';
import { showInfo, showSuccess, showError } from '../../components/ToastMessage';

export type SoftKeyboardOption = {
    data: string;
};

const CLIPBOARD_STORAGE_KEY = 'softKeyboard_clipboard';
const MAX_CLIPBOARD_HISTORY = 10;

// 172px 宽屏幕的紧凑 QWERTY 布局（每行最多10键）
const LETTER_KEYS = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['⇧', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '⌫'],
    ['中', '123', 'space', '.', '↵'],
];

const NUMBER_KEYS = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['-', '/', ':', ';', '(', ')', '$', '&', '@', '"'],
    ['#+=', '.', ',', '?', '!', '\'', '%', '*', '⌫'],
    ['ABC', 'space', '.', '↵'],
];

const SYMBOL_KEYS = [
    ['[', ']', '{', '}', '#', '%', '^', '*', '+', '='],
    ['_', '\\', '|', '~', '<', '>', '€', '£', '¥', '·'],
    ['123', '.', ',', '?', '!', '\'', '"', '`', '⌫'],
    ['ABC', 'space', '.', '↵'],
];

const EMOJI_LIST = [
    '😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆',
    '😉', '😊', '😋', '😎', '😍', '😘', '🥰', '😜',
    '👍', '👎', '👊', '✊', '🤚', '🖐', '✋', '👌',
    '❤️', '💔', '💖', '💙', '💚', '💛', '💜', '🖤',
    '⭐', '🌟', '✨', '🔥', '💯', '✅', '❌', '❓',
    '🎉', '🎊', '🎈', '🏆', '🚀', '💪', '🙏', '👏',
];

const softKeyboard = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<SoftKeyboardOption>,
            textBuffer: '',
            cursorPos: 0,
            isChinese: false,
            pinyin: '',
            candidates: [] as { hanZi: string; freq: number }[],
            candidatePage: 0,
            selectedCandidate: 0,
            imeReady: false,
            shiftOn: false,
            capsLock: false,
            mode: 'letters' as 'letters' | 'numbers' | 'symbols',
            showEmoji: false,
            clipboard: [] as string[],
            hasClipboard: false,
        };
    },

    computed: {
        displayText(): string {
            if (this.cursorPos >= this.textBuffer.length) {
                return this.textBuffer + '|';
            }
            return this.textBuffer.slice(0, this.cursorPos) + '|' + this.textBuffer.slice(this.cursorPos);
        },
        currentKeys(): string[][] {
            if (this.mode === 'numbers') return this.shiftOn ? SYMBOL_KEYS : NUMBER_KEYS;
            return LETTER_KEYS;
        },
        candidateList(): { hanZi: string; freq: number }[] {
            const start = this.candidatePage * 5;
            return this.candidates.slice(start, start + 5);
        },
        hasCandidates(): boolean {
            return this.isChinese && this.candidates.length > 0;
        },
        hasPrevPage(): boolean {
            return this.candidatePage > 0;
        },
        hasNextPage(): boolean {
            return (this.candidatePage + 1) * 5 < this.candidates.length;
        },
    },

    mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on('backpressed', this.close);

        const options = this.$page.loadOptions;
        if (options.data) {
            this.textBuffer = options.data;
            this.cursorPos = this.textBuffer.length;
        }

        this.loadClipboard();
        this.initIme();
    },

    methods: {
        // ---- IME 初始化 ----
        async initIme() {
            try {
                await IME.initialize();
                this.imeReady = true;
            } catch (e) {
                console.error('IME初始化失败:', e);
            }
        },

        // ---- 按键处理 ----
        onKey(key: string) {
            if (key === '↵') {
                this.confirm();
                return;
            }
            if (key === '⌫') {
                this.backspace();
                return;
            }
            if (key === 'space') {
                this.insertChar(' ');
                return;
            }
            if (key === '⇧') {
                this.toggleShift();
                return;
            }
            if (key === 'ABC' || key === '123') {
                this.switchMode(key);
                return;
            }
            if (key === '中') {
                this.toggleChinese();
                return;
            }
            if (key === '#+=') {
                this.shiftOn = !this.shiftOn;
                return;
            }

            if (this.isChinese && /^[a-z]$/i.test(key)) {
                this.inputPinyin(key.toLowerCase());
                return;
            }

            this.insertChar(key);
        },

        toggleShift() {
            if (this.capsLock) {
                this.capsLock = false;
                this.shiftOn = false;
            } else if (this.shiftOn) {
                this.capsLock = true;
            } else {
                this.shiftOn = true;
            }
        },

        switchMode(key: string) {
            if (key === 'ABC') {
                this.mode = 'letters';
                this.shiftOn = false;
            } else if (key === '123') {
                this.mode = this.mode === 'numbers' ? 'symbols' : 'numbers';
                this.shiftOn = false;
            }
        },

        async toggleChinese() {
            if (!this.imeReady) {
                try {
                    await this.initIme();
                } catch (e) {
                    showError('输入法加载失败');
                    return;
                }
            }
            this.isChinese = !this.isChinese;
            if (!this.isChinese) {
                this.pinyin = '';
                this.candidates = [];
                this.candidatePage = 0;
            }
        },

        // ---- 中文输入 ----
        async inputPinyin(ch: string) {
            this.pinyin += ch;
            try {
                const result = await IME.getCandidates(this.pinyin);
                this.candidates = result || [];
                this.candidatePage = 0;
                this.selectedCandidate = 0;
            } catch (e) {
                this.candidates = [];
            }
        },

        selectCandidate(hanZi: string) {
            this.insertChar(hanZi);
            this.pinyin = '';
            this.candidates = [];
            this.candidatePage = 0;
        },

        prevCandidates() {
            if (this.candidatePage > 0) this.candidatePage--;
        },

        nextCandidates() {
            if ((this.candidatePage + 1) * 5 < this.candidates.length) this.candidatePage++;
        },

        // ---- 文本操作 ----
        insertChar(ch: string) {
            const before = this.textBuffer.slice(0, this.cursorPos);
            const after = this.textBuffer.slice(this.cursorPos);
            this.textBuffer = before + ch + after;
            this.cursorPos += ch.length;
        },

        backspace() {
            if (this.isChinese && this.pinyin.length > 0) {
                this.pinyin = this.pinyin.slice(0, -1);
                if (this.pinyin.length > 0) {
                    IME.getCandidates(this.pinyin).then(r => {
                        this.candidates = r || [];
                        this.candidatePage = 0;
                    });
                } else {
                    this.candidates = [];
                }
                return;
            }
            if (this.cursorPos > 0) {
                const before = this.textBuffer.slice(0, this.cursorPos - 1);
                const after = this.textBuffer.slice(this.cursorPos);
                this.textBuffer = before + after;
                this.cursorPos--;
            }
        },

        confirm() {
            $falcon.trigger('softKeyboard', this.textBuffer);
            this.$page.finish();
        },

        close() {
            $falcon.trigger('softKeyboard', this.textBuffer);
            this.$page.finish();
        },

        // ---- 剪贴板 ----
        async loadClipboard() {
            try {
                const data = await $falcon.storage.get(CLIPBOARD_STORAGE_KEY);
                if (data) {
                    this.clipboard = JSON.parse(data);
                    this.hasClipboard = this.clipboard.length > 0;
                }
            } catch (e) {}
        },

        async saveClipboard() {
            try {
                await $falcon.storage.set(CLIPBOARD_STORAGE_KEY, JSON.stringify(this.clipboard));
                this.hasClipboard = this.clipboard.length > 0;
            } catch (e) {}
        },

        async copyText() {
            if (!this.textBuffer) return;
            this.clipboard.unshift(this.textBuffer);
            if (this.clipboard.length > MAX_CLIPBOARD_HISTORY) this.clipboard.pop();
            await this.saveClipboard();
            try { await Shell.exec(`echo "${this.textBuffer}" | clip`); } catch (e) {}
            showSuccess('已复制');
        },

        async cutText() {
            if (!this.textBuffer) return;
            await this.copyText();
            this.textBuffer = '';
            this.cursorPos = 0;
            showSuccess('已剪切');
        },

        pasteClip(idx: number) {
            const text = this.clipboard[idx];
            if (!text) return;
            // 移到最前
            this.clipboard.splice(idx, 1);
            this.clipboard.unshift(text);
            this.saveClipboard();
            this.insertChar(text);
        },

        deleteClip(idx: number) {
            this.clipboard.splice(idx, 1);
            this.saveClipboard();
        },

        pasteSysClipboard() {
            // 无法从系统剪贴板读回，提示用户
            showInfo('请从剪贴板历史中选择');
        },

        // ---- Emoji ----
        toggleEmoji() {
            this.showEmoji = !this.showEmoji;
        },

        insertEmoji(e: string) {
            this.insertChar(e);
            this.showEmoji = false;
        },

        // ---- 辅助 ----
        isActive(key: string): boolean {
            if (key === '⇧') return this.shiftOn || this.capsLock;
            if (key === '中') return this.isChinese;
            return false;
        },

        keyClass(key: string): string {
            const base = 'key';
            if (key === '↵') return base + ' key-confirm';
            if (key === '⌫' || key === '⇧' || key === '123' || key === 'ABC' || key === '#+=' || key === '中')
                return base + ' key-func';
            if (this.isActive(key)) return base + ' key-active';
            return base;
        },

        keyWidth(key: string): number {
            if (key === 'space') return 4;
            if (key === '↵' || key === '⇧' || key === '⌫') return 1.5;
            return 1;
        },
    },
});

export default softKeyboard;