// 应用锁：密码以轻量哈希形式存到框架 storage。
// 这是设备上的使用门槛，不是强安全存储，忘记密码只能清除应用数据。

const PASSWORD_KEY = 'app_password';

export function hashPassword(value: string): string {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < value.length; i++) {
        const ch = value.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export async function loadPassword(): Promise<string> {
    try {
        const result = await $falcon.jsapi.storage.getStorage({ key: PASSWORD_KEY });
        return (result && result.data) || '';
    } catch {
        return '';
    }
}

export async function savePassword(password: string): Promise<void> {
    await $falcon.jsapi.storage.setStorage({
        key: PASSWORD_KEY,
        data: password ? hashPassword(password) : '',
    });
}

export function verifyPassword(input: string, stored: string): boolean {
    return !!stored && hashPassword(input) === stored;
}
