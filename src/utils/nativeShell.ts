// 文件系统与命令执行的统一入口。
//
// 只依赖 Shell.initialize / Shell.exec 这两个老版本就有的接口，
// 避免设备上原生库未更新（Shell.list is not a function）导致页面不可用。
// 第一次调用时自动 initialize，页面不需要再手动初始化。

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

export function shellQuote(value: string): string {
    return `'${String(value == null ? '' : value).replace(/'/g, `'\\''`)}'`;
}

export async function exec(command: string): Promise<string> {
    await ensureShell();
    return Shell.exec(command);
}

function parseEntries(raw: string, base: string): FileEntry[] {
    const entries: FileEntry[] = [];
    const prefix = base === '/' ? '' : base.replace(/\/+$/, '');
    raw.split('\n').forEach((line) => {
        if (!line) { return; }
        const parts = line.split('\t');
        if (parts.length < 4) { return; }
        const name = parts.slice(3).join('\t');
        if (!name) { return; }
        entries.push({
            name,
            path: `${prefix}/${name}`,
            dir: parts[0] === 'd',
            size: Number(parts[1]) || 0,
            mtime: Number(parts[2]) || 0,
        });
    });
    entries.sort((a, b) => {
        if (a.dir !== b.dir) { return a.dir ? -1 : 1; }
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
    return entries;
}

export async function list(path: string): Promise<FileEntry[]> {
    const dir = path || '/';
    const script =
        `cd ${shellQuote(dir)} || exit 1; ` +
        'ls -1a | while IFS= read -r n; do ' +
        'case "$n" in .|..) continue;; esac; ' +
        'if [ -d "$n" ]; then t=d; else t=f; fi; ' +
        'set -- $(stat -c \'%s %Y\' "$n" 2>/dev/null); ' +
        'printf \'%s\\t%s\\t%s\\t%s\\n\' "$t" "${1:-0}" "${2:-0}" "$n"; ' +
        'done';

    const raw = await exec(script);
    return parseEntries(raw, dir);
}

export async function statPath(path: string): Promise<FileEntry | null> {
    const target = shellQuote(path);
    const raw = await exec(
        `if [ -e ${target} ]; then ` +
        `if [ -d ${target} ]; then echo d; else echo f; fi; ` +
        `stat -c '%s %Y' ${target} 2>/dev/null; ` +
        'else echo n; fi'
    );

    const lines = (raw || '').split('\n');
    const type = (lines[0] || '').trim();
    if (!type || type === 'n') { return null; }
    const info = (lines[1] || '').trim().split(/\s+/);
    const trimmed = path.replace(/\/+$/, '');
    return {
        name: trimmed.split('/').pop() || trimmed || '/',
        path: trimmed || '/',
        dir: type === 'd',
        size: Number(info[0]) || 0,
        mtime: Number(info[1]) || 0,
    };
}

export async function exists(path: string): Promise<boolean> {
    const raw = await exec(`if [ -e ${shellQuote(path)} ]; then echo 1; else echo 0; fi`);
    return (raw || '').trim() === '1';
}

export async function mkdir(path: string): Promise<boolean> {
    await exec(`mkdir -p ${shellQuote(path)}`);
    return true;
}

export async function remove(path: string): Promise<boolean> {
    await exec(`rm -rf ${shellQuote(path)}`);
    return true;
}

export async function rename(from: string, to: string): Promise<boolean> {
    await exec(`mv -f ${shellQuote(from)} ${shellQuote(to)}`);
    return true;
}

export async function copy(from: string, to: string): Promise<boolean> {
    await exec(`cp -r ${shellQuote(from)} ${shellQuote(to)}`);
    return true;
}

export async function readText(path: string): Promise<string> {
    const raw = await exec(`head -c 262144 ${shellQuote(path)}`);
    return raw || '';
}

export async function writeText(path: string, content: string): Promise<boolean> {
    await exec(`printf '%s' ${shellQuote(content)} > ${shellQuote(path)}`);
    return true;
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
