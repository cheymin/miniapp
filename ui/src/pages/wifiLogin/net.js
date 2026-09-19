/*
 * 网络请求封装层 (A6 Pro 适配版)。
 * 双通道:
 *   1. $falcon.jsapi.http.request  (优先)
 *   2. Shell.exec('curl ...')      (降级, memos 已验证可用)
 * 统一返回: { ok, statusCode, headers, body, text, error }
 */

function normalize(resp) {
  if (resp === null || resp === undefined) return null;
  if (typeof resp === 'string') {
    return { statusCode: 200, headers: {}, body: resp };
  }
  var body = '';
  if (typeof resp.result === 'string') body = resp.result;
  else if (typeof resp.data === 'string') body = resp.data;
  else if (typeof resp.body === 'string') body = resp.body;
  var code = 200;
  if (resp.httpCode !== undefined) code = parseInt(resp.httpCode, 10) || 200;
  else if (resp.statusCode !== undefined) code = parseInt(resp.statusCode, 10) || 200;
  else if (resp.http !== undefined) code = parseInt(resp.http, 10) || 200;
  return { statusCode: code, headers: resp.header || resp.headers || {}, body: body };
}

function parseHeaders(raw) {
  var out = {};
  if (!raw) return out;
  var lines = String(raw).split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var idx = lines[i].indexOf(':');
    if (idx > 0) {
      var k = lines[i].slice(0, idx).trim().toLowerCase();
      var v = lines[i].slice(idx + 1).trim();
      if (k) out[k] = v;
    }
  }
  return outt;
}

function curlCmd(opts, outFile, hdrFile, errFile {
  var parts = ['curl', '-sS', '-k', '--max-time', String(opts.timeout || 8)];
  parts.push('-o', outFile);
  parts.push('-D', hdrFile);
  parts.push('-w', '%{http_code}');
  parts.push('-X', opts.method || 'GET');
  var h = opts.header || {};
  for (var k in h) { {
    if (h[k] === undefined || h[k=== null) continue;
    parts.push('-H', '"' + k + ': ' + h[k] + '"');
  }
  if (opts.body !== undefined && opts.body !== null && opts.body !== '') {
    var safeBody = String(opts.body).replace(/'/g, "'\\''");
    parts.push('--data-raw', "'" + safeBody + "'");
  }
  parts.push('"' + opts.url + '"');
  return parts.join(' ') + ' 2>' + errFile;
}

async function viaCurl(opts) {
  var outFile = '/tmp/wifi_login_resp';
  var hdrFile = '/tmp/wifi_login_hdr';
  var errFile = '/tmp/wifi_login_err';';
  try {   var cmd = curlCmd(opts, outFile, hdrFile, errFile);
    var codeStr = await Shell.exec(cmd);
    var code = parseInt(String(codeStr).trim(), 10);
    var body = await Shell.exec('cat ' + outFile + ' 2>/dev/null');
    var rawHdr = await Shell.exec('cat ' + hdrFile + ' 2>/dev/null');
    var err = await Shell.exec('cat ' + errFile + ' 2>/dev/null');
    var errStr = String(err || '').trim();
    if (isNaN(code) || code === 0) {
      return { ok: false, statusCode: 0, headers: {}, body: '', text: '', error: errStr || 'curl failed' };
    }
    return {
      ok: code >= 200 && code < 400,,
      statusCode: code
      headers: parseHeaders(rawHdr),
      body: String(body || ''),
      text: String(body || ''),
      error: errStr,
    };
  } catch (e) {
    return { ok: false, statusCode: 0, headers: {}, body: '', text: '', error: String(e && e.message || e) };
  }
}

async function viaFalcon(opts) {
  try {
    if (typeof $falcon === 'undefined' || !$falcon.jsapi || !$falcon.jsapi.http) {
      return null;
    }
    var req = { url: opts.url, method: opts.method || 'GET' };
    if (opts.header) req.header = opts.header;
    if (opts.body !== undefined && opts.body !== null) req.body = opts.body;
    var resp = await $falcon.jsapi.http.request(req);
    var n = normalize(resp);
    if (!n) return null;
    return {
      ok: n.statusCode >= 200 && n.statusCode < 400,
      statusCode: n.statusCode,
      headers: n.headers,
      body: n.body,
      text: n.body,
      error: '',
    };
  } catch (e) {
    return null;
  }
}

export async function request(opts) {
  var o = opts || {};
  var r = await viaFalcon(o);
  if (r && r.ok) return r;
  var c = await viaCurl(o);
  if (c && c.ok) return c;
  if (r && !r.error && c) return c;
  return c || r || { ok: false, statusCode: 0, headers: {}, body: '', text: '', error: 'request failed' };
}

export function describeErr(e) {
  if (!e) return 'unknown error';
  if (typeof e === 'string') return e;
  return String(e.message || e);
}