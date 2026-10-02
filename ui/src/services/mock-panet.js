/*
 * mock-panet.js — Web 预览 mock
 * 仅在 aiot-cli preview (浏览器) 时通过 app.json alias 生效
 * 真机打包时 rollup 不读 alias，仍用原生 Shell/$falcon 模块
 *
 * 用 localStorage 模拟文件读写 + 同步 HTTP（XMLHttpRequest）
 */

function getStore() {
  try { if (typeof localStorage !== 'undefined' && localStorage) return localStorage } catch (e) {}
  var mem = {}
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null },
    setItem: function (k, v) { mem[k] = String(v) },
  }
}

function readFile(path) {
  return new Promise(function (resolve, reject) {
    var v = getStore().getItem('panet:' + path)
    if (v != null) resolve(v)
    else reject(new Error('mock readFile not found: ' + path))
  })
}

function writeFile(path, data) {
  return new Promise(function (resolve, reject) {
    try { getStore().setItem('panet:' + path, String(data)); resolve(true) }
    catch (e) { reject(e) }
  })
}

function mkdirs(path) {
  return new Promise(function (resolve) { resolve(true) })
}

function request(url, method, timeoutSec) {
  return new Promise(function (resolve) {
    try {
      var xhr = new XMLHttpRequest()
      var timer = setTimeout(function () {
        resolve({ statusCode: 0, headers: [], body: '', error: 'timeout' })
        try { xhr.abort() } catch (e) {}
      }, (timeoutSec || 8) * 1000)
      xhr.onload = function () {
        clearTimeout(timer)
        var lines = []
        for (var i = 0; i < xhr.getAllResponseHeaders().split('\n').length; i++) {
          lines.push(xhr.getAllResponseHeaders().split('\n')[i])
        }
        resolve({
          statusCode: xhr.status,
          headers: lines,
          body: xhr.responseText,
          error: '',
        })
      }
      xhr.onerror = function () { clearTimeout(timer); resolve({ statusCode: 0, headers: [], body: '', error: 'xhr error' }) }
      xhr.open(method || 'GET', url, true)
      xhr.send(null)
    } catch (e) {
      resolve({ statusCode: 0, headers: [], body: '', error: String(e) })
    }
  })
}

export var Panet = {
  mkdirs: mkdirs,
  readFile: readFile,
  writeFile: writeFile,
  request: request,
  wifiSsid: function () { return Promise.resolve('MOCK_WIFI') },
}
