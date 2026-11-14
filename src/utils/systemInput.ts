// 系统输入法会话。
//
// 设备自带输入法是一个独立的系统 miniapp，通过原生模块 global 拉起：
//   new Global().startTextEdit(JSON.stringify({ text, placeholder, maxlength, autofocus }))
// 结果回调有两条通道：module.textEditFinished.on 和 $falcon.on('textEditFinished')，
// 不同固件给的回调形态不一致，因此这里同时订阅并兼容多种参数形态。
//
// 参考实现：56dz/PenBili 与 56dz/PenBili-CVI 的 src/services/input.js（真机验证）。

import globalModule, { type Global } from 'global';
import { showWarning } from '../components/ToastMessage';

const ID_RE = /^[0-9a-f]{32}$/i;
const UUID_RE = /^[0-9a-f-]{36}$/i;
const PROBE_METHODS = [
    'getTextEditValue',
    'getTextEditContent',
    'getTextEditText',
    'getCurrentTextEditValue',
    'getEditText',
    'getContent',
    'getText',
    'getValue',
];

export interface SystemInputOptions {
    value?: string;
    placeholder?: string;
    maxlength?: number;
}

export interface SystemInputResult {
    confirmed: boolean;
    text: string;
    canceled?: boolean;
    error?: string;
}

function isIdLike(value: string) {
    return ID_RE.test(value) || UUID_RE.test(value);
}

function normalizeTextValue(value: unknown): string {
    if (typeof value === 'string') { return value; }
    if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        if (typeof obj.value === 'string') { return obj.value; }
        if (typeof obj.text === 'string') { return obj.text; }
    }
    return '';
}

class InputSession {
    private manager: Global | null = null;
    private uuid = '';
    private moduleHandler: ((...args: unknown[]) => void) | null = null;
    private busHandler: ((...args: unknown[]) => void) | null = null;
    private pending: ((result: SystemInputResult) => void) | null = null;
    private watchdog = 0;

    private ensureManager() {
        if (!this.manager) {
            this.manager = new globalModule.Global();
        }
        return this.manager;
    }

    private resolvePending(result: SystemInputResult) {
        const pending = this.pending;
        this.pending = null;
        if (this.watchdog) {
            clearTimeout(this.watchdog);
            this.watchdog = 0;
        }
        if (pending) { pending(result); }
    }

    private subscribe(manager: Global) {
        if (!this.moduleHandler) {
            this.moduleHandler = (...args: unknown[]) => this.onFinished(args);
            try {
                manager.textEditFinished.on(this.moduleHandler);
            } catch {
                this.moduleHandler = null;
            }
        }
        if (!this.busHandler) {
            this.busHandler = (...args: unknown[]) => this.onFinished(args);
            try {
                $falcon.on('textEditFinished', this.busHandler);
            } catch {
                this.busHandler = null;
            }
        }
    }

    private onFinished(args: unknown[]) {
        if (!this.pending) { return; }

        const acc = { uuid: '', confirmed: false, canceled: false, text: '' };
        for (const item of args) { this.absorb(item, acc, 0); }

        if (this.uuid && acc.uuid && acc.uuid !== this.uuid) { return; }

        let text = acc.text;
        if (!text) {
            const probed = this.probeText(acc.uuid || this.uuid);
            if (probed) { text = probed; }
        }
        if (!acc.confirmed && !acc.canceled && text) { acc.confirmed = true; }

        const uuid = this.uuid;
        this.uuid = '';
        const confirmed = acc.confirmed && !acc.canceled;
        this.resolvePending({ confirmed, text: confirmed ? text : '' });
        this.deferClose(acc.uuid || uuid);
    }

    private absorb(item: unknown, acc: { uuid: string; confirmed: boolean; canceled: boolean; text: string; }, depth: number) {
        if (depth > 3 || item === undefined || item === null) { return; }

        if (typeof item === 'string') {
            const value = item.trim();
            if (!value) { return; }
            if (isIdLike(value)) {
                if (!acc.uuid) { acc.uuid = value; }
                return;
            }
            const head = value.charAt(0);
            if (head === '{' || head === '[') {
                try {
                    this.absorb(JSON.parse(value), acc, depth + 1);
                    return;
                } catch {
                    // 普通文本
                }
            }
            if (value.length > acc.text.length) { acc.text = value; }
            return;
        }

        if (typeof item === 'boolean') {
            if (item) { acc.confirmed = true; }
            return;
        }
        if (typeof item !== 'object') { return; }

        const obj = item as Record<string, unknown>;
        if (obj.editConfirmed === true || obj.confirmed === true) { acc.confirmed = true; }
        if (obj.editCanceled === true || obj.canceled === true) { acc.canceled = true; }

        const uuid = obj.uuid || obj.calledTaskUuid || obj.taskUuid;
        if (typeof uuid === 'string' && uuid) { acc.uuid = uuid; }

        const raw = obj.editText !== undefined
            ? obj.editText
            : obj.text !== undefined
                ? obj.text
                : obj.value !== undefined
                    ? obj.value
                    : obj.contents !== undefined
                        ? obj.contents
                        : obj.content;
        const text = normalizeTextValue(raw);
        if (text && !isIdLike(text) && text.length >= acc.text.length) { acc.text = text; }
        if (!text && typeof obj.data === 'string') { this.absorb(obj.data, acc, depth + 1); }
    }

    private probeText(uuid: string): string {
        const manager = this.manager;
        if (!manager) { return ''; }

        for (const name of PROBE_METHODS) {
            const fn = manager[name];
            if (typeof fn !== 'function') { continue; }
            let value: unknown = null;
            try {
                value = uuid ? fn.call(manager, uuid) : fn.call(manager);
            } catch {
                try {
                    value = fn.call(manager);
                } catch {
                    value = null;
                }
            }
            if (typeof value === 'string' && value && !isIdLike(value)) { return value; }
        }
        return '';
    }

    private deferClose(uuid: string) {
        if (!uuid) { return; }
        setTimeout(() => {
            try {
                this.manager?.closeTextEdit(uuid);
            } catch {
                // 面板可能已被系统关闭
            }
        }, 60);
    }

    open(options: SystemInputOptions = {}): Promise<SystemInputResult> {
        return new Promise((resolve) => {
            let manager: Global;
            try {
                manager = this.ensureManager();
            } catch {
                resolve({ confirmed: false, text: '', error: 'INPUT_UNAVAILABLE' });
                return;
            }

            if (this.uuid) {
                try { manager.closeTextEdit(this.uuid); } catch { /* 忽略 */ }
                this.uuid = '';
                this.resolvePending({ confirmed: false, text: '' });
            }

            this.subscribe(manager);

            let uuid: unknown = '';
            try {
                uuid = manager.startTextEdit(JSON.stringify({
                    text: options.value ?? '',
                    placeholder: options.placeholder ?? '请输入',
                    maxlength: options.maxlength ?? 2048,
                    autofocus: true,
                }));
            } catch {
                resolve({ confirmed: false, text: '', error: 'INPUT_START_FAIL' });
                return;
            }

            if (uuid && typeof uuid === 'object') {
                const obj = uuid as Record<string, unknown>;
                uuid = obj.uuid || obj.value || '';
            }
            this.uuid = typeof uuid === 'string' ? uuid : '';
            this.pending = resolve;

            this.watchdog = setTimeout(() => {
                if (!this.pending) { return; }
                const pendingUuid = this.uuid;
                this.uuid = '';
                this.resolvePending({ confirmed: false, text: '' });
                this.deferClose(pendingUuid);
            }, 90000) as unknown as number;
        });
    }

    dispose() {
        if (this.manager && this.moduleHandler) {
            try {
                this.manager.textEditFinished.off(this.moduleHandler);
            } catch {
                // 忽略
            }
            this.moduleHandler = null;
        }
        if (this.busHandler) {
            try {
                $falcon.off('textEditFinished', this.busHandler);
            } catch {
                // 忽略
            }
            this.busHandler = null;
        }
        this.resolvePending({ confirmed: false, text: '', canceled: true });
    }
}

const input = new InputSession();

/**
 * 用系统输入法编辑一个值，保持旧 openSoftKeyboard 的调用形态。
 * 取消输入或校验失败时不写回。
 */
export function openSystemInput(
    get: () => string,
    set: (value: string) => void,
    validate?: (value: string) => string | undefined
) {
    input.open({ value: get(), placeholder: '请输入', maxlength: 2048 }).then((result) => {
        if (result.error) {
            showWarning('系统输入法不可用');
            return;
        }
        if (!result.confirmed) { return; }

        const value = result.text;
        const validationError = validate?.(value);
        if (validationError) {
            showWarning(validationError);
            return;
        }
        set(value);
    });
}

export function disposeSystemInput() {
    input.dispose();
}
