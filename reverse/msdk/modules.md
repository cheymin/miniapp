# msdk 模块清单

`atoms` 为该模块字节码中的字符串原子数量，可作为复杂度参考；`bridge` 表示该模块显式依赖原生模块（每个模块都可用，故不单列）。

| 模块 | atoms | 作用 | 导入 |
|---|---|---|---|
| `app` | 294 | 应用入口：根实例、页面注册、本地 HTTP 服务与 bridge 初始化 | ./base-page-e54c7e7c.js、./gate-f4009b17.js、./screen-1861a6a2.js、./jslog-0a73e180.js、./base-ac6db2f1.js、./platform-56cd6f66.js、./version-d96a99cf.js、./theme-7f2e6c0e.js、./store-830d3ef4.js |
| `apps_assis` | 1165 | 学习助手（资料/计划，Dbase 存储） | — |
| `apps_bilis` | 2079 | 哔哩哔哩客户端：视频/番剧/直播、登录 Cookie、后台听视频 | — |
| `apps_browser` | 412 | 内嵌浏览器（百度/Bing 入口，可接 canvas 视频） | — |
| `apps_chats` | 972 | 本地聊天/会话列表 | — |
| `apps_chaty` | 1284 | Chaty 聊天页（长连接 + 文件传输） | — |
| `apps_comic` | 498 | 漫画阅读 | — |
| `apps_fanqie` | 1091 | 番茄小说/听书（章节音频经 Video.playAudio/Audio 播放） | — |
| `apps_foods` | 778 | 外卖聚合（美团 H5 + 自有代理） | — |
| `apps_iwara` | 337 | Iwara 视频入口 | — |
| `apps_music` | 1299 | QQ 音乐：扫码登录、搜索/榜单/歌单、下载、播放遥控 | — |
| `apps_qqbot` | 2149 | QQ 机器人控制台（消息/音频/文件） | ./copy-880b828f.js、./trash-4b64e144.js |
| `apps_qqbot_custom` | 271 | QQBot：自定义配置 | ./base-ac6db2f1.js、./qq-account-fee6fc8e.js、./jslog-0a73e180.js |
| `apps_qqbot_deploy` | 297 | QQBot：部署向导 | ./qr-async-c2c3a0ee.js、./qq-account-fee6fc8e.js |
| `apps_qqbot_entry` | 310 | QQBot：入口/账号选择 | ./qq-account-fee6fc8e.js、./qq-multi-account-60c98333.js、./qq-diag-39d55afa.js |
| `apps_qqbot_login` | 278 | QQBot：登录 | ./base-ac6db2f1.js、./qq-account-fee6fc8e.js、./qq-multi-account-60c98333.js、./jslog-0a73e180.js |
| `apps_qqbot_mode` | 150 | QQBot：运行模式切换 | ./qq-account-fee6fc8e.js |
| `apps_qqbot_panel` | 574 | QQBot：控制面板 | — |
| `apps_qqbot_shop` | 344 | QQBot：商店/额度 | ./qr-async-c2c3a0ee.js、./qq-account-fee6fc8e.js |
| `apps_qqbot_signup` | 232 | QQBot：注册 | ./base-ac6db2f1.js、./jslog-0a73e180.js、./qq-account-fee6fc8e.js |
| `apps_rccws` | 1136 | Claude/WS 对话客户端（RCCWS） | — |
| `apps_shop` | 561 | 应用市场/资源商店 | — |
| `apps_timetable` | 491 | 课程表页 | — |
| `apps_tools` | 1300 | 工具箱：WiFi 管理、网络探测、视频/音频、设备信息 | — |
| `apps_webui` | 352 | WebUI 浏览器 | — |
| `apps_wyyyy` | 878 | 网易云音乐（wy）页 | — |
| `apps_xvids` | 316 | 成人视频站点聚合入口 | — |
| `base-ac6db2f1` | 226 | 基础设施：API 多线路切换、Dbase 封装、键盘事件、活动状态 | ./jslog-0a73e180.js |
| `base-page-e54c7e7c` | 162 | 页面基类：生命周期、日志、主题、错误上报 | ./base-ac6db2f1.js、./gate-f4009b17.js、./jslog-0a73e180.js、./theme-7f2e6c0e.js、./store-830d3ef4.js |
| `bf-a516c0f9` | 8 | 纯资源模块：内联 PNG 图标 | — |
| `chat-shared-30c38a05` | 159 | 聊天 UI 共享逻辑（消息块、LaTeX、重发、预设） | ./base-ac6db2f1.js |
| `chaty-67f7d33f` | 963 | Chaty 核心：PTY、WebSocket 长连接、文件分片读写 | ./base-ac6db2f1.js、./version-d96a99cf.js、./jslog-0a73e180.js |
| `copy-880b828f` | 6 | 纯资源模块：内联 PNG 图标 | — |
| `desktop` | 1202 | 桌面主页：时钟/播放器控制、队列与歌单抽屉、状态轮询 | — |
| `duration-864037c2` | 9 | 时长工具：秒/毫秒/auto 归一化 | — |
| `endpoints-cad58d87` | 15 | 域名常量：api.loliyc.com、头像 CDN | — |
| `format-90a6a181` | 55 | 格式化工具：日期/周次、shell 双引号转义、事件取值 | ./jslog-0a73e180.js |
| `gate-f4009b17` | 145 | 启动门禁/页面守卫 | ./jslog-0a73e180.js |
| `image-d8b75edd` | 4 | 纯资源模块：内联 PNG | — |
| `index` | 415 | 计算器主页（默认入口，button.vue） | — |
| `jslog-0a73e180` | 122 | 日志注入：console/异常钩子、写 /userdata/applog/loli_cvi_dev.txt | — |
| `limit` | 1102 | 桌面 limit 版（与 desktop 同源的播放器控制页） | — |
| `music-shared-218de356` | 149 | 音乐共享：ffprobe 时长探测、下载当前歌曲、队列 UI、登录弹窗 | ./duration-864037c2.js |
| `netease-37eef2bc` | 227 | 网易云：登录态、搜索/播放地址/音质选择 | — |
| `other-74802938` | 540 | 其它工具页合集（文件/下载/音频） | ./base-ac6db2f1.js、./jslog-0a73e180.js、./endpoints-cad58d87.js、./store-830d3ef4.js |
| `platform-56cd6f66` | 70 | 平台能力探测：rk/cvi 芯片、canvas/系统播放器/ALSA 默认值 | — |
| `player-shared-de500b41` | 37 | 播放器共享：B站 URL 判定、倍速循环与控制条隐藏 | ./jslog-0a73e180.js |
| `playlist-2aea58af` | 165 | 歌单：本地歌单 CRUD、文件夹扫描、B站视频入歌单 | ./format-90a6a181.js |
| `qq-account-fee6fc8e` | 442 | QQ 账号体系：登录、Cookie、头像、多账号 | — |
| `qq-diag-39d55afa` | 53 | QQ 诊断：store/sync 耗时与快照 | — |
| `qq-message-archive-d42bf7e9` | 71 | QQ 消息归档（按 msgId 去重、原始包记录） | — |
| `qq-multi-account-60c98333` | 50 | QQ 多账号迁移与存储键管理 | — |
| `qqbot-747bced3` | 858 | QQBot SDK 封装：WS 事件、音频播放、消息发送 | ./base-ac6db2f1.js、./qq-diag-39d55afa.js、./endpoints-cad58d87.js、./format-90a6a181.js |
| `qr-async-c2c3a0ee` | 223 | 二维码生成/渲染（SVG/DataURL/Canvas） | — |
| `rccws-b9347bc0` | 360 | Claude WS 客户端核心 | ./base-ac6db2f1.js、./jslog-0a73e180.js、./format-90a6a181.js |
| `screen-1861a6a2` | 60 | 屏幕尺寸/旋转/触摸偏移适配 | ./jslog-0a73e180.js |
| `small-dbaa2389` | 8 | 纯资源模块：内联 PNG | — |
| `store-830d3ef4` | 247 | Dbase 表名与全局配置常量（sys_*、tools_*、desktop_*） | ./jslog-0a73e180.js |
| `system-volume-f765b486` | 30 | 系统音量适配：Audio.getSystemVolume/setSystemVolume + volume 模块回退 | ./jslog-0a73e180.js |
| `theme-7f2e6c0e` | 50 | 主题：light/dark 切换与 mixin | ./jslog-0a73e180.js |
| `timetable-484f1cd0` | 100 | 课表数据（节次时间、颜色） | — |
| `timetable1-0750bdc3` | 582 | 旧版桌面 chunk：内嵌完整音乐播放引擎（__audioBackend） | ./base-ac6db2f1.js、./platform-56cd6f66.js、./jslog-0a73e180.js、./system-volume-f765b486.js、./duration-864037c2.js、./netease-37eef2bc.js |
| `tools_camera` | 345 | 相机 | — |
| `tools_ffmpeg` | 388 | ffmpeg 工具页（转码/抽轨/预览） | ./player-shared-de500b41.js |
| `tools_files` | 908 | 文件管理器（Files 模块：索引/搜索/操作） | — |
| `tools_gallery` | 471 | 相册 | — |
| `tools_keyboard` | 2120 | 输入法/Rime 键盘（Spell 模块） | — |
| `tools_reader` | 923 | 文本阅读器 | — |
| `tools_settings` | 1346 | 设置：存储/内存/电池、ADB、蓝牙、驱动重载 | — |
| `tools_shell` | 734 | 终端（Shell.openPty 交互） | — |
| `tools_video` | 56 | 视频页入口（video 组件） | ./video-e680eea0.js、./jslog-0a73e180.js、./player-shared-de500b41.js |
| `trash-4b64e144` | 14 | 纯资源模块：内联 PNG | — |
| `version-d96a99cf` | 8 | 版本常量：1.15.5 / 202610071708 | — |
| `video-e680eea0` | 1028 | 视频播放器组件：Video bridge 画布播放 + 弹幕 + ffmpeg 音轨 | ./player-shared-de500b41.js |

> 导入关系取自每个模块字节码原子表的头部（QuickJS 模块依赖表），只列出 `./xxx.js` 形式的应用内模块。
