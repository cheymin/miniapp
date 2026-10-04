# Falcon 小程序框架核心模式（4 个参考项目提炼）

## 📁 标准目录结构
```
project/
├── src/
│   ├── app.js              ← 应用入口（extends $falcon.App）
│   ├── app.json            ← 页面注册 + options
│   ├── base-page.js        ← 页面基类（统一资源回收）
│   ├── pages/
│   │   └── index/
│   │       ├── index.vue   ← 页面 Vue 组件
│   │       └── index.js    ← (可选) 自定义页面类 extends BasePage
│   ├── services/           ← JS 模块 (net.js, input.js, store.js...)
│   ├── utils/
│   └── styles/             ← lessPaths 目录
├── libs/                   ← 原生模块 .so (自动被 app.json alias 或 import)
└── package.json
```

## 🔑 app.js — 必须写的 3 行
```js
import { BasePage } from './base-page.js'

class App extends $falcon.App {
  onLaunch(options) {
    super.onLaunch(options)
    this.setViewPort(DESIGN_WIDTH)   // ← 关键！960 或 800
    $falcon.useDefaultBasePageClass(BasePage)  // ← 关键！
  }
}
// 还必须 mock window/process（有些依赖要）
globalThis['window'] = { requestAnimationFrame, cancelAnimationFrame }
globalThis['process'] = { env: { NODE_ENV: 'production' } }

export default App
```

## 📄 base-page.js — 统一资源回收
所有项目几乎一模一样：
- `onLoad(options)` / `onShow()` / `onHide()` / `onUnload()` — 页面生命周期
- `setTimeout/setInterval` 自动追踪，onUnload 全清
- `$falcon.on` 记录 token，onUnload 全 off
- 调用 `this.$root.onShow/onHide/onUnload` 转发到 Vue 组件
- `beforeVueInstantiate(Vue)` — Vue.prototype 挂载全局

## 📱 .vue 页面写法
```html
<template>
  <div class="wrapper">
    <!-- @click / @touchstart / @touchend Falcon 都支持 -->
    <text @click="doSomething">按钮</text>
  </div>
</template>

<script>
export default {
  name: 'index',
  data() { return {} },
  // onShow/onHide/onUnload 会被 BasePage 转发
  onShow() { console.log('show') },
  onHide() { console.log('hide') },
  methods: { doSomething() {} }
}
</script>

<style lang="less" scoped>
.wrapper { flex: 1; flex-direction: column; background-color: #000; }
</style>
```

**注意**：
- Falon 支持 `@click` + `@touchstart/@touchend`（super-mario 全用 touch）
- 不支持 `flex-wrap`（所有 4 个项目都没用到 flex-wrap）
- 不支持 `position: fixed`
- flex 方向默认 column，显式写 `flex-direction: row/column`

## 🎹 系统键盘调用（PenBili 真机验证方案）
```js
import globalModule from 'global'

// 1. 创建管理器
const m = new globalModule.Global()

// 2. 订阅双通道回调
m.textEditFinished.on(handler)           // 模块信号通道
$falcon.on('textEditFinished', busHandler) // Falcon 总线通道

// 3. 拉起键盘
const uuid = m.startTextEdit(JSON.stringify({
  text: '初始文本',
  placeholder: '请输入',
  maxlength: 200,
  autofocus: true
}))

// 4. 回调参数: (uuid, { text, cursorIndex, editConfirmed })
//    90s 看门狗防永久等待！

// 5. 用完关闭
m.closeTextEdit(uuid)
```

## 🌐 HTTP 调用
- 固件可能不提供系统 http 模块
- PenBili: 用 `global` 原生模块
- wifi-login: 用自定义 `panet` 原生模块
- 通用: `$falcon.jsapi.http.request({ url, method, ... })` 也有

## 🔧 构建
```json
{
  "scripts": { "build": "aiot-cli -p" },
  "quickjs": { "version": "20200705", "bigNum": false },
  "single-js-bundle": false
}
```
Node 18 + 4 个 CI sed patches（之前踩过坑）

## 📐 屏幕尺寸
| 项目 | 设备 | setViewPort | 实际分辨率 |
|------|------|-------------|-----------|
| wifi-login | melon_pro (词典笔) | 960 | 960×266 |
| super-mario | melon_pro | 960 | 960×266 |
| PenBili | 有道 X5 | 800 | 800×254 |
| weather | 词典笔 | 960 | 960×266 |

## ⚠️ Falcon 限制（重要！）
1. **不支持 flex-wrap** — 手动拆行
2. **不支持 position: fixed** — 用 absolute 代替
3. **组件间 slot 不支持** — 所有 template 直接写根页面
4. **原生模块静态 import 要谨慎** — 设备没装就黑屏！用 `import X from 'native-module'` 时构建会 warning"原生模块请忽略"
5. **`window`/`process` 必须 mock** — app.js 里手动 globalThis 赋值
6. **页面类可选** — 简单页面只要 .vue，复杂页面可加 .js 写 class extends BasePage
