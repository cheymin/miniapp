/*
 * net.js — 统一网络请求层
 * 优先级: $falcon.jsapi.http.request（最快）→ Shell.exec('curl')（降级）
 * 归一化返回: { ok, statusCode, headers, body, text, error }
 * 永不 throw，调用方只判断 ok/error
 */

function headersToMap(lines) {
  var map = {}
  if (!lines) return map
  var arr = typeof lines === 'string' ? lines.split('\n') : lines
  for (var i = 0; i < arr.length; i++) {
    var s = arr[i]
    var idx = s.indexOf(':')
    if (idx > 0) {
      map[s.slice(0, idx).trim().toLowerCase()] = s.slice(idx + 1).trim()
    }
  }
  return map
}

function raceTimeout(promise, ms) {
  return new Promise(function (resolve, reject) {
    var done = false
    var timer = setTimeout(function () {
      if (done) return
      done = true
      reject(new Error('请求超时 (' + Math.round(ms / 1000) + 's)'))
    }, ms)
    promise.then(
      function (v) { if (done) return; done = true; clearTimeout(timer); resolve(v) },
      function (e) { if (done) return; done = true; clearTimeout(timer); reject(e) }
    )
  })
}

// --- 通道 1: $falcon.jsapi.http（固件原生 HTTP, 快 ~100ms） ---
async function viaFalcon(opts) {
  try {
    if (typeof $falcon === 'undefined' || !$falcon.jsapi || !$falcon.jsapi.http) return null
    var resp = await $falcon.jsapi.http.request({
      url: opts.url,
      method: opts.method || 'GET',
      headers: opts.headers || {},
      data: opts.data || null,
      timeout: opts.timeout || 8,
    })
    if (!resp) return null
    return {
      ok: resp.statusCode >= 200 && resp.statusCode < 400,
      statusCode: resp.statusCode || 0,
      headers: resp.headers || {},
      body: typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data || ''),
      text: typeof resp.data === 'string' ? resp.data : (resp.data ? JSON.stringify(resp.data) : ''),
      error: resp.error || '',
    }
  } catch (e) {
    return null
  }
}

// --- 通道 2: Shell.exec('curl')（降级, 起子进程 ~100ms 开销） ---
var _shellReady = false
async function ensureShell() {
  if (_shellReady) return true
  try {
    var mod = require('langningchen')
    if (mod && mod.Shell) {
      await mod.Shell.initialize()
      _shellReady = true
      return true
    }
  } catch (e) {}
  try {
    await Shell.initialize()
    _shellReady = true
    return true
  } catch (e) {}
  return false
}

async function viaShell(opts) {
  var ok = await ensureShell()
  if (!ok) return null
  try {
    var parts = ['curl', '-sS', '-k', '--max-time', String(opts.timeout || 8)]
    parts.push('-o', '/tmp/net_body_' + Date.now())
    parts.push('-D', '/tmp/net_hdr_' + Date.now())
    parts.push('-w', '%{http_code}')
    parts.push('-X', opts.method || 'GET')
    var h = opts.headers || {}
    for (var k in h) {
      if (Object.prototype.hasOwnProperty.call(h, k)) {
        parts.push('-H', '"' + k + ': ' + h[k] + '"')
      }
    }
    if (opts.data) {
      var safe = String(opts.data).replace(/'/g, "'\\''")
      parts.push('--data-raw', "'" + safe + "'")
    }
    parts.push('"' + opts.url + '"')
    var cmd = parts.join(' ')
    var codeStr = await Shell.exec(cmd)
    var code = parseInt(String(codeStr || '').trim(), 10)
    var body = await Shell.exec('cat /tmp/net_body_' + (Date.now() - 0))
    var rawHdr = await Shell.exec('cat /tmp/net_hdr_' + (Date.now() - 0))
    return {
      ok: code >= 200 && code < 400,
      statusCode: code || 0,
      headers: headersToMap(rawHdr || ''),
      body: String(body || ''),
      text: String(body || ''),
      error: '',
    }
  } catch (e) {
    return null
  }
}

// --- 统一入口 ---
export async function request(opts) {
  var o = opts || {}
  var timeout = (o.timeout || 8) * 1000 + 500

  // 先快通道
  var f = await raceTimeout(viaFalcon(o), timeout).catch(function () { return null })
  if (f && f.ok) return f

  // 降级 Shell
  var s = await raceTimeout(viaShell(o), timeout).catch(function () { return null })
  if (s && s.ok) return s

  // 都不行，返回第一个非 null
  return f || s || { ok: false, statusCode: 0, headers: {}, body: '', text: '', error: '所有网络通道失败' }
}

export function describeErr(e) {
  if (!e) return '未知错误'
  if (typeof e === 'string') return e
  if (e.message) return e.message
  return String(e)
}
