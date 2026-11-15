# pstore —— 词典笔「应用商店 / 启动器」小程序逆向归档

| 项 | 值 |
|---|---|
| appid | `8001782559140681` |
| manifest version | `1.1.40` |
| 展示名 | 学习计划（商店/启动器实际承担「应用商店 + 桌面」） |
| 引擎 | QuickJS（字节码版本字节 `0x01`，atoms 段后直接跟字节码） |
| 模块数 | 48 个 `*.js.bin`（manifest 中 97 个 module 条目，其余为 `assets/` 下的 PNG 资源） |
| 体积 | atoms/字节码约 1.3 MB（`store.js.bin` 单文件 775 KB，内联了商店页面与大量文案） |

## 目录结构

```
/workspace/reverse/pstore/
├── README.md                 本文件
├── modules.md                48 个模块一句话说明 + 导入关系 + 原子数
├── strings/                  每个模块的原子/字符串清单（<module>.txt，_index.txt 为索引）
└── recovered/
    └── launcher-flow.ts      启动器 / 应用管理 / 本地 IO / 下载安装 的 TypeScript 还原稿
```

解码工具：`/workspace/reverse/tools/atoms.py`（原子表）、`dump_strings.py`（导出 strings/）、`gen_modules.py`（生成 modules.md）。
原子编码为 `hdr = (char_count << 1) | is_wide`，`is_wide=0` 时存 ASCII，`is_wide=1` 时存 UTF-16LE —— 这是 `/tmp/atoms.py` 中途 desync 的原因（宽字符被多读/少读 1 字节）。

## 运行时架构

```
app.js.bin  ──► createApp(Vue2 运行时 + Vuex?) ──► DisplayRoot（根组件，屏幕适配 / 文本编辑器宿主 / 返回键）
   │
   ├── display.js        全局单例：setBridge() / getShell() / getFetch() / getDatas()
   │                     所有页面不直接 require('bridge')，统一从这里取，便于无 bridge 环境降级
   ├── base-page.js      PageRes 页面基类：日志环形缓冲、崩溃摘要、toast、存储上报
   ├── back.js           返回键 / 侧滑手势 mixin
   ├── screen_fit.js     屏幕尺寸、紧凑模式（COMPACT_ASPECT_THRESHOLD）、横竖屏判定
   └── pages             index(商店) / launcher(桌面) / apps_manage / settings / about / log / blocked / uidebug
```

* 页面组件都带 `src/pages/<name>/<name>.vue` 与 `data-v-xxxxxxxx` 作用域 id，说明是由 Vue SFC 编译后用 QuickJS `qjsc` 打包的。
* `display` 的 `__$_require_bridge__` 原子说明 bridge 在模块初始化阶段被 require，随后 `setBridge()` 注入。
* `launcher` 与 `apps_manage` 共享 `desktop_icon.js`（注册表读取、appid→图标/安装目录映射）。

## 页面 / 路由

| 路由（Vue 页面） | 承担功能 |
|---|---|
| `src/pages/index/index.vue` | 商店首页：推荐位、分类 Tab、搜索、更新红点；`store.js.bin` 内联了首页所需的全部文案与目录数据 |
| `src/pages/launcher/launcher.vue` | 桌面：图标网格、字母索引、分页拖拽、应用启动 |
| `src/pages/apps_manage/apps_manage.vue` | 应用管理：全部/第三方/系统筛选、桌面显示开关、启动、卸载、重启 |
| `src/pages/settings/settings.vue` | 显示模式（经典/紧凑）、字体、商店偏好、更新 |
| `src/pages/about/about.vue` | 版本、许可、外链 |
| `src/pages/log/log.vue` | 运行日志查看/导出 |
| `src/pages/blocked/blocked.vue` | 授权/拦截提示 |
| `src/pages/uidebug/uidebug.vue` | UI 尺寸/颜色调试 |

## 原生能力（`require('bridge')`）

pstore 的 `libs/libjsapi_bridge.so` 只导出三个子模块名（`Shell` / `Fetch` / `Dbase`），
文件类方法（`readFile`、`listFiles`、`fsAction`、`getSystemInfo`）与 Shell 同属一个桥接实现。

| 子模块 | 方法（自 .so 字符串表确认） | 用途 |
|---|---|---|
| `Shell` | `exec`、`execAsync`、`openPty`、`getScreenSize`、`getStorageInfo`、`getSystemInfo`、`listFiles`、`readFile`、`fsAction` | 执行 `cat`/`mkdir`/`printf`/`mv`/`reboot`、读写注册表、屏幕与存储信息 |
| `Fetch` | `fetch`、`downloadFile`、`downloadToFile` | 商店 API 与安装包下载 |
| `Dbase` | `read`、`write`、`remove`、`list` | 键值存储（`pstore_device_id`、`pstore_device.json` 等） |

另有独立原生模块 `pstore_license`（`libjsapi_pstore_license.so`，注册名即 `pstore_license`）：

```
checkLicense(appid)      // 校验本机授权，token 中带 appid + device_id
challenge()              // 向服务端取挑战串，参与签名
checkUpdate(...)         // 应用更新检查
applyUpdate(...)         // 校验 size/checksum 后落盘安装
```

### 依赖库（`libs/`）

| 库 | 大小 | 作用 |
|---|---|---|
| `libcurl.so` | 424 KB | license 模块与 Fetch 的 HTTP 栈（so 内有 CURL 初始化失败日志） |
| `libsqlite3.so` | 902 KB | Dbase 键值/表存储的后端 |
| `libjsapi_bridge.so` | 597 KB | JS↔原生桥：Shell / Fetch / Dbase（已 strip，仅字符串表可用） |
| `libjsapi_pstore_license.so` | 560 KB | 授权校验、挑战签名、更新应用 |

请求头固定为 `X-Device-Id`、`X-Device-Storage`、`X-Signature`；设备指纹读取
`/sys/block/mmcblk{0,1,2}/device/cid`（eMMC CID），因此**授权与设备硬件绑定，换卡即失效**。
`applyUpdate` 会做 `size mismatch got=%zu expect=%lld` 与 `checksum mismatch` 双重校验。

## 网络与鉴权

* 唯一业务域名：`https://store.posc.net`，CDN 备用域：`pstore.posc.net`。
* 商店 API（`store.js.bin` 中提取）：

```
/api/device/license              /api/device/check-update        /api/device/software
/api/device/software/detail      /api/device/software/download   /api/device/app-update?sku=
/api/device/download/<id>        /api/device/order/status        /api/device/report
/api/device/agreements/accept    /api/device/trial               /api/device/app-lock
/api/device/sponsors             /api/device/sponsors/set        /api/device/sponsor/tiers
/api/pstore/cdn-probe            /api/pstore/agreements/<ver>
```

* 请求签名（`local_io.signRequestHeaders`）：
  * `X-Device-Id`、`X-Timestamp`、`X-Nonce`（`nonceSeq + randomNonce`）、`X-Signature`；
  * 签名算法在 JS 内实现（`sha256Raw` / `hmacSha256Hex` / `sha256Hex`，自带 SHA-256 K 常量和 `rotr`），
    由 URL path + query + timestamp + nonce + 设备密钥做 HMAC-SHA256；
  * 设备密钥文件：`/userdisk/pstore/.device_key`（旧路径兼容 `/userdata/...`、Dbase 表），
    对应 `pstore_device_id` / `pstore_device.json`，与 `pstore_license` 共用。
* 错误码（`download_flow` 内明文字符串，已直接解码）：`SUBSCRIPTION_EXPIRED`、`ENTITLEMENT_REVOKED`、
  `PURCHASE_REQUIRED`、`HTTPS_REQUIRED`、`DEVICE_AUTH_EXPIRED`、`DEVICE_NONCE_REUSED`、
  `DEVICE_DISABLED`、`DEVICE_SIGNATURE_INVALID`；401 会走 `plan401Recovery()`（换 CDN / 重新取 key / 提示校正时间）。

## 关键流程

1. **桌面启动（launcher）**：`readRegistry()` 读 `packages.json` → 过滤 `flag` → 生成图标网格 →
   点击时校验 `isSafeName(appid)` → 先 `$falcon.navTo('falcon://<appid>/index')`，
   失败再 `miniapp_cli start "<appid>" > /dev/null 2>&1 &`。
2. **应用管理（apps_manage）**：`cat "/userdata/cfg/sys_config.conf"` 取 A/B 槽信息 → 合并注册表 →
   开关桌面显示 = 改 `packages.json` 的 `flag`（重启后生效）→ `miniapp_cli uninstall "<appid>"` → `reboot`。
3. **本地 IO（local_io）**：shell 封装（`shellQuoteSingle`、`printf "%s\n"` + `mv -f` 原子替换），
   分块写文件（`WRITE_SINGLE_LIMIT` / `WRITE_CHUNK_CHARS`），应用锁记录
   （`/userdisk/pstore/.app_lock`，PIN 加盐迭代、连错锁定、恢复码），helper 数据（`.helper_data`）。
4. **下载安装（download_flow）**：`preflightDownload()` 检查存储 →
   `orderCdnOrigins()`/`pickFastestProbe()` 选 CDN → `downloadToFile` 轮询（`DL_PHASE_TRANSFER → VERIFY → INSTALL`）→
   `parseSha256Sum()` + `checksumDecision()` 校验 → `parseInstallResult()` 解析 `miniapp_cli install` 返回 →
   `miniapp_cli start`。失败按 `DOWNLOAD_ERROR_CODES` 映射文案并做多 CDN 重试。

## 字符串混淆

`local_io` / `download_flow` / `desktop_icon` / `store` / `store-7e7ff099` / `uidebug` / `base-page` /
`pay_flow` / `catalog_display` / `lock_flow` / `client_log` / `back` 共 12 个模块的中文与路径是
「base64 后大小写翻转」的混淆串，例如 `5Q2J5zYO5A6j6kof` → `5q2j5Zyo5a6J6KOF` → `正在安装`。解码只需：

```python
s2 = ''.join(c.swapcase() if c.isalpha() else c for c in s)
base64.b64decode(s2 + '=' * (-len(s2) % 4)).decode()
```

因此 `strings/*.txt` 中同时保留了原始混淆串（可离线解码），未做二次清洗。

## 局限

* 字节码未做完整反汇编：控制流、闭包变量与 Vue 模板渲染函数来自原子顺序 + 命名推断，
  `README` 中的参数顺序以字符串与调用点顺序为准，标注了「推断」的部分需结合真机验证。
* `store.js.bin` 单文件 3,474 条原子（含大量内联文案与目录数据），已完整导出到 `strings/store.txt`；
  导出器对超长原子（>400 字符）做截断并标注原长度，避免单行不可读。
