// 视频播放器服务层
// 动态 import('player') —— 复用 PenBili 的 libjsapi_player.so
//
// 原生模块方法：
//   open(input, startMs, durationMs, fps, audio, transpose, x, y, w, h
//        [, audioDevice[, userAgent[, referer[, input2]]]])
//   pause() / resume() / stop() / release()
//   seek(positionMs) / status() / info()
//
// 所有方法返回 JSON 对象，标准字段 { ok, state, ... }

let mod = null;
let tried = false;

export const PLAYER_STATE = {
  IDLE: 'idle',
  PLAYING: 'playing',
  PAUSED: 'paused',
  ENDED: 'ended',
  ERROR: 'error'
};

export async function getPlayerModule() {
  if (tried) return mod;
  tried = true;
  try {
    const m = await import('player');
    if (m && typeof m.open === 'function') {
      mod = m;
    } else if (m && m.default && typeof m.default.open === 'function') {
      mod = m.default;
    }
  } catch (e) {
    mod = null;
    console.error('[player] native 模块加载失败: ' + (e && e.message));
  }
  return mod;
}

export async function hasModule() {
  const m = await getPlayerModule();
  return !!m;
}

export function resetPlayerModuleCache() {
  mod = null;
  tried = false;
}

function parseJson(raw) {
  if (typeof raw !== 'string' || !raw) return null;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' ? v : null;
  } catch (e) {
    return null;
  }
}

function call(fnName, args) {
  if (!mod || typeof mod[fnName] !== 'function') {
    return { ok: false, code: 'PLAYER_NATIVE_MISSING', state: 'error',
             error: '播放器模块不可用' };
  }
  try {
    const raw = mod[fnName].apply(mod, args || []);
    let parsed = raw;
    if (typeof raw === 'string') parsed = parseJson(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, code: 'PLAYER_BAD_JSON', state: 'error',
               error: '播放器返回格式异常' };
    }
    return parsed;
  } catch (e) {
    console.error('[player] ' + fnName + ' 抛错: ' + (e && e.message));
    return { ok: false, code: 'PLAYER_CALL_FAILED', state: 'error',
             error: (e && e.message) || '播放器调用失败' };
  }
}

// 校验 URL
function isValidInput(input) {
  if (typeof input !== 'string' || !input || input.length > 2048) return false;
  if (/[\s\u0000-\u001f]/.test(input)) return false;
  if (/^https?:\/\/[^\s]+$/i.test(input)) return true;
  if (input.charAt(0) === '/') return true;
  return false;
}

/**
 * 打开视频播放
 * @param {Object} opts
 * @param {string} opts.input       - 视频 URL 或本地路径
 * @param {number} opts.startMs     - 起始时间（毫秒）
 * @param {number} opts.durationMs  - 时长（毫秒，0=未知）
 * @param {number} opts.fps         - 帧率（默认 24）
 * @param {boolean} opts.audio      - 是否启用音频（默认 true）
 * @param {number} opts.transpose   - 旋转（1=无, 2=90度）
 * @param {Object} opts.rect        - 显示区域 { x, y, width, height }
 * @returns {Promise<Object>} { ok, state, ... }
 */
export async function open(opts) {
  const m = await getPlayerModule();
  if (!m) return { ok: false, code: 'PLAYER_NATIVE_MISSING', state: 'error' };

  const o = opts || {};
  if (!isValidInput(o.input)) {
    return { ok: false, code: 'PLAYER_BAD_INPUT', state: 'error',
             error: '播放地址不合法' };
  }

  const rect = o.rect || { x: 0, y: 0, width: 0, height: 0 };
  if (!(rect.width > 0) || !(rect.height > 0)) {
    return { ok: false, code: 'PLAYER_BAD_RECT', state: 'error',
             error: '视频区域未计算' };
  }

  return call('open', [
    o.input,
    Math.max(0, Math.round(o.startMs || 0)),
    Math.max(0, Math.round(o.durationMs || 0)),
    Math.max(1, Math.round(o.fps || 24)),
    o.audio === false ? 0 : 1,
    o.transpose === 2 ? 2 : 1,
    Math.round(rect.x),
    Math.round(rect.y),
    Math.round(rect.width),
    Math.round(rect.height)
  ]);
}

export async function pause() {
  await getPlayerModule();
  return call('pause', []);
}

export async function resume() {
  await getPlayerModule();
  return call('resume', []);
}

export async function stop() {
  await getPlayerModule();
  return call('stop', []);
}

export async function release() {
  await getPlayerModule();
  return call('release', []);
}

export async function seek(positionMs) {
  await getPlayerModule();
  return call('seek', [Math.max(0, Math.round(positionMs || 0))]);
}

export async function status() {
  await getPlayerModule();
  return call('status', []);
}

export async function info() {
  await getPlayerModule();
  return call('info', []);
}

// 格式化毫秒为 mm:ss
export function formatTime(ms) {
  if (!ms || ms < 0) return '00:00';
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

// 错误码 → 用户可读
export function describeError(code, error) {
  const map = {
    PLAYER_NATIVE_MISSING: '播放器组件缺失',
    PLAYER_BAD_INPUT: '播放地址不合法',
    PLAYER_BAD_RECT: '视频区域计算失败',
    PLAYER_BAD_JSON: '播放器内部错误',
    PLAYER_CALL_FAILED: '播放器调用失败',
    PLAYER_OPEN_FAILED: '播放器启动失败',
    PLAYER_FFMPEG_FAILED: '解码进程启动失败',
    PLAYER_FB_FAILED: '显示设备打开失败',
    PLAYER_ALREADY_RUNNING: '已有播放会话在运行'
  };
  if (code && map[code]) return map[code] + (error ? '：' + error : '');
  return error || '播放失败';
}
