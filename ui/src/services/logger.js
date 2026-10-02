/*
 * logger.js — 轻量日志
 * 真机: console.* 直接输出
 * 可选落盘: Shell.appendFile（如果初始化成功）
 */

var DEBUG = false
var _shellReady = false

function ensureShell() {
  if (_shellReady) return
  try {
    var mod = require('langningchen')
    if (mod && mod.Shell) {
      mod.Shell.initialize().then(function () { _shellReady = true }).catch(function () {})
    }
  } catch (e) {}
}

function ts() {
  try {
    var d = new Date()
    var p = function (n) { return n < 10 ? '0' + n : '' + n }
    return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
  } catch (e) { return '' }
}

function write(tag, msg) {
  if (!DEBUG && (tag === 'debug')) return
  var line = '[' + ts() + '][' + tag + '] ' + String(msg == null ? '' : msg).replace(/[\r\n]+/g, ' ')
  console.log(line)
  // 异步落盘（失败静默）
  ensureShell()
  if (_shellReady) {
    try { Shell.exec("echo '" + line.replace(/'/g, "'\\''") + "' >> /tmp/miniapp.log") } catch (e) {}
  }
}

export function debug(msg) { write('DEBUG', msg) }
export function info(msg)  { write('INFO', msg) }
export function warn(msg)  { write('WARN', msg) }
export function error(msg) { write('ERROR', msg) }

export function setDebug(on) { DEBUG = !!on }
