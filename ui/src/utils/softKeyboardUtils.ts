// 输入工具 — 统一调用系统键盘 NativeSDK.startTextEdit
// 移除自研软键盘，所有输入框走系统键盘

import { showWarning } from '../components/ToastMessage';

export async function openKeyboard(
    get: () => string,
    set: (value: string) => void,
    validate?: (value: string) => string | undefined
) {
    try {
        const NativeSDK = (globalThis as any).NativeSDK;
        if (!NativeSDK || typeof NativeSDK.startTextEdit !== 'function') {
            console.error('NativeSDK.startTextEdit 不可用');
            return;
        }

        const currentValue = get();
        const uuid = NativeSDK.startTextEdit({
            text: currentValue,
            maxlength: 1000,
            enterButtonText: '确定',
            inputType: 'text'
        });

        const handler = (editUuid: string, jsonData: string) => {
            if (editUuid !== uuid) return;
            try {
                const result = JSON.parse(jsonData);
                if (result.editConfirmed) {
                    const newValue = (result.text || '').replace(/\n/g, '');
                    if (validate) {
                        const err = validate(newValue);
                        if (err) { showWarning(err); return; }
                    }
                    set(newValue);
                }
            } catch (e) {
                console.error('textEdit 结果解析失败:', e);
            }
            try {
                if (NativeSDK.globalModule && NativeSDK.globalModule().closeTextEdit) {
                    NativeSDK.globalModule().closeTextEdit(uuid);
                }
                if (NativeSDK.globalModule && NativeSDK.globalModule().textEditFinished) {
                    NativeSDK.globalModule().textEditFinished.off(handler);
                }
            } catch (e) {}
        };

        if (NativeSDK.globalModule && NativeSDK.globalModule().textEditFinished) {
            NativeSDK.globalModule().textEditFinished.on(handler);
        }
    } catch (error) {
        console.error('系统键盘调用失败:', error);
    }
}
