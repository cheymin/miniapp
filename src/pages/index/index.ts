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

// 复刻自 1.15.5 包 index.js：计算器主页。
// 输入 “1999” 并求值可进入 desktop 桌面。

type ThemeColor = [string, string];

interface CalcKey {
    key: string;
    text: string;
    expr: string;
    color: ThemeColor;
    wide?: boolean;
}

interface CalcResult {
    ok: boolean;
    text: string;
}

const THEME = {
    ng: ['#0f263b', '#e3e3e3'] as ThemeColor,
    sb: ['#022133', '#c2e7ff'] as ThemeColor,
    db: ['#052350', '#d3e3fd'] as ThemeColor,
    lg: ['#6ada8b', '#0a3818'] as ThemeColor,
};

const COLOR_NORMAL = '#e3e3e3';
const COLOR_OK = '#6dd58c';
const COLOR_ERR = '#f2b8b5';
const DESKTOP_SECRET = '1999';

function digitKey(digit: string): CalcKey {
    return { key: 'd' + digit, text: digit, expr: digit, color: THEME.ng };
}

const LINE1: CalcKey[] = [
    { key: 'e', text: 'e', expr: 'e', color: THEME.sb },
    { key: 'pi', text: 'π', expr: 'π', color: THEME.sb },
    { key: 'pow', text: 'xⁿ', expr: '^', color: THEME.sb },
    { key: 'fact', text: '!', expr: '!', color: THEME.sb },
    { key: 'clear', text: 'AC', expr: 'clear', color: THEME.db },
    digitKey('7'),
    digitKey('8'),
    digitKey('9'),
    { key: 'lp', text: '(', expr: '(', color: THEME.sb },
    { key: 'div', text: '÷', expr: '/', color: THEME.sb },
    { key: 'mul', text: '×', expr: '*', color: THEME.sb },
];

const LINE2: CalcKey[] = [
    { key: 'unit', text: 'rad', expr: 'unit-toggle', color: THEME.sb },
    { key: 'sin', text: 'sin', expr: 'sin(', color: THEME.sb },
    { key: 'cos', text: 'cos', expr: 'cos(', color: THEME.sb },
    { key: 'tan', text: 'tan', expr: 'tan(', color: THEME.sb },
    { key: 'dot', text: '.', expr: '.', color: THEME.ng },
    digitKey('4'),
    digitKey('5'),
    digitKey('6'),
    { key: 'rp', text: ')', expr: ')', color: THEME.sb },
    { key: 'sub', text: '-', expr: '-', color: THEME.sb },
    { key: 'add', text: '+', expr: '+', color: THEME.sb },
];

const LINE3: CalcKey[] = [
    { key: 'inv', text: 'inv', expr: 'inverse', color: THEME.sb },
    { key: 'sqrt', text: '√', expr: 'sqrt(', color: THEME.sb },
    { key: 'ln', text: 'ln', expr: 'ln(', color: THEME.sb },
    { key: 'log', text: 'log', expr: 'log(', color: THEME.sb },
    digitKey('0'),
    digitKey('1'),
    digitKey('2'),
    digitKey('3'),
    { key: 'del', text: 'Del', expr: 'remove', color: THEME.sb },
];

const LINE3_INV: CalcKey[] = [
    { key: 'inv', text: 'inv', expr: 'inverse', color: THEME.sb },
    { key: 'sqr', text: 'x²', expr: '^2', color: THEME.sb },
    { key: 'expx', text: 'eˣ', expr: 'e^', color: THEME.sb },
    { key: 'pow10', text: '10ˣ', expr: '10^', color: THEME.sb },
    digitKey('0'),
    digitKey('1'),
    digitKey('2'),
    digitKey('3'),
    { key: 'del', text: 'Del', expr: 'remove', color: THEME.sb },
];

const FUNC_NAMES = ['asin', 'acos', 'atan', 'sin', 'cos', 'tan', 'sqrt', 'cbrt', 'ln', 'log'];

class ExpressionParser {
    private pos = 0;

    constructor(private src: string) {}

    parse(): number {
        const value = this.parseAdditive();
        this.skipSpaces();
        if (this.pos < this.src.length) {
            throw new Error('invalid expr');
        }
        return value;
    }

    private skipSpaces() {
        while (this.src[this.pos] === ' ') {
            this.pos += 1;
        }
    }

    private peek(): string {
        this.skipSpaces();
        return this.src[this.pos] || '';
    }

    private parseAdditive(): number {
        let value = this.parseMultiplicative();
        for (;;) {
            const ch = this.peek();
            if (ch === '+') {
                this.pos += 1;
                value += this.parseMultiplicative();
            } else if (ch === '-') {
                this.pos += 1;
                value -= this.parseMultiplicative();
            } else {
                return value;
            }
        }
    }

    private parseMultiplicative(): number {
        let value = this.parseUnary();
        for (;;) {
            const ch = this.peek();
            if (ch === '*') {
                this.pos += 1;
                value *= this.parseUnary();
            } else if (ch === '/') {
                this.pos += 1;
                value /= this.parseUnary();
            } else {
                return value;
            }
        }
    }

    private parseUnary(): number {
        const ch = this.peek();
        if (ch === '-') {
            this.pos += 1;
            return -this.parseUnary();
        }
        if (ch === '+') {
            this.pos += 1;
            return this.parseUnary();
        }
        return this.parsePower();
    }

    private parsePower(): number {
        const base = this.parsePostfix();
        if (this.peek() === '^') {
            this.pos += 1;
            const exponent = this.parseUnary();
            return Math.pow(base, exponent);
        }
        return base;
    }

    private parsePostfix(): number {
        let value = this.parsePrimary();
        while (this.peek() === '!') {
            this.pos += 1;
            value = this.factorial(value);
        }
        return value;
    }

    private parsePrimary(): number {
        this.skipSpaces();
        const rest = this.src.slice(this.pos);
        const numMatch = /^\d+(?:\.\d*)?|^\.\d+/.exec(rest);
        if (numMatch) {
            this.pos += numMatch[0].length;
            return Number(numMatch[0]);
        }
        if (rest.startsWith('π')) {
            this.pos += 1;
            return Math.PI;
        }
        const name = FUNC_NAMES.find((item) => rest.startsWith(item));
        if (name) {
            this.pos += name.length;
            if (this.peek() !== '(') {
                throw new Error('invalid call');
            }
            this.pos += 1;
            const arg = this.parseAdditive();
            if (this.peek() === ')') {
                this.pos += 1;
            }
            return callFunction(name, arg);
        }
        if (rest.startsWith('e')) {
            this.pos += 1;
            return Math.E;
        }
        if (this.peek() === '(') {
            this.pos += 1;
            const value = this.parseAdditive();
            if (this.peek() === ')') {
                this.pos += 1;
            }
            return value;
        }
        throw new Error('invalid token');
    }

    private factorial(raw: number): number {
        if (!Number.isFinite(raw) || raw < 0 || Math.abs(raw - Math.round(raw)) > 1e-9) {
            throw new Error('factorial invalid');
        }
        const n = Math.round(raw);
        if (n > 170) {
            throw new Error('factorial overflow');
        }
        let result = 1;
        for (let i = 2; i <= n; i += 1) {
            result *= i;
        }
        return result;
    }
}

let currentUnit: 'rad' | 'deg' = 'rad';

function callFunction(name: string, arg: number): number {
    const toRad = (v: number) => (currentUnit === 'deg' ? (v * Math.PI) / 180 : v);
    const fromRad = (v: number) => (currentUnit === 'deg' ? (v * 180) / Math.PI : v);
    switch (name) {
        case 'sin':
            return Math.sin(toRad(arg));
        case 'cos':
            return Math.cos(toRad(arg));
        case 'tan':
            return Math.tan(toRad(arg));
        case 'asin':
            return fromRad(Math.asin(arg));
        case 'acos':
            return fromRad(Math.acos(arg));
        case 'atan':
            return fromRad(Math.atan(arg));
        case 'sqrt':
            return Math.sqrt(arg);
        case 'cbrt':
            return Math.cbrt(arg);
        case 'ln':
            return Math.log(arg);
        case 'log':
            return Math.log(arg) / Math.LN10;
        default:
            throw new Error('unknown func');
    }
}

function tokenize(expr: string) {
    const tokens: string[] = [];
    let i = 0;
    while (i < expr.length) {
        const ch = expr[i];
        if (ch === ' ') {
            i += 1;
            continue;
        }
        if (/[0-9.]/.test(ch)) {
            let num = ch;
            i += 1;
            while (i < expr.length && /[0-9.]/.test(expr[i])) {
                num += expr[i];
                i += 1;
            }
            tokens.push(num);
            continue;
        }
        const name = FUNC_NAMES.find((item) => expr.startsWith(item, i));
        if (name) {
            tokens.push(name);
            i += name.length;
            continue;
        }
        if (ch === 'π') {
            tokens.push('π');
            i += 1;
            continue;
        }
        if ('e+-*/^!()'.includes(ch)) {
            tokens.push(ch);
            i += 1;
            continue;
        }
        throw new Error('invalid char');
    }
    return tokens;
}

function evaluateExpression(expr: string): CalcResult {
    try {
        if (!expr.trim()) {
            return { ok: false, text: '0' };
        }
        const value = new ExpressionParser(expr).parse();
        if (Number.isNaN(value)) {
            return { ok: false, text: '定义域错误' };
        }
        if (!Number.isFinite(value)) {
            return { ok: false, text: '定义域错误' };
        }
        return { ok: true, text: formatNumber(value) };
    } catch (error) {
        return { ok: false, text: '不合法的计算' };
    }
}

function formatNumber(value: number): string {
    if (Math.abs(value) < 1e-12) {
        value = 0;
    }
    const rounded = Math.round(value);
    if (Math.abs(value - rounded) < 1e-12) {
        return String(rounded);
    }
    return value
        .toPrecision(12)
        .replace(/(\.\d*?[1-9])0+$/, '$1')
        .replace(/\.0+$/, '');
}

const index = defineComponent({
    data() {
        return {
            loading: true,
            didWarmUp: false,
            isInv: false,
            unit: 'rad' as 'rad' | 'deg',
            tokens: [] as string[],
            result: null as string | null,
            textColor: COLOR_NORMAL,
            pressedKey: '',
            emptyObject: {},
        };
    },

    computed: {
        keyMap(): { line1: CalcKey[]; line2: CalcKey[]; line3: CalcKey[] } {
            const altUnit = this.unit === 'rad' ? 'deg' : 'rad';
            const line2 = [{ ...LINE2[0], text: altUnit }].concat(LINE2.slice(1));
            return {
                line1: LINE1,
                line2,
                line3: this.isInv ? LINE3_INV : LINE3,
            };
        },

        display(): string {
            if (this.result !== null) {
                return this.result;
            }
            return this.tokens.map(prettyToken).join('');
        },
    },

    mounted() {
        currentUnit = 'rad';
        // 预热求值引擎，和原包一致：先跑一次 1+1。
        setTimeout(() => {
            evaluateExpression('1+1');
            this.didWarmUp = true;
            this.loading = false;
        }, 60);
    },

    methods: {
        onKey(key: CalcKey) {
            const expr = key.expr;
            if (expr === 'clear') {
                this.clearAll();
                return;
            }
            if (expr === 'remove') {
                this.tokens.pop();
                this.result = null;
                this.textColor = COLOR_NORMAL;
                return;
            }
            if (expr === 'unit-toggle') {
                this.unit = this.unit === 'rad' ? 'deg' : 'rad';
                currentUnit = this.unit;
                return;
            }
            if (expr === 'inverse') {
                this.isInv = !this.isInv;
                return;
            }
            this.textColor = COLOR_NORMAL;
            this.result = null;
            const last = this.tokens[this.tokens.length - 1] || '';
            if (/^[0-9.]/.test(expr) && /^[0-9.]/.test(last)) {
                this.tokens[this.tokens.length - 1] = last + expr;
            } else {
                this.tokens.push(expr);
            }
        },

        clearAll() {
            this.tokens = [];
            this.result = null;
            this.textColor = COLOR_NORMAL;
            this.isInv = false;
        },

        evaluate() {
            const outcome = evaluateExpression(this.tokens.join(''));
            this.result = outcome.text;
            this.textColor = outcome.ok ? COLOR_OK : COLOR_ERR;
            if (outcome.ok) {
                this.checkSecret(outcome.text);
            }
        },

        checkSecret(display: string) {
            if (display === DESKTOP_SECRET) {
                $falcon.navTo('desktop', { from: 'index' });
            }
        },

        press(key: CalcKey) {
            this.pressedKey = key.key;
        },

        release() {
            this.pressedKey = '';
        },
    },
});

function prettyToken(token: string): string {
    switch (token) {
        case 'sqrt(':
            return '√(';
        case '*':
            return '×';
        case '/':
            return '÷';
        case '^2':
            return '²';
        case 'e^':
            return 'e^';
        case '10^':
            return '10^';
        default:
            return token;
    }
}

export default index;
