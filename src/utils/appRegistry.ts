// 应用注册表读取与管理。
//
// 参考 pstore 的 desktop_icon/apps_manage 与 Loli 的文件管理器：
//   - 已安装列表优先读 packages.json，读不到时扫描安装目录下的 manifest.json；
//   - 桌面显示开关改写 packages.json 的 flag 最低位，重启桌面后生效；
//   - 启动 / 卸载统一走设备自带的 miniapp_cli；
//   - 安装只接受 .amr，链接会先下载到 /tmp 再交给 miniapp_cli。

import { exec, list, readText, shellQuote, statPath } from './nativeShell';

export interface InstalledApp {
    appid: string;
    name: string;
    version: string;
    category: string;
    categoryLabel: string;
    installPath: string;
    icon: string;
    desktop: boolean;
    system: boolean;
    protected: boolean;
    self: boolean;
}

export interface RegistrySnapshot {
    path: string;
    root: any;
    apps: InstalledApp[];
}

export const SELF_APPID = '8001749644971194';

const PACKAGES_JSON_CANDIDATES = [
    '/userdata/miniapp/data/mini_app/pkg/packages.json',
    '/userdisk/secondary/miniapp/data/mini_app/pkg/packages.json',
    '/userdisk/miniapp/data/mini_app/pkg/packages.json',
    '/data/miniapp/data/mini_app/pkg/packages.json',
];

const PKG_DIR_CANDIDATES = [
    '/userdata/miniapp/data/mini_app/pkg',
    '/userdisk/secondary/miniapp/data/mini_app/pkg',
    '/userdisk/miniapp/data/mini_app/pkg',
];

const MANIFEST_SLOTS = ['/manifest.json', '/a/manifest.json', '/b/manifest.json'];

// 这些应用参与系统运行，禁止从列表里卸载。
const PROTECTED_APPIDS = [
    SELF_APPID,
    '8001687764241341',
    '8001782559140681',
    '8080222437664451',
    '8080222501178405',
];

const SYSTEM_APPIDS = [
    '8001782559140681',
    '8080222437664451',
    '8080222501178405',
];

const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/;

function isSafeName(value: string): boolean {
    return SAFE_NAME.test(value);
}

function asText(value: any): string {
    return typeof value === 'string' ? value.trim() : '';
}

function pickText(entry: any, keys: string[]): string {
    for (const key of keys) {
        const value = asText(entry[key]);
        if (value) { return value; }
    }
    return '';
}

function pickBoolean(entry: any, keys: string[]): boolean | null {
    for (const key of keys) {
        if (typeof entry[key] === 'boolean') { return entry[key]; }
    }
    return null;
}

function appIdOf(entry: any, key?: string): string {
    return pickText(entry, ['appid', 'appId', 'id', 'packageName']) || asText(key || '');
}

function joinPath(base: string, name: string): string {
    if (!base) { return name; }
    if (!name) { return base; }
    return `${base.replace(/\/+$/, '')}/${name.replace(/^\.?\//, '')}`;
}

function dirOf(path: string): string {
    const index = path.lastIndexOf('/');
    return index <= 0 ? '/' : path.slice(0, index);
}

function resolveInstallPath(entry: any, appid: string, registryPath: string): string {
    const raw = pickText(entry, ['installPath', 'packageDir', 'installDir', 'dir', 'path']);
    if (raw) {
        return raw.charAt(0) === '/' ? raw : joinPath(dirOf(registryPath), raw);
    }
    return joinPath(dirOf(registryPath), appid);
}

function resolveIcon(entry: any, installPath: string): string {
    const raw = pickText(entry, ['icon', 'appIcon', 'packageIcon', 'logo']);
    if (!raw) { return ''; }
    if (/^(https?:)?\/\//i.test(raw)) { return raw; }
    if (raw.charAt(0) === '/') { return raw; }
    return joinPath(installPath, raw);
}

function desktopVisible(entry: any): boolean {
    const explicit = pickBoolean(entry, ['desktop', 'shownOnDesktop', 'showOnDesktop']);
    if (explicit !== null) { return explicit; }
    const hidden = pickBoolean(entry, ['hidden', 'iconHidden']);
    if (hidden === true) { return false; }
    const flag = Number(entry.flag);
    if (!isNaN(flag)) { return (flag & 1) === 1; }
    return true;
}

function categoryLabelOf(category: string, system: boolean): string {
    if (system) { return '系统'; }
    const value = category.trim();
    if (!value) { return '应用'; }
    const lower = value.toLowerCase();
    if (lower === 'system') { return '系统'; }
    if (lower === 'developer' || lower === 'third' || lower === 'thirdparty' || lower === 'third-party') {
        return '第三方';
    }
    return value;
}

function isSystemCategory(category: string): boolean {
    const lower = category.toLowerCase();
    return category.indexOf('系统') >= 0 || lower.indexOf('system') >= 0;
}

function normalizeApp(entry: any, appid: string, registryPath: string): InstalledApp | null {
    if (!appid || !isSafeName(appid)) { return null; }

    const system = isSystemCategory(pickText(entry, ['category', 'type'])) ||
        entry.system === true || SYSTEM_APPIDS.indexOf(appid) >= 0;
    // 与 pstore 一致：只有显式 protected / 不支持卸载的内置应用才禁止隐藏和卸载，
    // 系统分类本身不直接等同于受保护。
    const protectedApp = entry.protected === true || entry.supportUnInstall === false ||
        PROTECTED_APPIDS.indexOf(appid) >= 0;
    const installPath = resolveInstallPath(entry, appid, registryPath);
    const category = pickText(entry, ['category', 'type']);

    return {
        appid,
        name: pickText(entry, ['name', 'appName', 'label', 'title']) || appid,
        version: pickText(entry, ['version', 'ver']) || '-',
        category,
        categoryLabel: categoryLabelOf(category, system),
        installPath,
        icon: resolveIcon(entry, installPath),
        desktop: desktopVisible(entry),
        system,
        protected: protectedApp,
        self: appid === SELF_APPID,
    };
}

function entriesOf(root: any): Array<{ appid: string; entry: any }> {
    const source = root && typeof root === 'object' && root.packages ? root.packages : root;
    const result: Array<{ appid: string; entry: any }> = [];

    if (Array.isArray(source)) {
        source.forEach((entry) => {
            if (entry && typeof entry === 'object') {
                result.push({ appid: appIdOf(entry), entry });
            }
        });
        return result;
    }

    if (source && typeof source === 'object') {
        Object.keys(source).forEach((key) => {
            const entry = source[key];
            if (entry && typeof entry === 'object') {
                result.push({ appid: appIdOf(entry, key), entry });
            }
        });
    }
    return result;
}

function normalizeRegistry(root: any, registryPath: string): InstalledApp[] {
    const apps: InstalledApp[] = [];
    const seen: { [appid: string]: boolean } = {};

    entriesOf(root).forEach((item) => {
        if (seen[item.appid]) { return; }
        const app = normalizeApp(item.entry, item.appid, registryPath);
        if (!app) { return; }
        seen[app.appid] = true;
        apps.push(app);
    });

    apps.sort((a, b) => {
        if (a.system !== b.system) { return a.system ? 1 : -1; }
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
    return apps;
}

async function readManifest(dir: string): Promise<any | null> {
    for (const slot of MANIFEST_SLOTS) {
        let raw = '';
        try {
            raw = await readText(`${dir}${slot}`);
        } catch {
            raw = '';
        }
        if (!raw) { continue; }
        try {
            return JSON.parse(raw);
        } catch {
            // 尝试下一个槽位
        }
    }
    return null;
}

async function scanInstalledFromDisk(): Promise<InstalledApp[]> {
    const apps: InstalledApp[] = [];
    const seen: { [appid: string]: boolean } = {};

    for (const dir of PKG_DIR_CANDIDATES) {
        let entries;
        try {
            entries = await list(dir);
        } catch {
            continue;
        }
        for (const item of entries) {
            if (!item.dir || !isSafeName(item.name) || seen[item.name]) { continue; }
            const manifest = await readManifest(item.path);
            if (!manifest || typeof manifest !== 'object') { continue; }
            const app = normalizeApp(manifest, appIdOf(manifest, item.name), `${dir}/packages.json`);
            if (!app) { continue; }
            app.installPath = item.path;
            app.icon = resolveIcon(manifest, item.path);
            seen[app.appid] = true;
            apps.push(app);
        }
    }

    apps.sort((a, b) => {
        if (a.system !== b.system) { return a.system ? 1 : -1; }
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
    return apps;
}

export async function loadInstalledApps(): Promise<RegistrySnapshot> {
    for (const path of PACKAGES_JSON_CANDIDATES) {
        let raw = '';
        try {
            raw = await readText(path);
        } catch {
            raw = '';
        }
        if (!raw || raw.trim().charAt(0) !== '{') { continue; }
        try {
            const root = JSON.parse(raw);
            const apps = normalizeRegistry(root, path);
            return { path, root, apps };
        } catch {
            // 继续尝试下一个候选路径
        }
    }

    return { path: '', root: null, apps: await scanInstalledFromDisk() };
}

function mutablePackages(root: any): any {
    return root && typeof root === 'object' && root.packages ? root.packages : root;
}

function findEntry(root: any, appid: string): any | null {
    const source = mutablePackages(root);
    if (Array.isArray(source)) {
        for (const entry of source) {
            if (entry && typeof entry === 'object' && appIdOf(entry) === appid) { return entry; }
        }
        return null;
    }
    if (source && typeof source === 'object') {
        if (source[appid] && typeof source[appid] === 'object') { return source[appid]; }
        const keys = Object.keys(source);
        for (const key of keys) {
            const entry = source[key];
            if (entry && typeof entry === 'object' && appIdOf(entry, key) === appid) { return entry; }
        }
    }
    return null;
}

async function writeFileAtomic(path: string, content: string): Promise<void> {
    const tmp = `${path}.tmp.${Date.now()}`;
    const size = 6000;
    await exec(`mkdir -p ${shellQuote(dirOf(path))}`);
    for (let offset = 0; offset < content.length || offset === 0; offset += size) {
        const chunk = content.slice(offset, offset + size);
        const op = offset === 0 ? '>' : '>>';
        await exec(`printf '%s' ${shellQuote(chunk)} ${op} ${shellQuote(tmp)}`);
    }
    await exec(`mv -f ${shellQuote(tmp)} ${shellQuote(path)}`);
}

export async function setDesktopVisible(
    snapshot: RegistrySnapshot,
    appid: string,
    visible: boolean
): Promise<void> {
    if (!snapshot.path || !snapshot.root) {
        throw new Error('未找到可写的 packages.json');
    }
    if (!isSafeName(appid)) {
        throw new Error('应用标识不合法');
    }
    const installed = snapshot.apps.find((app) => app.appid === appid);
    if (!visible && (SELF_APPID === appid || PROTECTED_APPIDS.indexOf(appid) >= 0 ||
        (installed && installed.protected))) {
        throw new Error('受保护的应用不能隐藏');
    }

    const entry = findEntry(snapshot.root, appid);
    if (!entry) {
        throw new Error('应用不在注册表中');
    }

    const flag = Number(entry.flag);
    const base = isNaN(flag) ? 0 : flag;
    entry.flag = visible ? (base | 1) : (base & ~1);
    entry.desktop = visible;

    await writeFileAtomic(snapshot.path, JSON.stringify(snapshot.root));

    // Shell.exec 不返回退出码，写回后再读一遍确认真的生效。
    const verifiedRaw = await readText(snapshot.path);
    let verified: any;
    try {
        verified = JSON.parse(verifiedRaw);
    } catch {
        throw new Error('写入注册表失败');
    }
    const verifiedEntry = findEntry(verified, appid);
    if (!verifiedEntry) {
        throw new Error('写入注册表失败');
    }
    const verifiedFlag = Number(verifiedEntry.flag);
    if (isNaN(verifiedFlag) || (verifiedFlag & 1) !== (visible ? 1 : 0)) {
        throw new Error('写入注册表失败，请检查文件权限');
    }
}

export async function launchInstalledApp(appid: string): Promise<void> {
    if (!isSafeName(appid)) {
        throw new Error('应用标识不合法');
    }
    await exec(`miniapp_cli start ${shellQuote(appid)} > /dev/null 2>&1 &`);
}

export async function uninstallInstalledApp(
    appid: string,
    snapshot?: RegistrySnapshot | null
): Promise<string> {
    if (!isSafeName(appid)) {
        throw new Error('应用标识不合法');
    }
    const installed = snapshot ? snapshot.apps.find((app) => app.appid === appid) : null;
    if (PROTECTED_APPIDS.indexOf(appid) >= 0 || (installed && installed.protected)) {
        throw new Error('受保护的应用不可卸载');
    }
    const output = await exec(`miniapp_cli uninstall ${shellQuote(appid)} 2>&1`);
    return output || '已卸载';
}

export async function installAmrPackage(source: string): Promise<string> {
    const target = source.trim();
    if (!target) {
        throw new Error('请输入安装包路径或下载链接');
    }

    let local = target;
    if (/^https?:\/\//i.test(target)) {
        const name = target.split('?')[0].split('/').pop() || 'package.amr';
        if (!/\.amr$/i.test(name)) {
            throw new Error('链接必须指向 .amr 安装包');
        }
        local = `/tmp/cheymin-install-${Date.now()}.amr`;
        await exec(
            `curl -k -L -s --connect-timeout 30 --max-time 600 ` +
            `${shellQuote(target)} -o ${shellQuote(local)}`
        );
        const info = await statPath(local);
        if (!info || info.size <= 0) {
            throw new Error('下载失败，请检查链接或网络');
        }
    } else if (!/\.amr$/i.test(local)) {
        throw new Error('只支持 .amr 安装包');
    }

    const info = await statPath(local);
    if (!info || info.dir || info.size <= 0) {
        throw new Error('安装包不存在或为空');
    }

    const output = await exec(`miniapp_cli install ${shellQuote(local)} 2>&1`);
    return output || '安装完成';
}
