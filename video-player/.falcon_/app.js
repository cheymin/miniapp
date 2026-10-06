// 统一资源回收的页面基类
// 跟踪 $falcon.on token、timeout、interval，在 onUnload 的 finally 中释放
class ResourcePage extends $falcon.Page {
  constructor() {
    super();
    this.falconOnTokens = [];
    this.timeoutTokens = new Set();
    this.intervalTokens = new Set();
  }

  on(name, callback) {
    const token = $falcon.on(name, callback);
    this.falconOnTokens.push([token, name]);
    return token;
  }

  off(name, callbackOrToken) {
    $falcon.off(name, callbackOrToken);
    this.falconOnTokens = this.falconOnTokens.filter((item) => item[0] !== callbackOrToken);
  }

  setTimeout(callback, delay) {
    const token = setTimeout(() => {
      this.timeoutTokens.delete(token);
      callback();
    }, delay);
    this.timeoutTokens.add(token);
    return token;
  }

  clearTimeout(token) {
    clearTimeout(token);
    this.timeoutTokens.delete(token);
  }

  setInterval(callback, delay) {
    const token = setInterval(callback, delay);
    this.intervalTokens.add(token);
    return token;
  }

  clearInterval(token) {
    clearInterval(token);
    this.intervalTokens.delete(token);
  }

  sleep(delay) {
    return new Promise((resolve) => this.setTimeout(resolve, delay));
  }

  release() {
    this.falconOnTokens.forEach((item) => $falcon.off(item[1], item[0]));
    this.falconOnTokens = [];
    this.timeoutTokens.forEach((token) => clearTimeout(token));
    this.intervalTokens.forEach((token) => clearInterval(token));
    this.timeoutTokens.clear();
    this.intervalTokens.clear();
  }
}

class BasePage extends ResourcePage {
  onLoad(options) {
    super.onLoad(options);
    this.options = options || {};
  }

  onNewOptions(options) {
    super.onNewOptions(options);
    this.options = options || {};
  }

  onShow() {
    super.onShow();
    if (this.$root && this.$root.onShow) this.$root.onShow();
  }

  onHide() {
    super.onHide();
    if (this.$root && this.$root.onHide) this.$root.onHide();
  }

  onUnload() {
    try {
      super.onUnload();
      if (this.$root && this.$root.onUnload) this.$root.onUnload();
    } finally {
      this.release();
    }
  }

  beforeVueInstantiate(Vue) {
    if (super.beforeVueInstantiate) super.beforeVueInstantiate(Vue);
    Vue.prototype.$workspace = globalThis.$workspace;
    Vue.prototype.$appid = globalThis.$appid;
  }
}

// 设计宽度 800（与 PenBili 一致，Falcon 自动缩放到 320x240 物理屏幕）
const DESIGN_WIDTH = 800;

class App extends $falcon.App {
  constructor() {
    super();
  }

  onLaunch(options) {
    super.onLaunch(options);
    this.setViewPort(DESIGN_WIDTH);
    $falcon.useDefaultBasePageClass(BasePage);
  }

  onShow() {
    super.onShow();
  }

  onHide() {
    super.onHide();
  }

  onDestroy() {
    super.onDestroy();
  }
}

var App$1 = App;

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

/**
 * 探测原生模块
 * 依次尝试 import('mediaPlayer') → import('player')
 * @returns {Promise<{ module: any, moduleName: string, manager: any }|null>}
 */
async function probe() {
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

function resetCache() {
  cachedModule = null;
  cachedManager = null;
  cachedModuleName = null;
  tried = false;
}

/** 诊断：列出 module 和 manager 上所有函数名 */
function getAvailableApiList() {
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

// --- 播放控制（自动适配两个模块的不同函数名） ---

async function play() {
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

async function pause() {
  const r = await probe();
  if (!r) return { ok: false, error: '无可用模块' };
  if (r.manager) return firstAvailable(r.manager, ['pause', 'doPause'], []);
  return firstAvailable(r.module, ['pause', 'doPause'], []);
}

async function stop() {
  const r = await probe();
  if (!r) return { ok: false, error: '无可用模块' };
  if (r.manager) return firstAvailable(r.manager, ['stop', 'doStop'], []);
  return firstAvailable(r.module, ['stop', 'doStop'], []);
}

async function resume() {
  const r = await probe();
  if (!r) return { ok: false, error: '无可用模块' };
  if (r.manager) return firstAvailable(r.manager, ['resume', 'doPlayResumeMedia'], []);
  return firstAvailable(r.module, ['resume'], []);
}

// --- 状态查询 ---

async function getPlayState() {
  const r = await probe();
  if (!r) return { ok: false };
  if (r.manager) return firstAvailable(r.manager, ['getPlayState'], []);
  return firstAvailable(r.module, ['status'], []);
}

async function getCurrentPos() {
  const r = await probe();
  if (!r) return 0;
  if (r.manager) return firstAvailable(r.manager, ['getCurrentPos', 'getCurrentPosition'], []);
  const res = firstAvailable(r.module, ['status'], []);
  if (res.ok && res.result && typeof res.result.position === 'number') return { ok: true, result: res.result.position };
  return res;
}

async function getDuration() {
  const r = await probe();
  if (!r) return 0;
  if (r.manager) return firstAvailable(r.manager, ['getDuration', 'duration'], []);
  const res = firstAvailable(r.module, ['status'], []);
  if (res.ok && res.result && typeof res.result.duration === 'number') return { ok: true, result: res.result.duration };
  return res;
}

// --- 工具 ---

function formatTime(ms) {
  if (!ms || ms < 0) return '00:00';
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

//

var script = {
  data() {
    return {
      url: 'https://www.w3schools.com/html/mov_bbb.mp4',
      playing: false,
      paused: false,
      currentState: '',
      moduleName: '',
      managerOk: false,
      apiList: { module: [], manager: [] },
      logs: [],
      pollToken: null
    };
  },

  computed: {
    timeText() {
      return formatTime(this.currentPos) + ' / ' + formatTime(this.durationMs);
    }
  },

  onLoad() {
    // monkey-patch console 收集日志到 UI
    const self = this;
    this._origLog = console.log;
    this._origWarn = console.warn;
    this._origErr = console.error;
    console.log = function () {
      self._pushLog(Array.prototype.slice.call(arguments).join(' '), false, true);
      self._origLog.apply(console, arguments);
    };
    console.warn = function () {
      self._pushLog(Array.prototype.slice.call(arguments).join(' '), false, false);
      self._origWarn.apply(console, arguments);
    };
    console.error = function () {
      self._pushLog(Array.prototype.slice.call(arguments).join(' '), true, false);
      self._origErr.apply(console, arguments);
    };
    this._pushLog('页面加载完成', false, true);
    this.onProbeAgain();
  },

  onUnload() {
    this.stopPoll();
    console.log = this._origLog;
    console.warn = this._origWarn;
    console.error = this._origErr;
  },

  methods: {
    _pushLog(text, err, ok) {
      this.logs.push({ text: String(text), err: !!err, ok: !!ok });
      if (this.logs.length > 200) this.logs.shift();
    },

    async onProbeAgain() {
      resetCache();
      this._pushLog('开始探测 mediaPlayer / player 模块...', false, false);
      const r = await probe();
      if (r) {
        this.moduleName = r.moduleName;
        this.managerOk = !!r.manager;
        this._pushLog('✅ 模块: ' + r.moduleName + (r.manager ? ' + manager' : ''), false, true);
      } else {
        this.moduleName = '无';
        this.managerOk = false;
        this._pushLog('❌ 所有模块加载失败', true, false);
      }
      this.apiList = getAvailableApiList();
      this._pushLog('module API: ' + (this.apiList.module || []).length + ' 个, manager API: ' + (this.apiList.manager || []).length + ' 个', false, false);
      // 打印完整 API 列表到 console（沙箱看不到 UI 时能用 logcat 看到）
      this._origLog('[VidPlayer] module APIs:', this.apiList.module);
      this._origLog('[VidPlayer] manager APIs:', this.apiList.manager);
    },

    onUrlInput(e) {
      this.url = e.detail && e.detail.value ? e.detail.value : e.value;
    },

    async onTogglePlay() {
      if (this.playing) {
        this._pushLog('调 stop()...', false, false);
        const res = await stop();
        this._pushLog('stop 返回: ' + JSON.stringify(res), !!res.error, !res.error);
        this.playing = false;
        this.paused = false;
        this.currentState = 'stopped';
        this.stopPoll();
      } else {
        this._pushLog('调 play()...', false, false);
        this._pushLog('URL: ' + this.url, false, false);
        const res = await play();
        this._pushLog('play 返回: ' + JSON.stringify(res), !!res.error, !res.error);
        if (res.ok !== false) {
          this.playing = true;
          this.paused = false;
          this.currentState = 'playing';
          this.startPoll();
        } else {
          this.playing = false;
          this.currentState = 'error: ' + (res.error || 'unknown');
        }
      }
    },

    async onPauseResume() {
      if (!this.playing) return;
      if (this.paused) {
        this._pushLog('调 resume()...', false, false);
        const res = await resume();
        this._pushLog('resume 返回: ' + JSON.stringify(res), !!res.error, !res.error);
        if (res.ok !== false) {
          this.paused = false;
          this.currentState = 'playing';
        }
      } else {
        this._pushLog('调 pause()...', false, false);
        const res = await pause();
        this._pushLog('pause 返回: ' + JSON.stringify(res), !!res.error, !res.error);
        if (res.ok !== false) {
          this.paused = true;
          this.currentState = 'paused';
        }
      }
    },

    startPoll() {
      this.stopPoll();
      this.pollToken = this.setInterval(async () => {
        try {
          const s = await getPlayState();
          const p = await getCurrentPos();
          const d = await getDuration();
          if (s && s.result !== undefined) this.currentState = String(s.result);
          if (p && typeof p.result === 'number') this.currentPos = p.result;
          if (d && typeof d.result === 'number') this.durationMs = d.result;
        } catch (e) { /* ignore */ }
      }, 800);
    },

    stopPoll() {
      if (this.pollToken) {
        this.clearInterval(this.pollToken);
        this.pollToken = null;
      }
    }
  }
};

var style_0 = { "_": {
  "page": {
    "display": "flex",
    "width": "800px",
    "height": "600px",
    "backgroundColor": "#0e1116"
  },
  "bar": {
    "display": "flex",
    "flexDirection": "column",
    "width": "280px",
    "height": "600px",
    "paddingTop": "12px",
    "paddingRight": "12px",
    "paddingBottom": "12px",
    "paddingLeft": "12px",
    "backgroundColor": "#1b2027"
  },
  "brand": {
    "fontSize": "28px",
    "color": "#3ea6ff",
    "fontWeight": "bold"
  },
  "sub": {
    "marginTop": "2px",
    "fontSize": "11px",
    "color": "#8d99a6"
  },
  "diag-title": {
    "marginTop": "12px",
    "fontSize": "13px",
    "color": "#3ea6ff"
  },
  "diag-line": {
    "marginTop": "3px",
    "fontSize": "12px",
    "color": "#8d99a6",
    "lines": 2,
    "textOverflow": "ellipsis"
  },
  "diag-error": {
    "color": "#ff6b6b"
  },
  "btn-row": {
    "marginTop": "6px"
  },
  "btn": {
    "display": "flex",
    "justifyContent": "center",
    "alignItems": "center",
    "height": "36px",
    "borderRadius": "4px",
    "opacity:active": 0.7
  },
  "btn-play": {
    "backgroundColor": "#3ea6ff"
  },
  "btn-stop": {
    "backgroundColor": "#5a2847"
  },
  "btn-ctrl": {
    "backgroundColor": "#0e1116"
  },
  "btn-text": {
    "fontSize": "14px",
    "color": "#ffffff",
    "textAlign": "center"
  },
  "api-scroll": {
    "width": "256px",
    "height": "200px",
    "marginTop": "6px",
    "backgroundColor": "#0e1116",
    "borderRadius": "4px",
    "paddingTop": "6px",
    "paddingRight": "6px",
    "paddingBottom": "6px",
    "paddingLeft": "6px"
  },
  "api-head": {
    "fontSize": "11px",
    "color": "#3ea6ff",
    "marginTop": "4px"
  },
  "api-item": {
    "fontSize": "11px",
    "color": "#e9eef4",
    "marginTop": "1px"
  },
  "api-item-m": {
    "color": "#3ea6ff"
  },
  "right-col": {
    "display": "flex",
    "flexDirection": "column",
    "width": "496px",
    "height": "600px",
    "paddingTop": "12px",
    "paddingRight": "12px",
    "paddingBottom": "12px",
    "paddingLeft": "12px"
  },
  "input-wrap": {
    "marginTop": "6px",
    "paddingTop": "8px",
    "paddingRight": "8px",
    "paddingBottom": "8px",
    "paddingLeft": "8px",
    "backgroundColor": "#1b2027",
    "borderRadius": "4px"
  },
  "url-input": {
    "width": "480px",
    "fontSize": "14px",
    "color": "#e9eef4",
    "backgroundColor": "rgba(0,0,0,0)"
  },
  "log-scroll": {
    "width": "496px",
    "height": "450px",
    "marginTop": "6px",
    "backgroundColor": "#1b2027",
    "borderRadius": "4px",
    "paddingTop": "6px",
    "paddingRight": "6px",
    "paddingBottom": "6px",
    "paddingLeft": "6px"
  },
  "log-line": {
    "fontSize": "11px",
    "color": "#e9eef4",
    "fontFamily": "monospace",
    "marginTop": "1px",
    "lines": 2,
    "textOverflow": "ellipsis"
  },
  "log-err": {
    "color": "#ff6b6b"
  },
  "log-ok": {
    "color": "#3ea6ff"
  }
} };

var render = function (){
var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;
  return _c('div', {
    staticClass: ["page"]
  }, [_c('div', {
    staticClass: ["bar"]
  }, [_c('text', {
    staticClass: ["brand"]
  }, [_vm._v("VidPlayer")]), _c('text', {
    staticClass: ["sub"]
  }, [_vm._v("A6P · 320×240")]), _c('text', {
    staticClass: ["diag-title"]
  }, [_vm._v("模块探测")]), _c('text', {
    staticClass: ["diag-line"]
  }, [_vm._v("模块: " + _vm._s(_vm.moduleName || '探测中...'))]), _c('text', {
    staticClass: ["diag-line"]
  }, [_vm._v("manager: " + _vm._s(_vm.managerOk ? '✓ 已获取' : '— 无'))]), _c('div', {
    staticClass: ["btn-row"]
  }, [_c('div', {
    staticClass: ["btn", "btn-ctrl"],
    on: {
      "click": _vm.onProbeAgain
    }
  }, [_c('text', {
    staticClass: ["btn-text"]
  }, [_vm._v("重新探测")])])]), _c('text', {
    staticClass: ["diag-title"]
  }, [_vm._v("播放控制")]), _c('div', {
    staticClass: ["btn-row"]
  }, [_c('div', {
    class: _vm.playing ? 'btn btn-stop' : 'btn btn-play',
    on: {
      "click": _vm.onTogglePlay
    }
  }, [_c('text', {
    staticClass: ["btn-text"]
  }, [_vm._v(_vm._s(_vm.playing ? '停止' : '播放'))])])]), _c('div', {
    staticClass: ["btn-row"]
  }, [_c('div', {
    staticClass: ["btn", "btn-ctrl"],
    on: {
      "click": _vm.onPauseResume
    }
  }, [_c('text', {
    staticClass: ["btn-text"]
  }, [_vm._v(_vm._s(_vm.paused ? '继续' : '暂停'))])])]), (_vm.playing || _vm.currentState) ? _c('text', {
    staticClass: ["diag-line"]
  }, [_vm._v("\n      状态: " + _vm._s(_vm.currentState) + " · " + _vm._s(_vm.timeText) + "\n    ")]) : _vm._e(), (_vm.errorMsg) ? _c('text', {
    staticClass: ["diag-line", "diag-error"]
  }, [_vm._v(_vm._s(_vm.errorMsg))]) : _vm._e(), _c('text', {
    staticClass: ["diag-title"]
  }, [_vm._v("可用 API")]), _c('scroller', {
    staticClass: ["api-scroll"],
    attrs: {
      "scrollY": "true"
    }
  }, [_c('text', {
    staticClass: ["api-head"]
  }, [_vm._v(_vm._s(_vm.apiList.module ? 'module (' + _vm.apiList.module.length + ')' : ''))]), _vm._l((_vm.apiList.module), function(fn) {
    return _c('text', {
      key: 'm' + fn,
      staticClass: ["api-item"]
    }, [_vm._v(_vm._s(fn))])
  }), _c('text', {
    staticClass: ["api-head"]
  }, [_vm._v(_vm._s(_vm.apiList.manager ? 'manager (' + _vm.apiList.manager.length + ')' : ''))]), _vm._l((_vm.apiList.manager), function(fn) {
    return _c('text', {
      key: 'g' + fn,
      staticClass: ["api-item", "api-item-m"]
    }, [_vm._v(_vm._s(fn))])
  })], 2)]), _c('div', {
    staticClass: ["right-col"]
  }, [_c('text', {
    staticClass: ["diag-title"]
  }, [_vm._v("视频地址")]), _c('div', {
    staticClass: ["input-wrap"]
  }, [_c('input', {
    staticClass: ["url-input"],
    attrs: {
      "value": _vm.url,
      "placeholder": "http://.../path.mp4 或 /local/file"
    },
    on: {
      "input": _vm.onUrlInput
    }
  })]), _c('text', {
    staticClass: ["diag-title"]
  }, [_vm._v("console 日志")]), _c('scroller', {
    staticClass: ["log-scroll"],
    attrs: {
      "scrollY": "true"
    }
  }, _vm._l((_vm.logs), function(line, i) {
    return _c('text', {
      key: 'l' + i,
      staticClass: ["log-line"],
      class: {
        'log-err': line.err,
        'log-ok': line.ok
      }
    }, [_vm._v("\n        " + _vm._s(line.text) + "\n      ")])
  }), 0)])])
};

var staticRenderFns=[];
render._withStripped = true;
  
const __file = 'src/pages/index/index.vue';
const _scopeId = 'data-v-1badc801';

const _exports = script;

_exports.render = render;
_exports.staticRenderFns = staticRenderFns;
_exports._compiled = true;
_exports._scopeId = _scopeId;
_exports.themes = {};
_exports.style = Object.assign({}, style_0['_']);
_exports.__file = __file;

var IndexComponent = _exports;

class PageIndex extends BasePage {
  constructor() {
    super();
  }

  onLoad(options) {
    super.onLoad(options);
    this.setRootComponent(IndexComponent);
  }

  onNewOptions(options) {
    super.onNewOptions(options);
  }
}

var _index = PageIndex;

App$1.meta = {
  "pages": {
    "index": "pages/index/index.js"
  },
  "options": {
    "style": {
      "lessPaths": [
        "styles"
      ],
      "theme": "theme-dark"
    },
    "alias": {}
  }
};
App$1.meta.name = 'vid-player';
App$1.meta.version = '1.0.0';
App$1.meta.isSingleJsBundle = false;
$falcon.__AppClazz = App$1;
$falcon.__loadModuleDefault = async function (fileName) {
  if(App$1.__pages && App$1.__pages[fileName]){
    return App$1.__pages[fileName];
  } else {
    try{
      const pagePath = './' + fileName + '.js';
      let mod = await import(pagePath);
      return mod.default;
    } catch(e){
      console.log(e.message, e.stack);
    }
  }
};
App$1.__pages = {};
App$1.__pages['index'] = _index;
