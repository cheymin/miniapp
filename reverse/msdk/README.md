# msdk —— 词典笔聚合小程序「计算器」逆向归档

| 项 | 值 |
|---|---|
| appid | `8001687764241342` |
| manifest version | `1.15.5`（构建号 `202610071708`） |
| 展示名 | 计算器（实际是一个聚合型「应用市场 + 媒体 + QQ 机器人」外壳） |
| 引擎 | QuickJS 20200705，`bigNum: false` |
| 模块数 | 74 个 `*.js.bin`（cert 表中连同图片、libs、rime 词库共 173 条） |
| 原生库 | `libs/libjsapi_bridge.so`（7.8 MB，**未 strip**，带符号表，是最重要的逆向素材） |
| 额外资源 | `rime/`（万象拼音 17.2.5 词库 23 MB + OpenCC/librime 许可）、`images/`（约 90 张内联 PNG） |

## 目录结构

```
/workspace/reverse/msdk/
├── README.md                  本文件
├── modules.md                 74 个模块说明 + 导入关系 + 原子数
├── strings/                   每个模块的原子/字符串清单（_index.txt 为总索引）
└── recovered/
    ├── music-player.ts        音乐播放链路（apps_music / music-shared / playlist / system-volume / desktop 播放器）
    └── bilis-playback.ts      apps_bilis 取流与播放（是否走原生播放器）
```

工具：`/workspace/reverse/tools/atoms.py`、`dump_strings.py`、`gen_modules.py`。

## 分层结构

```
app.js
 ├── jslog-0a73e180        日志注入（console/异常钩子 → /userdata/applog/loli_cvia_dev.txt）
 ├── base-ac6db2f1         基础设施：API 多线路、Dbase 封装、onActivityStatus
 ├── store-830d3ef4        Dbase 表名 / 全局配置键（sys_* / tools_* / desktop_* / ob_*）
 ├── theme / screen / platform / format / duration / endpoints   UI 与平台适配
 ├── gate-f4009b17         启动门禁（首启引导、登录态、路由守卫）
 ├── desktop.js / limit.js 桌面主页（时钟、播放器卡片、队列抽屉）—— 真正的播放控制端
 ├── index.js              计算器主页
 └── apps_* / tools_*      各业务页（每个都是独立 Vue SFC 编译产物）
```

`apps_*` 页面彼此不 import，只共享 `base` / `store` / `theme` / `music-shared` 等底层模块；
QQ 相关页面共享 `qq-account` / `qqbot` / `chat-shared`。

## 页面 / 路由

| 页面 | 说明 |
|---|---|
| `index` | 计算器主页（伪装入口） |
| `desktop` / `limit` | 桌面：播放器卡片、播放队列、歌单抽屉（`desktop` 为完整版，`limit` 为精简版） |
| `apps_music` | QQ 音乐：搜索、热榜、歌单、扫码登录、下载、播放遥控 |
| `apps_wyyyy` / `netease` | 网易云音乐 |
| `apps_bilis` | B 站：视频/番剧/直播、Cookie 登录、后台听视频 |
| `apps_fanqie` / `apps_comic` / `apps_iwara` / `apps_xvids` | 小说听书 / 漫画 / 视频站 |
| `apps_browser` / `apps_webui` | 内嵌浏览器 |
| `apps_chats` / `apps_chaty` / `chat-shared` | 本地聊天与 Chaty 长连接聊天 |
| `apps_qqbot*`（9 个子页） | QQ 机器人：登录、模式、面板、部署、商店、注册、自定义 |
| `apps_shop` / `apps_tools` / `apps_timetable` / `apps_assis` / `other` | 商店、工具箱、课程表、学习助手、杂项工具 |
| `tools_*` | 相机、相册、文件、终端、键盘、ffmpeg、阅读器、设置、视频 |

## 原生能力（`require('bridge')`，方法名取自 .so 符号与 rodata 注册表）

`bridge` 实际是**一个容器**，导出多个子模块：`Shell`、`Files`、`Dbase`、`Fetch`、`Audio`、`Video`、`Spell`、`Chaty`。
页面里写作 `const bridge = require('bridge')`，随后 `bridge.Audio.play(...)`。

### Audio（音乐/音频播放器，ffmpeg + ALSA）

| 方法 | 说明 |
|---|---|
| `play(path, startMs?)` | 从 `startMs` 开始播放本地文件/URL；内部 fork ffmpeg 解码 → FIFO → aplay/bluealsa |
| `seek(ms)` | 重新定位（重开 ffmpeg `-ss`） |
| `getState()` | 返回 `playing/paused/ended/stopped` + 位置/时长（字段名见下） |
| `poll()` | 拉取事件：`progress` / `stateChange` / `message` |
| `setVolume(0-100)` | 播放增益 |
| `getSystemVolume(device?)` / `setSystemVolume(v, device?)` | 系统音量，返回 `{ device, source, reason, ageMs }` |
| `setAudioOutput(device)` / `getAudioOutput()` / `listAudioDevices()` | 扬声器 / 耳机 / 蓝牙切换 |

内部实现证据：`mkfifo /tmp/loli_audio_s6.fifo`、`/tmp/loli_audio_prog.fifo`，
`ffmpeg ... -c:a pcm_s16le -f s16le -ar 48000 -ac 2 - | aplay -q -f S16_LE -r 48000 -c 2 -D <dev>`，
蓝牙走 `bluealsa:` / `bluealsa-aplay`，日志 `ffmpeg pid=%d dev=%s`。

### Video（视频 + 音频，含画布播放与弹幕）

`getInfo`、`setPlaybackRate`、`startRecord` / `stopRecord` / `getRecordInfo`、
`playAudio` / `pauseAudio` / `resumeAudio` / `seekAudio` / `getAudioInfo` / `isAudioPlaying` / `setAudioVolume` / `setMuted`、
`setRotate`、`setScaleMode`、`setAudioTrack`、`setLogLevel` / `getLogLevel`、`getProxyUrl`、
`startHoleTouch` / `pollHoleTouches` / `stopHoleTouch`、`pollMediaKeys`、
`setUseCanvasPlayer`、`setCacheBeforePlay`、`setAvSyncDelayMs`、`setRenderBuffer`、`getFrameCounter`、
`setRenderRect` / `getRenderGeometry` / `setRenderViewport`、
`configureDanmakuOverlay` / `renderDanmakuFrame` / `clearDanmakuOverlay`。

* 视频解码：`ffmpeg -vf <scale> -pix_fmt <rgb565le|bgr24> -f rawvideo` 写 `/tmp` 帧缓存（`fb0` / `Canvas` / `raw` 三种模式）。
* 音频：`ffmpeg -af aresample=48000,atempo=<rate>,atempo=<rate>,adelay=<ms>|<ms>` 后接 ALSA，倍速通过串联两个 atempo（0.5~2.0）。
* 画布模式：`setUseCanvasPlayer(true)` 后 JS 每帧读 `getFrameCounter()` 再 `render`，弹幕由 `renderDanmakuFrame` 合成。

### Shell / Files / Fetch / Dbase / Spell / Chaty

| 子模块 | 关键方法 |
|---|---|
| `Shell` | `exec`、`execAsync`、`openPty`、`writePty`、`readPty`、`closePty`、`resizePty`、`isPtyRunning`、`getStorageInfo`、`getMemoryInfo`、`getBatteryInfoAsync`、`getFileSizeAsync`、`readFileChunkBase64Async`、`getSystemStatus`、`getWlan0Address`、`setBtQuality`、`toggleAdb`、`reloadDriver`、`getScreenSize`、`startLocalHttpServer`、`stopLocalHttpServer`、`getLocalHttpServerInfo`、`getLocalFileUrl`、`getAbsoluteFileUrl`、`getAudioProxyUrl`、`openSystemVideo`、`wifiScan`、`wifiScanResults`、`wifiStatus`、`wifiAddNetwork`、`wifiSetNetwork`、`wifiEnableNetwork`、`wifiDisconnect`、`wifiSaveConfig` |
| `Files` | `fsAction`、`readFile`、`getFileIndexStatusAsync`、`buildFileIndexAsync`、`searchFileIndexAsync`、`getSystemInfo`、`listFiles`、`patchBluetoothAudio` |
| `Fetch` | `fetch`、`fetchStream`、`downloadFile`、`WebSocket`（构造器）、`wsSend`/`wsClose`/`wsPing`/`wsPoll`/`getReadyState`/`setEventCallback`，下载任务 `abort`/`destroy`/`isFinished` |
| `Dbase` | 按表读写（`read`/`write` 走属性访问器）、`remove`、`list`、`appendLog` |
| `Spell` | Rime 输入法：`init`、`search`、`searchT9`、`reload`、`getStatus`、`createSession`、`processKey`、`selectCandidate`、`changePage`、`clearComposition`、`destroySession` |
| `Chaty` | 长连接：`start`、`updateConfig`、`forceReconnect`、`send`、`request`、`updateActivityStatus`、`setEventCallback`、`sendHeartbeatNow` |

> `Files.patchBluetoothAudio` 会 `mount --bind` 一个包装过的 `bluealsa`（`--a2dp-source --hfp-ag --a2dp-volume --sbc-quality=2`）到 `/usr/bin/bluealsa` 后 `killall -9 bluealsa`，用于绕过系统默认的 SBC 质量。

## 音乐播放链路（核心发现）

**播放不在 `apps_music` 里发生，而是「遥控」模式**：

```
apps_music（QQ 音乐页）
   ├─ $Fetch 调 https://api.loliyc.com/music/* 取搜索/榜单/播放地址
   ├─ $falcon.trigger('music_command', { action: 'play_song', song, quality })
   └─ 轮询/订阅 desktop_player_state（Dbase）渲染进度

desktop.js / limit.js / timetable1（桌面 Page chunk，含完整引擎）
   ├─ $falcon.on('music_command', handleMusicCommand)
   ├─ handleMusicCommand → __audioBackend.play/playAudio/seek/setVolume
   ├─ __audioBackend = bridge.Audio（优先）| bridge.Video（旧机型/视频源）
   └─ 把 { song, index, status, position, duration } 写回 desktop_player_state

system-volume
   └─ Audio.getSystemVolume() / setSystemVolume()，失败回退 require('volume')
```

`music_command` 的 action 全集（字节码字符串）：`play_song`、`play_list`、`play_list_at`、
`play_next`、`add_queue`、`remove_queue_item`、`clear_queue`、`volume_set`、`toggle`、`prev`、
`toggle_mode`（顺序/随机）、`vol_up` / `vol_down`、`cycle_speed`（倍速）。

歌单与队列持久化 Key：`desktop_play_queue`、`desktop_playlists`、`qqmusic_credentials`、
`qqmusic_listen_history`、`desktop_music_folders`、`music_panel_state`。

## B 站取流与播放（apps_bilis）

* 登录：直连 `passport.bilibili.com` 扫码，Cookie（`SESSDATA` / `bili_jct` / `DedeUserID` / `buvid3` …）落 `BILI_CREDENTIALS`。
* 设备指纹：`https://api.bilibili.com/x/frontend/finger/spi` 取 `b_3`/`b_4`，`/x/web-interface/nav` 取 wbi 的 `imgKey`/`subKey`，
  `bapis/.../GenWebTicket` 取 ticket，再对 playurl 参数做 wbi 签名字典序拼接。
* 取流走自有代理：`POST /bili/video/url`、`POST /bili/bangumi/url`（`api.loliyc.com`），
  返回 `audio_url` / 视频分段；必要时 `Shell.getAudioProxyUrl` 包一层本地代理，`Video.getProxyUrl` 处理 CORS。
* 播放：**用 bridge 原生播放器**。视频用 `video-e680eea0` 组件 + `Video` 模块（画布帧 / fb0）；
  后台听音用 `Video.playAudio(url)` + `Video.getAudioInfo()` + `Video.isAudioPlaying()`；
  本地缓存文件可用 `Audio.play(path, startMs)`。`player-shared` 负责 B 站 URL 识别与倍速。

## 网络与后端

* 自有后端：`api.loliyc.com`（业务 API）、`auth.loliyc.com`、`cdn-api.loliyc.com`、`stc.loliyc.com`、
  `relay.loliyo.cc`、`loli.tesbin.top`/`qq.tesbin.top`（备用线路）、`sq.loliyc.com` / `sq.kashic.cn`（词库/文件分发）。
* 第三方：`api.bilibili.com` / `passport.bilibili.com` / `i0.hdslb.com` / `comment.bilibili.com`、
  `api.open-meteo.com`（天气）、`i.waimai.meituan.com` / `h5.waimai.meituan.com` / `mars.meituan.com`、
  `q1.qlogo.cn` / `p.qlogo.cn`（头像）、`img.icons8.com`。
* 站点聚合：`m.baidu.com`、`www.bing.com`、`www.xvideos.com`、`www.pornhub.com`、`missav.ai`、`www.wetvag.com`。

## 字符串混淆

与 pstore 不同，msdk 的 74 个模块**没有**使用「base64 + 大小写翻转」混淆：
原子表里中文与路径均为明文，只有少量 `ob_*` 存储键与正常英文标识符。
（pstore 侧则有 12 个模块使用该混淆，见 `../pstore/README.md`。）

## 局限

* 未做完整 QuickJS 字节码反汇编，控制流由原子顺序、函数名与原生符号表交叉推断；
  标注「推断」的字段名/参数顺序需要真机或 native 反汇编进一步确认。
* `Video`/`Audio` 的返回对象字段名（`position`、`duration`、`status`）来自内部日志与状态枚举
  （`playing` / `paused` / `ended`），非 100% 确定。
