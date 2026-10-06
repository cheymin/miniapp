// video-player 播放器服务层
//
// 优先方案：import('mediaPlayer')  —— 官方播放器 miniapp (appid 8001650599023931) 提供
//   模块名来自 mediaPlayerManager-37158e14.js.bin strings:
//     import('mediaPlayer')
//     MediaPlayer* getMediaPlayerManager()
//   依赖 SO：
//     libjsapi_mediaplayer.so (626KB, JS 桥接层)
//     libbusiness_mediaplayer.so (834KB, 实际播放实现)
//
// 备选方案：import('player')  —— PenBili 自编译的通用 ffmpeg 播放器
//
// 诊断重点：probe() 返回每个模块名的详细错误对象，index.vue 把全部错误显示在 UI 上

// 候选模块名列表（按优先级排序）
// 可能的 Falcon QuickJS 模块解析规则：大小写敏感、名称必须匹配 so 导出的 JS 模块名
const MODULE_CANDIDATES = [
  'mediaPlayer',     // strings: import('mediaPlayer')
  'mediaplayer',     // 小写兜底
  'MediaPlayer',     // 大写兜底
  'player',          // PenBili
  'Player'           // PenBili 大写兜底
];

let cachedResult = null;   // probe 缓存 { success, module, manager, moduleName, errors: { [name]: error } }
let tried = false;

export const PLAYER_STATE = {
  IDLE: 'idle', PLAYING: 'playing', PAUSED: 'paused',
  ENDED: 'ended', ERROR: 'error', UNKNOWN: 'unknown'
};

// 把任意 error 转成可 JSON 化的字符串
export function stringifyError(e) {
  if (e == null) return 'null';
  if (typeof e === 'string') return e;
  const parts = [];
  try {
    if (e.name) parts.push('name=' + e.name);
    if (e.message) parts.push('msg=' + e.message);
    if (e.code !== undefined) parts.push('code=' + e.code);
    if (e.stack) parts.push('stack=' + String(e.stack).split('\n')[0]);
    // QuickJS 错误对象可能有额外属性
    for (const k of Object.keys(e)) {
      if (['name','message','stack','code'].indexOf(k) < 0) {
        let v;
        try { v = String(e[k]); } catch (_) { v = '[无法序列化]'; }
        parts.push(k + '=' + v);
      }
    }
  } catch (_) {}
  const s = parts.join(' | ');
  return s || String(e);
}

/**
 * 探测所有候选模块
 * @returns {Promise<{
 *   success: boolean,
 *   moduleName: string|null,
 *   module: any,
 *   manager: any,
 *   errors: { [moduleName]: string }   // 每个候选模块的错误详情
 * }>}
 */
export async function probe() {
  if (tried) return cachedResult;
  tried = true;

  const errors = {};
  let found = null;   // { module, manager, moduleName }

  for (const name of MODULE_CANDIDATES) {
    try {
      const m = await import(name);
      if (!m) { errors[name] = 'import 返回空值'; continue; }

      // module 对象可能挂在 m 上或 m.default 上
      let mod = m;
      // 如果有 default 且 default 是 object（非 constructor），优先 default
      if (m.default && typeof m.default === 'object' && !Array.isArray(m.default)) {
        mod = m.default;
      }

      // 检查 mod 是否真有可用内容
      const keys = Object.getOwnPropertyNames(mod).filter(k =>
        k !== 'constructor' && typeof mod[k] !== 'function'
      );
      const fnKeys = Object.getOwnPropertyNames(mod).filter(k => typeof mod[k] === 'function');

      if (fnKeys.length === 0 && keys.length === 0) {
        errors[name] = 'import 成功但返回空对象';
        continue;
      }

      let manager = null;

      // mediaPlayer 类：调 getMediaPlayerManager()
      if (/media/i.test(name)) {
        // 尝试多种获取 manager 的方式
        const tryGet = (obj) => {
          if (!obj) return null;
          if (typeof obj.getMediaPlayerManager === 'function') {
            return obj.getMediaPlayerManager();
          }
          // manager 也可能直接挂在 module 上
          if (obj.MediaPlayer && typeof obj.MediaPlayer.getMediaPlayerManager === 'function') {
            return obj.MediaPlayer.getMediaPlayerManager();
          }
          if (obj.mediaPlayer && typeof obj.mediaPlayer.getMediaPlayerManager === 'function') {
            return obj.mediaPlayer.getMediaPlayerManager();
          }
          // 也可能 manager 本身就是一个全局单例
          if (obj.default && typeof obj.default.getMediaPlayerManager === 'function') {
            return obj.default.getMediaPlayerManager();
          }
          return null;
        };

        try {
          manager = tryGet(mod) || tryGet(m) || tryGet(m.default);
        } catch (e) {
          errors[name + '.getMediaPlayerManager'] = stringifyError(e);
        }
      }

      found = { module: mod, manager, moduleName: name };
      break;

    } catch (e) {
      errors[name] = stringifyError(e);
    }
  }

  cachedResult = {
    success: !!found,
    moduleName: found ? found.moduleName : null,
    module: found ? found.module : null,
    manager: found ? found.manager : null,
    errors
  };

  return cachedResult;
}

export function resetCache() {
  cachedResult = null;
  tried = false;
}

/** 获取最新探测缓存（如果没探测过会返回 null） */
export function getProbeResult() { return cachedResult; }

export function getModule() { return cachedResult && cachedResult.module; }
export function getManager() { return cachedResult && cachedResult.manager; }
export function getModuleName() { return cachedResult && cachedResult.moduleName; }

/** 列出 module 和 manager 上所有函数名，用于 UI 展示 */
export function getAvailableApiList() {
  const result = { module: [], manager: [] };
  if (cachedResult && cachedResult.module) {
    result.module = listFunctions(cachedResult.module);
  }
  if (cachedResult && cachedResult.manager) {
    result.manager = listFunctions(cachedResult.manager);
  }
  return result;
}

function listFunctions(obj) {
  if (!obj) return [];
  const names = [];
  const seen = new Set();
  try {
    // 自有属性
    const own = Object.getOwnPropertyNames(obj);
    for (const k of own) {
      if (seen.has(k)) continue;
      seen.add(k);
      try {
        if (typeof obj[k] === 'function') names.push(k);
      } catch (e) {}
    }
    // 原型链
    let proto = Object.getPrototypeOf(obj);
    let depth = 0;
    while (proto && depth < 6) {
      const pnames = Object.getOwnPropertyNames(proto);
      for (const k of pnames) {
        if (seen.has(k) || k === 'constructor') continue;
        seen.add(k);
        try {
          if (typeof obj[k] === 'function') names.push(k);
        } catch (e) {}
      }
      proto = Object.getPrototypeOf(proto);
      depth++;
    }
  } catch (e) {}
  return names.sort();
}

// ======== 播放器 API 封装 ========

function safeCall(obj, fnName, args) {
  if (!obj || typeof obj[fnName] !== 'function') {
    return { ok: false, error: '函数不存在: ' + fnName };
  }
  try {
    return { ok: true, result: obj[fnName].apply(obj, args || []) };
  } catch (e) {
    return { ok: false, error: fnName + ' 抛错: ' + stringifyError(e) };
  }
}

function firstAvailable(obj, fns, args) {
  if (!obj) return { ok: false, error: 'target 为 null' };
  for (const fn of fns) {
    if (typeof obj[fn] === 'function') {
      try {
        return { ok: true, result: obj[fn].apply(obj, args || []), fnUsed: fn };
      } catch (e) {
        return { ok: false, error: fn + ' 抛错: ' + stringifyError(e) };
      }
    }
  }
  return { ok: false, error: '找不到函数: ' + fns.join('|') };
}

export async function hasModule() {
  const r = await probe();
  return r && r.success;
}

// --- 播放控制 ---

export async function play() {
  const r = await probe();
  if (!r || !r.success) return { ok: false, error: '无可用模块', probe: r };
  const target = r.manager || r.module;
  // 按模块类型选候选函数
  const fns = r.moduleName === 'player'
    ? ['play']   // PenBili 其实是 open() 后自动播，先试 play 不行 UI 会调 open
    : ['play', 'doPlay', 'doPlayResumeMedia'];
  return firstAvailable(target, fns, []);
}

export async function pause() {
  const r = await probe();
  if (!r || !r.success) return { ok: false };
  const target = r.manager || r.module;
  return firstAvailable(target, ['pause', 'doPause'], []);
}

export async function stop() {
  const r = await probe();
  if (!r || !r.success) return { ok: false };
  const target = r.manager || r.module;
  return firstAvailable(target, ['stop', 'doStop'], []);
}

export async function resume() {
  const r = await probe();
  if (!r || !r.success) return { ok: false };
  const target = r.manager || r.module;
  return firstAvailable(target, ['resume', 'doPlayResumeMedia', 'play'], []);
}

export async function seek(positionMs) {
  const r = await probe();
  if (!r || !r.success) return { ok: false };
  const target = r.manager || r.module;
  const pos = Math.max(0, Math.round(positionMs || 0));
  return firstAvailable(target, ['seekPosition', 'doSeekPlay', 'setCurrentPos', 'seek'], [pos]);
}

export async function getPlayState() {
  const r = await probe();
  if (!r || !r.success) return { ok: false };
  const target = r.manager || r.module;
  return firstAvailable(target, ['getPlayState', 'status'], []);
}

export async function getCurrentPos() {
  const r = await probe();
  if (!r || !r.success) return { ok: false };
  const target = r.manager || r.module;
  return firstAvailable(target, ['getCurrentPos', 'getCurrentPosition'], []);
}

export async function getDuration() {
  const r = await probe();
  if (!r || !r.success) return { ok: false };
  const target = r.manager || r.module;
  return firstAvailable(target, ['getDuration', 'duration'], []);
}

export async function release() {
  const r = await probe();
  if (!r || !r.success) return { ok: false };
  const target = r.manager || r.module;
  if (r.moduleName === 'player') {
    return safeCall(r.module, 'release');
  }
  return firstAvailable(target, ['resetPlayer', 'stop', 'doStop'], []);
}

// --- 工具 ---

export function formatTime(ms) {
  if (!ms || ms < 0) return '00:00';
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}
