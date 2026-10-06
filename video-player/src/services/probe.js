// 极简 SO 加载探针
// 试尽所有可能的模块加载方式，任何一个返回非空就算赢
//
// 注意：import 语法分两种：
//   静态 import { xxx } from 'player'  —— 编译时 resolve，文件顶部
//   动态 import('player')             —— 运行时 resolve，返回 Promise
//
// Falcon QuickJS 也可能支持 require('player') 同步加载

// ====== 静态 import（如果 aiot-vue-cli 支持的话）======
// 这些在文件顶部，编译时就会被解析；如果模块不存在，**构建就会失败**
// 所以注释掉，运行时动态试

export const results = {
  // 每种方式的结果：{ ok: bool, value: any, error: string }
  dynamicImport: null,       // await import('player')
  dynamicImportMedia: null,  // await import('mediaPlayer')
  requirePlayer: null,       // require('player')
  requireMedia: null,        // require('mediaPlayer')
  requireJsapiPlayer: null,  // require('$jsapi/player')
  falconGlobal: null,        // globalThis.$falcon
  jsapiGlobal: null,         // globalThis.$jsapi
  allErrors: {}
};

// 动态 import（原来的方式）
export async function testDynamicImport(name) {
  try {
    const m = await import(name);
    let mod = (m && m.default) ? m.default : m;
    const keys = mod ? Object.getOwnPropertyNames(mod) : [];
    return { ok: true, value: mod, keys };
  } catch (e) {
    return { ok: false, error: stringifyError(e) };
  }
}

// 同步 require（如果 QuickJS 支持的话）
export function testRequire(name) {
  try {
    if (typeof require !== 'function') {
      return { ok: false, error: 'typeof require != function' };
    }
    const m = require(name);
    let mod = (m && m.default) ? m.default : m;
    const keys = mod ? Object.getOwnPropertyNames(mod) : [];
    return { ok: true, value: mod, keys };
  } catch (e) {
    return { ok: false, error: stringifyError(e) };
  }
}

// 直接查 globalThis
export function testGlobal(name) {
  try {
    const g = typeof globalThis !== 'undefined' ? globalThis : (typeof global !== 'undefined' ? global : this);
    const keys = g ? Object.getOwnPropertyNames(g).filter(k =>
      k.toLowerCase().indexOf(name.toLowerCase()) >= 0 ||
      k.indexOf('$falcon') >= 0 ||
      k.indexOf('$jsapi') >= 0
    ) : [];
    return { ok: true, keys, $falcon: g.$falcon ? '存在' : '无', $jsapi: g.$jsapi ? '存在' : '无' };
  } catch (e) {
    return { ok: false, error: stringifyError(e) };
  }
}

// 一次性跑所有测试
export async function runAllTests() {
  const r = results;

  // 动态 import
  r.dynamicImport = await testDynamicImport('player');
  r.dynamicImportMedia = await testDynamicImport('mediaPlayer');

  // 同步 require
  r.requirePlayer = testRequire('player');
  r.requireMedia = testRequire('mediaPlayer');
  r.requireJsapiPlayer = testRequire('$jsapi/player');

  // globalThis
  r.falconGlobal = testGlobal('falcon');
  r.jsapiGlobal = testGlobal('jsapi');

  // 汇总所有失败
  r.allErrors = {};
  for (const key of ['dynamicImport', 'dynamicImportMedia', 'requirePlayer', 'requireMedia', 'requireJsapiPlayer']) {
    if (r[key] && !r[key].ok) {
      r.allErrors[key] = r[key].error;
    }
  }

  return r;
}

function stringifyError(e) {
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
