# pstore 模块清单

`atoms` 为该模块字节码中的字符串原子数量，可作为复杂度参考；`bridge` 表示该模块显式依赖原生模块（每个模块都可用，故不单列）。

| 模块 | atoms | 作用 | 导入 |
|---|---|---|---|
| `AboutPanel-bec7ae0c` | 276 | 「关于」面板：版本、开源许可、外链与日志入口 | ./icons-0e185c35.js、./icon-button-1b68f214.js、./UiSection-20aa64fd.js、./back-53f49b57.js、./screen_fit-441d89c7.js、./display-6c9f60ff.js |
| `AppCard-1aa3c5b7` | 271 | 商店应用卡片（图标/名称/价格/状态/安装按钮） | ./catalog_display-2c72a8f4.js、./screen_fit-441d89c7.js、./back-53f49b57.js、./display-6c9f60ff.js |
| `CategoryTabs-0c61b486` | 878 | 商店分类 Tab 与应用详情页外壳（下载/购买/评论） | ./catalog_display-2c72a8f4.js、./rich_text-0c305fc3.js、./screen_fit-441d89c7.js、./back-53f49b57.js、./download_flow-75e71906.js、./UiButton-f2c4907e.js、./UiChip-0e1c22f8.js、./UiSwitch-4827faca.js、./display-6c9f60ff.js、./QuietClose-2c6a4375.js、./icons-0e185c35.js |
| `DisplayRoot-0f879b56` | 284 | 根组件：屏幕适配、原生文本编辑器宿主、返回键分发 | ./display-6c9f60ff.js |
| `EmptyState-f2c5dc23` | 89 | 空态占位组件 | ./icons-0e185c35.js、./screen_fit-441d89c7.js、./display-6c9f60ff.js |
| `GuideOverlay-6cdd13a3` | 460 | 首次启动引导浮层 | ./back-53f49b57.js、./search-93640b9d.js、./apps-68e21edf.js、./add-8292ee90.js、./screen_fit-441d89c7.js、./UiButton-f2c4907e.js、./display-6c9f60ff.js |
| `LockDialog-facba76a` | 252 | 应用锁 PIN 输入弹窗 | ./icons-0e185c35.js、./screen_fit-441d89c7.js、./QuietClose-2c6a4375.js、./UiButton-f2c4907e.js、./display-6c9f60ff.js |
| `LogPanel-0a1dbbd4` | 233 | 运行日志面板（含调试开关） | ./EmptyState-f2c5dc23.js、./icon-button-1b68f214.js、./UiButton-f2c4907e.js、./UiChip-0e1c22f8.js、./screen_fit-441d89c7.js、./back-53f49b57.js、./display-6c9f60ff.js |
| `PageToast-4d6b727b` | 101 | 页面级 Toast | ./screen_fit-441d89c7.js、./display-6c9f60ff.js |
| `QuietClose-2c6a4375` | 73 | 无动画关闭/返回当前页（静默 close） | ./back-53f49b57.js、./screen_fit-441d89c7.js、./display-6c9f60ff.js |
| `UiButton-f2c4907e` | 379 | 通用按钮与 LoadingDots | ./screen_fit-441d89c7.js、./display-6c9f60ff.js |
| `UiChip-0e1c22f8` | 267 | 标签 chip | ./screen_fit-441d89c7.js、./back-53f49b57.js、./display-6c9f60ff.js |
| `UiLoading-e8ef573a` | 541 | 加载态、支付/购买弹窗（PayDialog） | ./icons-0e185c35.js、./screen_fit-441d89c7.js、./UiButton-f2c4907e.js、./UiChip-0e1c22f8.js、./display-6c9f60ff.js |
| `UiSection-20aa64fd` | 106 | 分区标题组件 | ./screen_fit-441d89c7.js、./back-53f49b57.js、./display-6c9f60ff.js |
| `UiSwitch-4827faca` | 171 | 开关组件 | ./screen_fit-441d89c7.js、./display-6c9f60ff.js |
| `about` | 189 | 关于页（src/pages/about/about.vue） | ./DisplayRoot-0f879b56.js、./AboutPanel-bec7ae0c.js、./store-7e7ff099.js、./back-53f49b57.js、./display-6c9f60ff.js、./icons-0e185c35.js、./icon-button-1b68f214.js、./screen_fit-441d89c7.js、./UiSection-20aa64fd.js、./local_io-60f027f1.js、./client_log-5698cc68.js、./download_flow-75e71906.js、./rich_text-0c305fc3.js、./catalog_display-2c72a8f4.js |
| `add-8292ee90` | 5 | 纯资源模块：内联 add.png base64 图标 | — |
| `app` | 322 | 应用入口：创建 Vue 根实例、注册全部页面组件、初始化 bridge | ./base-page-77c2f279.js、./display-6c9f60ff.js、./client_log-5698cc68.js |
| `apps-68e21edf` | 5 | 纯资源模块：内联 apps.png base64 图标 | — |
| `apps_manage` | 454 | 应用管理页：应用列表、桌面显示开关、启动/卸载、重启 | — |
| `back-53f49b57` | 152 | 返回键/侧滑手势 mixin | ./display-6c9f60ff.js |
| `base-page-77c2f279` | 409 | 页面基类 PageRes：日志环形缓冲、崩溃摘要、toast、存储上报 | ./client_log-5698cc68.js |
| `blocked` | 54 | 拦截/不可用提示页 | ./DisplayRoot-0f879b56.js、./screen_fit-441d89c7.js、./display-6c9f60ff.js |
| `catalog_display-2c72a8f4` | 230 | 商店目录数据整形：试用/购买/授权判断、价格与体积文案 | ./download_flow-75e71906.js |
| `client_log-5698cc68` | 261 | 客户端错误采集：去重指纹、批量上报、崩溃行解析 | — |
| `debug_logs-cb5e1442` | 54 | 调试环形日志缓冲（DEBUG_LOG_MAX） | — |
| `desktop_icon-58a36964` | 295 | 桌面图标状态：读取 packages.json/appid 目录、安装映射与版本比较 | ./download_flow-75e71906.js |
| `display-6c9f60ff` | 237 | 显示层与 bridge 单例：setBridge/getShell/getFetch/getDatas、字体缩放 | — |
| `download_flow-75e71906` | 435 | 下载/校验/安装状态机：CDN 选路、设备密钥、401 恢复、错误码 | — |
| `icon-button-1b68f214` | 108 | 图标按钮组件 | ./screen_fit-441d89c7.js、./display-6c9f60ff.js |
| `icon_lazy-6100ab34` | 69 | 图标懒加载/滚动缓冲 | — |
| `icons-0e185c35` | 130 | 图标名到 PNG 的映射表（assets/icons/*） | — |
| `index` | 593 | 商店首页：首页推荐、搜索、分类、更新提示（CoverHome） | — |
| `launcher` | 469 | 桌面启动器页：图标网格、分页/拖拽、应用启动 | — |
| `launcher_pref-055dd609` | 121 | 启动器显示偏好：横/竖屏切换、beta 开关持久化 | ./display-6c9f60ff.js |
| `local_io-60f027f1` | 364 | 本地 IO 工具：shell 封装、SHA256/HMAC、应用锁记录、helper 数据、分块写文件 | ./display-6c9f60ff.js、./DisplayRoot-0f879b56.js、./screen_fit-441d89c7.js |
| `lock_flow-e484aaf7` | 191 | 应用锁状态机：设置/校验 PIN、连错锁定、标题连点解锁 | ./local_io-60f027f1.js |
| `log` | 86 | 日志页（查看/导出运行日志） | ./DisplayRoot-0f879b56.js、./LogPanel-0a1dbbd4.js、./screen_fit-441d89c7.js、./debug_logs-cb5e1442.js、./back-53f49b57.js、./display-6c9f60ff.js、./EmptyState-f2c5dc23.js、./icons-0e185c35.js、./icon-button-1b68f214.js、./UiButton-f2c4907e.js、./UiChip-0e1c22f8.js |
| `overlay_nav-fac6b725` | 66 | 覆盖层导航：返回时是否关闭详情/重置封面 | — |
| `pay_flow-c400e63a` | 204 | 支付流程：建单、二维码、轮询、赞助订单 | ./download_flow-75e71906.js、./catalog_display-2c72a8f4.js |
| `rich_text-0c305fc3` | 103 | 富文本块解析（应用详情描述）与分类名规范化 | — |
| `screen_fit-441d89c7` | 68 | 屏幕尺寸探测与紧凑/竖屏 UI 判定（COMPACT_ASPECT_THRESHOLD） | — |
| `search-93640b9d` | 13 | 纯资源模块：搜索/设置/已安装内联 PNG | — |
| `settings` | 566 | 设置页：显示模式、字体、商店偏好、ADB/更新等 | — |
| `sponsor` | 694 | 赞助/会员面板：档位、赞助下单、权益展示 | ./DisplayRoot-0f879b56.js |
| `store` | 3474 | 商店主页面（内联 TabBar 与大量文案/目录展示，体积最大） | — |
| `store-7e7ff099` | 821 | 商店 API 客户端：store.posc.net、请求签名、错误上报、CDN 测速 | ./local_io-60f027f1.js、./client_log-5698cc68.js、./download_flow-75e71906.js、./rich_text-0c305fc3.js、./catalog_display-2c72a8f4.js、./display-6c9f60ff.js |
| `uidebug` | 579 | UI 调试页：尺寸/颜色/点击探针 | ./screen_fit-441d89c7.js、./back-53f49b57.js、./AppCard-1aa3c5b7.js、./EmptyState-f2c5dc23.js、./QuietClose-2c6a4375.js、./CategoryTabs-0c61b486.js、./UiButton-f2c4907e.js、./UiSwitch-4827faca.js、./UiChip-0e1c22f8.js、./UiSection-20aa64fd.js、./UiLoading-e8ef573a.js、./rich_text-0c305fc3.js、./display-6c9f60ff.js、./LockDialog-facba76a.js、./LogPanel-0a1dbbd4.js、./AboutPanel-bec7ae0c.js、./PageToast-4d6b727b.js、./GuideOverlay-6cdd13a3.js、./catalog_display-2c72a8f4.js、./download_flow-75e71906.js、./icons-0e185c35.js、./icon-button-1b68f214.js、./search-93640b9d.js、./apps-68e21edf.js、./add-8292ee90.js |

> 导入关系取自每个模块字节码原子表的头部（QuickJS 模块依赖表），只列出 `./xxx.js` 形式的应用内模块。
