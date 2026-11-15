// 文件系统与命令执行的统一入口。
//
// 原生 Shell 模块由 jsapi/src/Shell 提供，第一次调用时自动 initialize，
// 页面不需要再手动初始化（修复了图片查看器因未初始化导致扫描失败的问题）。

import { Shell } from 'langningchen';

export interface FileEntry {
    name: string;
    path: string;
    dir: boolean;
    size: number;
    mtime: number;
}

let initPromise: Promise<void> | null = null;

export function ensureShell(): Promise<void> {
    if (!initPromise) {
        initPromise = Promise.resolve(Shell.initialize()).then(() => undefined);
    }
    return initPromise;
}

export async function exec(command: string): Promise<string> {
    await ensureShell();
    return Shell.exec(command);
}

export async function list(path: string): Promise<FileEntry[]> {
    await ensureShell();
    const raw = await Shell.list(path || '/');
    try {
        const data = JSON.parse(raw || '[]');
        return Array.isArray(data) ? data : [];
    } catch (e) {
        return [];
    }
}

export async function statPath(path: string): Promise<FileEntry | null> {
    await ensureShell();
    try {
        const data = JSON.parse(await Shell.stat(path));
        return {
            name: String(data.path || path).split('/').pop() || '',
            path: data.path,
            dir: !!data.dir,
            size: Number(data.size) || 0,
            mtime: Number(data.mtime) || 0,
        };
    } catch (e) {
        return null;
    }
}

export async function exists(path: string): Promise<boolean> {
    await ensureShell();
    return Shell.exists(path);
}

export async function mkdir(path: string): Promise<boolean> {
    await ensureShell();
    return Shell.mkdir(path);
}

export async function remove(path: string): Promise<boolean> {
    await ensureShell();
    return Shell.remove(path);
}

export async function rename(from: string, to: string): Promise<boolean> {
    await ensureShell();
    return Shell.rename(from, to);
}

export async function copy(from: string, to: string): Promise<boolean> {
    await ensureShell();
    return Shell.copy(from, to);
}

export async function readText(path: string): Promise<string> {
    await ensureShell();
    return Shell.readText(path);
}

export async function writeText(path: string, content: string): Promise<boolean> {
    await ensureShell();
    return Shell.writeText(path, content);
}

export function joinPath(base: string, name: string): string {
    if (!base || base === '/') { return `/${name}`; }
    return base.endsWith('/') ? `${base}${name}` : `${base}/${name}`;
}

export function parentPath(path: string): string {
    if (!path || path === '/') { return '/'; }
    const trimmed = path.endsWith('/') ? path.slice(0, -1) : path;
    const index = trimmed.lastIndexOf('/');
    if (index <= 0) { return '/'; }
    return trimmed.slice(0, index);
}

export function baseName(path: string): string {
    const trimmed = path.endsWith('/') ? path.slice(0, -1) : path;
    return trimmed.split('/').pop() || trimmed;
}
