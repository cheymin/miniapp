# A6P 视频播放 + 框架踩坑全记录

## 📐 A6P 设备参数
- **屏幕**: 320×240 横屏（有道词典笔 A6P）
- **setViewPort**: 320（逻辑画布宽度）
- **方向**: landscape（无需旋转）
- **CPU**: 低功耗 ARM Cortex-A 系列，软解 720p 吃力

## 🎬 视频播放方案对比（按优先级）

### 方案 1: Native cvplayer JSAPI（优先）
- **存在性**: `$falcon.jsapi.cvplayer` — Falcon 系统 JSAPI
- **调用**: `cvplayer.play(filePath)` → 硬件解码，最流畅
- **探测**: `typeof ($falcon as any).jsapi.cvplayer?.play === 'function'`
- **优点**: 硬件解码、不消耗 CPU
- **缺点**: 仅本地文件（`.mp4/.avi/.mkv`）
- **PenBili 对比**: PenBili 用自定义 `player` native 模块 + ffmpeg 软解（X5 设备有）

### 方案 2: Shell + ffplay 降级
- **调用**: `Shell.exec('ffplay -autoexit -x 320 -y 240 file.mp4 &')`
- **必要参数**: `-x 320 -y 240` 强制适配 A6P 屏幕
- **全屏参数**: `-noborder` 无边框
- **优点**: 通用、支持所有格式
- **缺点**: 软解耗 CPU，可能卡顿
- **PenBili 参考**: PenBili 的 player.js 里有 `hasModule()` 检查 + native 调用，我们可以把 `import player` 改成动态 try-catch，fallback 到 Shell

### 方案 3: Shell + mpv/vlc（备选）
- `mpv --no-border --autofit=320x240 file.mp4 &`
- `vlc --no-border --width=320 --height=240 file.mp4 &`

## 🔑 PenBili → A6P 适配要点

| PenBili (X5) | A6P | 适配 |
|-------------|-----|------|
| `setViewPort(800)` | `setViewPort(320)` | app.js 改 |
| 800×254 横条屏 | 320×240 横屏 | screen.js 重写 |
| `import player` native 模块 | **无此模块** | player.js 加 Shell fallback |
| ffmpeg 软解 B 站流 | cvplayer 仅本地文件 | 分流: B站→ffplay, 本地→cvplayer |
| 双栏布局（视频+面板） | 单栏 320px | layout 全改单列 |

### PenBili 改 A6P 需要动的文件
1. **src/app.js** — DESIGN_WIDTH 800 → 320
2. **src/services/screen.js** — LOGICAL { width: 320, height: 240 }
3. **src/services/player.js** — `import player` 改成 try-catch，fallback `Shell.exec('ffplay ...')`
4. **src/styles/*.less** — 所有 800px/452px 宽度改 320/240
5. **src/pages/index/index.vue** — 双栏布局改单栏

## 🏗️ Falcon 框架踩坑大全（血泪史）

### ✅ 必须遵守的规则
1. **用 Vue 2 Options API**: `export default { data(), methods: {} }`，**不要** Vue 3 setup/script setup
2. **不要 TypeScript**: 参考项目全 `.js`，TS 编译产物路径容易炸
3. **静态 import 原生模块要谨慎**: `import { Shell } from 'langningchen'` 设备没装就**整个页面黑屏**！
   - PenBili 方案: `try { const m = await import('player') } catch(e) { fallback }`
   - 我们可以: `const Shell = globalThis.Shell || null` 动态拿
4. **base-page.js 是必须的**: 统一资源回收，onUnload 时清 timeout/interval/$falcon.on
5. **app.js 必须 mock window/process**: 某些依赖会查
   ```js
   globalThis['window'] = { requestAnimationFrame, cancelAnimationFrame }
   globalThis['process'] = { env: { NODE_ENV: 'production' } }
   ```
6. **页面生命周期**: onLoad → onShow → onHide → onUnload（和 Vue 组件同名方法会被自动转发）
7. **页面基类可选**: 简单页面只要 .vue，复杂页面可加 .js 写 `class PageXxx extends BasePage { onLoad() { this.setRootComponent(VueComponent) } }`

### ❌ 绝对不能做的事
0. **❌❌❌ 不要在模块顶层写 `await`！QuickJS ES 模块不支持顶层 await！**
   - 错误示范: `let m = await import('global');` 写在 .js 模块顶层 → **整个 App 加载就炸 → 黑屏！**
   - 正确做法: 包进函数里懒加载 `async function getM() { return await import('global'); }`
   - player.js 原封不动是因为它的 `await import('player')` 在函数内部！
   - 所有原生模块动态 import 都必须在函数体内！
1. **不要 flex-wrap**: Falcon 不支持！手动拆 row
2. **不要 position: fixed**: Falcon 不支持
3. **不要组件嵌套**: `<PageShell><slot>` → 整页 JS 炸！所有 template 平铺
4. **不要 DOM touch 事件**（我们设备上）: 之前试 @touchstart 无效
   - 但 super-mario 用了 touch 且能跑！可能是设备差异
   - 保守方案: 只用 @click
5. **不要自定义软键盘**: 系统键盘 `globalModule.Global().startTextEdit()` 才是正道
6. **不要 langningchen 静态 import**: 原生库我们设备没装！用 Shell.exec 手动调

### 🔧 构建流程（固化）
```bash
export NVM_DIR=/root/.nvm && . "$NVM_DIR/nvm.sh" && nvm use 18
pnpm install
# 4 个 sed patches（照搬 CI）
sed -i "s/commonjs(),/commonjs(),require('@rollup\/plugin-typescript')(),/g" \
  node_modules/aiot-vue-cli/src/libs/rollup.config.js
sed -i "s/compiler.parseComponent(content, { pad: 'line' })/compiler.parse(content, { pad: 'line' }).descriptor/g" \
  node_modules/aiot-vue-cli/web-loaders/falcon-vue-loader/lib/parser.js
sed -i "s/path.resolve(__dirname, '.\/vue\/packages\/vue-template-compiler\/index.js')/'@vue\/compiler-sfc'/g" \
  node_modules/aiot-vue-cli/cli-libs/index.js
sed -i "s/compiler.compile/compiler.compileTemplate/g" \
  node_modules/aiot-vue-cli/web-loaders/falcon-vue-loader/lib/template-compiler/index.js
pnpm run build
```

### 🎹 系统键盘调用（PenBili 真机验证方案）
```js
import globalModule from 'global'

const m = new globalModule.Global()
m.textEditFinished.on((uuid, jsonData) => {
  const result = JSON.parse(jsonData)
  if (result.editConfirmed) { /* use result.text */ }
})
const uuid = m.startTextEdit(JSON.stringify({
  text: '初始值',
  placeholder: '请输入',
  maxlength: 200,
  autofocus: true
}))
// 用完 m.closeTextEdit(uuid)
```

### 📂 标准目录结构
```
project/
├── src/
│   ├── app.js              ← class App extends $falcon.App
│   ├── app.json            ← { pages, options: { style: { lessPaths: ["styles"] } } }
│   ├── base-page.js        ← class BasePage extends $falcon.Page
│   ├── pages/{name}/{name}.vue    ← 最小页面
│   ├── pages/{name}/{name}.js     ← (可选) 复杂页面类
│   ├── services/           ← JS 模块
│   └── styles/             ← lessPaths 目录
├── libs/                   ← 原生 .so（可选）
└── package.json            ← scripts.build: "aiot-cli -p"
```

## 📊 参考项目速查
| 项目 | 设备 | setViewPort | 原生模块 | 特色 |
|------|------|-------------|---------|------|
| weatheronyddictpen | 词典笔 | 960 | 无 | 单页面极简 |
| wifi-login | melon_pro | 960 | panet.so | 多页面 + 自定义网络 |
| super-mario | melon_pro | 960 | panet.so | Canvas 游戏 + touch 手势 |
| PenBili | 有道 X5 | 800 | player.so + global | B站视频播放完整方案 |

## 🎯 下次开写 Checklist
- [ ] 确定设备 setViewPort
- [ ] 复制 PenBili 的 app.js + base-page.js 骨架
- [ ] 原生模块 import 改 try-catch + fallback
- [ ] 只用 Vue 2 Options API
- [ ] 只用 @click，touch 按需试
- [ ] 无 flex-wrap / position:fixed / slot
- [ ] 本地构建 → Node 18 + 4 sed patches
