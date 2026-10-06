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
//   模块名来自 PenBili src/services/player.js
//   SO：libjsapi_player.so (35KB)
//
// 诊断能力：probe() 自动探测模块上所有函数，getAvailableApiList() 返回可用 API 列表

const MODULE_NAMES = ['mediaPlayer', 'player'];

let cachedModule = null;       // 原生 module 对象（import 返回值）
let cachedManager = null;      // getMediaPlayerManager() 返回的管理器实例
let cachedModuleName = null;   // 实际加载成功的模块名
let tried = false;

export const PLAYER_STATE = {
  IDLE: 'idle',
  PLAYING: 'playing',
  PAUSED: 'paused',
  ENDED: 'ended',
  ERROR: 'error',
  UNKNOWN: 'unknown'
};

/**
 * 探测原生模块
 * 依次尝试 import('mediaPlayer') → import('player')
 * @returns {Promise<{ module: any, moduleName: string, manager: any }|null>}
 */
export async function probe() {
  if (tried) return cachedModule ? {
    module: cachedModule,
    moduleName: cachedModuleName,
    manager: cachedManager
  } : null;

  tried = true;

  for (const name of MODULE_NAMES) {
    try {
      const m = await import(name);
      const mod = (m && typeof m.open === 'function') ? m :
                  (m && m.default && typeof m.default.open === 'function') ? m.default : m;

      if (!mod) continue;

      cachedModule = mod;
      cachedModuleName = name;

      // mediaPlayer 模块：调 getMediaPlayerManager() 拿管理器
      if (name === 'mediaPlayer') {
        try {
          if (typeof mod.getMediaPlayerManager === 'function') {
            cachedManager = mod.getMediaPlayerManager();
          } else if (mod.default && typeof mod.default.getMediaPlayerManager === 'function') {
            cachedManager = mod.default.getMediaPlayerManager();
          }
        } catch (e) {
          console.error('[player] getMediaPlayerManager() 失败: ' + (e && e.message));
        }
      }

      console.log('[player] ✅ 模块已加载: ' + name +
                  (cachedManager ? ' (manager 已获取)' : ' (无 manager)'));
      return { module: mod, moduleName: name, manager: cachedManager };

    } catch (e) {
      console.warn('[player] ❌ import("' + name + '") 失败: ' + (e && e.message));
    }
  }

  console.error('[player] ❌ 所有播放器模块都加载失败');
  return null;
}

export function resetCache() {
  cachedModule = null;
  cachedManager = null;
  cachedModuleName = null;
  tried = false;
}

/** 诊断：返回当前使用的模块名 */
export function getModuleName() {
  return cachedModuleName;
}

/** 诊断：返回原始 module 对象 */
export function getModule() {
  return cachedModule;
}

/** 诊断：返回原始 manager 对象（mediaPlayer 专用） */
export function getManager() {
  return cachedManager;
}

/** 诊断：列出 module 和 manager 上所有函数名 */
export function getAvailableApiList() {
  const result = {};
  if (cachedModule) {
    result.module = listFunctions(cachedModule);
  }
  if (cachedManager) {
    result.manager = listFunctions(cachedManager);
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
    // 原型链上可枚举的
    let proto = Object.getPrototypeOf(obj);
    let depth = 0;
    while (proto && depth < 5) {
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
    return { ok: false, error: (e && e.message) || '调用 ' + fnName + ' 失败' };
  }
}

function firstAvailable(obj, fns, args) {
  for (const fn of fns) {
    if (obj && typeof obj[fn] === 'function') {
      try {
        return { ok: true, result: obj[fn].apply(obj, args || []), fnUsed: fn };
      } catch (e) {
        return { ok: false, error: fn + ' 抛错: ' + (e && e.message) };
      }
    }
  }
  return { ok: false, error: '找不到任何函数: ' + fns.join('|') };
}

export async function hasModule() {
  const r = await probe();
  return !!r;
}

// --- 播放控制（自动适配两个模块的不同函数名） ---

export async function play() {
  const r = await probe();
  if (!r) return { ok: false, error: '无可用模块' };
  // mediaPlayer: play() 或 doPlay() / doPlayResumeMedia()
  // player: 无 play()，open() 后自动播放
  if (r.manager) {
    return firstAvailable(r.manager, ['play', 'doPlay', 'doPlayResumeMedia'], []);
  }
  if (r.moduleName === 'player') {
    return { ok: false, error: 'player 模块无直接 play()，需要先 open()' };
  }
  return firstAvailable(r.module, ['play', 'doPlay', 'doPlayResumeMedia'], []);
}

export async function pause() {
  const r = await probe();
  if (!r) return { ok: false, error: '无可用模块' };
  if (r.manager) return firstAvailable(r.manager, ['pause', 'doPause'], []);
  return firstAvailable(r.module, ['pause', 'doPause'], []);
}

export async function stop() {
  const r = await probe();
  if (!r) return { ok: false, error: '无可用模块' };
  if (r.manager) return firstAvailable(r.manager, ['stop', 'doStop'], []);
  return firstAvailable(r.module, ['stop', 'doStop'], []);
}

export async function resume() {
  const r = await probe();
  if (!r) return { ok: false, error: '无可用模块' };
  if (r.manager) return firstAvailable(r.manager, ['resume', 'doPlayResumeMedia'], []);
  return firstAvailable(r.module, ['resume'], []);
}

export async function seek(positionMs) {
  const r = await probe();
  if (!r) return { ok: false, error: '无可用模块' };
  const pos = Math.max(0, Math.round(positionMs || 0));
  if (r.manager) return firstAvailable(r.manager, ['seekPosition', 'doSeekPlay', 'setCurrentPos', 'seek'], [pos]);
  return firstAvailable(r.module, ['seek'], [pos]);
}

// --- 状态查询 ---

export async function getPlayState() {
  const r = await probe();
  if (!r) return { ok: false };
  if (r.manager) return firstAvailable(r.manager, ['getPlayState'], []);
  return firstAvailable(r.module, ['status'], []);
}

export async function getIsPlaying() {
  const r = await probe();
  if (!r) return false;
  const res = r.manager
    ? firstAvailable(r.manager, ['getIsPlaying'], [])
    : firstAvailable(r.module, ['getIsPlaying'], []);
  return res.ok && !!res.result;
}

export async function getCurrentPos() {
  const r = await probe();
  if (!r) return 0;
  if (r.manager) return firstAvailable(r.manager, ['getCurrentPos', 'getCurrentPosition'], []);
  const res = firstAvailable(r.module, ['status'], []);
  if (res.ok && res.result && typeof res.result.position === 'number') return { ok: true, result: res.result.position };
  return res;
}

export async function getDuration() {
  const r = await probe();
  if (!r) return 0;
  if (r.manager) return firstAvailable(r.manager, ['getDuration', 'duration'], []);
  const res = firstAvailable(r.module, ['status'], []);
  if (res.ok && res.result && typeof res.result.duration === 'number') return { ok: true, result: res.result.duration };
  return res;
}

// --- player 模块专用（PenBili ffmpeg 播放器） ---

export async function open(opts) {
  const r = await probe();
  if (!r) return { ok: false, error: '无可用模块' };
  if (r.moduleName !== 'player') {
    return { ok: false, error: 'open() 只对 player 模块有效，当前是 ' + r.moduleName +
                                  '。mediaPlayer 需要先用 playMedia() 或 createWithUrl()' };
  }
  const o = opts || {};
  if (!o.input) return { ok: false, error: '缺少 input' };
  const rect = o.rect || { x: 0, y: 0, width: 0, height: 0 };
  return firstAvailable(r.module, ['open'], [
    o.input,
    Math.max(0, Math.round(o.startMs || 0)),
    Math.max(0, Math.round(o.durationMs || 0)),
    Math.max(1, Math.round(o.fps || 24)),
    o.audio === false ? 0 : 1,
    o.transpose === 2 ? 2 : 1,
    Math.round(rect.x), Math.round(rect.y), Math.round(rect.width), Math.round(rect.height)
  ]);
}

export async function release() {
  const r = await probe();
  if (!r) return { ok: false };
  if (r.moduleName === 'player' && r.module && typeof r.module.release === 'function') {
    return safeCall(r.module, 'release');
  }
  if (r.manager) return firstAvailable(r.manager, ['resetPlayer', 'stop', 'doStop'], []);
  return { ok: false };
}

// --- mediaPlayer 模块专用 ---

/**
 * mediaPlayer 专用：用 URL/文件创建播放项
 * 从 strings 看到的候选函数：createWithUrl, createWithFile, createPlayMediaPrams
 */
export async function createPlayItem(url) {
  const r = await probe();
  if (!r || r.moduleName !== 'mediaPlayer') return { ok: false, error: 'mediaPlayer 模块未加载' };
  const target = r.manager || r.module;
  // 依次尝试
  let res = firstAvailable(target, ['createWithUrl'], [url]);
  if (!res.ok) res = firstAvailable(target, ['createWithFile'], [url]);
  if (!res.ok) res = firstAvailable(target, ['createPlayMediaPrams'], [{ url: url }]);
  return res;
}

/**
 * mediaPlayer 专用：直接播放某个 mediaId（有道媒体库 ID）
 */
export async function playMedia(mediaId) {
  const r = await probe();
  if (!r) return { ok: false };
  const target = r.manager || r.module;
  return firstAvailable(target, ['playMedia', 'startPlayMedia', 'setToPlayMedia'], [mediaId]);
}

/** 显示/隐藏播放器 UI（mediaPlayer 有内置 UI） */
export async function showPlayer() {
  const r = await probe();
  if (!r || !r.manager) return { ok: false };
  return firstAvailable(r.manager, ['showMediaPlayer'], []);
}

export async function hidePlayer() {
  const r = await probe();
  if (!r || !r.manager) return { ok: false };
  return firstAvailable(r.manager, ['hideMediaPlayer'], []);
}

// --- 工具 ---

export function formatTime(ms) {
  if (!ms || ms < 0) return '00:00';
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}
