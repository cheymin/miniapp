# 修复 AI 助手 / 新 AI 聊天全部不可用（1.2.44 回归）

## 一、问题摘要

用户反馈（1.2.44 升级后出现）：
- **AI 助手**：能打开，但无法发消息、设置无法保存、无法创建新对话；待一会儿后设备重启，随后 database 损坏，无法再进入 AI 助手。
- **新 AI 聊天**：点开「设置」黑屏。
- API 配置此前有效；问题在升级到 1.2.44 后出现。

两个 AI 助手共用同一套原生层（`jsapi/src/AI/AI.cpp` 的 `AI` 类 + `ConversationManager` + `Database` + `Fetch`），前端分别走 `pages/ai/ai.ts`（旧，`AI`）和 `pages/chat/chat.ts`（新，`Chat`）。

## 二、根因分析（基于代码静态审查）

### 根因 1：流式回调触发整表重写风暴（最致命）

[ai.cpp](file:///workspace/jsapi/src/AI/AI.cpp) 的 `AI::generateResponse`（旧 AI 助手走这条路径，经 `JSAI::generateResponse`）在 `packedStreamCallback` 里，**每收到一个 content/reasoning delta 都调用 `saveConversation()`**：

```cpp
// AI.cpp 第 363 行（responseStarted 时）
saveConversation();
// AI.cpp 第 384 行（每个 delta 更新后）
saveConversation();
```

而 [ConversationManager::saveConversation](file:///workspace/jsapi/src/AI/ConversationManager.cpp#L107-L141) 的实现是"整表重写"：

```cpp
database.update("conversations").set("updated_at", currentTime).where("id", conversationId).execute();
database.remove("conversation_nodes").where("conversation_id", conversationId).execute(); // DELETE 全部节点
for (const auto &pair : nodeMap)                                                          // 重新 INSERT 全部节点
    database.insert("conversation_nodes")...execute();
```

后果：一条 2000 token 的回复 ≈ 2000 次「1 UPDATE + 1 DELETE全表 + N INSERT」的完整事务序列。ARMv7 单核 + uclibc + 慢闪存上：
- 单次回复耗时极长，触发设备 watchdog → 中途重启 → SQLite 写到一半 → **数据库文件损坏**。
- 流式写回调与 UI 读线程并发，无 WAL/无 busy_timeout → `database is locked` → 发消息/保存设置/建会话全失败。

`AI::generateResponseIncremental`（新 AI 聊天走这条，经 `JSChat::generateResponse`）稍好（用 `updateNodeContent` 单行 UPDATE），但仍在 `responseStarted` 时调用一次 `saveConversation()` 整表重写，且每个 delta 仍触发一次 `updateNodeContent`（1 次 UPDATE + 隐式 commit）。在节点数多或回复长时仍会加剧锁竞争。

### 根因 2：Database 构造函数有内存安全 bug

[Database.cpp:21-25](file:///workspace/jsapi/src/Database/Database.cpp#L21-L25)：

```cpp
DATABASE::DATABASE(const std::string &filePath)
{
    if (sqlite3_open(filePath.c_str(), &conn) != SQLITE_OK && conn)
        sqlite3_close(conn);
}
```

问题：
1. `conn` 成员在 [Database.hpp:36](file:///workspace/jsapi/src/Database/Database.hpp#L36) 未初始化为 `nullptr`。
2. `sqlite3_open` 失败时 `close(conn)` 后**未将 conn 置 nullptr** → 悬垂指针；析构时 `sqlite3_close(conn)` 再次 close → **double-free / use-after-free**。
3. 失败时**不 throw**，后续 `table()/select()/insert()` 用无效句柄执行 SQL → 原生层段错误。

当数据库文件已损坏（根因 1 的后果），`sqlite3_open` 可能成功但后续 `loadConversation` 的 SELECT 抛异常；若文件本身坏到 open 阶段失败或并发句柄异常，则触发段错误 → 前端 `Chat.initialize()` / `AI.initialize()` 原生崩溃 → 页面黑屏（chatSettings 调 `Chat.initialize` 时正是此症状）。

### 根因 3：无并发保护（WAL / busy_timeout 缺失）

`DATABASE` 构造里未设置 `PRAGMA journal_mode=WAL`、`PRAGMA busy_timeout`。流式回调线程写、UI 线程读，默认 rollback journal + 无等待 → 频繁 `SQLITE_BUSY` → 操作失败。

### 根因 4：JSAI 枚举序列化不一致

[JSAI.cpp:50-57](file:///workspace/jsapi/src/AI/JSAI.cpp#L50-L57) `getCurrentPath` 返回 `{"role", msg.role}`、`{"stopReason", msg.stopReason}` **未加强转**；而 [JSChat.cpp:54-55](file:///workspace/jsapi/src/AI/JSChat.cpp#L54-L55) 是 `{"role", (int)msg.role}`、`{"stopReason", (int)msg.stopReason}`。Bson 对裸 enum 的序列化行为依赖库实现，可能产出非整数值 → 前端 `message.role === 0` 判断失效（旧 AI 助手消息角色/停止原因显示异常）。

### 根因 5：db 损坏后无恢复路径

[AI.cpp 构造函数](file:///workspace/jsapi/src/AI/AI.cpp#L30-L56)：若 `conversationManager.loadConversation` 抛异常（db 损坏），异常一路传播到 `JSAI::initialize` / `JSChat::initialize` 的 catch，前端 `AI.initialize()` 抛错 → `aiInitialized` 保持 false → 永远无法发消息，且每次进入都尝试打开同一个损坏 db → 恶性循环。

## 三、修复方案（决策完整，可直接执行）

### 修改 1：[jsapi/src/Database/Database.cpp](file:///workspace/jsapi/src/Database/Database.cpp) — 修复构造函数 + 加 WAL/busy_timeout

将构造函数改为：

```cpp
DATABASE::DATABASE(const std::string &filePath)
{
    conn = nullptr;
    if (sqlite3_open(filePath.c_str(), &conn) != SQLITE_OK)
    {
        std::string err = conn ? sqlite3_errmsg(conn) : "unknown open error";
        if (conn) { sqlite3_close(conn); conn = nullptr; }
        throw std::runtime_error("sqlite3_open failed for '" + filePath + "': " + err);
    }
    // 并发保护：WAL + 忙等待，避免流式写线程与 UI 读线程互相 SQLITE_BUSY
    sqlite3_busy_timeout(conn, 5000);
    sqlite3_exec(conn, "PRAGMA journal_mode=WAL;", nullptr, nullptr, nullptr);
    sqlite3_exec(conn, "PRAGMA synchronous=NORMAL;", nullptr, nullptr, nullptr);
}
```

同时在 [Database.hpp:36](file:///workspace/jsapi/src/Database/Database.hpp#L36) 把 `sqlite3 *conn;` 改为 `sqlite3 *conn = nullptr;`。

### 修改 2：[jsapi/src/AI/AI.cpp](file:///workspace/jsapi/src/AI/AI.cpp) — 消除流式整表重写风暴

**`generateResponse`（旧 AI 助手路径）**：把 `packedStreamCallback` 里的两次 `saveConversation()` 调用去掉。改为：
- `responseStarted` 时：仅 `addNode` 到内存 `nodeMap`，**不写库**（创建 assistant 节点并入内存树即可）。
- 每个 delta：仅更新内存里的 `assistantNode->content / reasoningContent`，**不写库**。
- 在 `generateResponse` 末尾（流结束 / 取消 / 出错）统一调用一次 `saveConversation()` 做持久化。

即：把"每 chunk 全表重写"改为"流式期间只更新内存 + 流结束一次性落库"。

**`generateResponseIncremental`（新 AI 聊天路径）**：保留 `updateNodeContent` 增量更新，但加节流——用 `lastSaveTime` 记录，距离上次写库 < 500ms 则只更新内存不写库；流结束统一 `updateNodeContent` + `updateNodeStopReason` 落库一次。`responseStarted` 时的 `saveConversation()` 整表重写改为仅在内存建节点，不落库（首次落库交给后续 `updateNodeContent` 或结束时的统一保存）。

### 修改 3：[jsapi/src/AI/AI.cpp](file:///workspace/jsapi/src/AI/AI.cpp) 构造函数 — db 损坏可恢复

在 `AI(const std::string &dbPath)` 构造里，把 `loadConversation` 包在独立 try/catch 中：

```cpp
try
{
    conversationManager.loadConversation(conversationId, nodeMap, rootNodeId, currentNodeId);
}
catch (const std::exception &e)
{
    // db 损坏：备份旧库 + 从默认对话重开，避免永久卡死
    std::string backupPath = ... ; // 例如 dbPath + ".corrupt." + 时间戳
    rename(dbPath.c_str(), backupPath.c_str()); // best-effort
    // 重新打开一个干净库（ConversationManager 持有的是已坏句柄，需要重建）
    // 见下方"决策点"
}
```

**决策点（执行时落实）**：`ConversationManager` 内部 `database` 成员是值语义且不可重新打开。最稳妥做法是：在 `ConversationManager` 增加 `resetDatabase()` 方法，或把 `loadConversation` 的失败处理放到 `ConversationManager` 层（捕获后重建 Database）。推荐在 `ConversationManager::loadConversation` 内部 try/catch，失败时调用一个 `recover()` 重建 conversations/nodes/api_settings 三表，并在外层 `AI` 构造里随之重建 `nodeMap` 为默认 system 节点。

### 修改 4：[jsapi/src/AI/JSAI.cpp](file:///workspace/jsapi/src/AI/JSAI.cpp) — 枚举序列化加强转

[JSAI.cpp:53-54](file:///workspace/jsapi/src/AI/JSAI.cpp#L53-L54) 把：
```cpp
{"role", msg.role},
{"stopReason", msg.stopReason},
```
改为（与 JSChat 一致）：
```cpp
{"role", (int)msg.role},
{"stopReason", (int)msg.stopReason},
```

### 修改 5：前端容错（防御性，非必须但建议）

- [pages/ai/ai.ts](file:///workspace/ui/src/pages/ai/ai.ts) 和 [pages/chat/chat.ts](file:///workspace/ui/src/pages/chat/chat.ts) 的 `mounted` 里 `AI.initialize()` / `Chat.initialize()` 已有 try/catch，保持。无需大改。
- [pages/chatSettings/chatSettings.vue](file:///workspace/ui/src/pages/chatSettings/chatSettings.vue) 模板里 `{{apiKey.split('').map(_ => '*').join('') || '点击输入API密钥'}}` 在 apiKey 为空时正常（`[].join('')` = `''` → fallback 生效），**确认无需改**。chatSettings 黑屏的根因是 `Chat.initialize` 原生崩溃，修改 1+3 修复后即恢复。

## 四、不改动的内容

- 不改 `Fetch.cpp`（流式缓冲逻辑 PROJECT_GUIDE 6.1 明确警告勿回退）。
- 不改前端 Vue 语法子集限制相关代码。
- 不动版本号三处同步（本次为 bugfix，可在 commit message 带 `v1.2.45: 修复 AI 助手数据库损坏` 并同步更新 [ui/package.json](file:///workspace/ui/package.json)、[ui/src/pages/update/update.ts](file:///workspace/ui/src/pages/update/update.ts)、[README.md](file:///workspace/README.md)）。
- 不引入新依赖、不重构无关模块。

## 五、假设与决策

- **假设**：1.2.44 之前的某个版本已引入"每 chunk 全表重写"或节点数/回复长度显著增加的改动（shallow clone 只有 2 个 commit，无法 diff 确认）。无论回归点在哪，上述修复均从根上消除写风暴，覆盖回归。
- **决策**：修改 1-4 全部执行；修改 5 不做无谓改动。版本号升到 1.2.45。
- **决策**：不本地构建（PROJECT_GUIDE 2.2 明确不要本地 build，依赖 GitHub Actions）。改完 push 触发 CI，设备 OTA 升级验证。
- **决策**：db 恢复采用"备份坏库 + 重建空库 + 默认对话"策略，保留坏库供事后分析，不尝试修复旧数据（用户数据损失风险已在症状中体现，优先恢复可用性）。

## 六、验证步骤

1. **commit & push**：`git add -A && git commit -m "v1.2.45: 修复 AI 助手/新AI聊天数据库损坏与黑屏" && git push origin main`。
2. 等 GitHub Actions 构建出 `miniapp.amr`（见 [.github/workflows/build_for_a6p.yml](file:///workspace/.github/workflows/build_for_a6p.yml)）。
3. 设备端：设置 → 检查更新 → OTA 升级到 1.2.45。
4. **验证旧 AI 助手**：
   - 进入 AI 助手，能正常看到历史对话（若旧库已损坏，应自动重建为默认对话，不再黑屏/卡死）。
   - 发送一条消息，流式输出正常，回复完成后设备不重启。
   - 进入「设置」能保存 API 配置；进入「历史」能创建新对话。
5. **验证新 AI 聊天**：
   - 点「设置」不再黑屏，能加载并保存配置。
   - 发送消息流式正常，多次往返不损坏 db。
6. **回归验证**：连续发送 5+ 条长回复，观察设备不重启、db 文件未损坏（可进 penshell 执行 `ls -la /userdisk/database/` 确认 `langningchen-ai.db` / `langningchen-chat.db` 大小合理、有 `-wal` 文件）。
7. 若仍异常，通过 penshell 抓 `logcat` 或 native 日志定位。
