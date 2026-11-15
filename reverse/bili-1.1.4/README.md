# bili-a6p 1.1.4 逆向报告

目标包：`bili-a6p-1.1.4-production.amr`（笔上哔哩，A6P 有道词典笔小程序）

## 1. 结论

- AMR 只是外壳，应用逻辑被编译成 **QuickJS 字节码**，再用 **ChaCha20-Poly1305** 加密后嵌入 `libjsapi_p73c240220fc98f0c.so`。
- 已完整还原解密流程并通过 Poly1305 tag 校验，得到 351,668 字节明文载荷。
- 载荷是一个 QuickJS 模块：`m73c240220fc98f0c.js`，4,184 个字符串原子、1,849 个函数，反汇编 122,326 行。
- 由于是字节码，**无法还原成原始 Vue 工程源码**（组件结构、变量名、注释在编译时已丢失），但可以还原完整逻辑结构、字符串资源、模块依赖和函数级伪汇编。

## 2. 包结构

| 文件 | 大小 | 说明 |
|---|---|---|
| `manifest.json` | 504 B | 应用名「笔上哔哩」，version 1.1.4，appid `8001790873150699`，quickjs `20200705` |
| `app.js.bin` | 67 B | 启动入口：模块 `app.js`、原生模块 `p73c240220fc98f0c`、入口 `run` |
| `libs/libjsapi_p73c240220fc98f0c.so` | 397,760 B | 加密载荷加载器 + 整个应用字节码 |
| `libs/libjsapi_biliio.so` | 362,008 B | 网络 / Cookie / 播放地址等原生能力 |
| `libs/libjsapi_bilidanmaku.so` | 133,000 B | 弹幕协议 |
| `libs/libjsapi_bililicense.so` | 94,968 B | 授权 / DRM |
| `libs/libjsapi_canvasdecoder.so` | 187,432 B | 视频解码 |
| `assets/nekoh264/` | - | H.264 软解与证书 |

## 3. 加密与解密

`libjsapi_p73c240220fc98f0c.so` 的加载函数（Ghidra 地址 `0x78c24`）逻辑：

1. 从 `.rodata` 读取两段 32 字节常量，异或得到主密钥；
2. 初始化 ChaCha20 状态（8 字节 nonce、64 位计数器，初始计数值由载荷头给出）；
3. 校验 16 字节 Poly1305 tag；
4. 解密 351,668 字节密文，交给 `JS_ReadObject(..., JS_READ_OBJ_BYTECODE)`；
5. `JS_ResolveModule` + `JS_EvalFunction` 执行。

载荷布局（Ghidra 虚拟地址，镜像基址 `0x10000`）：

| 地址 | 内容 |
|---|---|
| `0x126D8` | 32 字节密钥 A |
| `0x126F8` | 32 字节密钥 B（A XOR B = 主密钥） |
| `0x12718` | 初始计数器高 32 位 |
| `0x1271C` | 8 字节 nonce |
| `0x12724` | 16 字节 Poly1305 tag |
| `0x12734` | 75 字节 AAD：`{"appid":"8001790873150699","version":"1.1.4","buildId":"73c240220fc98f0c"}` |
| `0x1277F` | 351,668 字节密文 |

解密脚本：`tools/decrypt_bundle.py`

```bash
python3 tools/decrypt_bundle.py libjsapi_p73c240220fc98f0c.so -o payload.bin
```

脚本会校验 tag，输出 `metadata` 和明文 `payload.bin`。

## 4. 字节码结构

明文开头是 QuickJS 序列化格式（`BC_VERSION = 1`，即未启用 bignum 的 2020-07-05 构建）：

- 4184 个原子（字符串），采用 QuickJS 的 `(len << 1) | is_wide` 编码；
- 之后是模块字节码：32,972 字节、464 个常量、265 个闭包变量。

模块信息：

```
MODULE: m73c240220fc98f0c.js
import: biliio, canvasdecoder, volume, bilidanmaku, global, bililicense
```

顶层是严格模式 `<eval>`，通过 `fclosure8` 把各函数挂到 `_p73c*` 变量上（名称已压缩）。

## 5. 功能面（从原子表提取）

- 登录：`PhoneLogin`、`setLoginMode`、`switchLogin`、`needLogin`、`csrf_token`
- 设备标识：`buvid`、`buvid3`、`buvid4`
- 视频：`playurl`、`codec`、`resolution`、`media_bangumi`
- 弹幕：`Danmaku`、`DanmakuOverlay`、`toggleDanmaku`
- 直播：`Live`、`liveToken`、`liveMessageRows`、`stopLiveMessages`
- 搜索 / 历史 / 收藏：`searchWindow`、`inputSearch`、`setHistory`、`clearHistory`、`favorite`、`saveFavorite`
- 界面文案（部分）：友、万、直播、番剧、影视、观众
- 内嵌资源：大量 base64 PNG 图标（约 30+ 个）

HTTP 接口没有直接以 URL 形式出现在原子表中，请求由原生 `biliio` 模块完成，JS 侧只传接口标识和参数。

## 6. 原生库

- 其余 4 个 `libjsapi_bili*.so` 同样是 ARM32 ELF，字符串区域存在运行时自解密（`strings` 只能看到少量可读串）。
- `biliio.so` 负责请求签名、Cookie、取流等敏感逻辑，混淆程度高于主模块，需要单独做函数级分析。
- `canvasdecoder.so` / `nekoh264` 是解码器，与业务逻辑无直接关系。

## 7. 局限

1. QuickJS 字节码不是源码，恢复出的是操作码级反汇编，不能直接变回 `.vue` / `.ts` 原文件。
2. 变量、函数名已被压缩（`_p73cE`、`_p73cU` 等），语义需要结合字节码和字符串推断。
3. 若需要精确到「某个接口的参数构造、签名算法」，需要继续逆 `biliio.so`（工作量明显更大）。
4. 该包可能包含 B 站私有接口与 DRM 逻辑，复刻时请自行评估合规风险。

## 8. 产出文件

- `out/bytecode.txt`：完整 QuickJS 字节码反汇编（122,326 行，1,849 个函数）
- `out/atoms.json`：4,184 个字符串原子
- `out/payload.bin`：解密后的 QuickJS 字节码模块
- `out/module-info.txt`：模块头与导入信息
- `out/package-files.txt`：AMR 原始文件清单
- `tools/decrypt_bundle.py`：可复现的解密脚本

## 9. 复现反汇编（可选）

1. 下载 `quickjs-2020-07-05` 源码；
2. 在 `quickjs.c` 末尾追加一个导出函数，调用静态函数 `js_dump_function_bytecode`（并对模块类型取 `JSModuleDef->func_obj`）；
3. 用 `-DDUMP_BYTECODE=1` 编译 `libquickjs.a`；
4. 写一个 C 程序读取 `payload.bin`，调用 `JS_ReadObject(ctx, buf, len, JS_READ_OBJ_BYTECODE)`，再调用上述导出函数。

注意：官方 dump 代码在 `vars == NULL` 时会崩溃，需要把 `if (idx < var_count)` 改成 `if (vars && idx < var_count)`（`args` 同理）。
