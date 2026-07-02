# Miniapp 项目开发指南

> 本文档面向 AI 助手和新加入的开发者，目标是让阅读者能在 10 分钟内理解项目架构，并具备快速交付新功能的能力。

**当前版本**：1.2.23
**目标设备**：有道词典笔 A6P（320×240 屏幕，ARMv7，uclibc Linux）
**应用框架**：Falcon MiniApp（基于 QuickJS 引擎 + Vue 3 语法子集）

---

## 一、项目总览

### 1.1 这是什么

"min 的工具箱"是一个运行在**有道词典笔**上的第三方应用，用 Falcon MiniApp 框架开发。提供 AI 助手、终端、浏览器、文件管理、图片查看、计算器、PVZ 游戏等数十个工具模块，通过 GitHub Actions 自动构建为 `.amr` 包供设备 OTA 升级。

### 1.2 仓库结构

```
/workspace
├── ui/                          # 前端（Vue 3 + Falcon）
│   ├── src/
│   │   ├── app.json             # 页面注册表（关键！）
│   │   ├── pages/               # 每个功能一个目录 (.vue/.ts/.less)
│   │   ├── components/          # 公共组件 (Toast, Loading, webview)
│   │   ├── editor/              # 文本编辑器内核
│   │   ├── utils/               # 工具函数 (softKeyboardUtils 等)
│   │   ├── @types/              # TypeScript 类型定义
│   │   └── styles/              # 全局样式
│   └── package.json             # 版本号在这里
├── jsapi/                       # C++ 原生模块（编译为 .so）
│   └── src/
│       ├── AI/                  # AI 对话 (含流式)
│       ├── Penshell/            # 交互式 shell
│       ├── Shell/               # 非交互 shell
│       ├── Database/            # SQLite 封装
│       ├── IME/                 # 输入法
│       ├── Fetch.cpp            # HTTP/cURL 封装（含 SSE 流）
│       └── JSAPI.cpp            # 模块注册入口
├── tools/build.sh               # 本地构建脚本
└── .github/workflows/build_for_a6p.yml   # CI/CD
```

### 1.3 双层架构

| 层 | 语言 | 职责 |
|---|---|---|
| **前端 (ui/)** | TypeScript + Vue 3 语法子集 | UI、业务逻辑、状态管理 |
| **原生 (jsapi/)** | C++17 | 系统调用、网络、数据库、shell |

前端通过 `$falcon.jsapi.<模块名>` 调用原生能力。原生模块用 `JQPublishObject` 的 `on/publish` 机制向前端推送事件。

---

## 二、开发环境

### 2.1 设备约束（务必牢记）

- **屏幕**：320×240 横屏，**每个像素都珍贵**
- **内存**：有限，单页 DOM 节点不宜 >300
- **CPU**：ARMv7 单核低频，复杂动画/大字符串拼接要小心
- **网络**：设备只支持 HTTP，**HTTPS 链接必须降级**（见下文）
- **输入**：无实体键盘，靠 `softKeyboard` 软键盘页面输入
- **JS 引擎**：QuickJS，**不支持** ES2020+ 部分特性（如 `??=`、`?.()` 调用），写代码要保守

### 2.2 不要在本地构建

**不要尝试在本地 `pnpm install` 或运行 `build.sh`** —— 依赖链复杂（需要 ARM 交叉编译工具链、设备版本信息），仅在 GitHub Actions 上构建。

**开发流程**：
1. 改代码 → 2. `git commit` → 3. `git push origin main` → 4. Actions 自动构建 → 5. 设备端"检查更新"拉取 `.amr`

### 2.3 HTTPS 降级（高频坑）

设备 cURL 不支持现代 TLS。**所有外部 URL 必须降级为 HTTP**：

```javascript
url = url.replace('https://', 'http://');
```

参考 [webview.vue](file:///workspace/ui/src/components/webview.vue) 的 `_replaceHttps` 方法。百度、必应等站点 HTTP 仍可用。

---

## 三、关键约定

### 3.1 版本号管理（三处同步）

每次发布新版本，**必须同步修改这三个文件**：

| 文件 | 字段 |
|---|---|
| [ui/package.json](file:///workspace/ui/package.json) | `"version": "x.y.z"` |
| [ui/src/pages/update/update.ts](file:///workspace/ui/src/pages/update/update.ts) | `const CURRENT_VERSION = 'x.y.z';` |
| [README.md](file:///workspace/README.md) | `**Version: x.y.z**` |

提交信息用 `vx.y.z: 简述`，会自动生成 GitHub Release。

### 3.2 备份 tag

做**重大改动前**，先打备份 tag，方便回滚：

```bash
git tag vX.Y.Z-backup
git push origin main --tags
```

### 3.3 页面注册

新页面**必须**在 [ui/src/app.json](file:///workspace/ui/src/app.json) 的 `pages` 对象里注册：

```json
"pages": {
  "myFeature": "pages/myFeature/myFeature.vue"
}
```

页面由 `$falcon.navTo('myFeature', { ...options })` 跳转。

### 3.4 页面文件三件套

每个页面是 `.vue` + `.ts` + `.less` 三件套：

- `myFeature.vue`：模板 + 引入 ts/less
- `myFeature.ts`：`defineComponent({...})` 逻辑，`export default`
- `myFeature.less`：样式，`@import url('../../styles/section.less')` 引入公共样式

参考 [pages/penshell/](file:///workspace/ui/src/pages/penshell) 是干净的三件套范例。

---

## 四、常用 API 速查

### 4.1 页面导航与生命周期

```typescript
// 跳转页面
$falcon.navTo('pageName', { key: 'value' });

// 返回
$falcon.navBack();

// 页面内获取参数
const options = this.$page.loadOptions;

// 返回键处理（重要！设备有返回键）
this.$page.$npage.setSupportBack(true);
this.$page.$npage.on('backpressed', this.handleBackPress);

// 关闭页面
this.$page.finish();
```

### 4.2 软键盘输入（无实体键盘，核心工具）

```typescript
import { openSoftKeyboard } from '../../utils/softKeyboardUtils';

openSoftKeyboard(
  () => this.currentInput,          // getter
  (value) => {                      // setter
    this.currentInput = value;
    this.$forceUpdate();
  }
);
```

详见 [utils/softKeyboardUtils.ts](file:///workspace/ui/src/utils/softKeyboardUtils.ts)。

### 4.3 持久化存储

```typescript
await $falcon.storage.set('key', 'value');
const value = await $falcon.storage.get('key');
```

### 4.4 原生模块调用

```typescript
import { AI, Shell, Penshell } from 'langningchen';

// 同步方法（SetProtoMethod）
Shell.exec('ls -la');

// 异步方法（SetProtoMethodPromise，返回 Promise）
await Penshell.initialize();
await AI.generateResponse();

// 事件订阅（JQPublishObject 的 on/publish）
Penshell.on('penshell_output', (chunk: string) => { ... });
```

类型定义在 [@types/langningchen.d.ts](file:///workspace/ui/src/@types/langningchen.d.ts)。

### 4.5 HTTP 请求

```typescript
const http = $falcon.jsapi.http;
const resp = await http.request({
  url: 'http://example.com',   // 注意：必须是 http
  method: 'GET',
  header: { 'User-Agent': '...' }
});
// resp 是字符串或 {result/data/body }
```

---

## 五、模块详解

### 5.1 AI 助手 (`pages/ai/`)

- **后端**：`jsapi/src/AI/`，OpenAI 兼容 API + 流式 SSE
- **存储**：对话树（ConversationNode）持久化到 SQLite
- **关键事件**：`ai_stream` 推送流式 chunk
- **流式输出坑**：见第六节"已知坑"

### 5.2 Penshell (`pages/penshell/`)

交互式终端，**关键设计**：

- `exec()` 内部追加 `echo __PENSHELL_DONE__` 标记，`condition_variable.wait_for(10s)` 带超时
- 前端 `executeCommand()` **必须用纯异步** `Penshell.write(cmd + '\n')`，不能用 `exec('true')` 检测完成（会污染交互式命令的 stdin）
- `sendCtrlC()` 发送 `\x03` 中断

⚠️ **不要再引入 `exec('true')` 检测逻辑**，会导致 CLI 菜单类交互命令卡死。

### 5.3 浏览器 (`pages/browser/` + `components/webview.vue`)

纯 JS 实现的 HTML/CSS 渲染器，**不执行 JavaScript**：

- `parseHTML` → 节点树 → `renderNode` 递归渲染为 Falcon 原生组件
- 支持表单提交、链接导航、图片加载、外部 CSS
- input/textarea 点击拉起软键盘（`onInputClick`）
- HTTPS 链接自动降级为 HTTP

### 5.4 图片查看器 (`pages/imageViewer/`)

- 菜单为**全屏覆盖式 scroller 弹窗**（`menu-overlay`），不要改回固定面板（会划不动）
- 图片用 `perl MIME::Base64` 编码为 data URI
- 双层 scroller 实现图片缩放后的双向滚动

### 5.5 文件管理 (`pages/fileManager/`)

- 通过 `Shell.exec` 执行 `ls/cat/mv/rm` 等命令
- 可作为 picker 模式被其他页面调用（`pickerMode: true`）

---

## 六、已知坑与避坑指南

### 6.1 流式输出缺字（已修复，勿回退）

**根因**：`Fetch.cpp` 的 `StreamWriteCallback` 用 `std::getline` 按本次 chunk 分行，但 curl 网络分块不按 SSE 边界对齐，半条 JSON 被丢弃。

**正确做法**：保留 `StreamContext` 跨回调缓冲区，见 [Fetch.cpp](file:///workspace/jsapi/src/Fetch.cpp)。**不要改回无缓冲版本**。

### 6.2 QuickJS 语法限制

- ❌ 不支持 `obj?.method()`（可选链调用方法）
- ❌ 不支持 `??=`、`||=` 复合赋值
- ❌ 不支持 `#privateField` 私有字段
- ✅ 支持 `obj?.field`、`arr?.[i]`、`null ?? default`
- ✅ 支持 async/await、Promise、Class、箭头函数

写 TS 时优先用显式 `if` 判断而非可选链调用。

### 6.3 Falcon 样式限制

- ❌ 不支持 `position: fixed`（用 `position: absolute` + 全屏覆盖）
- ❌ 不支持 CSS Grid、复杂 Flexbox
- ❌ `<scroller>` 只能有一个子元素
- ✅ 支持 `flex-direction: row/column`、`align-items`、`justify-content`
- ✅ `position: absolute` 需配 `left/top/right/bottom`

### 6.4 Vue 3 语法子集

- ✅ `defineComponent({...})`、`data()`、`computed`、`methods`、`mounted`
- ❌ 不支持 `<script setup>`、Composition API 的 `ref/reactive`
- ❌ 不支持 `v-html`、`v-model`（用 `:value` + `@click` 手动处理）
- ⚠️ 模板里调用方法要显式传 `this`：`@click="sendMessage(this.currentInput)"`

### 6.5 native 模块阻塞

任何 native 方法（`exec`/`generateResponse` 等）都可能阻塞。前端**不要**在 await 期间假设 UI 仍响应。长任务用 Ctrl+C/stopGeneration 中断。

### 6.6 中文与编码

- `.ts`/`.vue` 文件保存为 UTF-8
- 字符串里直接写中文即可，`console.log` 也能正常输出
- 从外部 zip/源码复制代码时**警惕中文字符混入代码**（曾导致 webview.vue 损坏）

---

## 七、构建与发布

### 7.1 触发构建

```bash
git add -A
git commit -m "vx.y.z: 功能描述"
git push origin main
```

推送到 `main` 即触发 [build_for_a6p.yml](file:///workspace/.github/workflows/build_for_a6p.yml)。

### 7.2 构建产物

- `ui/*.amr`：应用包，设备 OTA 升级用
- GitHub Release 自动创建，tag = `vx.y.z`
- Artifacts 保留 30 天

### 7.3 设备端升级

设备打开应用 → 设置 → 检查更新 → 自动下载 `.amr` 并安装。

### 7.4 回滚

```bash
# 回到某个备份版本
git checkout v1.2.20-backup -- .
git commit -m "revert to v1.2.20"
git push origin main
```

---

## 八、开发检查清单

新功能开发完，提交前对照检查：

- [ ] 版本号三处同步（package.json / update.ts / README.md）
- [ ] 新页面已在 `app.json` 注册
- [ ] 页面三件套齐全（.vue / .ts / .less）
- [ ] 返回键已处理（`backpressed`）
- [ ] 所有外部 URL 已降级为 HTTP
- [ ] 无 QuickJS 不支持的语法
- [ ] 无 `position: fixed`
- [ ] `<scroller>` 只有一个子元素
- [ ] 重大改动前已打备份 tag
- [ ] commit message 含版本号
- [ ] 如改了 native，确认前端类型定义 (`@types/langningchen.d.ts`) 同步

---

## 九、快速上手示例：新增一个页面

**1. 创建三件套** `ui/src/pages/hello/hello.{vue,ts,less}`：

```vue
<!-- hello.vue -->
<template>
  <div class="container">
    <text class="title">{{ msg }}</text>
    <text class="btn" @click="onInput">输入</text>
  </div>
</template>
<style lang="less" scoped>
@import url('hello.less');
</style>
<script>
import hello from './hello';
export default { ...hello };
</script>
```

```typescript
// hello.ts
import { defineComponent } from 'vue';
import { openSoftKeyboard } from '../../utils/softKeyboardUtils';

export type HelloOptions = {};

const hello = defineComponent({
  data() {
    return {
      $page: {} as FalconPage<HelloOptions>,
      msg: 'Hello'
    };
  },
  mounted() {
    this.$page.$npage.setSupportBack(true);
    this.$page.$npage.on('backpressed', () => this.$page.finish());
  },
  methods: {
    onInput() {
      openSoftKeyboard(
        () => this.msg,
        (v) => { this.msg = v; this.$forceUpdate(); }
      );
    }
  }
});
export default hello;
```

**2. 注册页面**：在 `app.json` 的 `pages` 加 `"hello": "pages/hello/hello.vue"`

**3. 从首页加入口**：在 [pages/index/index.vue](file:///workspace/ui/src/pages/index/index.vue) 加按钮，`index.ts` 加 `Hello() { $falcon.navTo('hello', {}); }`

**4. 升版本号** → commit → push → 等构建 → 设备升级测试

---

## 十、参考资源

- [开发文档/VUE_XM_STYLE_GUIDE.md](file:///workspace/开发文档/VUE_XM_STYLE_GUIDE.md)：Vue 样式规范
- [开发文档/XM_MINIAPP_SOURCE_GUIDE.md](file:///workspace/开发文档/XM_MINIAPP_SOURCE_GUIDE.md)：源码结构详解
- [pages/penshell/](file:///workspace/ui/src/pages/penshell)：最干净的三件套页面范例
- [components/webview.vue](file:///workspace/ui/src/components/webview.vue)：复杂组件范例（HTML 解析器）

---

**文档维护**：每次重大架构变更后更新本文档。版本号与代码版本同步。
