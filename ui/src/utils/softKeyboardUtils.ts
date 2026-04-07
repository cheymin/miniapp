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

import { showWarning } from '../components/ToastMessage';

function normalizeKeyboardData(data: any): string {
    if (typeof data === 'string') {
        return data;
    }

    if (data && typeof data === 'object') {
        if (typeof data.value === 'string') return data.value;
        if (typeof data.text === 'string') return data.text;
        if (typeof data.key === 'string') return data.key;
    }

    return '';
}

export async function getKeyboardType(): Promise<string> {
    try {
        const data = await $falcon.storage.get('keyboard_type');
        return data || 'soft';
    } catch (error) {
        console.error('获取键盘类型失败:', error);
        return 'soft';
    }
}

export function openSoftKeyboard(
    get: () => string,
    set: (value: string) => void,
    validate?: (value: string) => string | undefined
) {
    const currentValue = get();
    $falcon.navTo('softKeyboard', { data: currentValue });

    const handler = (e: { data: any }) => {
        const newValue = normalizeKeyboardData(e.data);

        if (validate) {
            const validationError = validate(newValue);
            if (validationError) {
                showWarning(validationError);
                $falcon.off('softKeyboard', handler);
                return;
            }
        }

        set(newValue);
        $falcon.off('softKeyboard', handler);
    };

    $falcon.on('softKeyboard', handler);
}

export async function openKeyboard(
    get: () => string,
    set: (value: string) => void,
    validate?: (value: string) => string | undefined
) {
    const keyboardType = await getKeyboardType();
    
    if (keyboardType === 'system') {
        try {
            const NativeSDK = (globalThis as any).NativeSDK;
            if (NativeSDK && NativeSDK.startTextEdit) {
                const currentValue = get();
                const uuid = NativeSDK.startTextEdit({
                    text: currentValue,
                    maxlength: 1000,
                    enterButtonText: '确定',
                    inputType: 'text'
                });
                
                const handler = (editUuid: string, jsonData: string) => {
                    if (editUuid !== uuid) return;
                    
                    const result = JSON.parse(jsonData);
                    if (result.editConfirmed) {
                        const newValue = (result.text || '').replace(/\n/g, '');
                        
                        if (validate) {
                            const validationError = validate(newValue);
                            if (validationError) {
                                showWarning(validationError);
                                return;
                            }
                        }
                        
                        set(newValue);
                    }
                    
                    if (NativeSDK.globalModule && NativeSDK.globalModule().closeTextEdit) {
                        NativeSDK.globalModule().closeTextEdit(uuid);
                    }
                };
                
                if (NativeSDK.globalModule && NativeSDK.globalModule().textEditFinished) {
                    NativeSDK.globalModule().textEditFinished.on(handler);
                }
                
                return;
            }
        } catch (error) {
            console.error('系统键盘调用失败，使用软键盘:', error);
        }
    }
    
    openSoftKeyboard(get, set, validate);
}
