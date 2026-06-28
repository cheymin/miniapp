# Miniapp Code Wiki

> 本文档是对 `langningchen/miniapp` 仓库的源码级 Code Wiki，覆盖项目整体架构、主要模块职责、关键类与函数、依赖关系以及构建运行方式。
>
> - **项目名称**：min 的工具箱（`miniapp`）
> - **当前版本**：1.2.21
> - **目标设备**：有道词典笔 A6P（320×240 横屏，ARMv7 + uclibc Linux）
> - **应用框架**：Falcon MiniApp（QuickJS 引擎 + Vue 3 语法子集）
> - **License**：GPL-3.0
> - **仓库**：`https://github.com/langningchen/miniapp`（发布版）/ `cheymin/miniapp`（设备 OTA 源）

---

## 目录

1. [项目总览](#1-项目总览)
2. [仓库结构](#2-仓库结构)
3. [整体架构](#3-整体架构)
4. [UI 前端模块（`ui/`）](#4-ui-前端模块ui)
5. [JSAPI 原生模块（`jsapi/`）](#5-jsapi-原生模块jsapi)
6. [iot-miniapp-sdk（JSAPI 依赖的 SDK）](#6-iot-miniapp-sdkjsapi-依赖的-sdk)
7. [webview-for-miniapp（参考子项目）](#7-webview-for-miniapp参考子项目)
8. [依赖关系](#8-依赖关系)
9. [构建与运行方式](#9-构建与运行方式)
10. [关键约定与已知坑](#10-关键约定与已知坑)
11. [文件索引](#11-文件索引)

---

## 1. 项目总览

`miniapp` 是运行在**有道词典笔**上的第三方 Falcon MiniApp，名为"min 的工具箱"。它通过 GitHub Actions 自动交叉编译为 `.amr` 应用包，设备端"检查更新"即可 OTA 升级。

提供的主要能力：

- **桌面系统**：实时时钟、农历、应用抽屉、通知中心、Dock 栏
- **AI 助手**：OpenAI 兼容 API + 流式 SSE、对话树持久化、多模型切换
- **终端**：交互式 `Penshell`（持久 `/bin/sh` 子进程）与非交互 `Shell`（`popen`）
- **浏览器**：纯 JS 实现的 HTML/CSS 渲染器（不执行 JS），HTTPS 自动降级
- **文件管理 / 文本编辑器 / 图片查看器 / 图库**
- **工具集**：计算器、单位转换、二维码生成、音乐播放器
- **系统功能**：设备信息、OTA 更新、杂项设置（亮度/手电筒/键盘类型）
- **小游戏**：PVZ（植物大战僵尸简化版）
- **QQ 聊天**：基于本地 SQLite 的模拟聊天 UI
- **拼音输入法（IME）**：自带词库 + 用户词频学习

### 1.1 双层架构一句话

> 前端用 TypeScript + Vue 3 语法子集写 UI 与业务逻辑；C++17 写原生能力（网络、SQLite、shell、AI 流式、IME、扫描输入）。前端通过 `import { AI, Shell, Penshell, IME, ScanInput } from 'langningchen'` 调用原生，原生用 `JQPublishObject` 的 `on/publish` 机制向前端推送事件。

---

## 2. 仓库结构

```
/workspace
├── ui/                              # 前端工程（Vue 3 + Falcon）
│   ├── src/
│   │   ├── app.js                   # App 入口（注册 BasePage）
│   │   ├── app.json                 # 页面注册表（关键！）
│   │   ├── base-page.js             # 页面基类（事件/定时器自动回收）
│   │   ├── pages/                   # 每个功能一个目录（.vue/.ts/.less 三件套）
│   │   ├── components/              # 公共组件（Loading / ToastMessage / webview）
│   │   ├── editor/                  # 自研文本编辑器内核（cursor/selection/...）
│   │   ├── utils/                   # 工具函数（softKeyboard / database / icons / ...）
│   │   ├── @types/                  # TS 类型定义（falcon.d.ts / langningchen.d.ts）
│   │   └── styles/                  # 全局样式（section.less）
│   ├── images/                      # 图片资源（loading 动画 27 帧 / 图标）
│   ├── package.json                 # 应用元信息 + 依赖 + 版本号
│   ├── tsconfig.json
│   └── app_icon.png
│
├── jsapi/                           # C++ 原生模块工程（编译为 libjsapi_langningchen.so）
│   ├── CMakeLists.txt               # 交叉编译配置
│   ├── iot-miniapp-sdk/             # Falcon 原生 SDK（头文件 + jqutil_v2 实现）
│   │   ├── include/                 # 公共头（quickjs / jqutil_v2 / looper / utils ...）
│   │   └── src/jqutil_v2/           # jqutil_v2 实现
│   ├── src/
│   │   ├── JSAPI.cpp                # 模块注册入口（注册 langningchen 模块）
│   │   ├── Fetch.{cpp,hpp}          # libcurl HTTP/SSE 客户端
│   │   ├── strUtils.{cpp,hpp}       # 字符串工具（trim/randomId/split/join）
│   │   ├── AI/                      # AI 对话 + 流式 + 对话树持久化
│   │   ├── Database/                # SQLite 链式查询构建器
│   │   ├── Exceptions/              # 异常体系（Curl/Network/Database/Assert）
│   │   ├── IME/                     # 拼音输入法引擎
│   │   ├── Penshell/                # 交互式 shell（fork /bin/sh + pipe）
│   │   ├── ScanInput/               # 扫描输入轮询（设备扫描笔输入）
│   │   ├── Shell/                   # 非交互 shell（popen）
│   │   ├── Update/                  # GitHub Releases OTA 更新
│   │   └── nlohmann/json.hpp        # 第三方 JSON 库（vendored）
│   ├── rawdict_utf16_65105_freq.txt # 拼音词库（UTF-16，编译期转 UTF-8 嵌入）
│   └── lib/                         # 设备 .so（libcurl / libsqlite3，由设备拉取）
│
├── webview-for-miniapp-main/        # 独立的 webview 参考子项目（可独立构建）
│   ├── src/components/webview.vue   # 增强版 HtmlView（带 JS sandbox / diagnose）
│   ├── README.md / package.json
│   └── api-mock/                    # JSAPI mock
│
├── tools/
│   ├── build.sh                     # 本地构建脚本（版本校验 + cmake + pnpm package）
│   ├── getVersionInfo.sh            # 在设备上采集版本信息
│   └── install.bat                  # Windows 安装辅助
│
├── .github/workflows/build_for_a6p.yml  # CI：push main / 每日 0 点构建并发布 Release
├── 开发文档/                         # 项目内开发文档（Vue 规范 / 源码说明 / 风格指南等）
├── PROJECT_GUIDE.md                 # 项目开发指南（10 分钟上手）
├── README.md                        # 面向用户的使用与构建说明
├── pnpm-workspace.yaml              # pnpm 工作区（仅 ui）
└── LICENSE                          # GPL-3.0
```

---

## 3. 整体架构

### 3.1 分层

| 层 | 目录 | 语言 | 职责 |
|---|---|---|---|
| **前端** | `ui/` | TypeScript + Vue 3 语法子集 | UI 渲染、业务逻辑、状态管理、页面路由 |
| **原生** | `jsapi/` | C++17 | 系统调用、网络（cURL）、数据库（SQLite）、shell、AI 流式、IME、扫描输入 |
| **SDK** | `jsapi/iot-miniapp-sdk/` | C++（头文件为主） | Falcon 提供的 QuickJS 绑定层、Looper、线程池、原子操作等基础设施 |

### 3.2 调用链路

```
┌──────────────────────────────────────────────────────────────┐
│  QuickJS 引擎（设备 Falcon 运行时）                            │
│                                                                │
│  Vue 页面 ──import──▶ 'langningchen' 模块                      │
│      │                          ▲                              │
│      │ $falcon.navTo/storage/on │ publish('ai_stream', ...)    │
│      ▼                          │                              │
│  $falcon 全局 API ──────────────┘                              │
│                                                                │
└────────────────────────────┬─────────────────────────────────┘
                             │ JSValue ↔ C++ (jqutil_v2 绑定)
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  libjsapi_langningchen.so（C++17）                             │
│                                                                │
│  JSAPI.cpp ── registerCModuleLoader("langningchen", ...)       │
│     │                                                          │
│     ├── createAI      ── AI/ConversationManager ── Fetch(cURL) │
│     ├── createShell   ── Shell (popen)                         │
│     ├── createPenshell── Penshell (fork/pipe /bin/sh)          │
│     ├── createIME     ── IME (拼音词库 + SQLite)                │
│     ├── createScanInput── ScanInput (轮询 history.db)           │
│     └── createUpdate  ── Fetch + GitHub Releases API           │
│                                                                │
│  Database (SQLite 链式构建器) ── sqlite3                        │
│  Exceptions (Curl/Network/Database/Assert)                     │
└──────────────────────────────────────────────────────────────┘
                             │
                             ▼
                  设备 Linux（uclibc / ARMv7）
```

### 3.3 JS ↔ C++ 绑定模式

原生模块统一通过 `jqutil_v2` 暴露给 JS：

- **同步方法**：`SetProtoMethod` → JS 端直接返回值（如 `Shell.exec` 在 C++ 同步执行）
- **异步方法（Promise）**：`SetProtoMethodPromise` → JS 端 `await` 拿到结果（如 `AI.generateResponse`、`Penshell.exec`）
- **事件订阅**：C++ 类继承 `JQPublishObject`，JS 端用 `obj.on('event', cb)` 订阅，C++ 端用 `publish("event", data)` 推送
  - `AI` → `ai_stream`（流式 token）
  - `Penshell` → `penshell_output`（子进程输出）
  - `ScanInput` → `scan_input`（扫描到新词）

---

## 4. UI 前端模块（`ui/`）

### 4.1 应用入口与基类

#### [`ui/src/app.js`](file:///workspace/ui/src/app.js)
- 继承 `$falcon.App`，定义应用生命周期（`onLaunch`/`onShow`/`onHide`/`onDestroy`）
- `onLaunch` 中调用 `$falcon.useDefaultBasePageClass(BasePage)` 设置全局页面基类
- 全局 polyfill：`globalThis.window`（`requestAnimationFrame`/`cancelAnimationFrame`）与 `globalThis.process.env`

#### [`ui/src/app.json`](file:///workspace/ui/src/app.json)
- **页面注册表**（关键）。每个新页面必须在 `pages` 对象中登记：`"pageName": "pages/pageName/pageName.vue"`
- 当前已注册 20 个页面（见 [4.2](#42-页面清单pages)）

#### [`ui/src/base-page.js`](file:///workspace/ui/src/base-page.js)
- `PageRes`（继承 `$falcon.Page`）：自动跟踪 `$falcon.on` 事件 token、`setTimeout`/`setInterval` token，在 `onUnload` 时统一释放，防止内存泄漏
- `BasePage`（继承 `PageRes`）：标准生命周期钩子（`onLoad`/`onNewOptions`/`onShow`/`onHide`/`onUnload`），并把 `$root.onShow/onHide/onUnload` 串起来；`beforeVueInstantiate` 注入 `$workspace`/`$appid`

### 4.2 页面清单（`pages/`）

每个页面是 `.vue` + `.ts` + `.less` 三件套：`.vue` 是模板与导入入口，`.ts` 用 `defineComponent({...})` 导出逻辑，`.less` 用 `@import url('../../styles/section.less')` 引入公共样式。

#### 已在 `app.json` 注册的页面

| 页面 | 入口 | 职责 | 主要原生依赖 |
|---|---|---|---|
| `index` | [pages/index/index.ts](file:///workspace/ui/src/pages/index/index.ts) | 应用启动器/首页，跳转到各功能页 | `$falcon.navTo` |
| `desktop` | [pages/desktop/desktop.ts](file:///workspace/ui/src/pages/desktop/desktop.ts) | 手机风格桌面：时钟、农历、Dock、应用抽屉、通知中心（手势滑动） | `$falcon.navTo` |
| `ai` | [pages/ai/ai.ts](file:///workspace/ui/src/pages/ai/ai.ts) | AI 对话界面，流式输出、消息变体、重新生成、跳转设置/历史/导航 | `AI`（`on('ai_stream')`、`addUserMessage`、`generateResponse`、`stopGeneration`、`switchToNode`、`getChildNodes`） |
| `aiHistory` | [pages/aiHistory/aiHistory.ts](file:///workspace/ui/src/pages/aiHistory/aiHistory.ts) | 对话列表：搜索/创建/加载/删除/重命名 | `AI.getConversationList` 等 |
| `aiNav` | [pages/aiNav/aiNav.ts](file:///workspace/ui/src/pages/aiNav/aiNav.ts) | 当前对话消息树浏览，跳转到指定消息 | `AI.getCurrentPath` + `$falcon.trigger('jump')` |
| `aiSettings` | [pages/aiSettings/aiSettings.ts](file:///workspace/ui/src/pages/aiSettings/aiSettings.ts) | 配置 API Key / baseUrl / 模型 / maxTokens / temperature / topP / 系统提示词 | `AI.getSettings`/`setSettings`/`getModels` |
| `browser` | [pages/browser/browser.ts](file:///workspace/ui/src/pages/browser/browser.ts) | 浏览器：URL 输入、书签、快捷链接 | `$falcon.storage`（书签） + [webview.vue](file:///workspace/ui/src/components/webview.vue) |
| `shell` | [pages/shell/shell.ts](file:///workspace/ui/src/pages/shell/shell.ts) | 终端页：命令执行、历史导航、内置 `vi` 编辑器支持 | `Shell.exec` |
| `penshell` | [pages/penshell/penshell.ts](file:///workspace/ui/src/pages/penshell/penshell.ts) | 交互式终端：命令历史、Ctrl+C、流式输出 | `Penshell`（`on('penshell_output')`、`exec`、`write`、`sendCtrlC`） |
| `fileManager` | [pages/fileManager/fileManager.ts](file:///workspace/ui/src/pages/fileManager/fileManager.ts) | 文件浏览器：`ls`/`find` 命令实现，支持打开/重命名/删除/属性/picker 模式 | `Shell.exec` |
| `fileEditor` | [pages/fileEditor/fileEditor.ts](file:///workspace/ui/src/pages/fileEditor/fileEditor.ts) | 文本编辑器：保存/另存为/查找/跳行 | `Shell.exec`（cat/echo 写文件） |
| `imageViewer` | [pages/imageViewer/imageViewer.ts](file:///workspace/ui/src/pages/imageViewer/imageViewer.ts) | 图片查看器：缩放/旋转/幻灯片/重命名/删除（菜单为全屏覆盖式 scroller） | `Shell.exec`（`perl MIME::Base64`、`find`、`stat`、`rm`、`mv`） |
| `gallery` | [pages/gallery/gallery.ts](file:///workspace/ui/src/pages/gallery/gallery.ts) | 网格图库：缩略图生成、懒加载、目录扫描 | `Shell.exec` |
| `qqchat` | [pages/qqchat/qqchat.ts](file:///workspace/ui/src/pages/qqchat/qqchat.ts) | QQ 风格聊天 UI：会话、消息、表情转换、模拟回复 | `database` util（本地 SQLite via `$falcon.storage`） |
| `pvz` | [pages/pvz/pvz.ts](file:///workspace/ui/src/pages/pvz/pvz.ts) | 植物大战僵尸简化版（5×9 网格） | 仅 `$falcon.navBack` |
| `softKeyboard` | [pages/softKeyboard/softKeyboard.ts](file:///workspace/ui/src/pages/softKeyboard/softKeyboard.ts) | 全屏软键盘：中文拼音 IME + 候选词 + 扫描输入 + 编辑器内核 | `IME`（`getCandidates`/`updateWordFrequency`）、`ScanInput`、自研 `Editor` |
| `update` | [pages/update/update.ts](file:///workspace/ui/src/pages/update/update.ts) | OTA 更新：检查 GitHub Releases、下载 `.amr`、`miniapp_cli install` 安装、多镜像源 | `Shell.exec`（`curl`/`wc`/`rm`/`miniapp_cli`） |
| `about` | [pages/about/about.ts](file:///workspace/ui/src/pages/about/about.ts) | 关于页：项目信息、鸣谢、GitHub 链接 | `$falcon.trigger('open_url')` |
| `deviceinfo` | [pages/deviceinfo/deviceinfo.ts](file:///workspace/ui/src/pages/deviceinfo/deviceinfo.ts) | 设备信息：IP/系统/存储/电池/网络/槽位/root fs | `Shell.exec`（`ip addr`/`uname`/`df`/`hal-battery`/`mount`/`cat /proc/...`） |
| `misc` | [pages/misc/misc.ts](file:///workspace/ui/src/pages/misc/misc.ts) | 杂项设置：屏幕亮度、亮屏时间、手电筒、键盘类型 | `Shell.exec`（`hal-screen`/`led_utils`） + `$falcon.storage` |

#### 目录存在但**未在 `app.json` 注册**的页面

> 这些页面源码完整但当前未挂入路由，可能是历史功能或未上线功能：

- `pages/calculator/` — 计算器（表达式求值、预览、持久化历史）
- `pages/musicPlayer/` — 音乐播放器（基于 `madplay` 后端，播放列表/模式/音量）
- `pages/qrcodeGenerator/` — 二维码生成（`qrencode` 命令、历史、保存/分享）
- `pages/unitConverter/` — 多分类单位转换（长度/重量/温度/面积/体积/时间/速度，防抖转换）
- `pages/videoPlayer/` — 视频播放器

### 4.3 公共组件（`components/`）

#### [`Loading.ts`](file:///workspace/ui/src/components/Loading.ts) / [`Loading.vue`](file:///workspace/ui/src/components/Loading.vue)
- 命令式 Loading 遮罩，单例模式
- 导出 `showLoading()` / `hideLoading()`
- `.vue` 渲染 27 帧 PNG 序列动画（`images/loading/01.png` ~ `27.png`）

#### [`ToastMessage.ts`](file:///workspace/ui/src/components/ToastMessage.ts) / [`ToastMessage.vue`](file:///workspace/ui/src/components/ToastMessage.vue)
- 命令式 Toast 通知，单例模式，支持进入/退出动画
- 类型：`'error' | 'warning' | 'success' | 'info'`
- 导出 `showError`/`showWarning`/`showSuccess`/`showInfo`（默认 3000ms 自动消失，点击可关闭）

#### [`webview.vue`](file:///workspace/ui/src/components/webview.vue)
- 组件名 `HtmlView`，**纯 JS 实现的 HTML/CSS 渲染器**（不执行 JavaScript）
- props：`url`（必填）、`debug`
- 核心流程：`loadHtml()` → `parseHTML()` 生成节点树 → `parseCSSText()` 解析内联/外部 CSS → `matchCSSRules()` + `getCombinedStyle()` 计算样式 → `renderNode(h, parentForm)` 递归渲染为 Falcon 原生组件（`scroller`/`div`/`text`/`image`）
- 支持：表单提交（`onFormSubmit`）、链接导航（`onLinkClick`）、图片加载、外部 CSS、`<table>`、HTTPS 自动降级为 HTTP（`_replaceHttps`）
- input/textarea 点击拉起软键盘（`onInputClick` → `openSoftKeyboard`）

### 4.4 文本编辑器内核（`editor/`）

自研轻量文本编辑器，被 `softKeyboard` 页面使用，支持光标移动、选择、撤销/重做、插入/改写模式、扫描输入。

| 文件 | 导出 | 职责 |
|---|---|---|
| [cursor.ts](file:///workspace/ui/src/editor/cursor.ts) | `Cursor` 类、`POS` 类型 | 光标位置（row/col）+ 宽字符感知的像素位置；上下移动用 `preferredPixelX` 保持水平意图；单词/行/文档首尾/翻页移动 |
| [textBuffer.ts](file:///workspace/ui/src/editor/textBuffer.ts) | `TextBuffer` 类、`TextData` 类型 | 文本存储（按行的 `string[]`）；`insertText`/`deleteText`/`backspace`/`deleteForward`/`getText` |
| [selection.ts](file:///workspace/ui/src/editor/selection.ts) | `Selection` 类、`Range` 类型 | 选区范围（绑定到 Cursor），`start`/`update`/`clear`/`getNormalizedRange`（自动正向化） |
| [history.ts](file:///workspace/ui/src/editor/history.ts) | `History` 类、`HistoryData` 类型 | 撤销/重做栈（snapshot = TextData + POS），`saveState`（去重 + 上限 100）/`undo`/`redo` |
| [editor.ts](file:///workspace/ui/src/editor/editor.ts) | `Editor` 类 | 顶层控制器，串联 cursor/selection/textBuffer/history，绑定 keyMap（方向键/Enter/Tab/Backspace/Delete/Ctrl+a/c/x/v/z/y 等），维护滚动偏移，对接 `ScanInput` |

模块间依赖关系：`editor.ts` → `cursor` / `selection` / `textBuffer` / `history` / `utils/charUtils` / `langningchen.ScanInput`；`selection` ↔ `cursor`；`history` ↔ `textBuffer` + `cursor`。

### 4.5 工具函数（`utils/`）

| 文件 | 导出 | 职责 |
|---|---|---|
| [softKeyboardUtils.ts](file:///workspace/ui/src/utils/softKeyboardUtils.ts) | `openSoftKeyboard`、`openKeyboard`、`getKeyboardType` | 文本输入统一入口。`openSoftKeyboard` 跳转 `softKeyboard` 页面并监听 `softKeyboard` 事件；`openKeyboard` 根据 `keyboard_type` 设置选择系统键盘（`NativeSDK.startTextEdit`）或软键盘 |
| [database.ts](file:///workspace/ui/src/utils/database.ts) | `database` 单例、`DatabaseConfig`/`ChatMessage`/`ChatSession`/`NotificationItem` 接口 | 应用配置 + 聊天会话持久化（基于 `$falcon.storage` JSON 文件，路径 `/userdisk/database`）。管理 QQ 配置、通知、设置；聊天会话/消息 CRUD |
| [charUtils.ts](file:///workspace/ui/src/utils/charUtils.ts) | `getCharWidth`、`getPositionWidth`、`findCharPositionByWidth` | 字符显示宽度（CJK/全角=2 倍），字符位置↔像素宽度互转 |
| [icons.ts](file:///workspace/ui/src/utils/icons.ts) | `icons`、`getIcon`、`getIconColor` | 逻辑图标名 → emoji 字符 + 品牌色映射 |
| [timeUtils.ts](file:///workspace/ui/src/utils/timeUtils.ts) | `formatTime` | Unix 时间戳（秒）→ 中文相对时间（`刚刚`/`N分钟前`/`N小时前`/`N天前`/日期） |

### 4.6 类型定义（`@types/`）

| 文件 | 内容 |
|---|---|
| [`falcon.d.ts`](file:///workspace/ui/src/@types/falcon.d.ts) | 宿主 `$falcon` 全局 API 类型：`on/off/trigger`、`navTo/navBack`、`jsapi.storage`/`jsapi.http.request`、`storage.get/set`、`closeApp/closePageByName/ById`、`$app.finish`；`FalconPage<T>`（含 `loadOptions`/`newOptions`/`$npage.setSupportBack/on/off`） |
| [`langningchen.d.ts`](file:///workspace/ui/src/@types/langningchen.d.ts) | 原生模块类型声明：`AI`、`IME`、`ScanInput`、`Shell`、`Penshell` 类的静态方法签名 |
| [`langningchen.ts`](file:///workspace/ui/src/@types/langningchen.ts) | 原生类型补充：`ROLE`/`STOP_REASON` 枚举、`ConversationNode`/`ConversationInfo`/`SettingsResponse`/`Candidate`/`Pinyin` 接口 |

### 4.7 关键前端 API 速查

```typescript
// 页面导航
$falcon.navTo('pageName', { key: 'value' });
$falcon.navBack();
this.$page.finish();
const options = this.$page.loadOptions;

// 返回键（设备有实体返回键）
this.$page.$npage.setSupportBack(true);
this.$page.$npage.on('backpressed', () => this.$page.finish());

// 软键盘（无实体键盘，核心工具）
import { openSoftKeyboard } from '../../utils/softKeyboardUtils';
openSoftKeyboard(() => this.currentInput, (v) => { this.currentInput = v; this.$forceUpdate(); });

// 持久化存储
await $falcon.storage.set('key', 'value');
const value = await $falcon.storage.get('key');

// 原生模块
import { AI, Shell, Penshell } from 'langningchen';
Shell.exec('ls -la');                       // 同步
await Penshell.initialize();                // 异步 Promise
await AI.generateResponse();                // 异步 Promise
Penshell.on('penshell_output', (chunk) => { ... });  // 事件订阅

// HTTP（注意：设备 cURL 不支持现代 TLS，URL 必须降级为 http）
const resp = await $falcon.jsapi.http.request({ url: 'http://...', method: 'GET' });

// 全局事件总线
$falcon.on('event', handler);
$falcon.off('event', handler);
$falcon.trigger('event', data);
```

---

## 5. JSAPI 原生模块（`jsapi/`）

### 5.1 模块入口 [`JSAPI.cpp`](file:///workspace/jsapi/src/JSAPI.cpp)

```cpp
extern "C" JQUICK_EXPORT void custom_init_jsapis() {
    registerCModuleLoader("langningchen", &langningchen_module_load);
}
```

- 通过 `registerCModuleLoader` 注册名为 `langningchen` 的原生模块加载器
- `module_init` 中用 `JQModuleEnv::CreateModule` 创建模块环境，依次导出 6 个子模块：`AI`、`IME`、`Penshell`、`ScanInput`、`Shell`、`Update`
- JS 端 `import { AI, Shell, ... } from 'langningchen'` 即可使用

### 5.2 [`Fetch.{cpp,hpp}`](file:///workspace/jsapi/src/Fetch.hpp) — HTTP/SSE 客户端

libcurl 封装，是 `AI` 与 `Update` 的统一网络层。

**关键类/函数**：
- `class Fetch`：静态方法 `Response fetch(url, FetchOptions)` — 执行 HTTP 请求
- `class Response`：`status`/`headers`/`body`/`ok`，方法 `json()`/`text()`/`isOk()`
- `class FetchOptions`：`method`/`headers`/`body`/`stream`/`streamCallback`/`timeout`（默认 10s）/`followRedirects`/`cancelled`（`shared_ptr<atomic<bool>>`）
- `struct StreamContext`：**跨 curl 回调保留不完整 SSE 行的缓冲区**（关键修复，见 [10.4](#104-流式输出缺字已修复勿回退)）
- 宏 `ASSERT_CURL_OK(expr)` — 非 OK 且非 `CURLE_ABORTED_BY_CALLBACK` 时抛 `CurlError`

**行为细节**：
- `StreamWriteCallback` 按 `\n` 分行、去尾空白、剥离 `data: ` 前缀，逐行调用 `streamCallback(line)`；不完整的尾部字节保留到下次回调
- `HeaderCallback` 解析 `Key: Value` 头
- 禁用 SSL 校验（`VERIFYPEER`/`VERIFYHOST = 0`）—— 设备 cURL 不支持现代 TLS
- 支持通过 `XFERINFOFUNCTION` 进度回调实现取消
- 流式结束后 flush 残留缓冲区

### 5.3 `AI/` — AI 对话模块

#### [`AI.hpp`](file:///workspace/jsapi/src/AI/AI.hpp) / `AI.cpp` — `class AI`
高层编排器，OpenAI 兼容 chat-completions 客户端 + 对话树持久化。

**关键成员**：
- `ConversationManager conversationManager` — 持久化层
- `unordered_map<string, unique_ptr<ConversationNode>> nodeMap` — 内存中的对话树
- `currentNodeId`/`rootNodeId`/`conversationId` — 当前位置
- `shared_ptr<atomic<bool>> currentRequestCancelled` — 流式请求取消标志
- 三把锁：`shared_mutex stateMutex`（状态）、`mutex settingsMutex`（设置）、`mutex conversationMutex`（对话操作）

**关键方法**：
- `generateResponse(AIStreamCallback)`：构造 OpenAI chat-completions 请求（`stream=true`、`Accept: text/event-stream`），POST 到 `baseUrl + "chat/completions"`；解析 SSE chunk 的 `delta.content`/`delta.reasoning_content`；映射 `finish_reason` → `STOP_REASON_*`；流式过程中实时追加/更新 assistant 节点；支持取消
- `stopGeneration()`：设置取消标志
- `getModels()`：GET `baseUrl + "models"`
- `getUserBalance()`：GET `baseUrl + "user/balance"`，返回 CNY 余额
- 对话树操作：`addNode`/`deleteNode`/`switchNode`/`getChildren`/`getCurrentPath`（沿 `parentId` 链回溯到根再反转）
- 对话 CRUD：`getConversationList`/`createConversation`/`loadConversation`/`deleteConversation`/`updateConversationTitle`
- 设置：`setSettings`/`getSettings`（返回 `SettingsResponse`）

#### [`ConversationManager.hpp`](file:///workspace/jsapi/src/AI/ConversationManager.hpp) / `.cpp`
SQLite 持久化层，DB 路径 `/userdisk/database/langningchen-ai.db`。

- 建表：`conversations`（id/title/created_at/updated_at）、`conversation_nodes`（id/conversation_id/role/content/parent_id/child_ids/timestamp/stop_reason）、`api_settings`（单行 "default"）
- `saveConversation`：更新 `updated_at` → 删除旧节点 → 重新插入全部节点
- `loadConversation`：重建 `nodeMap` 与 `childIds`，沿子节点链走到最后一个叶子作为 `leafNodeId`
- `saveApiSettings`/`loadApiSettings`：delete-all + insert 单行

#### [`ConversationNode.hpp`](file:///workspace/jsapi/src/AI/ConversationNode.hpp) — `struct ConversationNode`
- `id`、`ROLE` 枚举（USER=0/ASSISTANT=1/SYSTEM=2）、`STOP_REASON` 枚举（DONE/STOP/LENGTH/ERROR/CONTENT_FILTER/USER_STOPPED/NONE）、`content`、`parentId`、`childIds`、`timestamp`（毫秒）

#### [`ConversationInfo.hpp`](file:///workspace/jsapi/src/AI/ConversationInfo.hpp)
对话列表行 DTO（`id`/`title`/`createdAt`/`updatedAt`，秒级）

#### [`SettingsResponse.hpp`](file:///workspace/jsapi/src/AI/SettingsResponse.hpp)
API 设置 DTO（`apiKey`/`baseUrl`/`modelName`/`maxTokens`/`temperature`/`topP`/`systemPrompt`）

#### [`AICallback.hpp`](file:///workspace/jsapi/src/AI/AICallback.hpp)
`using AIStreamCallback = std::function<void(const std::string&)>;`

#### [`JSAI.hpp`](file:///workspace/jsapi/src/AI/JSAI.hpp) / `.cpp` — `class JSAI : JQPublishObject`
JS 绑定层。持有 `unique_ptr<AI>`，互斥保护。

**JS API 表面**：
- 同步（`SetProtoMethod`）：`initialize`、`getCurrentPath`、`getChildNodes`、`switchToNode`、`getCurrentNodeId`、`getRootNodeId`、`getCurrentConversationId`、`stopGeneration`、`setSettings`、`getSettings`
- 异步（`SetProtoMethodPromise`）：`addUserMessage`、`generateResponse`、`getModels`、`getUserBalance`、`getConversationList`、`createConversation`、`loadConversation`、`deleteConversation`、`updateConversationTitle`
- 事件：`generateResponse` 期间通过 `publish("ai_stream", chunk)` 推送流式 token

### 5.4 `Database/` — SQLite 链式查询构建器

轻量 fluent 查询构建器，包装 `sqlite3`，被 `AI`、`IME`、`ScanInput` 复用。**不直接暴露给 JS**。

#### [`Database.hpp`](file:///workspace/jsapi/src/Database/Database.hpp) — `class DATABASE`
连接持有者，工厂方法返回各 builder：
- `TABLE table(name)` — CREATE TABLE
- `SELECT select(name)` — SELECT
- `INSERT insert(name)` — INSERT
- `DELETE remove(name)` — DELETE
- `UPDATE update(name)` — UPDATE
- `SIZE size(name)` — COUNT(*)

#### Builder 模式

所有 builder 由 `DATABASE` 工厂方法构造（持 `sqlite3*` + 表名），链式方法返回 `*this`（`[[nodiscard]]`），终端 `execute()` 用 `sqlite3_prepare_v2` + 位置绑定文本值 + `ASSERT_DATABASE_OK`（失败抛 `DatabaseError`）。

| 类 | 链式方法 | `execute()` 返回 |
|---|---|---|
| [`TABLE`](file:///workspace/jsapi/src/Database/Table.hpp) | `column(name, type, options, defaultValue)` | 无（`CREATE TABLE IF NOT EXISTS`） |
| [`SELECT`](file:///workspace/jsapi/src/Database/Select.hpp) | `select(col)`/`where(col, val)`/`order(col, asc)`/`limit(n)`/`offset(n)` | `vector<unordered_map<string,string>>` |
| [`INSERT`](file:///workspace/jsapi/src/Database/Insert.hpp) | `value(col, data)` | `int64_t`（last insert rowid） |
| [`UPDATE`](file:///workspace/jsapi/src/Database/Update.hpp) | `set(col, val)`/`where(col, val)` | 无 |
| [`DELETE`](file:///workspace/jsapi/src/Database/Delete.hpp) | `where(col, val)` | 无 |
| [`SIZE`](file:///workspace/jsapi/src/Database/Size.hpp) | — | `int`（`SELECT COUNT(*)`） |

`ColumnType` 枚举：`TEXT/INTEGER/REAL/BLOB`；`ColumnOptions` 位掩码：`PRIMARY_KEY/NOT_NULL/UNIQUE/AUTOINCREMENT/DEFAULT`。

#### [`Includes.hpp`](file:///workspace/jsapi/src/Database/Includes.hpp)
共享头 + 宏 `ASSERT_DATABASE_OK(expr)`（非 OK/DONE 时抛 `DatabaseError`）。

### 5.5 `Exceptions/` — 异常体系

`Exception`（继承 `std::runtime_error`，构造时附加 `file:line`）为根的异常树：

| 文件 | 类 | 宏 | 用途 |
|---|---|---|---|
| [`Exception.hpp`](file:///workspace/jsapi/src/Exceptions/Exception.hpp) | `Exception` | `THROW_EXCEPTION(msg)` | 基类 |
| [`AssertFailed.hpp`](file:///workspace/jsapi/src/Exceptions/AssertFailed.hpp) | `AssertFailedException` | `ASSERT(cond)`/`THROW_ASSERT_FAILED(msg)` | 断言失败（参数校验） |
| [`DatabaseError.hpp`](file:///workspace/jsapi/src/Exceptions/DatabaseError.hpp) | `DatabaseError` | `THROW_DATABASE_ERROR(sqlite3*)` | SQLite 错误（用 `sqlite3_errmsg`） |
| [`NetworkError.hpp`](file:///workspace/jsapi/src/Exceptions/NetworkError.hpp) | `NetworkError` | `THROW_NETWORK_ERROR(statusCode)` | HTTP 非 2xx |
| [`CurlError.hpp`](file:///workspace/jsapi/src/Exceptions/CurlError.hpp) | `CurlError` | `THROW_CURL_ERROR(code)` | libcurl 错误（用 `curl_easy_strerror`） |

### 5.6 `IME/` — 拼音输入法引擎

#### [`IME.hpp`](file:///workspace/jsapi/src/IME/IME.hpp) / `.cpp` — `class IME`
- DB 路径 `/userdisk/database/langningchen-ime.db`，表 `ime_dict(pinyin, hanZi UNIQUE, freq)`
- `initialize()`：4 状态机解析内嵌 `RAWDICT_DATA`（HAN_ZI/FREQ/FLAG/PIN_YIN），填充 `pinyinDict`（`"py1 py2"` → `vector<DictEntry{hanZi,freq}>`）与 `pinyinUnits`（合法音节集合）；再从 DB 合并用户词频
- `splitPinyin(rawPinyin)`：贪心最长匹配分词（最大音节长度 5）
- `getCandidates(rawPinyin)`：对每个前缀收集候选，按 pinyin 长度降序、freq 降序排序
- `updateWordFrequency(pinyin, hanZi)`：内存 freq +100/500，upsert 到 `ime_dict`

#### [`JSIME.hpp`](file:///workspace/jsapi/src/IME/JSIME.hpp) / `.cpp` — `class JSIME : JQPublishObject`
- 同步：`getCandidates`、`updateWordFrequency`、`splitPinyin`
- 异步：`initialize`

### 5.7 `Penshell/` — 交互式 shell

#### [`Penshell.hpp`](file:///workspace/jsapi/src/Penshell/Penshell.hpp) / `.cpp` — `class Penshell`
持久化 `/bin/sh` 子进程管理器。

- `initialize()`：创建 3 对 `pipe()`（stdin/stdout/stderr），`fork()`；子进程 `dup2` 后 `execl("/bin/sh","sh",...)`；父进程启动 `readerLoop` 线程
- `exec(cmd, timeoutMs=10000)`：向 stdin 写 `cmd + "\necho __PENSHELL_DONE__\n"`，`condition_variable.wait_for` 等待 `DONE_MARKER` 出现在 `resultBuffer`（带超时支持交互命令）；返回前裁掉 marker
- `write(input)`：向子进程 stdin 原始写入（**不追加换行**）
- `sendCtrlC()`：写 `\x03` 并注入 `DONE_MARKER` 解阻塞
- `close()`：写 `exit\n`，关闭 fd，`waitpid(WNOHANG)`，join reader 线程
- `getWorkingDirectory()`：执行 `pwd`（3s 超时，失败返回 `/`）
- `readerLoop()`：`select()` 监听 stdout+stderr（100ms 超时），`onOutput(chunk)` 转发到 `outputCallback` 并追加到 `resultBuffer`，看到 marker 时 notify CV

#### [`JSPenshell.hpp`](file:///workspace/jsapi/src/Penshell/JSPenshell.hpp) / `.cpp`
- `setOutputCallback` 绑定到 `publish("penshell_output", chunk)`
- 异步：`initialize`、`exec`
- 同步：`write`、`sendCtrlC`、`getWorkingDirectory`、`close`、`isRunning`

### 5.8 `Shell/` — 非交互 shell

#### [`Shell.hpp`](file:///workspace/jsapi/src/Shell/Shell.hpp) / `.cpp` — `class Shell`
基于 `popen`/`pclose` 的一次性命令执行（无持久会话）。
- `static string exec(cmd)` — `popen("r")` 读 stdout 到字符串
- `static string exec(cmd, env)` — 前置 env 字符串
- `static pair<string,int> execWithStatus(cmd)` — 返回输出 + pclose 状态码
- `static void execAsync(cmd, onOutput)` — `std::thread` 流式回调

#### [`JSShell.hpp`](file:///workspace/jsapi/src/Shell/JSShell.hpp) / `.cpp`
- 同步：`initialize`（构造 Shell）
- 异步：`exec`

### 5.9 `ScanInput/` — 扫描输入轮询

#### [`ScanInput.hpp`](file:///workspace/jsapi/src/ScanInput/ScanInput.hpp) / `.cpp` — `class ScanInput`
后台轮询设备扫描笔输入历史。
- DB 路径 `/userdisk/database/history.db`，表 `table_history(word, timestamp)`
- `initialize(callback)`：起线程，每 1s `SELECT word FROM table_history ORDER BY timestamp DESC LIMIT 1`；当值变化（且 `lastString` 非空）时先 `system("miniapp_cli start 8001749644971193 softKeyboard")` 唤起软键盘，再调用 `callback(word)`
- `deinitialize()`：置 `initialized=false`，join 线程

#### [`ScanInputCallback.hpp`](file:///workspace/jsapi/src/ScanInput/ScanInputCallback.hpp)
`using ScanInputCallback = std::function<void(const std::string&)>;`

#### [`JSScanInput.hpp`](file:///workspace/jsapi/src/ScanInput/JSScanInput.hpp) / `.cpp` — `class JSSCAN_INPUT : JQPublishObject`
- 异步：`initialize`、`deinitialize`
- 事件：`publish("scan_input", word)`

### 5.10 `Update/` — GitHub Releases OTA 更新

#### [`JSUpdate.hpp`](file:///workspace/jsapi/src/Update/JSUpdate.hpp) / `.cpp` — `class JSUpdate : JQPublishObject`
逻辑与 JS 绑定合一的类。

- 默认配置：`owner="octocat"`、`repo="Hello-World"`、`downloadPath="/userdisk/downloads"`、`currentVersion="1.0.0"`、`filterPattern=".*\\.(tar\\.gz|zip|apk|bin)$"`
- `versionGreater(a,b)`：正则 `(\d+)\.(\d+)\.(\d+)` 数值比较
- `setRepo(info)`：从 JS 对象读 `owner/repo/downloadPath/currentVersion/filterPattern`
- `check(info)`：GET `https://api.github.com/repos/<owner>/<repo>/releases/latest`，选第一个匹配 `filterPattern` 的 asset，返回 `{success, hasUpdate, currentVersion, latestVersion, releaseNotes, downloadUrl, downloadSize, publishedAt, assetName}`
- `download(info)`：重新 check → 选 asset → `Fetch`（300s）→ 保存到 `downloadPath/assetName` → `chmod 0644`，返回 `{success, path, size, assetName}`
- `cleanup(info)`：`opendir`/`readdir` 扫 `downloadPath`，按 mtime 删除超过 `maxAgeDays`（默认 7）的文件
- 同步：`setRepo`、`cleanup`；异步：`check`、`download`、`getConfig`

### 5.11 [`strUtils.{cpp,hpp}`](file:///workspace/jsapi/src/strUtils.hpp) — 字符串工具

静态类 `strUtils`：
- `trim`/`trimStart`/`trimEnd` — 空白修剪
- `randomId()` — 32 位小写 hex（`std::random_device` + `mt19937`）
- `split(str, delimiter)` — 分割（保留非空 token）
- `join(vec, delimiter)` — 拼接

### 5.12 [`CMakeLists.txt`](file:///workspace/jsapi/CMakeLists.txt) — 原生构建配置

- 项目名 `jsapi_langningchen`，产物 `libjsapi_langningchen.so`
- 强制要求环境变量 `CROSS_TOOLCHAIN_PREFIX`（交叉编译器前缀）
- `find_library` 找 `libcurl`/`libsqlite3`（在 `lib/` 下）
- C++17，`-Wall -Werror=return-type`
- 先构建静态库 `iot_sdk_lib`（来自 `iot-miniapp-sdk/src/*.cpp`），再构建 SHARED 库链接它
- **词库嵌入**：`add_custom_command` 用 `iconv` 把 UTF-16 词库 `rawdict_utf16_65105_freq.txt` 转 UTF-8，生成 `rawdict_data.hpp`（`static const std::string RAWDICT_DATA = R"DICT(...)DICT";`），`IME` 包含它

---

## 6. iot-miniapp-sdk（JSAPI 依赖的 SDK）

`jsapi/iot-miniapp-sdk/` 是 Falcon 提供的原生 SDK，`jsapi/` 工程依赖它来绑定 QuickJS。

### 6.1 目录结构

| 子目录 | 职责 |
|---|---|
| `input/` | 硬件按键输入抽象：`KeyCodes.h`（键码枚举）、`KeyInput.h`（`injectKeyEvent` 注入 DOWN/UP 事件） |
| `jqutil_v2/` | **C++ ↔ QuickJS 绑定层**（核心）：对象/函数模板、基类生命周期、异步执行器、pub/sub、信号、BSON、序列化、引用计数 |
| `jsapis/` | JSAPI 扩展面：`ExtensionProxyBase.h`（`registerJSApi`/`postCallback`/`sendCustomEvent`/`sendAppEvent`）+ `REGISTER_JSAPI`/`REGISTER_STD_JSAPI` 宏 |
| `jsmodules/` | 原生模块加载：`JSCModuleExtension.h`（C API `registerCModuleLoader`）、`JSModuleExtension.h`（C++ 单例 `falcon::QJSModuleExtension`） |
| `looper/` | Android 风格消息循环：`Looper`/`MessageQueue`/`Message`/`Handler`/`HandlerThread`/`Thread`/`TaskThread`/`Task`/`FunctionalTask` |
| `port/` | 平台可移植原语：`jquick_thread`/`jquick_mutex`/`jquick_condition`/`jquick_time` |
| `quickjs/` | QuickJS 引擎公共头 `quickjs.h` |
| `threadpool/` | `ThreadPool`（核心 + 动态 worker、group/task 命名、shutdown）+ `ThreadPoolTask` |
| `utils/` | 通用工具：`REF.h`（`sp`/`wp` 智能指针 + `REF_BASE`）、`Mutex`/`Condition`/`Functional`/`JenkinsHash`/`LruCache`/`StrongPtr`/`UniquePtr`、多架构原子实现（`atomic-arm.h`/`atomic-x86_64.h` 等）、`log.h` |

### 6.2 顶层头文件

- [`JQuickContext.h`](file:///workspace/jsapi/iot-miniapp-sdk/include/JQuickContext.h) — Falcon 运行时顶层 API：`JQuickJSRuntime`/`JQuickJSContext`、JS 线程/Looper 查询、App 路径（`getWorkspace`/`getAppid`/`getDataDir`）、App 管理（`startApp`/`closeApp`/`getTopApp`）、生命周期（`registerAppLifecycle`/`unregisterAppLifecycle`）
- [`JQuickEnv.h`](file:///workspace/jsapi/iot-miniapp-sdk/include/JQuickEnv.h) — `$falcon.env` 访问器：`getEnvInt/Bool/Double/String/Json`、自定义 env 读写 + 持久化、`addCustomEnvChangeListener`
- [`jquick_config.h`](file:///workspace/jsapi/iot-miniapp-sdk/include/jquick_config.h) — 导出宏 `JQUICK_EXPORT`（Linux 上为 `__attribute__((visibility("default")))`）

### 6.3 `jqutil_v2` 关键类

| 类 | 职责 |
|---|---|
| `JQBaseObject` | C++ 对象 ↔ QuickJS 值的核心基类：`OnInit`/`OnCtor`/`OnGCMark`/`OnGCCollect` 生命周期钩子、`NewObject`/`FromJSObject`/`Unwrap` 包装、内部值/引用持有、异步执行器访问、信号注册、JS 调用禁用开关 |
| `JQPublishObject` | `JQBaseObject` 子类，实现 topic-based pub/sub 桥接到 JS：`publishJSON`/`publish`（auto/async/sync 模式）、`onSubscribe`/`onUnsubscribe` 钩子、JS 可调用的 `_SubscribeTopic`/`_UnsubscribeTopic` 维护 topic→callback 映射 |
| `JQFunctionTemplate` | 构造 JS 函数/构造器的模板：`GetFunction`/`CallConstructor`/`InstanceTemplate`/`PrototypeTemplate`，模板化 `SetProtoMethod`/`SetProtoMethodAsync`/`SetProtoMethodPromise`/`SetProtoAccessor`/`SetProtoGetter`/`SetProtoSetter` |
| `JQObjectTemplate` | 描述 JS 对象属性的模板（绑定层主力）：`Set`/`SetAccessor`/`SetBool` 基本类型与方法、嵌套模板、`JQSignal`/`JQProperty` 绑定、async/promise 变体（`SetAsync`/`SetAsyncStd`/`SetPromise`） |
| `JQAsyncExecutor` | JS 回调注册与跨线程调用：`addCallback`/`removeCallback`/`removeCallbackAsync`、`createPromiseId`、`onCallback`/`onCallbackJSON`/`onError`（线程安全异步 + JS 线程变体） |
| `JQAsyncSchedule` | 异步方法调度策略：`JQAsyncScheduleInfo`（handler/threadpool/thread-name/priority/stack/keepalive）、`setMode`（`MODE_MODULE`/`MODE_FUNCTION`/`MODE_APP`/`MODE_OBJECT`）、`setHook`、`dispatch` |
| `JQModuleEnv`（在 `JQTemplateEnv.h`） | 模块级环境，包装 `JSModuleDef*`，提供 `appid`/`dataDir`/`name`/`appDir`，`setModuleExport`/`setModuleExportDone`/`setModuleExportFailed` + `CreateModule` 工厂 |

---

## 7. webview-for-miniapp（参考子项目）

[`webview-for-miniapp-main/`](file:///workspace/webview-for-miniapp-main/) 是一个**独立的 Falcon MiniApp**（名为 `WebView`，appid `8001779527376453`，v1.0.0，作者 Mxzsan），作为 `HtmlView` 组件的参考实现与可独立运行示例。

### 7.1 与 `ui/` 的关系

- `ui/src/components/webview.vue` 是该组件的精简副本（仅 `url`/`debug` props）
- `webview-for-miniapp-main/src/components/webview.vue` 是增强版，额外支持：
  - `enableJS` prop + JS 沙箱（`executeScripts`、虚拟 `document`/node proxies）
  - `diagnose` prop（诊断报告）
  - `file://` 本地文件加载（`fs.readFile`）
  - 外部 CSS（`<link rel=stylesheet>`）抓取
  - `scripts[]` 收集路径

### 7.2 关键文件

- [`README.md`](file:///workspace/webview-for-miniapp-main/README.md) — 中文文档：功能、快速开始、props、events、兼容页面类型、工作原理、高级配置（UA/CSS 过滤/HTTPS 降级）
- [`package.json`](file:///workspace/webview-for-miniapp-main/package.json) — MiniApp manifest（Vue 2.6.12、`falcon-ui ^2.0.2`、`aiot-cli` 脚本）
- [`src/app.js`](file:///workspace/webview-for-miniapp-main/src/app.js) — App 入口（设置 BasePage + polyfill）
- [`src/app.json`](file:///workspace/webview-for-miniapp-main/src/app.json) — 注册 `index`/`page` 两个页面
- [`src/base-page.js`](file:///workspace/webview-for-miniapp-main/src/base-page.js) — 与 `ui/src/base-page.js` 同构
- [`src/components/webview.vue`](file:///workspace/webview-for-miniapp-main/src/components/webview.vue) — 核心增强版 `HtmlView`
- `src/styles/{base,mixin,var}.less` — 基础样式 / LESS mixin / 变量
- `api-mock/` — JSAPI mock（`$jsapi.test.js`、`test-module.js`）

---

## 8. 依赖关系

### 8.1 前端依赖（`ui/package.json`）

```json
{
  "dependencies": { "falcon-ui": "^2.0.2" },
  "devDependencies": {
    "@rollup/plugin-typescript": "^12.1.3",
    "@vue/compiler-sfc": "^3.5.17",
    "aiot-vue-cli": "^1.0.32",
    "vue": "^3.5.17"
  },
  "packageManager": "pnpm@10.12.4",
  "quickjs": { "version": "20200705", "bigNum": false }
}
```

- `falcon-ui` — Falcon 原生 UI 组件库
- `aiot-vue-cli` — Falcon 编译 CLI（`aiot-cli -p` 预览、`-c -q -p` 打包）
- `vue` + `@vue/compiler-sfc` — Vue 3 SFC 编译（实际运行时是 Vue 3 语法子集，非完整 Vue）
- `@rollup/plugin-typescript` — TS 编译（构建时通过 `sed` 注入到 `aiot-vue-cli` 的 rollup 配置中）

### 8.2 原生依赖（`jsapi/CMakeLists.txt`）

- **C++17**，工具链：`armv7-eabihf--uclibc--bleeding-edge-2018.11-1`（来自 `penosext/Cloudpan` releases）
- `libcurl`（设备 `.so`，位于 `jsapi/lib/`）
- `libsqlite3`（设备 `.so`）
- `nlohmann/json.hpp`（vendored 在 `jsapi/src/nlohmann/`）
- `iot-miniapp-sdk`（Falcon SDK，编译为静态库 `iot_sdk_lib`）
- POSIX：`pipe`/`fork`/`dup2`/`execl`/`select`/`waitpid`/`popen`/`system`/`opendir`/`chmod`/`stat`

### 8.3 设备运行时约束

- **屏幕**：320×240 横屏
- **CPU**：ARMv7 单核低频
- **内存**：有限，单页 DOM 节点不宜 > 300
- **网络**：设备 cURL 不支持现代 TLS，**HTTPS 必须降级为 HTTP**
- **JS 引擎**：QuickJS（`20200705`），不支持 `??=`/`||=`/`#privateField`/`obj?.method()`，支持 `obj?.field`/`arr?.[i]`/`null ?? default`/async-await/Class/箭头函数
- **输入**：无实体键盘，靠 `softKeyboard` 软键盘页面或系统输入法
- **Vue 子集**：仅 Options API（`defineComponent({...})`），不支持 `<script setup>`/Composition API 的 `ref`/`reactive`/`v-html`/`v-model`

### 8.4 模块依赖图

```
JSAPI.cpp
  ├── AI/JSAI ── AI ── ConversationManager ── Database
  │                 └── Fetch ── libcurl
  ├── IME/JSIME ── IME ── Database + rawdict_data.hpp
  ├── Penshell/JSPenshell ── Penshell ── POSIX (fork/pipe/select)
  ├── ScanInput/JSScanInput ── ScanInput ── Database + system()
  ├── Shell/JSShell ── Shell ── popen
  └── Update/JSUpdate ── Fetch + popen + dirent

所有模块共享:
  ├── Database/* ── sqlite3
  ├── Exceptions/* ── std::runtime_error
  ├── Fetch ── libcurl + nlohmann::json
  ├── strUtils
  └── iot-miniapp-sdk (jqutil_v2 绑定 + looper + threadpool + utils)
```

---

## 9. 构建与运行方式

### 9.1 推荐流程：GitHub Actions 自动构建

> **不要尝试在本地 `pnpm install` 或运行 `build.sh`** —— 依赖链复杂（需 ARM 交叉编译工具链 + 设备版本信息），仅在 GitHub Actions 上构建。

```bash
# 1. 改代码 → 同步三处版本号（见 10.1）
# 2. 提交
git add -A
git commit -m "vx.y.z: 功能描述"
git push origin main
# 3. Actions 自动构建（.github/workflows/build_for_a6p.yml）
# 4. 自动创建 GitHub Release（tag = vx.y.z）
# 5. 设备端：应用 → 设置 → 检查更新 → 自动下载 .amr 并安装
```

CI 触发条件：`push` 到 `main`、`workflow_dispatch`、`schedule`（每日 UTC 0 点）。

### 9.2 CI 工作流（[`build_for_a6p.yml`](file:///workspace/.github/workflows/build_for_a6p.yml)）

1. checkout 代码
2. 安装 Node 18 + `pnpm@latest-10`
3. `pnpm install -C ./ui`
4. 下载并解压 ARM 工具链到 `jsapi/toolchains/`
5. 下载并解压 `A6PversionInfo.tar.gz` 到 `jsapi/`（提供 `include/` 头文件与 `lib/` 设备 `.so`）
6. 注入设备型号常量到 `update.ts`（`DEVICE_MODEL = 'a6p'`）
7. **关键**：用 6 条 `sed` 修补 `aiot-vue-cli` 节点模块（让旧版 CLI 兼容新版 `@vue/compiler-sfc`，详见 9.4）
8. 修补 `CMakeLists.txt`（跳过依赖信息生成以加速）
9. 运行 `./tools/build.sh -a`（自动同步版本号）
10. 收集 `ui/*.amr` 上传 artifact（保留 30 天）
11. `push` 触发时用 `softprops/action-gh-release` 创建 Release

### 9.3 本地构建脚本（[`tools/build.sh`](file:///workspace/tools/build.sh)）

```bash
./tools/build.sh              # 正常构建（带版本校验）
./tools/build.sh -f           # 强制构建（忽略版本不匹配）
./tools/build.sh -a           # 自动同步 update.ts 版本号
./tools/build.sh -c           # 仅校验版本一致性
./tools/build.sh -v           # 详细输出
```

执行步骤：
1. `create_directories` — 创建 `ui/libs/`、`dist/`
2. `check_version_consistency` — 对比 `ui/package.json` 与 `ui/src/pages/update/update.ts` 的 `CURRENT_VERSION`，不匹配则交互式处理（或 `-a` 自动改 / `-f` 强制）
3. `setup_toolchain` — 在 `jsapi/toolchains/` 找第一个工具链，导出 `CROSS_TOOLCHAIN_PREFIX`
4. `build_native` — `cmake -S jsapi -B jsapi/build` + `make -j$(nproc)`，拷贝 `libjsapi_langningchen.so` 到 `ui/libs/`
5. `package_ui` — `pnpm -C ui package`（即 `aiot-cli -c -q -p`）生成 `.amr`
6. `create_distribution` — 拷贝 `ui/*.amr` 到 `dist/miniapp-<toolchain>.amr`

### 9.4 `aiot-vue-cli` 修补（CI 中的 6 条 sed）

为了让旧版 `aiot-vue-cli@1.0.32` 兼容新版 `@vue/compiler-sfc@3.5.17`：

```bash
# 1. rollup 配置注入 TS 插件
sed -i "s/commonjs(),/commonjs(),require('@rollup\/plugin-typescript')(),/g" \
  ./node_modules/aiot-vue-cli/src/libs/rollup.config.js
# 2. parser 用新 API：parseComponent → parse(...).descriptor
sed -i "s/compiler.parseComponent(content, { pad: 'line' })/compiler.parse(content, { pad: 'line' }).descriptor/g" \
  ./node_modules/aiot-vue-cli/web-loaders/falcon-vue-loader/lib/parser.js
# 3. vue-template-compiler → @vue/compiler-sfc
sed -i "s/path.resolve(__dirname, '.\/vue\/packages\/vue-template-compiler\/index.js')/'@vue\/compiler-sfc'/g" \
  ./node_modules/aiot-vue-cli/cli-libs/index.js
# 4. parser 同步修改
sed -i "s/compiler.parseComponent(content, { pad: true })/compiler.parse(content, { pad: true }).descriptor/g" \
  ./node_modules/aiot-vue-cli/src/libs/parser.js
# 5. compile → compileTemplate
sed -i "s/compiler.compile/compiler.compileTemplate/g" \
  ./node_modules/aiot-vue-cli/web-loaders/falcon-vue-loader/lib/template-compiler/index.js
# 6. defineComponent 在运行时抹掉
sed -i "s/const replaceValues = {}/const replaceValues = { 'defineComponent': '' }/g" \
  ./node_modules/aiot-vue-cli/src/libs/rollup.config.js
# 7. 图片插件相对路径解析（CI 额外加的）
sed -i "s/resolveId(id, importer) {/resolveId(id, importer){\n if (id.startsWith('.') \&\& importer) { id = require('path').resolve(require('path').dirname(importer), id); }/g" \
  ./node_modules/aiot-vue-cli/src/rollup-plugins/image.js
```

### 9.5 设备安装

```bash
# 上传 .amr 到设备
adb push miniapp.amr /userdisk/Favorite/miniapp.amr
# 安装
adb shell miniapp_cli install /userdisk/Favorite/miniapp.amr
```

或设备端：应用 → 设置 → 检查更新（[`pages/update`](file:///workspace/ui/src/pages/update/update.ts) 内置多镜像源：github / ghproxy / langningchen / FastGit / ghproxycn）

### 9.6 版本信息采集（[`tools/getVersionInfo.sh`](file:///workspace/tools/getVersionInfo.sh)）

在设备上执行，采集系统版本信息打包为 `versionInfo.tar.gz`，供 Ubuntu 端解压到 `jsapi/` 获取 `include/`（curl/sqlite3 头）与 `lib/`（设备 `.so`）。

---

## 10. 关键约定与已知坑

### 10.1 版本号三处同步

每次发布新版本，**必须同步修改**：

| 文件 | 字段 |
|---|---|
| [`ui/package.json`](file:///workspace/ui/package.json) | `"version": "x.y.z"` |
| [`ui/src/pages/update/update.ts`](file:///workspace/ui/src/pages/update/update.ts) | `const CURRENT_VERSION = 'x.y.z';` |
| [`README.md`](file:///workspace/README.md) | `**Version: x.y.z**` |

提交信息用 `vx.y.z: 简述`，自动生成 GitHub Release。

### 10.2 备份 tag

重大改动前先打备份 tag：
```bash
git tag vX.Y.Z-backup
git push origin main --tags
```

### 10.3 页面注册

新页面**必须**在 [`ui/src/app.json`](file:///workspace/ui/src/app.json) 的 `pages` 对象注册：
```json
"myFeature": "pages/myFeature/myFeature.vue"
```
页面三件套：`.vue`（模板 + 导入）+ `.ts`（`defineComponent({...})` 逻辑）+ `.less`（样式，`@import url('../../styles/section.less')`）。参考 [pages/penshell/](file:///workspace/ui/src/pages/penshell) 是最干净的范例。

### 10.4 流式输出缺字（已修复，勿回退）

**根因**：`Fetch.cpp` 的 `StreamWriteCallback` 若按本次 chunk 分行，curl 网络分块不按 SSE 边界对齐，半条 JSON 会被丢弃。

**正确做法**：保留 `StreamContext` 跨回调缓冲区（`buffer` 字段），见 [`Fetch.hpp`](file:///workspace/jsapi/src/Fetch.hpp)。**不要改回无缓冲版本**。

### 10.5 Penshell 交互命令

- `exec()` 内部追加 `echo __PENSHELL_DONE__` 标记 + `condition_variable.wait_for(10s)` 超时
- 前端 `executeCommand()` **必须用纯异步** `Penshell.write(cmd + '\n')`，**不能用 `exec('true')` 检测完成**（会污染交互式命令的 stdin，导致 CLI 菜单类命令卡死）

### 10.6 HTTPS 降级

设备 cURL 不支持现代 TLS。所有外部 URL 必须降级：
```javascript
url = url.replace('https://', 'http://');
```
参考 [webview.vue](file:///workspace/ui/src/components/webview.vue) 的 `_replaceHttps`。

### 10.7 QuickJS 语法限制

- ❌ 不支持 `obj?.method()`（可选链调用方法）
- ❌ 不支持 `??=`/`||=` 复合赋值
- ❌ 不支持 `#privateField` 私有字段
- ✅ 支持 `obj?.field`/`arr?.[i]`/`null ?? default`/async-await/Class/箭头函数

写 TS 优先用显式 `if` 判断而非可选链调用方法。

### 10.8 Falcon 样式限制

- ❌ 不支持 `position: fixed`（用 `position: absolute` + 全屏覆盖）
- ❌ 不支持 CSS Grid、复杂 Flexbox
- ❌ `<scroller>` 只能有一个子元素
- ✅ 支持 `flex-direction`/`align-items`/`justify-content`
- ✅ `position: absolute` 需配 `left/top/right/bottom`

### 10.9 native 模块阻塞

任何 native 方法（`exec`/`generateResponse` 等）都可能阻塞。前端**不要**在 `await` 期间假设 UI 仍响应。长任务用 Ctrl+C/`stopGeneration` 中断。

### 10.10 中文与编码

- `.ts`/`.vue` 保存为 UTF-8
- 字符串直接写中文，`console.log` 正常输出
- 从外部 zip/源码复制代码时**警惕中文字符混入代码**（曾导致 `webview.vue` 损坏）
- `rawdict_utf16_65105_freq.txt` 是 UTF-16，编译期由 `iconv` 转 UTF-8 嵌入 `rawdict_data.hpp`

### 10.11 imageViewer 菜单

菜单为**全屏覆盖式 scroller 弹窗**（`menu-overlay`），不要改回固定面板（会划不动）。图片用 `perl MIME::Base64` 编码为 data URI；双层 scroller 实现图片缩放后的双向滚动。

---

## 11. 文件索引

### 11.1 顶层文档

- [README.md](file:///workspace/README.md) — 面向用户的使用与构建说明
- [PROJECT_GUIDE.md](file:///workspace/PROJECT_GUIDE.md) — 10 分钟上手开发指南
- [LICENSE](file:///workspace/LICENSE) — GPL-3.0
- [pnpm-workspace.yaml](file:///workspace/pnpm-workspace.yaml) — pnpm 工作区（仅 `ui`）

### 11.2 UI 前端

- 入口：[app.js](file:///workspace/ui/src/app.js)、[app.json](file:///workspace/ui/src/app.json)、[base-page.js](file:///workspace/ui/src/base-page.js)
- 页面（已注册 20 个）：见 [4.2](#42-页面清单pages)
- 组件：[Loading](file:///workspace/ui/src/components/Loading.ts)、[ToastMessage](file:///workspace/ui/src/components/ToastMessage.ts)、[webview.vue](file:///workspace/ui/src/components/webview.vue)
- 编辑器内核：[cursor.ts](file:///workspace/ui/src/editor/cursor.ts)、[selection.ts](file:///workspace/ui/src/editor/selection.ts)、[textBuffer.ts](file:///workspace/ui/src/editor/textBuffer.ts)、[history.ts](file:///workspace/ui/src/editor/history.ts)、[editor.ts](file:///workspace/ui/src/editor/editor.ts)
- 工具：[softKeyboardUtils.ts](file:///workspace/ui/src/utils/softKeyboardUtils.ts)、[database.ts](file:///workspace/ui/src/utils/database.ts)、[charUtils.ts](file:///workspace/ui/src/utils/charUtils.ts)、[icons.ts](file:///workspace/ui/src/utils/icons.ts)、[timeUtils.ts](file:///workspace/ui/src/utils/timeUtils.ts)
- 类型：[falcon.d.ts](file:///workspace/ui/src/@types/falcon.d.ts)、[langningchen.d.ts](file:///workspace/ui/src/@types/langningchen.d.ts)、[langningchen.ts](file:///workspace/ui/src/@types/langningchen.ts)
- 配置：[package.json](file:///workspace/ui/package.json)、[tsconfig.json](file:///workspace/ui/tsconfig.json)

### 11.3 JSAPI 原生

- 入口：[JSAPI.cpp](file:///workspace/jsapi/src/JSAPI.cpp)、[CMakeLists.txt](file:///workspace/jsapi/CMakeLists.txt)
- AI：[AI.hpp](file:///workspace/jsapi/src/AI/AI.hpp)、[JSAI.hpp](file:///workspace/jsapi/src/AI/JSAI.hpp)、[ConversationManager.hpp](file:///workspace/jsapi/src/AI/ConversationManager.hpp)、[ConversationNode.hpp](file:///workspace/jsapi/src/AI/ConversationNode.hpp)、[ConversationInfo.hpp](file:///workspace/jsapi/src/AI/ConversationInfo.hpp)、[SettingsResponse.hpp](file:///workspace/jsapi/src/AI/SettingsResponse.hpp)、[AICallback.hpp](file:///workspace/jsapi/src/AI/AICallback.hpp)
- Database：[Database.hpp](file:///workspace/jsapi/src/Database/Database.hpp)、[Table.hpp](file:///workspace/jsapi/src/Database/Table.hpp)、[Select.hpp](file:///workspace/jsapi/src/Database/Select.hpp)、[Insert.hpp](file:///workspace/jsapi/src/Database/Insert.hpp)、[Update.hpp](file:///workspace/jsapi/src/Database/Update.hpp)、[Delete.hpp](file:///workspace/jsapi/src/Database/Delete.hpp)、[Size.hpp](file:///workspace/jsapi/src/Database/Size.hpp)、[Includes.hpp](file:///workspace/jsapi/src/Database/Includes.hpp)
- Exceptions：[Exception.hpp](file:///workspace/jsapi/src/Exceptions/Exception.hpp)、[AssertFailed.hpp](file:///workspace/jsapi/src/Exceptions/AssertFailed.hpp)、[DatabaseError.hpp](file:///workspace/jsapi/src/Exceptions/DatabaseError.hpp)、[NetworkError.hpp](file:///workspace/jsapi/src/Exceptions/NetworkError.hpp)、[CurlError.hpp](file:///workspace/jsapi/src/Exceptions/CurlError.hpp)
- IME：[IME.hpp](file:///workspace/jsapi/src/IME/IME.hpp)、[JSIME.hpp](file:///workspace/jsapi/src/IME/JSIME.hpp)
- Penshell：[Penshell.hpp](file:///workspace/jsapi/src/Penshell/Penshell.hpp)、[JSPenshell.hpp](file:///workspace/jsapi/src/Penshell/JSPenshell.hpp)
- ScanInput：[ScanInput.hpp](file:///workspace/jsapi/src/ScanInput/ScanInput.hpp)、[ScanInputCallback.hpp](file:///workspace/jsapi/src/ScanInput/ScanInputCallback.hpp)、[JSScanInput.hpp](file:///workspace/jsapi/src/ScanInput/JSScanInput.hpp)
- Shell：[Shell.hpp](file:///workspace/jsapi/src/Shell/Shell.hpp)、[JSShell.hpp](file:///workspace/jsapi/src/Shell/JSShell.hpp)
- Update：[JSUpdate.hpp](file:///workspace/jsapi/src/Update/JSUpdate.hpp)
- 公共：[Fetch.hpp](file:///workspace/jsapi/src/Fetch.hpp)、[strUtils.hpp](file:///workspace/jsapi/src/strUtils.hpp)

### 11.4 SDK 与工具

- SDK 顶层头：[JQuickContext.h](file:///workspace/jsapi/iot-miniapp-sdk/include/JQuickContext.h)、[JQuickEnv.h](file:///workspace/jsapi/iot-miniapp-sdk/include/JQuickEnv.h)、[jquick_config.h](file:///workspace/jsapi/iot-miniapp-sdk/include/jquick_config.h)
- 模块加载：[JSCModuleExtension.h](file:///workspace/jsapi/iot-miniapp-sdk/include/jsmodules/JSCModuleExtension.h)、[JSModuleExtension.h](file:///workspace/jsapi/iot-miniapp-sdk/include/jsmodules/JSModuleExtension.h)
- 构建工具：[build.sh](file:///workspace/tools/build.sh)、[getVersionInfo.sh](file:///workspace/tools/getVersionInfo.sh)、[install.bat](file:///workspace/tools/install.bat)、[build_for_a6p.yml](file:///workspace/.github/workflows/build_for_a6p.yml)

### 11.5 参考子项目

- [webview-for-miniapp-main/README.md](file:///workspace/webview-for-miniapp-main/README.md)、[package.json](file:///workspace/webview-for-miniapp-main/package.json)、[src/components/webview.vue](file:///workspace/webview-for-miniapp-main/src/components/webview.vue)

### 11.6 开发文档（`开发文档/`）

- [VUE_XM_STYLE_GUIDE.md](file:///workspace/开发文档/VUE_XM_STYLE_GUIDE.md) — Vue 样式规范
- [XM_MINIAPP_SOURCE_DOC.md](file:///workspace/开发文档/XM_MINIAPP_SOURCE_DOC.md) — 喜马拉雅 miniapp 源码级接口文档（参考）
- [XM_UI_DESIGN_SPEC.md](file:///workspace/开发文档/XM_UI_DESIGN_SPEC.md) — UI 设计规范
- [XM_UI_STYLE_AND_VISIBLE_DETAILS.md](file:///workspace/开发文档/XM_UI_STYLE_AND_VISIBLE_DETAILS.md) — UI 样式与可见细节
- [MUSIC_PLAYER_INVOCATION_GUIDE.md](file:///workspace/开发文档/MUSIC_PLAYER_INVOCATION_GUIDE.md) — 音乐播放器调用指南
- [astrbot.md](file:///workspace/开发文档/astrbot.md) — AstrBot 相关说明

---

**文档维护**：每次重大架构变更后更新本文档。版本号与代码版本同步（当前 1.2.21）。
