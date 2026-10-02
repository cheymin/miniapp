/*
 * store.js — 统一持久化
 * 底层: $falcon.storage.get/set
 * 特性: 自动 JSON.parse/Stringify，类型安全
 */

function isFalconAvailable() {
  try { return typeof $falcon !== 'undefined' && $falcon.storage } catch (e) { return false }
}

export async function get(key) {
  if (!isFalconAvailable()) return null
  try {
    var raw = await $falcon.storage.get(key)
    if (!raw) return null
    try { return JSON.parse(raw) } catch (e) { return raw }
  } catch (e) {
    return null
  }
}

export async function set(key, value) {
  if (!isFalconAvailable()) return false
  try {
    var s = typeof value === 'string' ? value : JSON.stringify(value)
    await $falcon.storage.set(key, s)
    return true
  } catch (e) {
    return false
  }
}

export async function remove(key) {
  return set(key, '')
}
