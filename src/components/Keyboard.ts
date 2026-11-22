// 自绘全键盘：中/英/数/符四套布局，中文为本地拼音候选。
// 560x170 短屏下采用全屏浮层，高度约 168px。

import { defineComponent } from 'vue';
import {
    buildCandidates,
    loadUserWords,
    recordUserWord,
    segmentPinyin,
} from '../utils/pinyin/engine';

type Layout = 'cn' | 'en' | 'num' | 'sym';

const QWERTY_ROWS = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

const NUM_ROWS = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['-', '/', ':', ';', '(', ')', '¥', '&', '@', '"'],
    ['.', ',', '?', '!', "'", '%', '*', '#', '+', '='],
];

const SYM_ROWS = [
    ['[', ']', '{', '}', '#', '%', '^', '*', '+', '='],
    ['_', '\\', '|', '~', '<', '>', '€', '£', '$', '·'],
    ['…', '。', '，', '、', '：', '；', '？', '！', '“', '”'],
];

export default defineComponent({
    name: 'Keyboard',
    props: {
        visible: { type: Boolean, default: false },
        value: { type: String, default: '' },
        placeholder: { type: String, default: '请输入…' },
    },

    data() {
        return {
            text: '',
            pinyinBuffer: '',
            candidates: [] as string[],
            layout: 'cn' as Layout,
            shifted: false,

            bsPressAt: 0,
            bsLastTouchEnd: 0,
            bsHoldTimer: null as any,
            bsRepeatTimer: null as any,
        };
    },

    computed: {
        qwertyRows(): string[][] {
            return QWERTY_ROWS;
        },
        numRows(): string[][] {
            return NUM_ROWS;
        },
        symRows(): string[][] {
            return SYM_ROWS;
        },
        hasPinyin(): boolean {
            return this.layout === 'cn' && !!this.pinyinBuffer;
        },
        displayText(): string {
            return this.text || this.placeholder;
        },
    },

    watch: {
        visible: {
            immediate: true,
            handler(value: boolean) {
                if (value) {
                    this.text = this.value || '';
                    this.pinyinBuffer = '';
                    this.candidates = [];
                    this.layout = 'cn';
                    this.shifted = false;
                    loadUserWords();
                }
            },
        },
        pinyinBuffer() {
            this.refreshCandidates();
        },
    },

    unmounted() {
        this.clearBackspaceTimers();
    },

    methods: {
        refreshCandidates() {
            this.candidates = buildCandidates(this.pinyinBuffer, 24);
        },

        displayKey(ch: string): string {
            if (this.shifted && /^[a-z]$/.test(ch)) { return ch.toUpperCase(); }
            return ch;
        },

        commitValue() {
            this.$emit('update:value', this.text);
        },

        onLetter(ch: string) {
            const value = this.shifted ? ch.toUpperCase() : ch;
            if (this.hasPinyin || this.layout === 'cn') {
                this.pinyinBuffer += value.toLowerCase();
                return;
            }
            this.text += value;
            this.commitValue();
        },

        onSymbol(ch: string) {
            this.text += ch;
            this.commitValue();
        },

        toggleShift() {
            this.shifted = !this.shifted;
        },

        switchLayout(target: Layout) {
            if (this.layout !== target) {
                if (this.pinyinBuffer) { this.commitFirstCandidate(); }
                this.layout = target;
                this.shifted = false;
            }
        },

        deleteOnce() {
            if (this.pinyinBuffer) {
                this.pinyinBuffer = this.pinyinBuffer.slice(0, -1);
                return;
            }
            if (this.text) {
                this.text = this.text.slice(0, -1);
                this.commitValue();
            }
        },

        clearBackspaceTimers() {
            if (this.bsHoldTimer) {
                clearTimeout(this.bsHoldTimer);
                this.bsHoldTimer = null;
            }
            if (this.bsRepeatTimer) {
                clearInterval(this.bsRepeatTimer);
                this.bsRepeatTimer = null;
            }
        },

        bsTouchStart() {
            this.clearBackspaceTimers();
            this.bsPressAt = Date.now();
            this.bsHoldTimer = setTimeout(() => {
                this.bsHoldTimer = null;
                this.deleteOnce();
                this.bsRepeatTimer = setInterval(() => this.deleteOnce(), 90);
            }, 460);
        },

        bsTouchEnd() {
            const held = Date.now() - this.bsPressAt;
            this.bsLastTouchEnd = Date.now();
            this.clearBackspaceTimers();
            if (held < 460) { this.deleteOnce(); }
        },

        bsClick() {
            if (Date.now() - this.bsLastTouchEnd < 700) { return; }
            this.deleteOnce();
        },

        commitFirstCandidate() {
            if (this.candidates.length) {
                this.selectCandidate(this.candidates[0]);
            } else {
                this.pinyinBuffer = '';
            }
        },

        selectCandidate(word: string) {
            const { syllables } = segmentPinyin(this.pinyinBuffer);
            this.text += word;
            this.pinyinBuffer = '';
            this.candidates = [];
            this.commitValue();
            if (syllables.length) {
                recordUserWord(word, syllables.join(' '));
            }
        },

        onSpace() {
            if (this.hasPinyin) {
                this.commitFirstCandidate();
                return;
            }
            this.text += ' ';
            this.commitValue();
        },

        onEnter() {
            if (this.hasPinyin) { this.commitFirstCandidate(); }
            this.commitValue();
            this.$emit('confirm', this.text);
        },

        onBackquote() {
            this.text += '`';
            this.commitValue();
        },

        onCommaOrPeriod(ch: string) {
            if (this.hasPinyin) {
                this.commitFirstCandidate();
                return;
            }
            if (this.layout === 'cn') {
                this.text += ch === ',' ? '，' : '。';
            } else {
                this.text += ch === ',' ? ',' : '.';
            }
            this.commitValue();
        },

        switchSymbolPage() {
            this.switchLayout(this.layout === 'sym' ? 'num' : 'sym');
        },

        close() {
            if (this.pinyinBuffer) { this.commitFirstCandidate(); }
            this.commitValue();
            this.$emit('close');
        },
    },
});
