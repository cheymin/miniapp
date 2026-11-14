import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { basename, resolve } from 'node:path';
import {
  getAppPackageInfo,
  getFalconBuildDir,
  pathResolve,
  type AppQuickJs,
} from '../libs/appinfo.js';

interface Manifest {
  appName: string;
  version: string;
  appid: string;
  icon: string;
  quickjs?: AppQuickJs;
  cert: Record<string, { size: number; md5: string }>;
}

const collectFiles = (dir: string, base = ''): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const relative = base ? `${base}/${entry.name}` : entry.name;
    return entry.isDirectory()
      ? collectFiles(resolve(dir, entry.name), relative)
      : [relative];
  });

export async function generate(): Promise<void> {
  const distDir = getFalconBuildDir();
  const appPkg = getAppPackageInfo();

  const icon = appPkg.icon ?? '';
  const src = pathResolve(icon);
  if (existsSync(src)) copyFileSync(src, resolve(distDir, basename(icon)));

  // 设备安装时会按 manifest.cert 校验每个文件，缺失会导致安装失败
  const cert: Manifest['cert'] = {};
  for (const file of collectFiles(distDir)) {
    if (file === 'manifest.json') continue;
    const content = readFileSync(resolve(distDir, file));
    cert[file] = {
      size: content.length,
      md5: createHash('md5').update(content).digest('hex'),
    };
  }

  const manifest: Manifest = {
    appName: appPkg.appName ?? '',
    version: appPkg.version ?? '',
    appid: appPkg.appid ?? '',
    icon: basename(icon),
    ...(appPkg.quickjs ? { quickjs: appPkg.quickjs } : {}),
    cert,
  };

  writeFileSync(resolve(distDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
}
