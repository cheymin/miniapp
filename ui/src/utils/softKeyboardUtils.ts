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
        const result = await $falcon.jsapi.storage.getStorage({ key: 'keyboard_type' });
        return (result && result.data) || 'soft';
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
            
            if (!NativeSDK) {
                console.error('NativeSDK 不存在');
                openSoftKeyboard(get, set, validate);
                return;
            }
            
            if (typeof NativeSDK.startTextEdit !== 'function') {
                console.error('startTextEdit 方法不存在');
                openSoftKeyboard(get, set, validate);
                return;
            }
            
            const currentValue = get();
            console.log('调用系统键盘，当前值:', currentValue);
            
            const uuid = NativeSDK.startTextEdit({
                text: currentValue,
                maxlength: 1000,
                enterButtonText: '确定',
                inputType: 'text'
            });
            
            console.log('系统键盘 UUID:', uuid);
            
            if (!NativeSDK.globalModule) {
                console.error('globalModule 方法不存在');
                openSoftKeyboard(get, set, validate);
                return;
            }
            
            const globalModule = NativeSDK.globalModule();
            console.log('globalModule:', globalModule);
            
            if (!globalModule || !globalModule.textEditFinished) {
                console.error('textEditFinished 不存在');
                openSoftKeyboard(get, set, validate);
                return;
            }
            
            const handler = (editUuid: string, jsonData: string) => {
                console.log('键盘事件触发:', editUuid, jsonData);
                
                if (editUuid !== uuid) {
                    console.log('UUID 不匹配，忽略');
                    return;
                }
                
                try {
                    const result = JSON.parse(jsonData);
                    console.log('解析结果:', result);
                    
                    if (result.editConfirmed) {
                        const newValue = (result.text || '').replace(/\n/g, '');
                        console.log('用户输入:', newValue);
                        
                        if (validate) {
                            const validationError = validate(newValue);
                            if (validationError) {
                                showWarning(validationError);
                                return;
                            }
                        }
                        
                        set(newValue);
                    }
                    
                    if (globalModule.closeTextEdit) {
                        globalModule.closeTextEdit(uuid);
                    }
                } catch (e) {
                    console.error('解析键盘返回数据失败:', e);
                }
            };
            
            globalModule.textEditFinished.on(handler);
            console.log('系统键盘监听已注册');
            return;
        } catch (error) {
            console.error('系统键盘调用失败:', error);
        }
    }
    
    openSoftKeyboard(get, set, validate);
}
