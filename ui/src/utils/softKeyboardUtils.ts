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

async function getKeyboardType(): Promise<'soft' | 'system'> {
    try {
        const data = await $falcon.storage.get('keyboard_type');
        return (data as 'soft' | 'system') || 'soft';
    } catch (error) {
        return 'soft';
    }
}

export function openSoftKeyboard(
    get: () => string,
    set: (value: string) => void,
    validate?: (value: string) => string | undefined
) {
    getKeyboardType().then(keyboardType => {
        if (keyboardType === 'system') {
            openSystemKeyboard(get, set, validate);
        } else {
            openCustomKeyboard(get, set, validate);
        }
    });
}

function openSystemKeyboard(
    get: () => string,
    set: (value: string) => void,
    validate?: (value: string) => string | undefined
) {
    const currentValue = get();
    
    try {
        const uuid = ($falcon as any).startTextEdit({
            placeholder: '请输入内容',
            text: currentValue,
            maxLength: 500
        });

        const handler = (data: any) => {
            const result = typeof data === 'string' ? JSON.parse(data) : data;
            
            if (result.editConfirmed) {
                const newValue = result.text || '';
                
                if (validate) {
                    const validationError = validate(newValue);
                    if (validationError) {
                        showWarning(validationError);
                        return;
                    }
                }
                
                set(newValue);
            }
            
            try {
                ($falcon as any).closeTextEdit(uuid);
            } catch (e) {
                console.error('关闭系统键盘失败:', e);
            }
        };

        ($falcon as any).textEditFinished?.on(handler);
    } catch (error) {
        console.error('系统键盘不可用，回退到软键盘:', error);
        openCustomKeyboard(get, set, validate);
    }
}

function openCustomKeyboard(
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
