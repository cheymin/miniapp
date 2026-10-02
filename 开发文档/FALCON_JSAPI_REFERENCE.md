# miniapp 开发快速参考（AI/开发者上手用）

> 项目地址：https://github.com/cheymin/miniapp
> 有道词典笔第三方工具箱，Falcon MiniApp + QuickJS + Vue 3 语法子集
> 设备：Rockchip RK3xxx（ARMv7 rev5，uclibc Linux 5.10.160），Falcon 逻辑分辨率 **640×260 横屏**
> 内存：约 50MB 可用 → **图片必须预缩**，大内存对象要清理

---

## 1. 项目结构

```
ui/
├── src/
│   ├── @types/              ← TypeScript 类型声明（falcon.d.ts, langningchen.ts）
│   ├── base-page.js         ← 🔥 所有页面的基类，处理生命周期/事件/定时器自动清理
│   ├── app.json             ← 页面注册表（pages 键值："name": "pages/xxx/xxx.vue"）
│   ├── app.js               ← 应用入口
│   ├── components/          ← 公共组件（ToastMessage, Loading, webview, MarkdownView）
│   ├── utils/               ← 工具函数（软键盘、数据库、时间、文件扫描）
│   ├── pages/               ← 每个页面一个目录，三件套：xxx.vue + xxx.ts + xxx.less
│   │   ├── index/           ← 首页（入口导航）
│   │   ├── gallery/         ← 图库（ffmpeg 预缩缩略图）
│   │   ├── imageViewer/     ← 图片查看器（左 9/10 图区 + 右按钮条）
│   │   ├── fileManager/     ← 文件管理器
│   │   ├── fileEditor/      ← 文本编辑器（自研内核）
│   │   ├── shell/           ← 同步 Shell
│   │   ├── penshell/        ← 交互式终端
│   │   ├── browser/         ← 纯 JS HTML 渲染器
│   │   ├── ai/ aiHistory/ aiNav/ aiSettings/ ← 旧 AI 助手（保留）
│   │   ├── softKeyboard/    ← 🔥 系统软键盘（全局唯一，navTo 后 on('softKeyboard') 拿返回）
│   │   ├── wifiLogin/       ← WiFi Portal 认证
│   │   ├── deviceinfo/ misc/ about/ update/ amrInstall/ desktop/ calculator/ unitConverter/ musicPlayer/
│   └── editor/              ← 文本编辑器内核（cursor, selection, history, textBuffer）
└── package.json
jsapi/                       ← C++ 原生模块（编译为 .so，随 .amr 一起打包）
├── src/
│   ├── JSShell.cpp          ← Shell.exec 起子进程
│   ├── JSPenshell.cpp       ← 交互式 PTY 终端
│   ├── JSAI.cpp / JSChat.cpp / ConversationManager.cpp  ← AI + SQLite 持久化
│   ├── JSIME.cpp            ← 输入法引擎
│   ├── JSScanInput.cpp      ← 扫描输入触发
│   ├── JSDatabase.cpp       ← SQLite 封装
│   ├── Fetch.cpp            ← HTTP/cURL
│   ├── JSUpdate.cpp         ← 系统更新检查
│   └── JSAPI.cpp            ← 桥接入口
├── toolchains/              ← ARMv7 交叉编译工具链
└── CMakeLists.txt
tools/                       ← 构建脚本
.github/workflows/           ← CI（自动构建 .amr）
```

---

## 2. 构建与部署

```bash
# 本机构建（项目里有 prebuilt jsapi .so，不一定需要 C++ 交叉编译）
cd ui
npm install     # 只需要 falcon-ui ^2.0.2 + aiot-vue-cli ^1.0.32
npm run build   # aiot-cli -p
# 产物在 ui/package.amr，push 到设备 /userdisk/Favorite/ 然后 miniapp_cli install

# 真机预览（aiot-cli preview 起 HTTP 服务器，设备浏览器访问）
# 注意：preview 模式下 $falcon.jsapi 和 native 模块不可用！

# CI 构建（最可靠）：push 到 GitHub → Actions 自动构建 3 分钟 → 设备检查更新
git commit -m "vx.y.z: 描述"
git push origin main
```

---

## 3. Vue 3 语法子集（⚠️ 这些不能用）

```
✅ 能用                           ❌ 不能用
─────────────────────────────────────────────────────────────
defineComponent({                <script setup>
data() { return {} }             Composition API（ref/reactive/computed）
methods: { ... }                 v-html, v-model（要用 @click + :value）
@click, @touchstart             $emit（用 $falcon.trigger）
:style="obj" / :class           CSS Grid、flex-wrap: wrap
resize="contain/cover"           position: fixed（Falcon 不支持）
display: flex（仅此一个）        background-color（可以，推荐用）
                                 box-shadow（不支持 rgba 多值）
                                 background（别名，用 background-color）
                                 display: none / inline-flex（只支持 flex）
                                 overflow: scroll（只支持 visible/hidden）
                                 text-align: justify（只支持 left/center/right）
                                 复合选择器 .a.b（Weex 只支持单类名 .a）
                                 border: 1px solid red（用 border-width/border-color/border-style 分开写）
                                 border-top/border-bottom（不支持）
                                 word-break, white-space（不支持）
                                 QuickJS: 不支持 ??=、?.# 私有字段
```

---

## 4. 原生 JSAPI 调用大全（🔥 重点）

### 4.1 Shell（同步起子进程）

```ts
import { Shell } from 'langningchen';

// 第一步：必须先 initialize（原生模块还没 mount）
await Shell.initialize();

// 执行命令，返回 stdout/stderr 拼接
const out = await Shell.exec('ls /userdisk/Pictures/ | head -5');

// 常用命令
await Shell.exec('ffmpeg -y -i src.jpg -vf "scale=240:-1" -q:v 5 thumb.jpg');
await Shell.exec('mkdir -p /tmp/gallery_thumbs');
await Shell.exec('cat /tmp/status.json');
await Shell.exec('test -f /tmp/foo.jpg && echo ok || echo no');
await Shell.exec(`rm -rf /tmp/gallery_thumbs`);
// ⚠️ 不要起太多个子进程（104MB 内存紧张）
// ⚠️ ffmpeg 可用（buildroot 自带），curl 可用，perl 可用，python3 不在，ImageMagick 不在，base64 命令不在
// ⚠️ 不要 fork 后台进程，同步 exec 等它退出
```

### 4.2 Penshell（交互式终端）

```ts
import { Penshell } from 'langningchen';
await Penshell.initialize();
await Penshell.exec('ls -la');        // 执行一条返回输出
Penshell.write('echo hello\n');       // 交互模式写 stdin
Penshell.sendCtrlC();                 // 发 Ctrl-C
const cwd = Penshell.getWorkingDirectory();
Penshell.close();
```

### 4.3 HTTP 请求（$falcon.jsapi.http.request）

```ts
// 优先用 $falcon.jsapi.http（不用起子进程，比 Shell.exec('curl') 快 100ms）
try {
  const resp = await $falcon.jsapi.http.request({
    url: 'http://example.com/api/data',   // ⚠️ 必须 HTTP，HTTPS 大概率 TLS 不支持
    method: 'GET',
    headers: { 'User-Agent': 'miniapp/1.0' },
    data: null,
    timeout: 8,
  });
  console.log(resp.statusCode);   // 200
  console.log(resp.headers);      // { 'Content-Type': 'application/json', ... }
  console.log(resp.data);         // 自动 JSON.parse 过的 body
} catch (e) {
  // 失败降级 Shell.exec('curl ...')
}
```

### 4.4 存储（$falcon.storage）

```ts
// 两个 API 都能用，异步 Promise
const data = await $falcon.storage.get('gallery_thumbs');
await $falcon.storage.set('last_visit', String(Date.now()));

// 或者 jsapi.storage（带 getStorageInfo）
await $falcon.jsapi.storage.setStorage({ key: 'k', data: 'v' });
const { data } = await $falcon.jsapi.storage.getStorage({ key: 'k' });
const info = await $falcon.jsapi.storage.getStorageInfo({});
// info.keys, info.currentSize, info.limitSize
```

### 4.5 软键盘（全局唯一页面）

```ts
// 方式 1：打开软键盘，拿返回值
import { openSoftKeyboard } from '../utils/softKeyboardUtils';

openSoftKeyboard(
  () => this.currentDirectory,                      // get：返回当前值
  async (val) => {                                   // set：用户确认后
    this.currentDirectory = val;
    await this.scanImages();
  },
  (val) => val.length === 0 ? '目录不能为空' : undefined  // validate：可选
);

// 方式 2：手动 navTo + on
$falcon.navTo('softKeyboard', { data: '初始值' });
const handler = (e) => {
  const val = e.data?.value ?? e.data?.text ?? e.data;
  $falcon.off('softKeyboard', handler);
  this.doSomething(val);
};
$falcon.on('softKeyboard', handler);
// ⚠️ 必须及时 off，否则重复触发
```

### 4.6 AI 助手

```ts
import { AI } from 'langningchen';

// 初始化（先加载 SQLite 数据库）
AI.initialize();

// 流式对话
AI.on('ai_stream', (chunk) => {
  this.streamText += chunk;
});
await AI.addUserMessage('帮我写一首关于春天的诗');
const full = await AI.generateResponse();

// 设置
AI.setSettings(apiKey, baseUrl, modelName, maxTokens, temperature, topP, systemPrompt, accessToken, userId);

// 图像生成（如果后端支持）
const imgPath = await AI.generateImage('一只在森林里的小狐狸');
```

### 4.7 SQLite 数据库

```ts
import { Database } from 'langningchen';
Database.initialize('/userdisk/miniapp/data.db');
const rows = Database.query('SELECT * FROM history WHERE id = ?', [id]);
Database.exec('INSERT INTO history (title) VALUES (?)', ['test']);
```

### 4.8 输入法引擎（IME）

```ts
import { IME } from 'langningchen';
await IME.initialize();
const candidates = IME.getCandidates('nihao');  // [{pinyin, hanZi, freq}, ...]
```

### 4.9 扫描输入触发

```ts
import { ScanInput } from 'langningchen';
await ScanInput.initialize();
ScanInput.on('scan_input', (text) => {
  // 词典笔扫到的文本
});
ScanInput.deinitialize();
```

### 4.10 新架构的 panet 原生模块（可选引入）

```ts
// super-mario / wifi-login 的方式——更高效
import { Panet } from 'panet';

// 网络
const { statusCode, headerLines, body, text } = await Panet.request(
  url, method, timeoutSec
);
// body 是 Uint8Array，text 是 Latin-1 字符串

// 文件（不用 Shell.exec('cat') 了！）
await Panet.mkdirs('/userdisk/foo');
const raw = await Panet.readFile('/userdisk/foo/data.json');
await Panet.writeFile(path, jsonString);

// WiFi
const ssid = await Panet.wifiSsid();
```

---

## 5. Falcon 框架 API（全局 $falcon）

### 5.1 页面导航

```ts
// 跳转到命名页面（app.json 里注册过的）
$falcon.navTo('gallery', { directory: '/userdisk/Pictures' });
$falcon.navBack();                         // 返回到上一页
$page.finish();                            // 关闭当前页
$page.loadOptions                          // navTo 时传入的参数（对象）
$page.$pageName                            // 当前页注册名
$page.$pageId                              // 运行时唯一 ID
```

### 5.2 事件总线

```ts
$falcon.on('some-event', (e) => {
  console.log(e.data);    // { type, timestamp, data }
});
$falcon.off('some-event', handler);     // 清理
$falcon.trigger('some-event', payload); // 触发
// ⚠️ 事件名全局唯一，加前缀区分，如 'softKeyboard', 'navRefresh'
```

### 5.3 页面返回键处理

```ts
// 在 mounted() 里
this.$page.$npage.setSupportBack(true);        // 开启物理返回键
this.$page.$npage.on('backpressed', () => {
  if (this.showSettings) {
    this.showSettings = false;
  } else {
    $falcon.navBack();
  }
});
// beforeDestroy() 里 off，否则内存泄漏
this.$page.$npage.off('backpressed', handler);
```

### 5.4 应用退出

```ts
$falcon.closeApp();
$page.$app.finish();
```

---

## 6. 页面开发模板（TypeScript）

```vue
<template>
    <div class="container">
        <text @click="doThing">点我</text>
    </div>
</template>

<style lang="less" scoped>
@import url('mypage.less');
</style>

<script>
import mypage from './mypage';
import Loading from '../../components/Loading.vue';
import ToastMessage from '../../components/ToastMessage.vue';
export default {
    ...mypage,
    components: { Loading, ToastMessage }
};
</script>
```

```ts
// mypage.ts
import { defineComponent } from 'vue';
import { Shell } from 'langningchen';
import { showError, showSuccess } from '../../components/ToastMessage';
import { hideLoading, showLoading } from '../../components/Loading';

export type MyPageOptions = {
    directory?: string;
};

const mypage = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<MyPageOptions>,
            shellInitialized: false,
            items: [] as string[],
        };
    },

    async mounted() {
        // 1. 原生模块 initialize
        try {
            await Shell.initialize();
            this.shellInitialized = true;
        } catch (e) {
            showError('Shell 初始化失败');
            return;
        }

        // 2. 物理返回键
        this.$page.$npage.setSupportBack(true);
        const backFn = () => $falcon.navBack();
        this.$page.$npage.on('backpressed', backFn);

        // 3. 页面关闭时清理
        this.$page.$npage.off('backpressed', backFn);

        // 4. 业务逻辑
        const opts = this.$page.loadOptions;
        await this.loadData(opts?.directory || '/userdisk');
    },

    methods: {
        async loadData(dir: string) {
            showLoading('加载中...');
            try {
                const out = await Shell.exec(`find "${dir}" -maxdepth 1 -type f | head -20`);
                this.items = out.trim().split('\n');
                showSuccess('完成');
            } catch (e: any) {
                showError('失败: ' + (e.message || e));
            } finally {
                hideLoading();
            }
        },

        doThing() {
            $falcon.navTo('gallery', { directory: '/userdisk/Pictures' });
        },
    },
});

export default mypage;
```

```less
// mypage.less — ⚠️ 严格遵循 Weex/Falcon 限制
@bg: #0d1117;     // 变量 @ 开头！不是 . ！
@text: #e6edf3;
@accent: #2f81f7;

.container {
    flex: 1;
    background-color: @bg;    // ✅ 用变量
    display: flex;
    flex-direction: column;   // ✅ 只支持 flex
}

.title {
    font-size: 14px;
    color: @text;
    padding: 8px 12px;
}

// ❌ 这些会报错：
// .a.b { }          — 复合选择器
// display: none     — 只支持 flex
// position: fixed   — 不支持
// border: 1px solid — 用 border-width/border-color/border-style 分开
// box-shadow: 0 2px 8px rgba(...) — 不支持多值
```

---

## 7. 图片加载三件套（避免 OOM）

```ts
// ⚠️ Falcon 直接 load 大图会爆 50MB 内存！必须预处理
// 核心：ffmpeg 先缩 → Falcon <image src="文件路径" /> 直接引用（不走 base64）

async function generateThumb(src: string, dst: string, w = 240) {
    await Shell.exec(`ffmpeg -y -i "${src}" -vf "scale=${w}:-1" -q:v 5 "${dst}" 2>/dev/null`);
}

// 用的地方
<image :src="thumbPath" resize="cover" class="thumb" />

// 查看大图：先缩到 ≤1280 宽（2× 横屏精度，清晰度够且不爆内存）
const hash = simpleHash(src);
const viewPath = `/tmp/viewer_imgs/v_${hash}.jpg`;
await Shell.exec(`ffmpeg -y -i "${src}" -vf "scale=1280:-2:force_original_aspect_ratio=decrease" -q:v 6 "${viewPath}" 2>/dev/null`);
// 然后 <image src="{{viewPath}}" resize="contain" /> 在 576×260 容器里
```

---

## 8. Falcon <image> 组件

```vue
<!-- resize 模式：cover 填满裁剪 | contain 完整显示留白 | stretch 拉伸变形 -->
<image src="/tmp/thumb_xxx.jpg" resize="cover" class="thumb" />

<!-- ⚠️ 限制：
   - 支持 jpg/png/gif/bmp，不支持 webp（Falcon 内部没有 webp decoder）
   - src 可以是本地文件路径，不一定要 base64 或 data URI
   - 网络图片要 HTTPS → 先下载到本地，或 HTTP 降级
   - scale 属性只有 resize="contain" 时才有意义
-->
```

---

## 9. Touch 手势

```vue
<image @touchstart="onStart" @touchmove="onMove" @touchend="onEnd" />
```

```ts
onStart(e) {
    const touches = e.touches;
    if (touches.length >= 2) {
        this.startDist = getDist(touches[0], touches[1]);
        this.startScale = this.scale;
    } else if (touches.length === 1) {
        this.touchStartX = touches[0].clientX;
        this.panStartX = this.panX;
    }
},
onMove(e) {
    // 双指缩放
    if (e.touches.length >= 2 && this.startDist) {
        const ratio = getDist(e.touches[0], e.touches[1]) / this.startDist;
        this.scale = clamp(this.startScale * ratio, 0.5, 6.0);
        this.$forceUpdate();
    }
    // 单指平移
    if (e.touches.length === 1 && this.scale > 1.05) {
        this.panX = this.panStartX + (e.touches[0].clientX - this.touchStartX);
        this.$forceUpdate();
    }
},
// ⚠️ Falcon <scroller> 会拦截 touchmove，所以图片区不能包在 scroller 里
//    需要手动处理 transform: translate()
```

---

## 10. 版本号三处同步

**每次发版必须同时改这三个地方**：

| 文件 | 字段 |
|---|---|
| `ui/package.json` | `"version": "x.y.z"` |
| `ui/src/pages/update/update.ts` | `const CURRENT_VERSION = 'x.y.z';` |
| `README.md` | `**Version: x.y.z**` |

---

## 11. 设备探测/诊断命令

```bash
# 屏幕分辨率（Falcon 逻辑分辨率）
cat /sys/class/graphics/fb0/virtual_size      # 172 560（旧竖屏）
# Falcon 实际运行时用的是 $falcon.env.width × $falcon.env.height

# CPU / 内存
cat /proc/cpuinfo
cat /proc/meminfo | head -3                   # MemTotal ~104MB

# 摄像头（SC2356 x2）
ls /dev/video*                                # video0 ~ video20
ffmpeg -f video4linux2 -i /dev/video0 -frames:v 1 /tmp/cap.jpg 2>/dev/null

# Shell 可用命令
which ffmpeg curl perl python3 convert base64 fswebcam v4l2-ctl

# 原生 JSAPI 模块列表
ls /userdisk/Favorite/*.amr && strings *.amr | grep -i 'jsapi\|native'

# Falcon 版本
miniapp_cli --help
miniapp_cli trimImageCache                    # 清理图片缓存（内存紧张时有用）
miniapp_cli memoryUsage                       # 看当前内存占用
```

---

## 12. 常见坑总结

| 坑 | 症状 | 解法 |
|---|---|---|
| **LESS 变量用 `.` 不用 `@`** | `Parse Error: Unrecognised input` line 2 col 3 | LESS 变量是 `@bg: #000;`，不是 `.bg: #000;`。后者被 style2json 当作 class selector，后面没 `{}` 就炸 |
| **复合 CSS 选择器** | `ERROR: Selector .a.b is not supported` | Falcon/Weex 只支持单类名 `.a`，不支持 `.a.b`、`.a .b` |
| **display: none** | `ERROR: value none not supported` | 只支持 `flex`，条件显示用 `v-if` 或动态 height: 0 |
| **HTTPS 请求** | curl/tls 失败，$falcon.jsapi.http 也挂 | 固件 cURL 不支持现代 TLS，全部降级 HTTP |
| **图片 OOM** | 大页面直接白屏或杀进程 | ffmpeg 先缩，或 Falcon `trimImageCache` 定时清 |
| **Shell 不 initialize** | `Shell.exec is not a function` | 先 `await Shell.initialize()`（但可能还没 mount 就调） |
| **软键盘 event 不 off** | 第二次打开页面回调触发多次 | `$falcon.on('softKeyboard', handler)` 后必须 `$falcon.off` 清理 |
| **backpressed 不 off** | 页面切回来物理键响应旧页逻辑 | `beforeDestroy` 里 `this.$page.$npage.off('backpressed', handler)` |
| **scroller 拦 touch** | 图片拖动不响应 | `<image>` 区不能包在 `<scroller>` 里，手动处理 transform |
| **preview 模式无 native** | `Shell.initialize` 抛错 | aiot-cli preview 是浏览器预览，$falcon.jsapi 和 native 模块都不可用 |

---

## 13. 同类项目参考

| 项目 | 作者 | 亮点 |
|---|---|---|
| [wifi-login](https://github.com/soarnext/wifi-login) | soarnext | 🔥 新架构标杆：services 层 + panet 原生模块 + mock-panet 浏览器预览 |
| [super-mario](https://github.com/wanfeng74/super-mario) | wanfeng74 | 🔥 rk/cvi 双平台适配 + 完整 services 层 + 存档 |
| [PenBili](https://github.com/56dz/PenBili) | 56dz | falcon-ui 1.0.3，B站客户端，多 native 模块 |
| [doge-reader](https://github.com/adogecheems/doge-reader) | adogecheems | 纯前端无 native，阅读 + 漫画 |
| [Periodic-Table-of-Elements](https://github.com/yuzechen45/Periodic-Table-of-Elements-a-PenOS-miniapp) | yuzechen45 | 类我们的完整 C++ 架构 |
| [weatheronyddictpen](https://github.com/xiao-k233/weatheronyddictpen) | xiao-k233 | 纯 JS fetch，天气 |

### 新架构推荐路径（后续重构）

```
第一步（现在）：
  ui/src/services/    ← 新建 services 层
    net.js            ← 统一 HTTP 接口
    store.js          ← 统一存储
    logger.js         ← 统一日志
    mock-panet.js     ← 浏览器预览 mock

第二步（编译）：
  native/panet/       ← 从 wifi-login 抄
    panet.cpp + CMakeLists.txt
  ui/libs/libjsapi_panet.so ← 预编译后放这里

第三步（接入）：
  services/net.js 优先 import { Panet } from 'panet'
  失败降级 $falcon.jsapi.http
  再失败降级 Shell.exec('curl')
```
