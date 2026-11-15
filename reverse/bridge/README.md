# `libjsapi_bridge.so`（bridge 模块）逆向结论

> 目标文件：`/tmp/msdk/libs/libjsapi_bridge.so`（ELF32 ARM, EABI5, hard-float, 未 strip，含 `.symtab`；`.debug_*` 只有 libgcc 的 21KB，主代码无 `-g`）
> 对照文件：`/tmp/pstore/libs/libjsapi_bridge.so`（597KB，已 strip，**旧版本，无 `playAudio*`/`setUseCanvasPlayer`/canvas 相关方法**，不要混用）
> 反汇编基线：`.text` @ `0x177038`，`.rodata` @ `0x528b70`，GOT @ `0x5a8000`

---

## 0. 五个问题速答

### ① JS 里怎么拿到对象？对象还是类？

```js
const { Video, Audio } = require('bridge')   // ESM 下：import { Video, Audio } from 'bridge'
```

- `require('bridge')` 返回的是**模块命名空间对象**（named exports，不是 `default`）。
- 导出名共 9 个，全部来自 `module_init` @ `0x20f3b8`（字符串逐条确认）：

  | 导出名 | 说明 |
  |---|---|
  | `Shell` | 进程/文件/系统能力（本工程已在用等价实现 `libjsapi_langningchen.so`） |
  | `Video` | **VideoBridge 的单例对象**（本文重点） |
  | `Audio` | **AudioBridge 的单例对象**（老接口，播放器另起一套进程模型） |
  | `Files` / `Fetch` | 文件 / HTTP |
  | `RimeIme` | 输入法 |
  | `Spell` / `Dbase` / `Chaty` | 词典 / 数据库 / 会话 |

- **`Video` / `Audio` 不是类，是已经 `new` 好的单例实例**。证据（`VideoBridge::CreateClass` @ `0x1f9344` 尾部）：

```
bl  JQFunctionTemplate::CallConstructor     ; -> 内部 GetFunction() + JS_CallConstructor(ctx, fn, 0, nullptr)
strd r0, r1, [sp, #...]                     ; 返回值直接交给 setModuleExport("Video", value, true)
```

  `JQFunctionTemplate::CallConstructor` @ `0x21ad18` 的反汇编就是 `GetFunction()` → `JS_CallConstructor()` → 返回**实例**。

  因此正确写法是 `Video.play(...)`；**`new Video()` 是错的**（`Video` 本身已是 object，`typeof Video === 'object'`）。
  方法都挂在 `InstanceTemplate()` 的 prototype 上（`SetProtoMethod<VideoBridge>`），调用时 JQ 会用内部的实例作为 `thisObj`；**不要解构**（`const { play } = Video; play()` 会丢失实例，行为未定义）。

### ② 方法签名

见 [`api.md`](./api.md)，含 46 个 `Video` 方法、13 个 `Audio` 方法，逐条标注参数、返回值与置信度。核心结论：

- **`Video.play` 没有「选项对象」**。它是位置参数：`play(path, x?, y?, w?, h?, landscape?)`，第二个参数起是**渲染矩形 4 个整数**，第 6 个是横屏 bool。传入对象会被 `JS_ToInt32` 转成 `NaN→0`，等于不生效。
- 视频 `pause/resume/stop/seek` 全部返回 **undefined**（不是 Promise，也不是 bool）；只有 `play/playAudio/setPlaybackRate/setAudioOutput/setLogLevel/startRecord` 等返回 bool。
- 音频（`playAudio` 系列）与视频是**两条独立管线**：音频走 `ffmpeg → aplay/bluealsa-aplay`，视频走 `ffmpeg → /dev/fb0` 或 canvas 缓冲。

### ③ `setUseCanvasPlayer` 是什么

`setUseCanvasPlayer(true)` 只做一件事：把 `VideoBridge+0x261` 置 1（另有日志 `[Video] setUseCanvasPlayer: on/off`）。它把**渲染目标**从 `/dev/fb0` 改成「JS 传来的 ArrayBuffer」：

```
canvasModeActive() @0x1f70d4:
  return this->useCanvasPlayer(+0x261)
      && this->canvasBuf(+0x1c8) != nullptr
      && this->canvasW(+0x1d0) > 0
      && this->canvasH(+0x1d4) > 0;
```

开关本身**不启动/不依赖 canvasdecoder**。`canvasdecoder` 是另一个独立 native 模块（`libjsapi_canvasdecoder.so`，本仓库 `reverse/bili-1.1.4` 里已逆向过），bridge 的 canvas 模式只要求：

1. `setRenderBuffer(arrayBuffer, w, h)`：`w*h*4` 字节的 RGBA/RGBX 缓冲，且**必须在 `play()` 之前**设置（播放中注册会抛 TypeError）；
2. `play(path)`：ffmpeg 把帧直接解码进这块内存；
3. JS 定时读 `getFrameCounter()`，计数变化时 `ctx.putImageData(imageData, 0, 0)` 上屏。

也就是说：**bridge + canvas 自己就能完成「软解码到 canvas」**；用 canvasdecoder 是为了 HLS/DASH/自选解码器，两者可组合但不是依赖关系。

### ④ 能否直接丢进 `libs/` 然后 `require('bridge')`？

**注册机制：可以（协议层面）。二进制：只有在目标机与来源机同为 uClibc 时才可以；本工程现有 native 库是 glibc，大概率不匹配——这是唯一硬阻塞。**

- 协议层面：`libs/*.so` 会被打包进 `.amr`，安装时按 `manifest.cert` 逐个校验（`packages/aiot-vue-cli/src/steps/manifest.ts` 自动生成，**不需要手写 manifest**）。运行时按 `libs/libjsapi_*.so` 逐个 `dlopen`（本工程现有 `libjsapi_langningchen.so` 即此机制），再调用其导出符号 `custom_init_jsapis`；该函数（@`0x20f1b0`）执行：
  ```
  registerCModuleLoader("bridge", init)      // r0 = "bridge" @0x531b80, r1 = init @0x20ef90
    └─ JS_NewCModule(ctx, "bridge", module_init@0x20f3b8)
  ```
  之后 `require('bridge')` 即可解析。**不需要在 manifest 里登记 .so 名字**，也不用改证书（构建会重算）。
- 构建层面：需要在 `src/app.json` 的 `options.external` 里加 `"bridge"`，否则 rollup 插件（`packages/aiot-vue-cli/src/rollup-plugins/falcon-module.ts:71-84`）会报 `The following modules are not found: bridge` 并中断构建。
- **二进制层面（关键风险）**：
  | | `libjsapi_bridge.so` | 本工程 `libjsapi_langningchen.so` |
  |---|---|---|
  | NEEDED | `libcurl.so.4`, `libsqlite3.so.0`, **`libc.so.0`**, **`ld-uClibc.so.1`** | `libc.so.6`, `libstdc++.so.6`, `ld-linux-armhf.so.3` |
  | libc | **uClibc**（Buildroot 2018.11） | **glibc**（Buildroot 2020.02, `@GLIBC_2.4` 版本化符号） |

  uClibc 的 `.so` **不能** dlopen 进 glibc 进程：会以 `cannot open shared object file: libc.so.0`（或 `ld-uClibc.so.1`）失败。两者 EABI/浮点一致（ARMv7 + VFPv3-d16 + hard-float），**只有 libc 不兼容**。
  另外它还额外依赖两个宿主导出符号（本工程现有 .so 不依赖，说明宿主版本要足够新）：
  ```
  JQuick::registerAppLifecycle(void (*)(JQuick::LifecycleState, std::string const&))
  RimeImeBridge::ForceReleaseAll()
  ```
  → 即使 libc 对上，宿主缺少这两个符号也会 dlopen 失败（`undefined symbol`）。

  三条可行路线（按推荐度）：
  1. **拿源码用本工程的 Buildroot 2020.02/glibc 工具链重编**（最稳）；
  2. 部署到原本那台 uClibc 词典笔上跑（与原宿主同版本）；
  3. 仅做「同 libc 设备」平移：`libcurl.so.4`、`libsqlite3.so.0` 也必须在目标机 `/usr/lib` 存在。

  上机前 30 秒验证：
  ```sh
  ls -l /lib/libc.so.0 /lib/ld-uClibc.so.1   # 存在 → uClibc 设备，可试
  ls -l /lib/libc.so.6 /lib/ld-linux-armhf.so.3
  ```

### ⑤ TS 示例

见本文第 5 节（可直接抄）。

---

## 1. 分析方法与证据链

| 结论 | 证据 |
|---|---|
| 模块名 `bridge`，注册函数 `custom_init_jsapis` | `custom_init_jsapis` @`0x20f1b0`：`ldr r0,=0x531b80`（`"bridge"`）+ `bl registerCModuleLoader` |
| 导出 9 个名字 | `module_init` @`0x20f3b8` 中 9 次 `setModuleExport(name, value, true)`，名字串 `0x531xxx` |
| 方法名 → 实现 | `VideoBridge::CreateClass` @`0x1f9344` / `AudioBridge::CreateClass` @`0x17df04` 中 `SetProtoMethod` 前一条 `add rX, pc, rY` 得到方法名串，`ldr r3,[r4,r3]` 得到 GOT 槽，再用 `.rel.dyn` 把 GOT 槽还原成 C++ 符号 |
| 参数类型 | 每个方法里 `JQFunctionInfo` 布局：`+0 ctx`、`+4 argc`、`+8 argv`、`+0x38 返回值(JSValue)`；`argc>N` 判断 + `ldrd r2,r3,[argv,#8*N]` + `JS_ToCStringLen2 / JS_ToInt32 / JS_ToInt64 / JS_ToFloat64 / JS_ToBool` |
| 返回值 | 写 `[info+0x38]` 的 tag：`0`=int、`1`=bool、`3`=undefined、`7`=float64；字符串/对象走 `JS_NewStringLen / JS_NewObject / JS_NewArray` |

复现脚本（本次写在 `/tmp`，未入库）：

```sh
nm -C --defined-only /tmp/msdk/libs/libjsapi_bridge.so | grep 'VideoBridge::'
readelf -d  /tmp/msdk/libs/libjsapi_bridge.so     # NEEDED
readelf -A  /tmp/msdk/libs/libjsapi_bridge.so     # Tag_ABI_VFP_args
python3 /tmp/armdis.py 0x20520c 0x780             # Video.play 反汇编（带字符串/GOT 注解）
python3 /tmp/parse_reg.py 0x1f9344 0x1f9ce0       # 方法注册表还原
```

---

## 2. 模块与对象模型（注册链全貌）

```
宿主 dlopen("libjsapi_bridge.so")
└─ dlsym("custom_init_jsapis")()                       @0x20f1b0
   └─ registerCModuleLoader("bridge", init@0x20ef90)
      └─ JS_NewCModule(ctx, "bridge", module_init@0x20f3b8)
         ├─ JQModuleEnv::CreateModule(ctx, env, "bridge")
         ├─ VideoBridge::CreateClass(env)
         │  ├─ JQFunctionTemplate::Create(ctx, "Video")
         │  ├─ InstanceTemplate()->SetProtoMethod("play",  &VideoBridge::play)  × 46
         │  └─ CallConstructor()  → JS_CallConstructor → **实例**
         ├─ AudioBridge::CreateClass(env)  同上（13 个方法）
         ├─ Shell / Files / Fetch / RimeIme / Spell / Dbase / Chaty
         └─ setModuleExport("Video", 实例, true)  … 逐个写进命名空间
```

注意点：

- 类名串是 **`"Video"` / `"Audio"`**（不是 `VideoBridge/AudioBridge`），构造器内部名仅用于调试。
- 没有调用 `setAsyncScheduleMode()`（`JQFunctionTemplate::setAsyncScheduleMode` 存在于库内），因此 **所有 JS 方法都在 JS 线程同步执行**；耗时动作（启动 ffmpeg、probe 时长）由 C++ 自己 fork/起线程，接口本身不返回 Promise。
- `CreateClassLegacy`（`VideoBridge` @`0x1f8824`）没有被 `module_init` 引用（全库无字面量引用），是**死代码**；`playLegacy/seekLegacy/getInfoLegacy/...` 同理，只服务于它。文档只描述生效的新接口。

---

## 3. 运行机制（为什么它需要 ffmpeg / fb0 / alsa）

从字符串与调用点确认（全部在 `.rodata`）：

- 视频：`/usr/bin/ffmpeg` 子进程，`-vf ...` 输出到 **`/dev/fb0`**（fbdev）或 stdout `rawvideo`（canvas 模式）；`setRotate(true)` → `transpose=2`，`setScaleMode` 控制拉伸/保持比例。
- 音频（`Video.playAudio` 这套）：`ffmpeg -f s16le ... | aplay -D <alsa>` 或 `/usr/bin/bluealsa-aplay`；时长用 `ffprobe` 探测（不传 `durationMs` 时）。
- 老 `Audio` 类：同样 fork `ffmpeg`，但自带 `monitorFn/progressReaderFn` 线程 + 事件队列，`poll()` 取事件。
- 代理：`getProxyUrl()` 在本机起 HTTP 代理并返回 `http://127.0.0.1:<port>/__video_proxy__/<HEX(url)>`，用于给 ffmpeg 注入 Referer/UA/Origin（B 站等防盗链）。
- 录音：`startRecord(path, durationMs?)` → ffmpeg 采集；`stopRecord()` 返回最终文件路径字符串。

**因此：设备上没有 `/usr/bin/ffmpeg`、`/dev/fb0` 可写、ALSA 设备可用，这套接口即使加载成功也跑不起来。**

---

## 4. 落地步骤（如果决定使用）

1. 拷贝：`/tmp/msdk/libs/libjsapi_bridge.so` → `/workspace/libs/libjsapi_bridge.so`（保持文件名前缀 `libjsapi_`）。
2. `src/app.json` → `options.external` 追加 `"bridge"`：
   ```json
   "external": ["langningchen", "global", "bridge"]
   ```
3. 构建：`tools/build.sh` → `pnpm exec aiot-cli build`。`packages/aiot-vue-cli/src/steps/build.ts:26` 会 `copyDir('libs')` 把整个 `libs/` 拷进 `.falcon_`，`manifest.ts` 再重算 `cert`，**无需手改 manifest**（注意 `build_native` 只编译 `libjsapi_langningchen.so`，bridge 的 `.so` 预先放进 `libs/` 即可）。
4. 运行验证（最小自检）：
   ```ts
   import * as bridge from 'bridge';
   console.log(Object.keys(bridge));                       // Shell,Video,Audio,Files,Fetch,RimeIme,Spell,Dbase,Chaty
   console.log(typeof bridge.Video, typeof bridge.Video.play);  // object function
   ```
   若 `require('bridge')` 抛 `module not found` → .so 没加载（先查 libc/undefined symbol）；若 `bridge` 有但 `Video` 为 undefined → 宿主 JQuick 版本过旧。

---

## 5. 可直接使用的 TypeScript 代码

### 5.1 类型声明（放在 `src/@types/bridge.d.ts` 或任意全局 d.ts）

```ts
declare module 'bridge' {
  export interface VideoState {
    state: 'none' | 'playing' | 'paused';
    error: string;
    message: string;
  }
  export interface MediaInfo {
    position: number;   // ms
    duration: number;   // ms
  }
  export interface AudioInfo {
    position: number;   // ms
    duration: number;   // ms
    playing: boolean;
    paused: boolean;
  }
  export interface AudioDevice {
    name: string;       // 'hw:0,0' / 'bluealsa' ...
    label: string;
    type: string;       // 'alsa'
    active: boolean;
  }

  export interface VideoBridge {
    // —— 视频 ——
    play(path: string): boolean;
    play(path: string, x: number, y: number, w: number, h: number, landscape?: boolean): boolean;
    pause(): void;
    resume(): void;
    stop(): void;
    seek(ms: number): void;
    getInfo(): MediaInfo;
    getState(): VideoState;
    release(): void;

    // —— 音频（独立管线）——
    playAudio(path: string, durationMs?: number): boolean;
    pauseAudio(): void;
    resumeAudio(): void;
    stopAudio(): void;
    seekAudio(ms: number): void;
    getAudioInfo(): AudioInfo;
    isAudioPlaying(): boolean;
    setAudioVolume(volume: number): void;      // 0..1
    setMuted(muted: boolean): void;
    setAudioTrack(name: string): void;

    // —— 输出设备 ——
    listAudioDevices(): AudioDevice[];
    setAudioOutput(name: string): boolean;     // 'auto'|'default'|'speaker'|'hw:0,0'|...
    getAudioOutput(): string;

    // —— 画面 ——
    setRotate(landscape: boolean): void;
    setScaleMode(stretch: boolean): void;
    setPlaybackRate(rate: number): boolean;    // 0.25..5.0
    setUseCanvasPlayer(on: boolean): void;
    setRenderBuffer(buffer: ArrayBuffer, width: number, height: number): void;
    setRenderRect(x: number, y: number, w: number, h: number): void;
    getFrameCounter(): number;
    setCacheBeforePlay(on: boolean): void;
    setAvSyncDelayMs(ms: number): void;        // 0..2000
    getProxyUrl(url: string, referer?: string, userAgent?: string, origin?: string): string;

    // —— 录制 ——
    startRecord(path: string, durationMs?: number): boolean;
    stopRecord(): string;
    getRecordInfo(): { recording: boolean; elapsedMs: number; error: string; file: string };

    setLogLevel(level: number): boolean;
    getLogLevel(): number;
  }

  export interface AudioBridge {
    play(path: string): { playing: boolean };
    pause(): void;
    resume(): void;
    seek(ms: number): void;
    stop(): void;
    getState(): { playing: boolean; paused: boolean; position: number; duration: number; ended: boolean };
    poll(): Array<{ type: string; [k: string]: unknown }>;
    setVolume(volume: number): void;
    getSystemVolume(): number;
    setSystemVolume(volume: number): void;
    setAudioOutput(name: string): boolean;
    getAudioOutput(): string;
    listAudioDevices(): AudioDevice[];
  }

  export const Video: VideoBridge;
  export const Audio: AudioBridge;
}
```

### 5.2 本地视频 + 音频：播放 / 暂停 / 继续 / 跳转 / 音量

```ts
import { Video } from 'bridge';

const videoPath = '/userdisk/media/demo.mp4';
const audioPath = '/userdisk/media/demo.mp3';

function playLocalVideo(landscape = false) {
  Video.setLogLevel(2);
  Video.setMuted(false);
  Video.setRotate(landscape);
  Video.setScaleMode(false);            // false = 保持比例

  // 全屏（默认分辨率为 fb0 尺寸）
  const ok = Video.play(videoPath);
  // 需要局部窗口时：Video.play(videoPath, 0, 0, 480, 270, landscape)

  if (!ok) {
    const st = Video.getState();        // {state, error, message}
    console.error('play failed:', st.state, st.error, st.message);
    return;
  }
  Video.setPlaybackRate(1.0);           // 0.25 ~ 5.0
}

function bindVideoControls() {
  Video.pause();
  Video.resume();
  Video.seek(30_000);                   // ms；play() 之前/未开画面时是 no-op

  const { position, duration } = Video.getInfo();   // ms
  console.log(`${position}/${duration}`);

  Video.stop();                          // 停止并关闭 fb
  Video.release();                       // 释放全部资源（页面卸载时调用）
}

function playLocalAudio() {
  Video.setAudioVolume(0.8);             // 0..1，立即生效
  Video.setAudioTrack('');               // '' = 用容器默认音轨
  const ok = Video.playAudio(audioPath); // 第二参数=总时长(ms)，省略则 ffprobe 探测
  if (!ok) console.error('audio start failed');

  Video.seekAudio(15_000);               // 跳到 15s（需要正在播）
  Video.pauseAudio();
  Video.resumeAudio();
  const info = Video.getAudioInfo();     // {position,duration,playing,paused}
  const playing = Video.isAudioPlaying();// paused 时为 false
  Video.stopAudio();
}
```

> 视频与音频是**两条独立管线**，可以同时播（视频静音 + `playAudio` 配音），但两者各自维护进度：
> 视频用 `getInfo()`，音频用 `getAudioInfo()`；`setAudioVolume` 只影响 `playAudio` 那条管线，`setMuted` 只影响视频那条。

### 5.3 Canvas 模式（可选，替代 fb0 直出）

```ts
import { Video } from 'bridge';

export function playOnCanvas(canvas: any, path: string, w = 480, h = 270) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(w, h);

  Video.setUseCanvasPlayer(true);
  // 必须在 play 之前注册；w*h*4 字节
  Video.setRenderBuffer(imageData.data.buffer, w, h);
  if (!Video.play(path)) throw new Error('play failed');

  let last = -1;
  const timer = setInterval(() => {
    const n = Video.getFrameCounter();
    if (n !== last) {
      last = n;
      ctx.putImageData(imageData, 0, 0);   // 每帧一次拷贝上屏
    }
    const st = Video.getState();
    if (st.state === 'none') { clearInterval(timer); }   // 播完/停止
  }, 16);

  return () => { clearInterval(timer); Video.stop(); };
}
```

> 参考实现（设备上真实 App 的调用序列，字符串表可还原）：
> `$refs.videoCanvas → createCanvasContext('2d') → getContext('2d') → fillRect → getImageData → .buffer → setRenderBuffer → setAudioTrack → play → setMuted → applyPlaybackRate → setInterval + getState + getInfo + getFrameCounter + putImageData`。

---

## 6. 坑 / 注意事项

1. **`seek` 是 no-op 的条件**：`Video.seek` 入口先读 `+0x22c`（画面已就绪标记），为 0 直接返回；即「必须先 `play` 过并成功开画面」。
2. **`pause/resume/stop/seek` 没有返回值**，不要 `if (Video.pause())`。
3. **`play` 的 4 个矩形参数必须一起给**（`argc>=5` 才解析），只给 2~3 个会被忽略；`x=y=w=h=0` 等价全屏。
4. `play` 的矩形校验：`0 ≤ x,y ≤ 10000`、`1 ≤ w,h ≤ 10000`，非法直接返回 `false`（不抛异常）。
5. 必填参数缺失时行为分两种：`play/playAudio/getProxyUrl/setRenderBuffer/setRenderRect` 等会 `JS_ThrowTypeError`（JS 侧 try/catch 可捕获），其余多为静默 return。
6. `setRenderBuffer` 只在**未播放**时可换；播放中换会抛 TypeError。缓冲被 bridge 直接写入，JS 侧不要持有第二份并假设同步。
7. `setAvSyncDelayMs` 被 clamp 到 `0..2000`；`setPlaybackRate` 被 clamp 到 `0.25..5.0`；`setAudioVolume` 被 clamp 到 `0..1`。
8. `listAudioDevices` 只读 `/proc/asound/pcm`，设备名必须真实存在；`setAudioOutput('auto'|'automatic'|'default'|'speaker')` 会映射到 `hw:0,0` 并持久化到 `/userdata/applog/audio_device.cfg`。
9. 老 `Audio` 类只在你确实需要 `poll()` 事件队列/系统音量（`getSystemVolume/setSystemVolume`）时用；新代码统一用 `Video.playAudio*`。
10. **`/dev/fb0` 只有一个**：视频直出会覆盖整个屏幕，页面隐藏/切页务必 `stop()`，否则会一直画在 fb 上。

---

## 7. 置信度说明

| 结论 | 置信度 |
|---|---|
| 模块名、9 个导出名、单例（非类）、方法名与实现地址一一对应 | **高**（逐指令 + GOT 重定位还原） |
| `play(path,x,y,w,h,landscape)`、`playAudio(path,durationMs)`、各 `To*` 参数类型 | **高**（直接读 `argc` 分支与 `JS_To*` 调用） |
| 返回值类型（bool/undefined/object 字段名） | **高**（读 `[info+0x38]` 的 tag 与 `JS_NewObject`+`SetPropertyStr` 串） |
| 时间单位 ms | **中高**（`durationMs` 字段名 + `playAudio` 参数语义 + `ffprobe` 流程一致，未做真机计时） |
| `seek` 依赖 `+0x22c` 已就绪、canvas 必须 `setRenderBuffer` 先于 `play` | **中高**（指令级确认，未在真机复验） |
| `setRenderViewport/configureDanmakuOverlay/startHoleTouch/pollHoleTouches/pollMediaKeys/renderDanmakuFrame` 的对象字段 | **中**（字段名来自字符串，语义按命名推断） |
| uClibc/glibc 不兼容会直接 dlopen 失败 | **高**（`NEEDED` 与符号版本实证） |

---

## 8. 附：关键地址速查

| 符号 | 地址 |
|---|---|
| `custom_init_jsapis` | `0x20f1b0` |
| `module_init`（lambda，`JSContext*, JSModuleDef*`） | `0x20f3b8` |
| `VideoBridge::CreateClass` | `0x1f9344` |
| `AudioBridge::CreateClass` | `0x17df04` |
| `VideoBridge::play` / `playAudio` / `seekAudio` | `0x20520c` / `0x205ef4` / `0x200fc4` |
| `VideoBridge::getAudioInfo` / `isAudioPlaying` / `setAudioVolume` | `0x1f613c` / `0x1f49dc` / `0x1f7cd0` |
| `VideoBridge::setUseCanvasPlayer` / `setRenderBuffer` | `0x2046cc` / `0x1f4050` |
| 模块名 `"bridge"` 字符串 | `0x531b80` |
