// video-player 播放器服务层 —— 极简安全版
//
// 所有 native API 调用都 try-catch 保护，绝不 crash
// Falcon QuickJS 已知事实：
//   - 有 $falcon 全局变量（不是 import 模块）
//   - 没有 require()（调用会 crash！）
//   - await import('xxx') 可能返回 NOT LOAD 但不 crash
//   - SO 通过 custom_init_jsapis() → registerCModuleLoader 注册
//     但 A6P 上第三方 appid 可能根本不加载 SO（安全策略）

const CANDIDATES = [
  'player',         // PenBili 原生 ffmpeg 播放器
  'mediaPlayer',    // 官方播放器 miniapp SO
];

let probeCache = null;
let tried = false;

export async function probe() {
  if (tried) return probeCache;
  tried = true;

  const errors = {};
  let found = null;

  for (const name of CANDIDATES) {
    try {
      const m = await import(name);
      if (!m) { errors[name] = '[空值]'; continue; }

      let mod = m;
      if (m.default && typeof m.default === 'object' && !Array.isArray(m.default)) {
        mod = m.default;
      }

      const fnKeys = safeListFns(mod);
      if (fnKeys.length === 0) {
        errors[name] = 'import 成功但无函数导出, keys=' + JSON.stringify(safeListKeys(mod));
        continue;
      }

      let manager = null;
      if (/media/i.test(name)) {
        try {
          if (typeof mod.getMediaPlayerManager === 'function') {
            manager = mod.getMediaPlayerManager();
          } else if (m && typeof m.getMediaPlayerManager === 'function') {
            manager = m.getMediaPlayerManager();
          }
        } catch (e) {
          errors[name + '.manager'] = safeStringify(e);
        }
      }

      found = { module: mod, manager, moduleName: name };
      break;

    } catch (e) {
      errors[name] = safeStringify(e);
    }
  }

  // 同时检查全局 $falcon
  let falconInfo = null;
  try {
    // 不用 globalThis，直接引用 $falcon（和 PenBili 一样）
    // eslint-disable-next-line no-undef
    if (typeof $falcon !== 'undefined') {
      // eslint-disable-next-line no-undef
      falconInfo = { keys: safeListKeys($falcon), fns: safeListFns($falcon) };
    }
  } catch (_) {}

  probeCache = {
    success: !!found,
    moduleName: found ? found.moduleName : null,
    module: found ? found.module : null,
    manager: found ? found.manager : null,
    errors,
    falconInfo
  };

  return probeCache;
}

export function resetCache() {
  probeCache = null;
  tried = false;
}

export function getAvailableApiList() {
  const r = probeCache;
  return {
    module: r && r.module ? safeListFns(r.module) : [],
    manager: r && r.manager ? safeListFns(r.manager) : [],
    falcon: r && r.falconInfo ? r.falconInfo.fns : []
  };
}

function safeListFns(obj) {
  if (!obj) return [];
  const names = [];
  const seen = new Set();
  try {
    const own = Object.getOwnPropertyNames(obj);
    for (const k of own) {
      if (seen.has(k)) continue;
      seen.add(k);
      try { if (typeof obj[k] === 'function') names.push(k); } catch (_) {}
    }
    let proto = Object.getPrototypeOf(obj);
    let depth = 0;
    while (proto && depth < 5) {
      const pnames = Object.getOwnPropertyNames(proto);
      for (const k of pnames) {
        if (seen.has(k) || k === 'constructor') continue;
        seen.add(k);
        try { if (typeof obj[k] === 'function') names.push(k); } catch (_) {}
      }
      proto = Object.getPrototypeOf(proto);
      depth++;
    }
  } catch (_) {}
  return names.sort();
}

function safeListKeys(obj) {
  if (!obj) return [];
  try { return Object.getOwnPropertyNames(obj); } catch (_) { return []; }
}

export function safeStringify(e) {
  if (e == null) return 'null';
  if (typeof e === 'string') return e;
  const parts = [];
  try {
    if (e.name) parts.push('name=' + e.name);
    if (e.message) parts.push('msg=' + e.message);
    if (e.stack) parts.push('stack=' + String(e.stack).split('\n')[0]);
    for (const k of Object.keys(e)) {
      if (['name','message','stack'].indexOf(k) < 0) {
        try { parts.push(k + '=' + String(e[k])); } catch (_) {}
      }
    }
  } catch (_) {}
  return parts.join(' | ') || String(e);
}

// ======== API 封装 ========

function firstAvailable(obj, fns, args) {
  if (!obj) return { ok: false, error: 'null' };
  for (const fn of fns) {
    try {
      if (typeof obj[fn] === 'function') {
        const result = obj[fn].apply(obj, args || []);
        // 如果返回 Promise 就等
        if (result && typeof result.then === 'function') {
          return result.then(v => ({ ok: true, result: v, fnUsed: fn }))
                       .catch(e => ({ ok: false, error: safeStringify(e) }));
        }
        return { ok: true, result, fnUsed: fn };
      }
    } catch (e) {
      return { ok: false, error: safeStringify(e), fnTried: fn };
    }
  }
  return { ok: false, error: '找不到函数: ' + fns.join('|') };
}

async function ensureProbe() {
  if (!tried) await probe();
  return probeCache;
}

export async function play() {
  const r = await ensureProbe();
  if (!r || !r.success) return { ok: false, error: '无可用模块' };
  const target = r.manager || r.module;
  const fns = r.moduleName === 'player' ? ['play'] : ['play', 'doPlay', 'doPlayResumeMedia'];
  return firstAvailable(target, fns, []);
}

export async function pause() {
  const r = await ensureProbe();
  if (!r || !r.success) return { ok: false };
  return firstAvailable(r.manager || r.module, ['pause', 'doPause'], []);
}

export async function stop() {
  const r = await ensureProbe();
  if (!r || !r.success) return { ok: false };
  return firstAvailable(r.manager || r.module, ['stop', 'doStop'], []);
}

export async function resume() {
  const r = await ensureProbe();
  if (!r || !r.success) return { ok: false };
  return firstAvailable(r.manager || r.module, ['resume', 'doPlayResumeMedia', 'play'], []);
}

export async function seek(positionMs) {
  const r = await ensureProbe();
  if (!r || !r.success) return { ok: false };
  const pos = Math.max(0, Math.round(positionMs || 0));
  return firstAvailable(r.manager || r.module, ['seekPosition', 'doSeekPlay', 'setCurrentPos', 'seek'], [pos]);
}

export async function openPlayer(opts) {
  const r = await ensureProbe();
  if (!r || !r.success) return { ok: false, error: '无可用模块' };
  if (r.moduleName !== 'player') return { ok: false, error: 'open 仅对 player 模块' };
  const o = opts || {};
  const rect = o.rect || { x: 0, y: 0, width: 0, height: 0 };
  return firstAvailable(r.module, ['open'], [
    o.input || '',
    Math.max(0, Math.round(o.startMs || 0)),
    Math.max(0, Math.round(o.durationMs || 0)),
    Math.max(1, Math.round(o.fps || 24)),
    o.audio === false ? 0 : 1,
    o.transpose === 2 ? 2 : 1,
    Math.round(rect.x), Math.round(rect.y), Math.round(rect.width), Math.round(rect.height)
  ]);
}

export async function status() {
  const r = await ensureProbe();
  if (!r || !r.success) return { ok: false };
  return firstAvailable(r.module, ['status'], []);
}

export async function release() {
  const r = await ensureProbe();
  if (!r || !r.success) return { ok: false };
  return firstAvailable(r.manager || r.module, ['release', 'resetPlayer', 'stop', 'doStop'], []);
}

export function formatTime(ms) {
  if (!ms || ms < 0) return '00:00';
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}
