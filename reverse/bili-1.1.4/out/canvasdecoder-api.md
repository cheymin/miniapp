# libjsapi_canvasdecoder.so 模块 API 逆向（中间稿）

> 目标：`/tmp/bili/libs/libjsapi_canvasdecoder.so`（ELF32 ARM EABI5 hard-float，静态 PIE，已 strip）
> 状态：**中间结论**，第 1、2 节为「已确认」，其余标注置信度。

## 0. 已跑通的解密方法（可复现）

该库所有字符串都在 `.data` 中加密，由 `.init_array` 里两个函数
（`0x178d0`、`0x1e4b0`）在加载时原地解密：

```
key  = *(u32*)(0x5c378) ^ *(u32*)(0x5c37c)       ; 每个字符串块前都会重新取两个 .data 字异或
r2   = key
loop:  r2 ^= r2 << 13; r2 ^= r2 >> 17; r2 ^= r2 << 5   ; xorshift32，每字节迭代一次
       byte[i] ^= r2 & 0xff
```

- 该函数被扁平化混淆成"常量异或后跳转"的状态机，但解密循环本身是明文 xorshift32。
- 用一个小型 ARM 解释器（capstone 解码 + 执行 `ldr/str/ldrb/strb/add/sub/eor/movw/movt/cmp/cmn/bne` 即可）
  从 `0x178d0`、`0x1e4b0` 顺序执行，即可还原 `.data` 中全部明文串。
- 虚拟地址 → 文件偏移：`.text` 段 `off = va - 0x10000`；`.data` 段 `off = va - 0x30000`（按 program header 分段映射）。

## 1. 模块注册名：`canvasdecoder` ✅确认

`custom_init_jsapis`(0x19b18) 里 `r0 = 0x5cde4`（ARM PC 相对：`0x19b28 + 0x432bc`），
解密后该地址内容为 `"canvasdecoder"`，`r1 = 0x19b34`（loader 入口），
调用 `registerCModuleLoader("canvasdecoder", loader_0x19b34)`。

loader(0x19b34) 是一个扁平化状态机，还原后语义为：

```c
JSModuleDef *loader(JSContext *ctx, ...) {
    JSModuleDef *m = JS_NewCModule(ctx, "canvasdecoder", module_init /*0x19d70*/);
    JS_AddModuleExport(ctx, m, "Decoder");
    JS_AddModuleExport(ctx, m, "Audio");
    JS_AddModuleExport(ctx, m, "Live");
    return m;
}
```

三个导出名分别在 `.data` 虚拟地址 `0x5cdb4` / `0x5cdc4` / `0x5cdd4`（解密后）。

## 2. 导出形态：**普通对象（每方法一个 C 函数）**，不是 class ✅确认

- 动态符号表**没有** `JS_NewClass / JS_SetClassProto / JS_NewObjectClass`，
  只有 `JS_NewCModule / JS_AddModuleExport / JS_SetModuleExport / JS_NewObject /
  JS_NewCFunction2 / JS_SetPropertyStr / JS_GetArrayBuffer / JS_ToInt32 / JS_ToFloat64 / JS_ToBool / JS_ToCStringLen2`。
- 模块初始化函数 `0x19d70`（`JSModuleInitFunc(ctx, m)`）的逻辑（已通过指令级模拟确认）：

```c
obj = JS_NewObject(ctx);
JS_SetPropertyStr(ctx, obj, "open",   JS_NewCFunction2(ctx, fn0x1a348, "open",   5, 0, 0));
JS_SetPropertyStr(ctx, obj, "frame",  JS_NewCFunction2(ctx, fn0x1ae8c, "frame",  0, 0, 0));
JS_SetPropertyStr(ctx, obj, "stop",   JS_NewCFunction2(ctx, fn0x1b220, "stop",   0, 0, 0));
JS_SetPropertyStr(ctx, obj, "pause",  JS_NewCFunction2(ctx, fn0x1b328, "pause",  0, 0, 0));
JS_SetPropertyStr(ctx, obj, "resume", JS_NewCFunction2(ctx, fn0x1b448, "resume", 0, 0, 0));
JS_SetPropertyStr(ctx, obj, "info",   JS_NewCFunction2(ctx, fn0x1b6a8, "info",   0, 0, 0));
// ... 另一个 JS_NewObject() → Audio
JS_SetPropertyStr(ctx, audio, "open",   JS_NewCFunction2(ctx, fn0x223b8, "open",   2, 0, 0));
JS_SetPropertyStr(ctx, audio, "stop",   JS_NewCFunction2(ctx, fn0x232b0, "stop",   0, 0, 0));
JS_SetPropertyStr(ctx, audio, "volume", JS_NewCFunction2(ctx, fn0x233b8, "volume", 1, 0, 0));
JS_SetPropertyStr(ctx, audio, "info",   JS_NewCFunction2(ctx, fn0x235ac, "info",   0, 0, 0));
// ... 第三个对象 → Live（分析中）
JS_SetModuleExport(ctx, m, "Decoder", obj);
JS_SetModuleExport(ctx, m, "Audio",   audio);
JS_SetModuleExport(ctx, m, "Live",    live);
```

结论：JS 侧是 `const { Decoder, Audio, Live } = require('canvasdecoder')`，
**每个导出都是单例对象，不是构造函数**，不需要 `new`。

## 3. 已确认的方法名 / 参数个数

| 导出 | 方法 | JS 声明参数个数（JS_NewCFunction2 的 length） |
|---|---|---|
| Decoder | `open` | 5 |
| Decoder | `frame` | 0（实际可能读 arguments） |
| Decoder | `stop` | 0 |
| Decoder | `pause` | 0 |
| Decoder | `resume` | 0 |
| Decoder | `info` | 0 |
| Audio | `open` | 2 |
| Audio | `stop` | 0 |
| Audio | `volume` | 1 |
| Audio | `info` | 0 |
| Live | 待确认 | — |

注意：`JS_NewCFunction2` 的 length 只是 `Function.length`，不代表真实参数上限；
真实取值需看各 C 函数里 `JS_GetArrayBuffer / JS_ToInt32 / JS_ToFloat64 / JS_ToCStringLen2` 的调用。

## 4. 待补（正在做）

- Live 对象的方法名与参数。
- `Decoder.open` 的 5 个参数含义（URL / headers / 起始时间 / 尺寸 / 音频轨？）。
- `Decoder.frame` 的返回值（ArrayBuffer + 宽高？）与 `info()` 的字段（已知有 `position`、
  `audioPosition`、`paused`、`ended`、`ready`、`error`、`gain`、`peak` 等候选字符串）。
- 与 JS 层 `openSegment / captionFrame / seek / previewSeek / ...` 的映射关系。
