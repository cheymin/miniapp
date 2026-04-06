# AstrBot HTTP API

从 v4.18.0 开始，AstrBot 提供基于 API Key 的 HTTP API，开发者可以通过标准 HTTP 请求访问核心能力。

## 快速开始

1. 在 WebUI - 设置中创建 API Key。
2. 在请求头中携带 API Key：



```
Authorization: Bearer abk_xxx
```

也支持：



```
X-API-Key: abk_xxx
```

1. 对于对话接口，`username` 为必填参数：

- `POST /api/v1/chat`：请求体必须包含 `username`
- `GET /api/v1/chat/sessions`：查询参数必须包含 `username`

## Scope 权限说明

创建 API Key 时可配置 `scopes`。每个 scope 控制可访问的接口范围：

| Scope    | 作用                                   | 可访问接口                                       |
| :------- | :------------------------------------- | :----------------------------------------------- |
| `chat`   | 调用对话能力、查询对话会话             | `POST /api/v1/chat`、`GET /api/v1/chat/sessions` |
| `config` | 获取可用配置文件列表                   | `GET /api/v1/configs`                            |
| `file`   | 上传附件文件，获取 `attachment_id`     | `POST /api/v1/file`                              |
| `im`     | 主动发 IM 消息、查询 bot/platform 列表 | `POST /api/v1/im/message`、`GET /api/v1/im/bots` |

如果 API Key 未包含目标接口所需 scope，请求会返回 `403 Insufficient API key scope`。

## 常用接口

**对话类**

调用 AstrBot 内建的 Agent 进行对话交互。支持插件调用、工具调用等能力，与 IM 端对话能力一致。

- `POST /api/v1/chat`：发送对话消息（SSE 流式返回，不传 `session_id` 会自动创建 UUID）
- `GET /api/v1/chat/sessions`：分页获取指定 `username` 的会话
- `GET /api/v1/configs`：获取可用配置文件列表

**文件上传**

- `POST /api/v1/file`：上传附件

**IM 消息发送**

- `POST /api/v1/im/message`：按 UMO 主动发消息
- `GET /api/v1/im/bots`：获取 bot/platform ID 列表

## `message` 字段格式（重点）

`POST /api/v1/chat` 和 `POST /api/v1/im/message` 的 `message` 字段支持两种格式：

1. 字符串：纯文本消息
2. 数组：消息段（message chain）

### 1. 纯文本格式



```
{
  "message": "Hello"
}
```

### 2. 消息段数组格式



```
{
  "message": [
    { "type": "plain", "text": "请看这个文件" },
    { "type": "file", "attachment_id": "9a2f8c72-e7af-4c0e-b352-111111111111" }
  ]
}
```

支持的 `type`：

| type     | 必填字段        | 可选字段        | 说明             |
| :------- | :-------------- | :-------------- | :--------------- |
| `plain`  | `text`          | -               | 文本段           |
| `reply`  | `message_id`    | `selected_text` | 引用回复某条消息 |
| `image`  | `attachment_id` | -               | 图片附件段       |
| `record` | `attachment_id` | -               | 音频附件段       |
| `file`   | `attachment_id` | -               | 通用文件段       |
| `video`  | `attachment_id` | -               | 视频附件段       |

- reply 消息段目前仅适配 `/api/v1/chat`，不适用于 `POST /api/v1/im/message`。

说明：

- `attachment_id` 来自 `POST /api/v1/file` 上传结果。
- `reply` 不能单独作为唯一内容，至少需要一个有实际内容的段（如 `plain/image/file/...`）。
- 仅 `reply` 或空内容会返回错误。

### Chat API 的 `message` 用法

`POST /api/v1/chat` 额外需要 `username`，可选 `session_id`（不传会自动创建 UUID）。



```
{
  "username": "alice",
  "session_id": "my_session_001",
  "message": [
    { "type": "plain", "text": "帮我总结这个 PDF" },
    { "type": "file", "attachment_id": "9a2f8c72-e7af-4c0e-b352-111111111111" }
  ],
  "enable_streaming": true
}
```

### IM Message API 的 `message` 用法

`POST /api/v1/im/message` 需要 `umo` + `message`。



```
{
  "umo": "webchat:FriendMessage:openapi_probe",
  "message": [
    { "type": "plain", "text": "这是主动消息" },
    { "type": "image", "attachment_id": "9a2f8c72-e7af-4c0e-b352-222222222222" }
  ]
}
```

## 示例



```
curl -N 'http://localhost:6185/api/v1/chat' \
  -H 'Authorization: Bearer abk_xxx' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Hello","username":"alice"}'
```

## 完整 API 文档

交互式 API 文档请查看：

- https://docs.astrbot.app/scalar.html



# AstrBot 开放API

下载 OpenAPI 文档下载 OpenAPI 文档

AstrBot 的开发者 HTTP API。对 /api/v1/* 端点使用 API 密钥认证。

服务器

服务器：http://localhost:6185

认证

精选授权类型

未选择认证

客户端库

贝壳卷曲



开放API复制链接

通过API密钥认证的开发者API

开放API运营

- 去/api/v1/im/bots
- 后/api/v1/file
- 去/api/v1/file
- 后/api/v1/chat
- 去/api/v1/chat/sessions
- 后/api/v1/im/message
- 去/api/v1/configs

列表机器人ID复制链接

返回已配置的机器人/平台ID。

回应

- application/json

- 401复制401链接

  未经授权

- 403复制403链接

  禁止

请求示例get/api/v1/im/bots

贝壳卷曲

```curl
curl http://localhost:6185/api/v1/im/bots \
  --header 'X-API-Key: YOUR_SECRET_TOKEN'
```



测试请求（获取 /api/v1/im/bots）

状态：200状态：401状态：403

```json
{
  "status": "ok",
  "message": null,
  "data": {
    "bot_ids": [
      "string"
    ]
  }
}
```



好的

上传附件文件复制链接

上传一个文件，获取attachment_id以备后续在聊天/消息API中使用。

正体

要求

多部分/形式-数据

- 文件复制链接到文件

  类型：弦形式：二进制

  要求

  用于描述文件的二进制数据

回应

- application/json

- 401复制401链接

  未经授权

- 403复制403链接

  禁止

请求示例post/api/v1/file

贝壳卷曲

```curl
curl http://localhost:6185/api/v1/file \
  --request POST \
  --header 'Content-Type: multipart/form-data' \
  --header 'X-API-Key: YOUR_SECRET_TOKEN' \
  --form 'file=@filename'
```



测试请求（发布于 /api/v1/file）

状态：200状态：401状态：403

```json
{
  "status": "ok",
  "message": null,
  "data": {
    "attachment_id": "string",
    "filename": "string",
    "type": "string"
  }
}
```



好的

获取附件文件复制链接

attachment_id 获取上传的附件文件。

查询参数

- 依恋_id复制附件链接_id

  类型：弦

  要求

  附件 ID 由 POST /api/v1/file 返回。

回应

- 应用/八位元组流

- 401复制401链接

  未经授权

- 403复制403链接

  禁止

请求示例get/api/v1/file

贝壳卷曲

```curl
curl 'http://localhost:6185/api/v1/file?attachment_id=' \
  --header 'X-API-Key: YOUR_SECRET_TOKEN'
```



测试请求（获取 /api/v1/file）

状态：200状态：401状态：403

```json
@filename
```



好的

发送聊天消息（SSE）复制链接

向 AstrBot 聊天管道发送消息，接收流式 SSE 回复。重复使用 /api/chat/send 的行为。如果省略了session_id/conversation_id，服务器会创建一个新的UUID新session_id。

正体

要求

application/json

- 信息复制链接至消息

  要求

  其中之一弦

  - 类型：弦

- 用户名复制用户名链接

  类型：弦

  要求

  目标用户名。

- 配置_id？复制链接到配置中_id

  类型：弦

  可选的 AstrBot 配置文件 ID。如果提供了，聊天会话将使用该配置文件。使用“default”重置为默认配置。

- 配置_name复制配置文件链接_name

  类型：弦

  可选的 AstrBot 配置文件名。仅在未提供config_id时使用。

- 对话_id复制对话链接_id

  类型：弦

  session_id的别名。

- 使得能_streaming。复制链接以启用吗_streaming

  类型：布尔值

  默认

- 精选_model复制链接至选中链接_model

  类型：弦

- 被选中_provider复制链接至选中链接_provider

  类型：弦

- 会谈_id复制会话链接_id

  类型：弦

  可选的聊天会话ID。如果省略（conversation_id也被省略），服务器会自动创建一个UUID。

回应

- 文本/事件流

- 401复制401链接

  未经授权

- 403复制403链接

  禁止

请求示例帖子/API/v1/聊天

贝壳卷曲

```curl
curl http://localhost:6185/api/v1/chat \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'X-API-Key: YOUR_SECRET_TOKEN' \
  --data '{
  "message": "Hello",
  "username": "alice",
  "session_id": "my_session_001",
  "enable_streaming": true
}'
```



平原

测试请求（帖子 /api/v1/chat）

状态：200状态：401状态：403

```json
string
```



SSE 流

带有分页的列表聊天会话复制链接

列出指定用户名的聊天会话。

查询参数

- 页面复制页面链接

  类型：整数min： 1

  默认

  整数。

- 佩奇_size复制页面链接_size

  类型：整数min： 1马克斯： 100

  默认

  整数。

- 平台_id复制平台链接_id

  类型：弦

  可选平台过滤器

- 用户名复制用户名链接

  类型：弦

  要求

  目标用户名。

回应

- application/json

- 401复制401链接

  未经授权

- 403复制403链接

  禁止

请求示例get/api/v1/chat/sessions

贝壳卷曲

```curl
curl 'http://localhost:6185/api/v1/chat/sessions?page=1&page_size=20&platform_id=&username=' \
  --header 'X-API-Key: YOUR_SECRET_TOKEN'
```



测试请求（获取 /api/v1/chat/sessions）

状态：200状态：401状态：403

```json
{
  "status": "ok",
  "message": null,
  "data": {
    "sessions": [
      {
        "session_id": "string",
        "platform_id": "string",
        "creator": "string",
        "display_name": null,
        "is_group": 1,
        "created_at": "2026-04-06T10:53:33.109Z",
        "updated_at": "2026-04-06T10:53:33.109Z"
      }
    ],
    "page": 1,
    "page_size": 1,
    "total": 1
  }
}
```



好的

主动向平台机器人发送消息复制链接

通过 umo + 消息链载荷直接向平台机器人发送消息。

正体

要求

application/json

- 信息复制链接至消息

  要求

  其中之一弦

  - 类型：弦

- 乌莫复制链接到 UMO

  类型：弦

  要求

  统一消息来源。格式：平台：message_type：session_id

回应

- application/json

- 401复制401链接

  未经授权

- 403复制403链接

  禁止

请求示例POST/API/V1/IM/Message

贝壳卷曲

```curl
curl http://localhost:6185/api/v1/im/message \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'X-API-Key: YOUR_SECRET_TOKEN' \
  --data '{
  "umo": "webchat:FriendMessage:openapi_probe",
  "message": "ping from api key"
}'
```



平原

测试请求（发布 /api/v1/im/消息）

状态：200状态：401状态：403

```json
{
  "status": "ok",
  "message": null,
  "data": {
    "additionalProperty": "anything"
  }
}
```



好的

列出可用的聊天配置文件复制链接

返回所有可用的 AstrBot 配置文件，这些配置文件可以通过 Chat API 通过 config_id/config_name 选择。

回应

- application/json

- 401复制401链接

  未经授权

- 403复制403链接

  禁止

请求示例get/api/v1/configs

贝壳卷曲

```curl
curl http://localhost:6185/api/v1/configs \
  --header 'X-API-Key: YOUR_SECRET_TOKEN'
```



测试请求（获取 /api/v1/configs）

状态：200状态：401状态：403

```json
{
  "status": "ok",
  "message": null,
  "data": {
    "configs": [
      {
        "id": "string",
        "name": "string",
        "path": "string",
        "is_default": true
      }
    ]
  }
}
```



