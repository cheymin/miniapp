/**
 * pstore（appid 8001782559140681, v1.1.40）启动器链路还原稿
 * ---------------------------------------------------------------------------
 * 依据：
 *   launcher.js.bin / apps_manage.js.bin / local_io-60f027f1.js.bin
 *   download_flow-75e71906.js.bin / desktop_icon-58a36964.js.bin / display-6c9f60ff.js.bin
 *   libs/libjsapi_bridge.so（Shell/Fetch/Dbase 字符串表）
 *   libs/libjsapi_pstore_license.so（checkLicense/challenge/checkUpdate/applyUpdate 日志串）
 *
 * 说明：
 *   1. 这不是可编译代码，是「控制流 + 真实命令/字符串」的还原稿，用于阅读，不追求类型正确。
 *   2. 标注 `// 推断` 的是由原子顺序与命名推得、未经完整字节码反汇编确认的部分。
 *   3. 所有中文都是字节码里的原始文案；obfuscated 串已按 base64+大小写翻转解码。
 */

/* ===========================================================================
 * 0. bridge 句柄：页面不直接 require('bridge')，统一走 display 单例
 * =========================================================================*/

interface ShellBridge {
  exec(cmd: string): number;                       // 同步执行，返回 exit code
  execAsync(cmd: string): Promise<{ code: number; out: string; err?: string }>; // 推断：out/err 字段
  openPty(cols: number, rows: number): number;     // 终端用，启动器不用
  getScreenSize(): { width: number; height: number; rotation: number };
  getStorageInfo(): { total: number; free: number };
  getSystemInfo(): Record<string, string>;
  listFiles(dir: string): Array<{ name: string; isDir: boolean; size: number }>;
  readFile(path: string): string;
  fsAction(op: 'copy' | 'move' | 'remove' | 'mkdir', src: string, dst?: string): boolean;
}

interface FetchBridge {
  fetch(url: string, init?: Record<string, any>): Promise<{ status: number; body: string }>;
  downloadFile(url: string, path: string, headers?: Record<string, string>): Promise<number>;
  downloadToFile(url: string, path: string, headers?: Record<string, string>): Promise<DownloadTask>;
}

interface DbaseBridge {
  read(table: string, key: string): any;
  write(table: string, key: string, value: any): void;
  remove(table: string, key: string): void;
  list(table: string): string[];
}

interface Bridge { Shell: ShellBridge; Fetch: FetchBridge; Dbase: DbaseBridge }

let _bridge: Bridge | null = null;
/** display.js 的 setBridge/getShell/getFetch/getDatas */
export function setBridge(b: Bridge) { _bridge = b; }
export function getShell(): ShellBridge { if (!_bridge) throw new Error('Shell 桥未就绪'); return _bridge.Shell; }
export function getFetch(): FetchBridge { if (!_bridge) throw new Error('Fetch 桥未就绪'); return _bridge.Fetch; }
export function getDatas(): DbaseBridge { if (!_bridge) throw new Error('Datas 桥未就绪'); return _bridge.Dbase; }

/** local_io.shellQuoteSingle —— 单引号包裹，内部 ' 变成 '\'' */
export function shellQuoteSingle(s: string): string {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

/** launcher.getShellOutput / local_io.shellOutput —— 同步取 stdout 的薄封装 */
export function shellOutput(cmd: string): string {
  const sh = getShell();
  try {
    const code = sh.exec(cmd);
    // 推断：真实实现把 stdout 重定向到临时文件再读，这里抽象掉
    return (sh as any).__lastStdout ?? '';
  } catch (e) {
    return '';
  }
}

/* ===========================================================================
 * 1. 应用注册表（packages.json）
 * =========================================================================*/

/**
 * desktop_icon.PACKAGES_JSON_CANDIDATES：按顺序探测，兼容单分区/双分区(A/B)镜像。
 * 第一个能读到 json 的即为 bestRegistry()。
 */
const PACKAGES_JSON_CANDIDATES = [
  '/userdata/miniapp/data/mini_app/pkg/packages.json',
  '/userdisk/secondary/miniapp/data/mini_app/pkg/packages.json',
  '/userdisk/miniapp/data/mini_app/pkg/packages.json',
  '/data/miniapp/data/mini_app/pkg/packages.json',
];

/** 安装目录候选（用于 packages.json 缺失时按目录反查已安装应用） */
const PKG_DIR_CANDIDATES = [
  '/userdata/miniapp/data/mini_app/pkg',
  '/userdisk/secondary/miniapp/data/mini_app/pkg',
  '/userdisk/miniapp/data/mini_app/pkg',
];

/** A/B 双槽的 manifest 位置（apps_manage 的「a槽 / b槽」文案由此而来） */
const SLOT_MANIFESTS = ['/a/manifest.json', '/b/manifest.json', '/manifest.json'];

/** 期望的注册表结构（字段来自 apps_manage 的 rawApps 整形代码） */
interface PkgEntry {
  appid: string;
  name?: string;
  icon?: string;          // 包内相对路径，最终拼 file://<installPath>/<icon>
  installPath: string;
  version?: string;
  category?: string;      // '开发者' / '第三方' / '系统'
  flag?: number;          // 位标志：桌面显示位由 toggle 修改
  desktop?: boolean;
  protected?: boolean;    // 系统/内置应用，禁止卸载
  sku?: string;           // 平台 SKU，仅用于图标主题
}
interface Registry { packages: Record<string, PkgEntry> }

function packagesJsonCatCommand(path: string) {
  return `cat ${shellQuoteSingle(path)} 2>/dev/null`;
}

/** launcher.readRegistry（同步）+ desktop_icon.bestRegistry（选举） */
export function readRegistry(): Registry | null {
  for (const path of PACKAGES_JSON_CANDIDATES) {
    const raw = shellOutput(packagesJsonCatCommand(path));
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.packages === 'object') return parsed as Registry;
    } catch { /* 继续下一个候选 */ }
  }
  return null;
}

/** 注册表丢失时的兜底：ls 安装目录 + 读 /a|/b/manifest.json 反查 appid/version */
function scanInstalledFromDisk(): PkgEntry[] {
  const dirs = PKG_DIR_CANDIDATES.join(' ');
  const listing = shellOutput(`ls -1 ${dirs} 2>/dev/null`);
  const ids = listing.split('\n').map(s => s.trim()).filter(Boolean);
  const out: PkgEntry[] = [];
  for (const id of ids) {
    for (const dir of PKG_DIR_CANDIDATES) {
      for (const mf of SLOT_MANIFESTS) {
        const raw = shellOutput(packagesJsonCatCommand(`${dir}/${id}${mf}`));
        if (!raw) continue;
        try {
          const m = JSON.parse(raw);
          out.push({ appid: m.appid || id, version: m.version, installPath: `${dir}/${id}`, icon: m.icon });
        } catch { /* ignore */ }
      }
    }
  }
  return out;
}

/** launcher：appid 白名单校验，防止 shell 注入 */
export function isSafeName(appid: string): boolean {
  // 推断：仅字母数字与 . _ -；apps_manage / download_flow 复用同一实现
  return typeof appid === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(appid);
}

/* ===========================================================================
 * 2. 桌面：图标网格、分页拖拽、启动
 * =========================================================================*/

/** 桌面图标条目 */
interface Tile {
  appid: string;
  name: string;        // fitName() 按 charWidth 截断到 NAME_BUDGET
  initial: string;     // initialOf()：中文取拼音首字母，其它取大写首字母
  iconSrc: string;     // `file://${installPath}/${icon}`
  hidden: boolean;     // 由 flag 位 + .icon_hidden 列表共同决定
}

const NAME_BUDGET = 8;          // 图标标题最大显示宽度（字宽单位）
const CJK_INITIALS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#';

/** 只显示「已安装 && flag 桌面位为 1 && 未被用户隐藏」的应用 */
function buildTiles(reg: Registry, hiddenIds: string[]): Tile[] {
  const tiles: Tile[] = [];
  for (const [appid, p] of Object.entries(reg.packages)) {
    if (!isSafeName(appid)) continue;
    if (p.desktop === false) continue;
    if (hiddenIds.includes(appid)) continue;
    tiles.push({
      appid,
      name: p.name || appid,
      initial: initialOf(p.name || appid),
      iconSrc: `file://${p.installPath}/${p.icon || 'icon.png'}`,
      hidden: false,
    });
  }
  // 按 initials 分组 + 组内按安装时间/名称排序；随后按 smallGrid / compact / portrait 计算每页行列
  return tiles;
}

function initialOf(name: string): string {
  // 推断：内置一张「汉字→拼音首字母」首字表，非汉字走 toUpperCase
  const c = name.charAt(0);
  return /[a-zA-Z]/.test(c) ? c.toUpperCase() : '#';
}

/** launcher 的触控分页：touchstart/touchmove/touchend + gridRow 行列命中 */
function onTouchStart(e: TouchEvent) { /* 记录 t0 / startX / 当前 page */ }
function onTouchMove(e: TouchEvent) {
  // 水平位移 > 阈值时实时 translateX，并在超过 50% 页宽时预览翻页
}
function onTouchEnd(e: TouchEvent) {
  // 松手后按 delta 与速度(ease-out)决定 page ± 1，写回 LIST_AT / LIST_CACHE（带 TTL 缓存）
}

/**
 * launcher 点击图标：
 *   1) 先尝试 falcon 内部路由（同一运行时内的页面跳转，最快）
 *   2) 失败则拉起独立小程序进程
 */
export async function launchApp(appid: string) {
  if (!isSafeName(appid)) { toast('应用标识不合法'); return false; }
  let opened = false;
  try {
    ($falcon as any).navTo(`falcon://${appid}/index`);
    opened = true;
  } catch (e) { opened = false; }

  if (!opened) {
    try {
      // 注意结尾的 `&`：启动后立即返回，不阻塞桌面
      await getShell().execAsync(`miniapp_cli start "${appid}" > /dev/null 2>&1 &`);
      opened = true;
    } catch (e) {
      toast('打开失败');
    }
  }
  return opened;
}

declare const $falcon: { navTo(url: string): void; on(ev: string, cb: Function): void; trigger(ev: string, ...a: any[]): void };
declare function toast(msg: string): void;

/* ===========================================================================
 * 3. 应用管理页
 * =========================================================================*/

interface ManageRow extends PkgEntry {
  isThird: boolean;
  canToggle: boolean;      // 桌面显示开关是否可用
  canUninstall: boolean;   // protected 应用不可卸载
  categoryLabel: string;   // '第三方' / '系统' / '应用'
}

/** 读 /userdata/cfg/sys_config.conf，拿平台型号与当前 A/B 槽（用于展示「a槽 / b槽」） */
function readSysConfig(): Record<string, string> {
  const raw = shellOutput('cat "/userdata/cfg/sys_config.conf" 2>/dev/null');
  const cfg: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const i = line.indexOf('=');
    if (i < 0) continue;
    cfg[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return cfg; // 关键字段：plat / slot / sku
}

function buildManageRows(reg: Registry, cfg: Record<string, string>, showSystem: boolean): ManageRow[] {
  const rows: ManageRow[] = [];
  for (const [appid, p] of Object.entries(reg.packages)) {
    if (!isSafeName(appid)) continue;
    const isThird = p.category === '第三方' || (p.category || '').indexOf('系统') < 0;
    if (!showSystem && !isThird) continue;
    rows.push({
      ...p,
      appid,
      isThird,
      canToggle: !p.protected,
      canUninstall: !p.protected,
      categoryLabel: isThird ? '第三方' : '系统',
    });
  }
  return rows.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

/**
 * 「从桌面隐藏 / 显示到桌面」：改写 packages.json 的 flag 位。
 * 由于 pstore 启动器只在启动时读一次注册表，所以文案明确提示「重启笔后生效」。
 */
function toggleDesktop(reg: Registry, appid: string, visible: boolean) {
  const p = reg.packages[appid];
  if (!p) return;
  p.flag = visible ? ((p.flag || 0) | 1) : ((p.flag || 0) & ~1); // 推断：bit0 = 桌面显示
  p.desktop = visible;
  const json = JSON.stringify(reg);
  writeTextFile(PACKAGES_JSON_CANDIDATES[0], json);  // 见 §4 的原子写入
  toast(`「${p.name || appid}」已${visible ? '加入' : '移出'}桌面,重启笔后生效`);
}

async function uninstallApp(appid: string) {
  if (!isSafeName(appid)) { toast('应用标识不合法,拒绝卸载'); return; }
  try {
    await getShell().execAsync(`miniapp_cli uninstall "${appid}"`);
    toast(`「${appid}」已卸载`);
  } catch (e) {
    toast('卸载失败: ' + String(e));
  }
}

/** 重启：走 shell reboot，页面先弹二次确认（rebootArmed） */
function rebootPen() { getShell().exec('reboot'); }

/* ===========================================================================
 * 4. local_io：shell 写入 / 哈希签名 / 应用锁 / helper 数据
 * =========================================================================*/

const WRITE_SINGLE_LIMIT = 32 * 1024;   // 单次 shell 写入上限（字符）
const WRITE_CHUNK_CHARS = 8 * 1024;

/**
 * 原子写文本：
 *   mkdir -p <dir>
 *   printf "%s\n" <chunk> > <tmp>      （分块追加）
 *   mv -f <tmp> <target>
 * 这样即使中途断电，也不会留下半个注册表/半个锁文件。
 */
export function writeTextFile(path: string, text: string) {
  const dir = path.replace(/\/[^/]+$/, '');
  const tmp = `${path}.tmp.${Date.now()}`;
  const sh = getShell();
  sh.exec(`mkdir -p ${shellQuoteSingle(dir)}`);
  let first = true;
  for (let i = 0; i < text.length; i += WRITE_CHUNK_CHARS) {
    const chunk = text.slice(i, i + WRITE_CHUNK_CHARS);
    const op = first ? '>' : '>>';
    sh.exec(`printf "%s\\n" ${shellQuoteSingle(chunk)} ${op} ${shellQuoteSingle(tmp)}`);
    first = false;
  }
  sh.exec(`mv -f ${shellQuoteSingle(tmp)} ${shellQuoteSingle(path)}`);
}

/** JS 内实现 SHA-256 / HMAC-SHA256（sha256Raw/rotr/SHA256_K），用于请求签名与应用锁 */
function sha256Hex(data: string): string { /* 标准 FIPS 180-4 实现，此处省略 */ return ''; }
function hmacSha256Hex(key: string, msg: string): string { /* 标准 HMAC */ return ''; }

/** 商店请求签名：X-Device-Id / X-Timestamp / X-Nonce / X-Signature */
function signRequestHeaders(method: string, url: string, device: { id: string; key: string }) {
  const ts = String(Date.now());
  const nonce = randomNonce();     // nonceSeq 自增 + 随机后缀
  const path = url.replace(/^https?:\/\/[^/]+/, '');   // splitUrl().path + query
  const sig = hmacSha256Hex(device.key, `${method}\n${path}\n${ts}\n${nonce}`);
  return {
    'X-Device-Id': device.id,
    'X-Timestamp': ts,
    'X-Nonce': nonce,
    'X-Signature': sig,
  };
}

/* ---- 应用锁（PIN） -------------------------------------------------------
 * 文件：/userdisk/pstore/.app_lock（旧:/userdata/pstore/.app_lock）
 * 记录：{ version, salt, rounds, pinHash, recoveryHash, fails, lockUntil }
 * 规则：PIN 6 位、弱口令黑名单（000000/012345/098765...）、
 *       错 1~N 次指数退避 lockoutMs()，成功后 applySuccess() 清零，
 *       老 rounds 低于 PIN_ROUNDS_MIN 时 maybeRehashPin() 静默升级迭代次数。
 * ------------------------------------------------------------------------ */
const APP_LOCK_PATHS = ['/userdisk/pstore/.app_lock', '/userdata/pstore/.app_lock'];
const PIN_LEN = 6;
const PIN_ROUNDS_MIN = 10000;   // 推断量级
const PIN_ROUNDS_MAX = 100000;
const WEAK_PINS = ['000000', '012345', '098765', /* ... */];

function evaluateAttempt(record: AppLockRecord, pin: string): AttemptResult {
  if (record.lockUntil && Date.now() < record.lockUntil) {
    return { ok: false, message: `${formatWait(remainingLockMs(record))} 后再试` };
  }
  const hash = hashSecret(pin, record.salt, record.rounds);
  if (!hashesEqual(hash, record.pinHash)) {
    const next = applyFail(record);                 // fails++ 并计算 lockUntil
    writeAppLockRecord(next);
    return { ok: false, message: next.fails >= 3 ? '不对，请稍后再试' : `${next.fails} 次` };
  }
  writeAppLockRecord(applySuccess(record));
  return { ok: true };
}

/* ---- helper 数据（学习计划） --------------------------------------------- */
const HELPER_DATA_PATHS = ['/userdisk/pstore/.helper_data', '/userdata/pstore/.helper_data'];
const HELPER_MAX_PLANS = 20, HELPER_MAX_TEXT = 4000, HELPER_MAX_DAYS = 365;
// { version, plans:[{id,text,qIylGQ..}], days:{ 'YYYY-MM-DD': {...} } }

/* ===========================================================================
 * 5. download_flow：选路 → 下载 → 校验 → 安装
 * =========================================================================*/

const CDN_PRIMARY = 'store.posc.net';
const EXTRA_CDN_HOSTS = ['pstore.posc.net'];
const CDN_CHOICE_AUTO = 'auto';
const CDN_PREF_MAX_AGE_MS = 6 * 60 * 60 * 1000;   // 推断：6h
const DOWNLOAD_IDLE_TICKS = 20;                   // 连续空转轮次判死
const DOWNLOAD_MIN_RATE_BPS = 8 * 1024;
const DOWNLOAD_SESSION_TIMEOUT_MS = 10 * 60 * 1000;

type Phase = 'transfer' | 'verify' | 'install';
const DL_PHASE_TRANSFER = 'transfer';
const DL_PHASE_VERIFY = 'verify';
const DL_PHASE_INSTALL = 'install';

/** CDN 选路：auto 模式先探测 /api/pstore/cdn-probe，取最快者并缓存 preference */
async function orderCdnOrigins(choice: string, preferred?: string) {
  if (choice !== CDN_CHOICE_AUTO && isPinnedCdnChoice(choice)) return [choice, ...EXTRA_CDN_HOSTS];
  if (preferred && isCdnPrefFresh(preferred)) return [preferred, ...EXTRA_CDN_HOSTS];
  const probes = await Promise.all(
    [CDN_PRIMARY, ...EXTRA_CDN_HOSTS].map(async host => ({
      host,
      ms: await probeLatency(`https://${host}/api/pstore/cdn-probe`),
    }))
  );
  const best = pickFastestProbe(probes);   // 过滤 isValidCdnProbeBody 失败的项
  return [best.host, ...EXTRA_CDN_HOSTS.filter(h => h !== best.host)];
}

/** 主流程（download_flow.preflightDownload + decidePollEvent 的合并视图） */
export async function installPackage(appid: string, pkgFormat: string) {
  // 0) 包格式白名单：商店只允许 Falcon .amr
  if (normPkgFormat(pkgFormat) !== '.amr') {
    return fail(`当前商店只能安装 Falcon .amr，拒绝下载 ${pkgFormat}`);
  }
  if (!isSafeName(appid)) return fail('应用标识不合法');

  // 1) 存储预检
  const storage = getShell().getStorageInfo();
  const pre = decideStoragePreflight(storage.free, /* needBytes */ 0);
  if (!pre.ok) return fail('存储空间不足');

  // 2) 设备密钥（缺失/损坏时自愈：official sidecar → /data/sharedpreferences → Dbase）
  const keyPair = chooseLocalKeyPair();
  if (!isKeyPairForDevice(keyPair)) return fail('设备验签失败,请重新进入商店');

  // 3) 下单/取下载地址：GET /api/device/software/download?appid=...&pkg_format=.amr
  const origins = await orderCdnOrigins(effectiveCdnPreferred(), keyPair.preferredCdn);
  const res = await getFetch().fetch(`https://${origins[0]}/api/device/software/download`, {
    method: 'GET',
    headers: signRequestHeaders('GET', '/api/device/software/download', keyPair.device),
  });

  if (res.status === 401) return recover401(appid);       // plan401Recovery()
  if (res.status !== 200) return fail(`下载失败 (HTTP ${res.status})`);

  // 4) 逐源下载 + 断流切源
  const savePath = downloadSavePath(appid);               // /userdisk/pstore/download/<appid>.amr
  let task: DownloadTask | null = null;
  for (const origin of origins) {
    try {
      task = await getFetch().downloadToFile(origin.urls?.[0] || origin, savePath, headers);
      if (task) break;
    } catch (e) { if (!isDownloadTransportFail(e)) throw e; }   // 传输层错误才切源
  }
  if (!task) return fail('下载被拒绝,请稍后重试');

  // 5) 轮询进度：idle 计时 + 最低速率 + 会话超时
  await pollUntilDone(task, {
    onProgress: (p) => emit('progress', { percent: downloadProgressPercent(p), text: downloadProgressText(p) }),
    idleTicks: DOWNLOAD_IDLE_TICKS,
    minRateBps: DOWNLOAD_MIN_RATE_BPS,
    sessionTimeoutMs: DOWNLOAD_SESSION_TIMEOUT_MS,
  });

  // 6) 校验 sha256（服务端给 <sha256>  <filename> 行）
  const expect = parseSha256Sum(task.sha256Line);
  const actual = sha256File(savePath);
  if (!checksumDecision(expect, actual)) return fail('校验失败,请重试');

  // 7) 安装：miniapp_cli install，解析返回体
  const ret = await getShell().execAsync(`miniapp_cli install "${savePath}"`);
  const parsed = parseInstallResult(ret.out);
  if (!parsed.ok) return fail('安装失败: ' + parsed.message);

  // 8) 启动（与桌面点击同一路径）
  await launchApp(appid);
}

function recover401(appid: string) {
  // 401 分支的四条恢复路径（文案来自字节码）：
  //   DEVICE_AUTH_EXPIRED  -> 设备密钥已更新,请重试下载（renewKey）
  //   DEVICE_NONCE_REUSED  -> 请求重复,请重试 / 设备时间不准，请先校正时间后再试
  //   DEVICE_DISABLED      -> 设备存储已更换,请联系管理员重新绑定
  //   SUBSCRIPTION_EXPIRED -> 订阅已到期,续费后可继续下载
  //   ENTITLEMENT_REVOKED  -> 该应用的授权已被关闭,请联系客服
  //   PURCHASE_REQUIRED    -> 该应用未开通,请先购买
  return fail(classifyDeviceAuthFail(appid));
}

function fail(msg: string) { emit('toast', msg); return { ok: false, message: msg }; }
function emit(ev: string, payload: any) { /* 页面事件总线 */ }
function downloadSavePath(appid: string) { return `/userdisk/pstore/download/${appid}.amr`; }
function sha256File(path: string) { return sha256Hex(''); }   // 实际走分块 readFile

/* ===========================================================================
 * 6. 授权（pstore_license 原生模块）
 * =========================================================================*/

/**
 * 安装/启动前的授权校验由 C 模块完成，JS 只拿结果：
 *   const lic = require('pstore_license');
 *   lic.checkLicense(appid)   -> { valid, expires_at, plans... }
 * 设备绑定：token 内比对 appid 与 device_id（日志 "token.appid=%s want=%s token.device_id=%s want=%s"），
 * 硬件指纹取 /sys/block/mmcblk{0,1,2}/device/cid。
 */
export function requireLicense(appid: string) {
  const lic = (globalThis as any).__require__('pstore_license');
  const r = lic.checkLicense(appid);
  return { authorized: !!r.valid, expiresAt: r.expires_at, raw: r };
}
