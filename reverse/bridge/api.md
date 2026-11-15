# `bridge` 模块 JS API 逐方法表

> 模块名：`bridge`　｜　natives：`libjsapi_bridge.so`（ARM32/uClibc）
> 导出对象：`Video`（VideoBridge 单例）、`Audio`（AudioBridge 单例）、`Shell`、`Files`、`Fetch`、`RimeIme`、`Spell`、`Dbase`、`Chaty`
> 置信度：**●** 逐指令确认（参数个数/类型/返回值 tag）｜**◐** 指令+字符串可确认，语义为推断｜**○** 仅凭字符串/结构推断

---

## 0. 通用约定

### 0.1 参数读取方式

所有方法都是 `void (T::*)(jqutil_dist::JQFunctionInfo&)`，`JQFunctionInfo` 内存布局（由反汇编确认）：

| 偏移 | 类型 | 含义 |
|---|---|---|
| `+0x00` | `JSContext*` | ctx |
| `+0x04` | `int` | **argc** |
| `+0x08` | `JSValue*` | **argv**（每项 8 字节） |
| `+0x30` | `JSContext*` | 返回值所属 ctx |
| `+0x38` | `JSValue` | 返回值（低 4 字节 value，高 4 字节 tag） |

因此：**全部是位置参数**；`argc` 不足时要么 `JS_ThrowTypeError`，要么按 0/undefined 处理（逐方法见下）。
`JSValue` tag：`0`=int32、`1`=bool、`3`=undefined、`7`=float64。

### 0.2 类型/单位约定

| 概念 | 约定 |
|---|---|
| 路径 | 本机绝对路径（`/userdisk/...`），或 `http(s)://`（ffmpeg 可直接拉） |
| 时间 | **毫秒（ms）**，整数；`position/duration` 也是 ms |
| 音量 | `0.0 ~ 1.0`（浮点，越界被 clamp） |
| 倍速 | `0.25 ~ 5.0`（clamp） |
| 矩形 | 逻辑像素 `{x, y, w, h}`，`0 ≤ x,y ≤ 10000`，`1 ≤ w,h ≤ 10000` |
| 布尔 | 既接受 `true/false`，也接受 `0/1`（编译器同时生成 `JS_ToBool` 与 `JS_ToInt32` 两条路径） |
| Promise | **本模块没有任何异步接口**，全部同步返回 |

### 0.3 异常 vs 返回 false

- **抛 TypeError**（JS 可 try/catch）：`play`、`playAudio`、`startRecord`、`getProxyUrl`、`setRenderBuffer` 等必填参数缺失/类型错误时。
- **返回 `false`**：参数合法但运行失败（如矩形越界、ffmpeg 起不来、pid<=0）。
- **返回 `undefined`**：方法本身不设返回值（`pause/resume/stop/seek/...`）。

---

## 1. `Video`（类名 `"Video"`，VideoBridge）——46 个方法

注册顺序与实现地址（`SetProtoMethod` 顺序，便于对版本）：

| # | JS 方法 | 实现地址 | 签名 | 返回 | 置信度 |
|---|---|---|---|---|---|
| 1 | `play` | `0x20520c` | `play(path: string, x?: number, y?: number, w?: number, h?: number, landscape?: boolean)` | `boolean` | ● |
| 2 | `pause` | `0x1f60c4` | `pause()` | `void` | ● |
| 3 | `resume` | `0x203c1c` | `resume()` | `void` | ● |
| 4 | `stop` | `0x1f8004` | `stop()` | `void` | ● |
| 5 | `seek` | `0x20579c` | `seek(positionMs: number)` | `void` | ● |
| 6 | `getInfo` | `0x1f6420` | `getInfo()` | `{ position: number; duration: number }`（ms） | ● |
| 7 | `getState` | `0x1f4ec4` | `getState()` | `{ state: 'none'\|'playing'\|'paused'; error: string; message: string }` | ● |
| 8 | `setPlaybackRate` | `0x2047a4` | `setPlaybackRate(rate: number)` | `boolean`（0.25~5.0） | ● |
| 9 | `startRecord` | `0x206250` | `startRecord(path: string, durationMs?: number)` | `boolean` | ◐ |
| 10 | `stopRecord` | `0x1fd980` | `stopRecord()` | `string`（最终文件路径，失败 `''`） | ● |
| 11 | `getRecordInfo` | `0x1f6684` | `getRecordInfo()` | `{ recording: boolean; elapsedMs: number; error: string; file: string }` | ◐ |
| 12 | `playAudio` | `0x205ef4` | `playAudio(path: string, durationMs?: number)` | `boolean` | ● |
| 13 | `pauseAudio` | `0x1f5ebc` | `pauseAudio()` | `void` | ● |
| 14 | `resumeAudio` | `0x1ff208` | `resumeAudio()` | `void` | ● |
| 15 | `stopAudio` | `0x1f8168` | `stopAudio()` | `void` | ● |
| 16 | `seekAudio` | `0x200fc4` | `seekAudio(positionMs: number)` | `void` | ● |
| 17 | `getAudioInfo` | `0x1f613c` | `getAudioInfo()` | `{ position: number; duration: number; playing: boolean; paused: boolean }` | ● |
| 18 | `isAudioPlaying` | `0x1f49dc` | `isAudioPlaying()` | `boolean` | ● |
| 19 | `setAudioVolume` | `0x1f7cd0` | `setAudioVolume(volume: number)` | `void`（0~1 clamp） | ● |
| 20 | `setMuted` | `0x1f7be0` | `setMuted(muted: boolean)` | `void` | ● |
| 21 | `setRotate` | `0x20451c` | `setRotate(landscape: boolean)` | `void` | ● |
| 22 | `setScaleMode` | `0x2045f4` | `setScaleMode(stretch: boolean)` | `void` | ◐ |
| 23 | `setAudioTrack` | `0x2021fc` | `setAudioTrack(name: string)` | `void`（`''`=清除，用默认轨） | ◐ |
| 24 | `listAudioDevices` | `0x1f50a0` | `listAudioDevices()` | `AudioDevice[]`（见 1.3） | ● |
| 25 | `setAudioOutput` | `0x20322c` | `setAudioOutput(name: string)` | `boolean` | ● |
| 26 | `getAudioOutput` | `0x1fb2c4` | `getAudioOutput()` | `string`（如 `hw:0,0`） | ● |
| 27 | `setLogLevel` | `0x1f4bc4` | `setLogLevel(level: number)` | `boolean` | ● |
| 28 | `getLogLevel` | `0x1f4a40` | `getLogLevel()` | `number` | ● |
| 29 | `getProxyUrl` | `0x209f80` | `getProxyUrl(url: string, referer?: string, userAgent?: string, origin?: string)` | `string` | ● |
| 30 | `getAudioProxyUrl` | `0x20aa50` | 同 `getProxyUrl`（尾部 `b getProxyUrl` 别名） | `string` | ● |
| 31 | `startHoleTouch` | `0x206cf0` | `startHoleTouch(options)`（见 1.4） | `boolean` | ◐ |
| 32 | `pollHoleTouches` | `0x1f586c` | `pollHoleTouches()` | `TouchEvent[]`（见 1.4） | ◐ |
| 33 | `stopHoleTouch` | `0x1f8718` | `stopHoleTouch()` | `void` | ◐ |
| 34 | `pollMediaKeys` | `0x1f54e4` | `pollMediaKeys()` | `Array<{ action: string }>` | ◐ |
| 35 | `release` | `0x1fc960` | `release()` | `void` | ● |
| 36 | `setUseCanvasPlayer` | `0x2046cc` | `setUseCanvasPlayer(on: boolean)` | `void` | ● |
| 37 | `setCacheBeforePlay` | `0x1f3e7c` | `setCacheBeforePlay(on: boolean)` | `void` | ● |
| 38 | `setAvSyncDelayMs` | `0x1f3f20` | `setAvSyncDelayMs(ms: number)` | `void`（0~2000 clamp） | ● |
| 39 | `setRenderBuffer` | `0x1f4050` | `setRenderBuffer(buffer: ArrayBuffer, width: number, height: number)` | `void` | ● |
| 40 | `getFrameCounter` | `0x1f4a88` | `getFrameCounter()` | `number`（累计帧号） | ● |
| 41 | `setRenderRect` | `0x203dc0` | `setRenderRect(x: number, y: number, w: number, h: number)` | `void` | ● |
| 42 | `getRenderGeometry` | `0x1f7114` | `getRenderGeometry()` | 见 1.5 | ◐ |
| 43 | `setRenderViewport` | `0x203fe8` | `setRenderViewport(options)`（见 1.5） | `boolean` | ○ |
| 44 | `configureDanmakuOverlay` | `0x1f4d08` | `configureDanmakuOverlay(options?)` | `{ ok, backend, maxItems }` / `{ ok:false, error }` | ○ |
| 45 | `renderDanmakuFrame` | `0x1f4954` | `renderDanmakuFrame()` | `boolean`（当前实现恒 `false`） | ○ |
| 46 | `clearDanmakuOverlay` | `0x1f4998` | `clearDanmakuOverlay()` | `void` | ○ |

> 注：`module_init` 里实际注册 **46 条**（上表全部）。`CreateClassLegacy`（`0x1f8824`）里的 `playLegacy/seekLegacy/getInfoLegacy/startRecordLegacy/stopRecordLegacy/getAudioInfoLegacy/playAudioLegacy/seekAudioLegacy/setAudioOutputLegacy/listAudioDevicesLegacy/setPlaybackRateLegacy` 为**死代码**，无任何引用，勿用。

---

## 1.1 `play` —— 视频播放（重点）

```
play(path: string, x?: number, y?: number, w?: number, h?: number, landscape?: boolean): boolean
```

反汇编事实（`0x20520c`）：

1. `argc == 0` → `JS_ThrowTypeError("play: 需要路径")`（`0x531634`）。
2. `argv[0]` → `JS_ToCStringLen2`（`0x205278`），失败同样抛错。
3. 先 `stopVideoPipeline(true)`，把旧的 ffmpeg/画面停掉。
4. `argc > 4`（即 **≥5 个参数**）才解析矩形：
   `x=ToInt32(argv[1])`、`y=argv[2]`、`w=argv[3]`、`h=argv[4]`（`0x205444-0x2054c0`）。
5. 校验（失败 `return false`，日志 `play: 渲染区域非法`）：
   `0 ≤ x ≤ 10000`、`0 ≤ y ≤ 10000`、`1 ≤ w ≤ 10000`、`1 ≤ h ≤ 10000`；
   `x==y==w==h==0` → 视为「全屏 / 不设矩形」。
6. `argc > 5`（即 **≥6 个参数**）才解析 `landscape = ToBool(argv[5])`，写 `this+0x259`（与 `setRotate` 同一字段）。
7. 分支：
   - `canvasModeActive()` 为真 → 把帧写进 `setRenderBuffer` 注册的缓冲（日志 `[Video] Canvas模式`）；
   - 否则 `openFb()` 打开 `/dev/fb0`，按矩形/window 尺寸做缩放后直出。
   - 两种分支都会 `fork/exec ffmpeg`。
8. 成功 `return true`（`[info+0x38] = {value:1, tag:1}`），失败 `false`。

**关键**：没有「选项对象」重载；也不接受 `{src, ...}`。要改画面位置请再调 `setRenderRect()`，要横屏用第 6 个参数或 `setRotate()`。

```ts
Video.play('/userdisk/a.mp4');                       // 全屏
Video.play('/userdisk/a.mp4', 0, 0, 480, 270);       // 左上角 480×270（4 个必须一起给）
Video.play('/userdisk/a.mp4', 0, 0, 480, 270, true); // 再指定横屏
```

---

## 1.2 音频（`playAudio` 系列，重点）

### `playAudio(path: string, durationMs?: number): boolean`

- `argc == 0` → `JS_ThrowTypeError("playAudio: 需要路径")`（`0x530de4`）。
- `argv[0]`：音频文件/URL（`ffmpeg` 可识别即可，含 mp3/aac/wav…）。
- `argv[1]`（可选）：`JS_ToInt64` → **总时长提示（ms）**；`< 1` 或省略时，会同步跑 `ffprobe` 探测时长。
  该值只用于进度计算（写入 `this+0x370`），**不是起播偏移**（起播偏移恒传 `0.0` 给 `spawnStandaloneAudioProcess`）。
- 启动独立管线：`ffmpeg -f s16le -ar 48000 -ac 2 - | aplay -D <alsa>`（蓝牙设备走 `bluealsa-aplay`）。
- 返回值：`pid > 0` → `true`，否则 `false`。
- 会先停掉上一条独立音频（单实例）。

### `pauseAudio(): void` / `resumeAudio(): void` / `stopAudio(): void`

- 无参数、无返回值（不读写 `JQFunctionInfo`）；内部对音频子进程发 `SIGSTOP/SIGCONT` 或杀掉。

### `seekAudio(positionMs: number): void`

- `argc == 0` 直接返回；`JS_ToInt32`，负值按 0。
- 实现：把 `positionMs` 写进基准位置（`+0x368`/`+0x36c`）；若音频正在播（`pid>0`）则
  `restartStandaloneAudioDirect()` 用 `-ss <positionMs/1000>` 重启 aplay，否则**只记录基准位置、不起播**。

### `getAudioInfo(): { position, duration, playing, paused }`

- 全部为 `number`/`boolean`。
- `position = clamp(基准位置 + 已播放时间, 0, duration)`，单位 **ms**（不是秒）；
- `duration` 来自 `playAudio` 第二参或 `ffprobe`；尚未 probe 到时为 `0`；
- `playing = pid > 0 && !paused`（与 `isAudioPlaying()` 同源）；`paused` 与 `playing` 互斥。

### `isAudioPlaying(): boolean`

- 严格等于 `pid > 0 && paused == 0`；**暂停时返回 false**（不是「有会话」）。

### `setAudioVolume(volume: number): void`

- `JS_ToFloat64`，clamp 到 `[0.0, 1.0]`，写 `this+0x140`；
- 通过 `audioGainFn` 线程把增益下发给 ffmpeg/aplay（`setVideoTargetGain` 是视频那条）。

```ts
Video.playAudio('/userdisk/b.mp3');        // 自动 ffprobe 时长
Video.playAudio('/userdisk/b.mp3', 180000) // 已知 3 分钟，省一次 probe
Video.setAudioVolume(0.7);
Video.seekAudio(42_000);
Video.pauseAudio();  Video.resumeAudio();  Video.stopAudio();
```

---

## 1.3 设备 / 输出

```ts
interface AudioDevice { name: string; label: string; type: string; active: boolean }
```

- `listAudioDevices(): AudioDevice[]`：读 `/proc/asound/pcm` 生成；`type` 固定 `'alsa'`；`active` 表示当前是否被选中。
- `setAudioOutput(name): boolean`：
  - 别名：`'auto' | 'automatic' | 'default' | 'speaker'` → 统一映射到 `hw:0,0`；
  - 其它值必须是 `/proc/asound/pcm` 里真实存在的设备名（如 `hw:1,0`），否则返回 `false`；
  - 成功后会持久化到 `/userdata/applog/audio_device.cfg`，并重启音频管线。
- `getAudioOutput(): string`：当前 ALSA 设备名。

---

## 1.4 触摸 / 按键（HoleTouch，用于「穿透」到下层 UI）

```ts
interface Rect { x?: number; y?: number; left?: number; top?: number; width: number; height: number }

Video.startHoleTouch({
  logicalRect:  { x: 0, y: 0, width: 480, height: 270 },   // 或 {left, top, width, height}
  visibleRect:  { x: 0, y: 0, width: 480, height: 270 },
  screenWidth:  480,
  screenHeight: 320,
  touchRotation: 0,
  touchOffsetX: 0,
  touchOffsetY: 0,
  touchDevice: '/dev/input/event2',
});

const touches = Video.pollHoleTouches();
// [{ x, y, maxX, maxY, timestamp, version, phase, pointerId, generation, insideVisible }]
const keys = Video.pollMediaKeys();   // [{ action: 'play'|'pause'|'next'|'prev'|... }]
Video.stopHoleTouch();
```

置信度 ◐：字段名来自字符串表，`x/left`、`y/top` 两套键名都存在于代码中（互为兼容），语义按 `recalcVideoRectLocked/updateRenderRectLocked` 推断。

---

## 1.5 画面几何 / 视口 / 弹幕（置信度较低，供完整起见）

```ts
Video.getRenderGeometry();
// {
//   valid: boolean, revision: number,
//   x, y, width, height: number,
//   frameWidth, frameHeight: number,
//   pixelAspectNumerator, pixelAspectDenominator: number,
//   cover: boolean, fit: boolean,
//   nativeEnvelope: { nativeVisible: boolean, contain: boolean }
// }

Video.setRenderViewport({ visible: true, targetRect: { x: 0, y: 0, width: 480, height: 270 } });

Video.configureDanmakuOverlay({ maxItems: 64 });  // -> { ok: true, backend: 'drm'|'fb', maxItems }
                                                  // 或 { ok: false, error: 'unsupported'|'drm_overlay_unsupported' }
Video.renderDanmakuFrame();                       // 当前实现恒 false（占位）
Video.clearDanmakuOverlay();
```

---

## 2. `Audio`（类名 `"Audio"`，AudioBridge）——13 个方法

老接口，独立实现（自建 `monitorFn/progressReaderFn` 线程 + 事件队列），**与 `Video.playAudio` 是两套进程模型，不要混用**。

| # | JS 方法 | 实现地址 | 签名 | 返回 | 置信度 |
|---|---|---|---|---|---|
| 1 | `play` | `0x183354` | `play(path: string, startMs?: number)` | `{ playing: boolean }` | ◐ |
| 2 | `pause` | `0x182de4` | `pause()` | `void` | ◐ |
| 3 | `resume` | `0x182fbc` | `resume()` | `void` | ◐ |
| 4 | `seek` | `0x183a3c` | `seek(positionMs: number)` | `void` | ◐ |
| 5 | `stop` | `0x1831e4` | `stop()` | `void` | ◐ |
| 6 | `getState` | `0x17d200` | `getState()` | `{ playing: boolean; paused: boolean; position: number; duration: number; ended: boolean }` | ● |
| 7 | `poll` | `0x181c04` | `poll()` | 事件数组（见下） | ◐ |
| 8 | `setVolume` | `0x17f9c0` | `setVolume(volume: number)` | `void`（0~1） | ◐ |
| 9 | `getSystemVolume` | `0x17f610` | `getSystemVolume()` | `number`（0~100） | ◐ |
| 10 | `setSystemVolume` | `0x18041c` | `setSystemVolume(volume: number)` | `void` | ◐ |
| 11 | `setAudioOutput` | `0x17f440` | `setAudioOutput(name: string)` | `boolean` | ◐ |
| 12 | `getAudioOutput` | `0x17e5b0` | `getAudioOutput()` | `string` | ◐ |
| 13 | `listAudioDevices` | `0x17edf4` | `listAudioDevices()` | `AudioDevice[]` | ◐ |

`poll()` 元素形如：

```ts
{ type: 'stateChange', state: 'playing' | 'paused' | 'stopped' | 'ended' }
{ type: 'progress',    position: number, duration: number }
```

> `Audio.play` 内部日志：`[Audio] play: "%s" startMs=%lld`，证明第 2 参是**起播偏移（ms）**（与 `Video.playAudio` 的「总时长」含义不同，注意区分）。

---

## 3. 其他导出（不在本次范围）

| 导出 | 说明 |
|---|---|
| `Shell` | 执行命令 / spawn 进程 / 文件与系统信息（本工程已用 `langningchen` 自研实现替代） |
| `Files` | 读写/列举文件 |
| `Fetch` | HTTP 请求 |
| `RimeIme` | 输入法引擎（`GetPreeditString` 等符号可见） |
| `Spell` | 拼写/词典查询 |
| `Dbase` | SQLite 封装（`.so` 依赖 `libsqlite3.so.0`） |
| `Chaty` | 会话/对话 |

---

## 4. 典型调用序列

### 4.1 视频直出（fb0）

```
setLogLevel(2) → setMuted(false) → setRotate(false) → play(path[,x,y,w,h,landscape])
   → (播放中) seek(ms) / pause() / resume() / setPlaybackRate(r)
   → getInfo() 轮询进度 / getState() 查状态
   → stop() → release()（页面销毁）
```

### 4.2 视频 + canvas

```
setUseCanvasPlayer(true) → setRenderBuffer(imageData.data.buffer, w, h)
   → setAudioTrack('') → play(path)
   → setInterval: getFrameCounter() 变化 → ctx.putImageData(imageData,0,0)
   → stop()/release()
```

### 4.3 视频静音 + 独立音轨

```
play(videoPath) → setMuted(true)
playAudio(audioPath, durationMs) → setAudioVolume(0.8) → seekAudio(ms)
→ getAudioInfo()/isAudioPlaying() 轮询
→ stopAudio() → stop()
```

---

## 5. 附录

### 5.1 VideoBridge 关键字段偏移（供排查）

| 偏移 | 含义 |
|---|---|
| `+0x160` | 视频会话 active |
| `+0x161` | 视频 paused |
| `+0x1c8` / `+0x1d0` / `+0x1d4` | canvas 缓冲指针 / 宽 / 高 |
| `+0x22c` | 画面已就绪（fb mmap 或 canvas 缓冲，`seek` 的前置条件） |
| `+0x240` / `+0x244` | 独立音轨名 |
| `+0x258` | muted |
| `+0x259` | landscape（`play` 第 6 参 / `setRotate`） |
| `+0x261` | useCanvasPlayer |
| `+0x262` | cacheBeforePlay |
| `+0x268` / `+0x270` | playbackRate |
| `+0x304` / `+0x308` | 录制 pid / 输出路径 |
| `+0x360` / `+0x364` | 音频 pid / paused |
| `+0x368` | 音频 positionBase(ms) |
| `+0x370` | 音频 durationMs |
| `+0x380` | positionBase 对应的墙钟 |
| `+0xec`…`+0xf8` | 渲染矩形 x/y/w/h |

### 5.2 可检索的错误/日志串

| 地址 | 内容 |
|---|---|
| `0x531634` | `play: 需要路径` |
| `0x530de4` | `playAudio: 需要路径` |
| `0x531118` | `startRecord: 需要路径` |
| `0x52f2b0` | `setRenderBuffer: 需要 (arrayBuffer, width, height)` |
| `0x52dee8` | `Args: url, [referer], [userAgent], [origin]` |
| `0x5298b0` | `Audio.play: 需要路径参数` |
| — | `play: 渲染区域非法` |

### 5.3 版本对照

| | `/tmp/msdk/libs`（本文） | `/tmp/pstore/libs` |
|---|---|---|
| 体积 | 7.8 MB（含 symtab） | 597 KB（stripped） |
| `playAudio*` / `setUseCanvasPlayer` / canvas / 录制 / 代理 | 有 | **无** |
| 方法集 | 46 条 | 老 15 条左右（`play/seek/getState/setAudioOutput/...`） |
| libc | uClibc | uClibc |

> 若目标机上的实际库是 pstore 那个版本，本文第 1 节里标 `Audio/Record/Canvas/Proxy` 的方法会**不存在**，调用即 `undefined is not a function`。上线前先 `Object.keys(Video)` 打印一次做能力探测。
