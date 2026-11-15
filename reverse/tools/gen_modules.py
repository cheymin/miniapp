#!/usr/bin/env python3
"""生成 modules.md（描述字典 + 自动提取的导入关系/原子数）。

用法: python3 gen_modules.py <pkg> <out.md>
"""
import json
import os
import sys

DESC = {
    # ---------------- pstore ----------------
    "pstore": {
        "AboutPanel-bec7ae0c": "「关于」面板：版本、开源许可、外链与日志入口",
        "AppCard-1aa3c5b7": "商店应用卡片（图标/名称/价格/状态/安装按钮）",
        "CategoryTabs-0c61b486": "商店分类 Tab 与应用详情页外壳（下载/购买/评论）",
        "DisplayRoot-0f879b56": "根组件：屏幕适配、原生文本编辑器宿主、返回键分发",
        "EmptyState-f2c5dc23": "空态占位组件",
        "GuideOverlay-6cdd13a3": "首次启动引导浮层",
        "LockDialog-facba76a": "应用锁 PIN 输入弹窗",
        "LogPanel-0a1dbbd4": "运行日志面板（含调试开关）",
        "PageToast-4d6b727b": "页面级 Toast",
        "QuietClose-2c6a4375": "无动画关闭/返回当前页（静默 close）",
        "UiButton-f2c4907e": "通用按钮与 LoadingDots",
        "UiChip-0e1c22f8": "标签 chip",
        "UiLoading-e8ef573a": "加载态、支付/购买弹窗（PayDialog）",
        "UiSection-20aa64fd": "分区标题组件",
        "UiSwitch-4827faca": "开关组件",
        "about": "关于页（src/pages/about/about.vue）",
        "add-8292ee90": "纯资源模块：内联 add.png base64 图标",
        "app": "应用入口：创建 Vue 根实例、注册全部页面组件、初始化 bridge",
        "apps-68e21edf": "纯资源模块：内联 apps.png base64 图标",
        "apps_manage": "应用管理页：应用列表、桌面显示开关、启动/卸载、重启",
        "back-53f49b57": "返回键/侧滑手势 mixin",
        "base-page-77c2f279": "页面基类 PageRes：日志环形缓冲、崩溃摘要、toast、存储上报",
        "blocked": "拦截/不可用提示页",
        "catalog_display-2c72a8f4": "商店目录数据整形：试用/购买/授权判断、价格与体积文案",
        "client_log-5698cc68": "客户端错误采集：去重指纹、批量上报、崩溃行解析",
        "debug_logs-cb5e1442": "调试环形日志缓冲（DEBUG_LOG_MAX）",
        "desktop_icon-58a36964": "桌面图标状态：读取 packages.json/appid 目录、安装映射与版本比较",
        "display-6c9f60ff": "显示层与 bridge 单例：setBridge/getShell/getFetch/getDatas、字体缩放",
        "download_flow-75e71906": "下载/校验/安装状态机：CDN 选路、设备密钥、401 恢复、错误码",
        "icon-button-1b68f214": "图标按钮组件",
        "icon_lazy-6100ab34": "图标懒加载/滚动缓冲",
        "icons-0e185c35": "图标名到 PNG 的映射表（assets/icons/*）",
        "index": "商店首页：首页推荐、搜索、分类、更新提示（CoverHome）",
        "launcher": "桌面启动器页：图标网格、分页/拖拽、应用启动",
        "launcher_pref-055dd609": "启动器显示偏好：横/竖屏切换、beta 开关持久化",
        "local_io-60f027f1": "本地 IO 工具：shell 封装、SHA256/HMAC、应用锁记录、helper 数据、分块写文件",
        "lock_flow-e484aaf7": "应用锁状态机：设置/校验 PIN、连错锁定、标题连点解锁",
        "log": "日志页（查看/导出运行日志）",
        "overlay_nav-fac6b725": "覆盖层导航：返回时是否关闭详情/重置封面",
        "pay_flow-c400e63a": "支付流程：建单、二维码、轮询、赞助订单",
        "rich_text-0c305fc3": "富文本块解析（应用详情描述）与分类名规范化",
        "screen_fit-441d89c7": "屏幕尺寸探测与紧凑/竖屏 UI 判定（COMPACT_ASPECT_THRESHOLD）",
        "search-93640b9d": "纯资源模块：搜索/设置/已安装内联 PNG",
        "settings": "设置页：显示模式、字体、商店偏好、ADB/更新等",
        "sponsor": "赞助/会员面板：档位、赞助下单、权益展示",
        "store-7e7ff099": "商店 API 客户端：store.posc.net、请求签名、错误上报、CDN 测速",
        "store": "商店主页面（内联 TabBar 与大量文案/目录展示，体积最大）",
        "uidebug": "UI 调试页：尺寸/颜色/点击探针",
    },
    # ---------------- msdk ----------------
    "msdk": {
        "app": "应用入口：根实例、页面注册、本地 HTTP 服务与 bridge 初始化",
        "apps_assis": "学习助手（资料/计划，Dbase 存储）",
        "apps_bilis": "哔哩哔哩客户端：视频/番剧/直播、登录 Cookie、后台听视频",
        "apps_browser": "内嵌浏览器（百度/Bing 入口，可接 canvas 视频）",
        "apps_chats": "本地聊天/会话列表",
        "apps_chaty": "Chaty 聊天页（长连接 + 文件传输）",
        "apps_comic": "漫画阅读",
        "apps_fanqie": "番茄小说/听书（章节音频经 Video.playAudio/Audio 播放）",
        "apps_foods": "外卖聚合（美团 H5 + 自有代理）",
        "apps_iwara": "Iwara 视频入口",
        "apps_music": "QQ 音乐：扫码登录、搜索/榜单/歌单、下载、播放遥控",
        "apps_qqbot": "QQ 机器人控制台（消息/音频/文件）",
        "apps_qqbot_custom": "QQBot：自定义配置",
        "apps_qqbot_deploy": "QQBot：部署向导",
        "apps_qqbot_entry": "QQBot：入口/账号选择",
        "apps_qqbot_login": "QQBot：登录",
        "apps_qqbot_mode": "QQBot：运行模式切换",
        "apps_qqbot_panel": "QQBot：控制面板",
        "apps_qqbot_shop": "QQBot：商店/额度",
        "apps_qqbot_signup": "QQBot：注册",
        "apps_rccws": "Claude/WS 对话客户端（RCCWS）",
        "apps_shop": "应用市场/资源商店",
        "apps_timetable": "课程表页",
        "apps_tools": "工具箱：WiFi 管理、网络探测、视频/音频、设备信息",
        "apps_webui": "WebUI 浏览器",
        "apps_wyyyy": "网易云音乐（wy）页",
        "apps_xvids": "成人视频站点聚合入口",
        "base-ac6db2f1": "基础设施：API 多线路切换、Dbase 封装、键盘事件、活动状态",
        "base-page-e54c7e7c": "页面基类：生命周期、日志、主题、错误上报",
        "bf-a516c0f9": "纯资源模块：内联 PNG 图标",
        "chat-shared-30c38a05": "聊天 UI 共享逻辑（消息块、LaTeX、重发、预设）",
        "chaty-67f7d33f": "Chaty 核心：PTY、WebSocket 长连接、文件分片读写",
        "copy-880b828f": "纯资源模块：内联 PNG 图标",
        "desktop": "桌面主页：时钟/播放器控制、队列与歌单抽屉、状态轮询",
        "duration-864037c2": "时长工具：秒/毫秒/auto 归一化",
        "endpoints-cad58d87": "域名常量：api.loliyc.com、头像 CDN",
        "format-90a6a181": "格式化工具：日期/周次、shell 双引号转义、事件取值",
        "gate-f4009b17": "启动门禁/页面守卫",
        "image-d8b75edd": "纯资源模块：内联 PNG",
        "index": "计算器主页（默认入口，button.vue）",
        "jslog-0a73e180": "日志注入：console/异常钩子、写 /userdata/applog/loli_cvi_dev.txt",
        "limit": "桌面 limit 版（与 desktop 同源的播放器控制页）",
        "music-shared-218de356": "音乐共享：ffprobe 时长探测、下载当前歌曲、队列 UI、登录弹窗",
        "netease-37eef2bc": "网易云：登录态、搜索/播放地址/音质选择",
        "other-74802938": "其它工具页合集（文件/下载/音频）",
        "platform-56cd6f66": "平台能力探测：rk/cvi 芯片、canvas/系统播放器/ALSA 默认值",
        "player-shared-de500b41": "播放器共享：B站 URL 判定、倍速循环与控制条隐藏",
        "playlist-2aea58af": "歌单：本地歌单 CRUD、文件夹扫描、B站视频入歌单",
        "qq-account-fee6fc8e": "QQ 账号体系：登录、Cookie、头像、多账号",
        "qq-diag-39d55afa": "QQ 诊断：store/sync 耗时与快照",
        "qq-message-archive-d42bf7e9": "QQ 消息归档（按 msgId 去重、原始包记录）",
        "qq-multi-account-60c98333": "QQ 多账号迁移与存储键管理",
        "qqbot-747bced3": "QQBot SDK 封装：WS 事件、音频播放、消息发送",
        "qr-async-c2c3a0ee": "二维码生成/渲染（SVG/DataURL/Canvas）",
        "rccws-b9347bc0": "Claude WS 客户端核心",
        "screen-1861a6a2": "屏幕尺寸/旋转/触摸偏移适配",
        "small-dbaa2389": "纯资源模块：内联 PNG",
        "store-830d3ef4": "Dbase 表名与全局配置常量（sys_*、tools_*、desktop_*）",
        "system-volume-f765b486": "系统音量适配：Audio.getSystemVolume/setSystemVolume + volume 模块回退",
        "theme-7f2e6c0e": "主题：light/dark 切换与 mixin",
        "timetable-484f1cd0": "课表数据（节次时间、颜色）",
        "timetable1-0750bdc3": "旧版桌面 chunk：内嵌完整音乐播放引擎（__audioBackend）",
        "tools_camera": "相机",
        "tools_ffmpeg": "ffmpeg 工具页（转码/抽轨/预览）",
        "tools_files": "文件管理器（Files 模块：索引/搜索/操作）",
        "tools_gallery": "相册",
        "tools_keyboard": "输入法/Rime 键盘（Spell 模块）",
        "tools_reader": "文本阅读器",
        "tools_settings": "设置：存储/内存/电池、ADB、蓝牙、驱动重载",
        "tools_shell": "终端（Shell.openPty 交互）",
        "tools_video": "视频页入口（video 组件）",
        "trash-4b64e144": "纯资源模块：内联 PNG",
        "version-d96a99cf": "版本常量：1.15.5 / 202610071708",
        "video-e680eea0": "视频播放器组件：Video bridge 画布播放 + 弹幕 + ffmpeg 音轨",
    },
}

def main():
    pkg, out = sys.argv[1], sys.argv[2]
    info = json.load(open("/tmp/modinfo.json"))[pkg]
    desc = DESC[pkg]
    rows = []
    for name in sorted(info):
        v = info[name]
        imps = [x for x in v["imports"] if x != "bridge"]
        imp = "、".join(imps) if imps else "—"
        rows.append((name, v["atoms"], desc.get(name, "（未归类）"), imp))
    lines = []
    lines.append("# %s 模块清单" % pkg)
    lines.append("")
    lines.append("`atoms` 为该模块字节码中的字符串原子数量，可作为复杂度参考；"
                 "`bridge` 表示该模块显式依赖原生模块（每个模块都可用，故不单列）。")
    lines.append("")
    lines.append("| 模块 | atoms | 作用 | 导入 |")
    lines.append("|---|---|---|---|")
    for name, n, d, imp in rows:
        lines.append("| `%s` | %d | %s | %s |" % (name, n, d, imp))
    lines.append("")
    lines.append("> 导入关系取自每个模块字节码原子表的头部（QuickJS 模块依赖表），"
                 "只列出 `./xxx.js` 形式的应用内模块。")
    open(out, "w").write("\n".join(lines) + "\n")

if __name__ == "__main__":
    main()
