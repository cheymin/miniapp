# 如何调用喜马拉雅风格的音乐播放器

本文档专门讲“如何调用播放器”，目标是把仓库里可见的 JS 源码和可见 `.so` 符号/字符串信息，整理成一份可以直接照着实现的调用手册。

说明：
- 本文档不依赖 `.so` 反编译结果
- 但使用了 `.so` 的静态符号和字符串扫描来补足字段、流程和底层职责
- 结论以仓库内现有数据为准

重点参考：
- `喜马拉雅/a/xmlyNativeSdk-6efe1704.js`
- `喜马拉雅/a/providers/mediaPlayerListProvider.js`
- `喜马拉雅/a/album.js`
- `喜马拉雅/a/player-4de55b85.js`
- `喜马拉雅/a/app.js`
- `喜马拉雅/a/libs/libjsapi_xmly_arm64-cherry3566_20250609_110125_2094904810.so`

---

## 1. 先理解：这个播放器不是“给 URL 就播”的简单播放器

它和浏览器 `<audio>` 或常见移动端播放器很不一样。

它的设计是三层：

1. **页面层**：专辑页、搜索页、历史页触发播放
2. **播放器服务层**：`mediaPlayerService`
3. **列表 Provider 层**：`mediaPlayerListProvider`

也就是说：
- 页面不会直接把完整曲目列表塞给播放器
- 页面会告诉播放器“去哪里拿列表”
- 播放器再通过 Provider 向 JS 请求列表内容、上一首、下一首、随机、收藏、字幕等能力

这也是为什么它的播放协议看起来比普通播放器复杂很多。

---

## 2. 核心对象总览

## 2.1 页面里常见的几个对象

### `$falcon.xmlyPlayer`
在 `app.js` 启动时创建：

```js
$falcon.xmlyPlayer = new xmlyPlayerModule.XmlyPlayer();
```

用途：
- 获取当前播放信息
- 监听播放状态变化
- 监听当前 track 变化
- 监听家长管控收听间隔事件

### `NativeSDK`
封装了更高层的播放器调用能力，例如：
- `HandlePlayer()`
- `SdkPlayTrack()`
- `getCurrentAlbum()`
- `getPlayerState()`
- `startTextEdit()`

### `MediaPlayerService`
定义在 `xmlyNativeSdk-6efe1704.js` 中，负责连接到系统播放器服务：

```text
falcon://8001650599023931/mediaPlayerService
```

### `mediaPlayerListProvider`
定义在：
- `喜马拉雅/a/providers/mediaPlayerListProvider.js`

它是播放器的“列表数据源”。

---

## 3. 调用播放器的最上层入口

## 3.1 最常用入口：`NativeSDK.SdkPlayTrack(playInfo)`

这是页面层最应该调用的入口。

你在这些页面里都能看到：
- `album.js`
- `history.js`
- `security_education_index.js`
- `global_travel_daily_station.js`
- `history_travel_chapter.js`

### 最简示例

```js
NativeSDK.SdkPlayTrack({
  albumSupplier: '100014',
  albumId: '123456',
  albumTitle: '超级故事专辑',
  albumTrackCount: 20,
  trackId: '987654',
  trackTitle: '第一集'
});
```

## 3.2 页面成功触发播放后通常会再打开播放器页面

例如 `album.js`：

```js
const playSuccess = await this.playTrack(item);
if (playSuccess) {
  NativeSDK.HandlePlayer('player');
  this.curPlayTrackId = parseInt(item.trackId);
}
```

所以常见完整流程是：

1. 调 `SdkPlayTrack()`
2. 如果成功，再调 `HandlePlayer('player')`

---

## 4. `SdkPlayTrack` 的真实作用

`SdkPlayTrack()` 并不是直接开始播音频文件，而是在做这些事：

1. 标准化供应商和专辑 ID
2. 判断是否需要续播
3. 构造 `playAlbum` 协议 JSON
4. 调 `MediaPlayerService.playAlbum()`
5. 让底层播放器通过 Provider 去拿列表

这意味着：
- 你最好复用它
- 不建议页面自己手拼 `playAlbum`，除非你完全理解协议

---

## 5. `SdkPlayTrack` 可传字段说明

从 JS 源码和 `.so` 可见信息综合整理，推荐使用这些字段：

```ts
interface XmSdkPlayTrackParams {
  albumSupplier: string;      // 100014=小喜马, 100008=大喜马
  albumId: string | number;
  albumTitle: string;
  albumTrackCount: number;

  trackId: string | number;
  trackTitle?: string;

  playlistType?: 'normal' | 'download' | 'swap';
  breakSecond?: number;       // 从第几秒开始播
  correctTrack?: boolean;     // false 时底层会尝试恢复上次播放到的 track
  voiceUserId?: string;       // 变声/声音定制
  recordId?: string;          // 特定业务记录 id
}
```

### 字段解释

#### `albumSupplier`
- `'100014'`：小喜马
- `'100008'`：大喜马

#### `albumId`
专辑 ID。

注意：
- 对大喜马来说，底层实际会把它转换成 `2_1_<albumId>` 格式。

#### `albumTrackCount`
专辑下曲目总数，播放器用于显示列表总量和播放上下文。

#### `trackId`
当前希望起播的音频 ID。

#### `breakSecond`
如果传入，会让播放器从该秒数开始播。

#### `correctTrack`
如果设为 `false`：
- 底层会通过原生 API 查“该专辑上次播放到哪首”，然后自动替换掉当前 `trackId`
- 非常适合“继续播放”场景

#### `voiceUserId`
用于变声、角色声音、朋友声音等场景。

#### `recordId`
用于某些记录型播放链路，例如朋友故事、声音定制相关。

---

## 6. 供应商与 `albumId` 的隐藏规则

这是调用时最容易错的点。

## 6.1 小喜马

如果：
```js
albumSupplier === '100014'
```
那么：
- 直接用原始 `albumId`

## 6.2 大喜马

如果：
```js
albumSupplier === '100008'
```
底层会自动变成：

```text
2_1_<albumId>
```

也就是说：
- 页面层传普通 ID 即可
- 不需要页面自己手动改
- 但你必须知道底层最终看到的专辑 key 已经不是原始值了

这会影响：
- 续播查询
- 当前专辑比对
- 某些日志和调试输出

---

## 7. `playAlbum` 协议是什么

播放器服务层真正收到的是一个 JSON 字符串协议，而不是简单的参数对象。

来源：`xmlyNativeSdk-6efe1704.js`

## 7.1 基本结构

```json
{
  "provider_info": {
    "type": "mediaplayer_list",
    "name": "xmplayer_media_list",
    "path": "falcon://8080292001695606/mediaPlayerListProvider"
  },
  "album_info": {
    "album_key": "...",
    "album_title": "...",
    "album_image_url": "",
    "album_media_cnt": 0,
    "appId": "8080292001695606",
    "appName": "喜马拉雅少儿",
    "xmlyPlaylistType": 1,
    "xmlyBeginTrackId": "...",
    "xmlyBreakSecond": 0,
    "voice_user_id": "",
    "record_id": ""
  },
  "media_info": {
    "media_source": "mediaplayer_xmly_media",
    "media_id_key": "..."
  }
}
```

## 7.2 关键字段解释

### `provider_info.path`
必须是当前 app 内注册的 Provider 地址。

对于喜马拉雅 app：

```text
falcon://8080292001695606/mediaPlayerListProvider
```

### `album_info.album_key`
当前专辑的唯一 key。
- 小喜马：原始 albumId
- 大喜马：`2_1_<albumId>`

### `album_info.xmlyPlaylistType`
源码注释和实现能对上：

- `1`：普通列表
- `2`：下载列表
- `3`：换声/变声列表

### `album_info.xmlyBeginTrackId`
指定从哪首 track 开始播。

### `album_info.xmlyBreakSecond`
指定从第几秒开始播。

### `media_info.media_source`
喜马拉雅这里固定写的是：

```text
mediaplayer_xmly_media
```

### `media_info.media_id_key`
就是起播的 trackId。

---

## 8. `playOptions` 可以控制什么

源码注释里给出了一批可选项，虽然 JS 层不一定每次都传，但如果你想做“更像原版”的播放器控制面板，这些字段要知道。

## 8.1 可见字段

```json
{
  "supportPlayMode": "[...]",
  "mediaPlayerAiSubtitleMode": "1",
  "mediaPlayerListButtonVisible": "1",
  "mediaPlayerListClearButtonVisible": "1",
  "mediaPlayerStoreButtonVisible": "0",
  "speedRateSettingOption": "1",
  "supportRepeatSentence": "1",
  "followReadVisibleOption": "1"
}
```

## 8.2 推荐含义

### `mediaPlayerAiSubtitleMode`
- `1`：开启 AI 字幕
- `0`：关闭

### `mediaPlayerListButtonVisible`
- 是否显示播放列表按钮

### `mediaPlayerListClearButtonVisible`
- 是否显示清空列表按钮

### `mediaPlayerStoreButtonVisible`
- 是否显示收藏按钮

### `speedRateSettingOption`
- 是否显示倍速设置

### `supportRepeatSentence`
- 是否显示单句复读

### `followReadVisibleOption`
- 是否显示跟读入口

如果你是自己做仿制版播放器，可以把这些视为一个“播放器能力配置面板”。

---

## 9. 为什么一定要有 `mediaPlayerListProvider`

因为这个播放器不是传数组，而是传一个“可查询列表的 Provider”。

## 9.1 Provider 做什么

当播放器需要：
- 进入专辑
- 加载某首音频
- 下一首
- 上一首
- 随机一首
- 获取当前专辑
- 下载字幕
- 收藏/取消收藏
- 删除某首
- 清空列表

它不会自己知道怎么做，而是通过 Provider 把动作发回给你的 JS。

## 9.2 Provider 必须支持的 action

从 `mediaPlayerListProvider.js` 可见：

- `getCurrentAlbum`
- `entryAlbum`
- `loadMore`
- `loadMedia`
- `loadFirstMedia`
- `loadLastMedia`
- `previous`
- `next`
- `random`
- `downloadSubtitleFile`
- `getFavoriteState`
- `addToFavorite`
- `removeFromFavorite`
- `clearMediaList`
- `notifyMediaPlayAction`
- `getCurrentMediaCount`
- `delMedia`
- `delMedias`

## 9.3 Provider 的最小生命周期

- 创建时连接播放器服务
- 连接成功后发送 `providerReady`
- 收到命令后按 action 分发
- 返回统一回调格式

---

## 10. Provider 在 Vue 项目里应该怎么写

如果你也在做一个 Falcon/Vue 项目，并且宿主支持 ServiceProvider，那么可以按这个思路：

```js
class MyMediaListProvider extends $falcon.ServiceProvider {
  onCreate(options) {
    super.onCreate(options);
    this.connect('falcon://8001650599023931/mediaPlayerService');
  }

  onConnected(options) {
    this.sendCommand('providerReady', options);
  }

  onCommand(action, params, cb) {
    switch (action) {
      case 'getProviderType':
        cb && cb(0, 'mediaplayer_list');
        break;
      case 'loadMedia':
        this.handleLoadMedia(params, cb);
        break;
      case 'next':
        this.handleNext(params, cb);
        break;
      default:
        cb && cb(-1, 'unsupported action');
    }
  }
}
```

### 要点
- `getProviderType` 必须返回 `mediaplayer_list`
- 连接后要 `providerReady`
- 所有 action 都要和播放器协议对齐

---

## 11. 在页面里如何组织“播放”调用

## 11.1 推荐封装：`useXmPlayerInvoker()`

建议你不要在每个页面直接写一大坨播放逻辑，而是抽成 composable。

```ts
export function useXmPlayerInvoker(nativeSDK: any) {
  function playTrack(params: {
    albumSupplier: string;
    albumId: string | number;
    albumTitle: string;
    albumTrackCount: number;
    trackId: string | number;
    trackTitle?: string;
    breakSecond?: number;
    playlistType?: 'normal' | 'download' | 'swap';
    voiceUserId?: string;
    recordId?: string;
    correctTrack?: boolean;
  }) {
    nativeSDK.SdkPlayTrack({
      albumSupplier: params.albumSupplier,
      albumId: params.albumId,
      albumTitle: params.albumTitle,
      albumTrackCount: params.albumTrackCount,
      trackId: params.trackId,
      trackTitle: params.trackTitle,
      breakSecond: params.breakSecond || 0,
      playlistType:
        params.playlistType === 'download'
          ? 'download'
          : params.playlistType === 'swap'
          ? 'swap'
          : 'normal',
      voiceUserId: params.voiceUserId || '',
      recordId: params.recordId || '',
      correctTrack: params.correctTrack,
    });
  }

  function openPlayerPanel() {
    nativeSDK.HandlePlayer('player');
  }

  function pause() {
    nativeSDK.HandlePlayer('pause');
  }

  function resume() {
    nativeSDK.HandlePlayer('play');
  }

  return { playTrack, openPlayerPanel, pause, resume };
}
```

---

## 12. 页面里真正调用时的推荐顺序

## 12.1 普通专辑页

```ts
async function onClickTrack(track: Track) {
  if (!networkConnected.value) {
    showToast('当前网络不可用');
    return;
  }

  if (!canPlayTrack(track)) {
    await handlePurchaseOrLogin(track);
    return;
  }

  player.playTrack({
    albumSupplier: album.value.supplier,
    albumId: album.value.albumId,
    albumTitle: album.value.title,
    albumTrackCount: album.value.trackCount,
    trackId: track.trackId,
    trackTitle: track.title,
  });

  player.openPlayerPanel();
}
```

## 12.2 下载页继续播放

如果你要复刻“继续播放”：

```ts
player.playTrack({
  albumSupplier: album.value.supplier,
  albumId: album.value.albumId,
  albumTitle: album.value.title,
  albumTrackCount: album.value.trackCount,
  trackId: track.trackId,
  correctTrack: false,
});
```

这样底层会优先尝试恢复上次播放的 track。

## 12.3 从上次秒数恢复

```ts
player.playTrack({
  albumSupplier: album.value.supplier,
  albumId: album.value.albumId,
  albumTitle: album.value.title,
  albumTrackCount: album.value.trackCount,
  trackId: track.trackId,
  breakSecond: 128,
});
```

---

## 13. 如何获取当前播放状态

## 13.1 最简单方式：`$falcon.xmlyPlayer.getPlayingInfo()`

原版页面大量这么做：

```js
const currentPlay = JSON.parse($falcon.xmlyPlayer.getPlayingInfo() || '{}');
```

一般会拿到：
- `albumId`
- `trackId`
- 以及当前上下文中的一些字段

## 13.2 更稳的做法：结合 `NativeSDK.getPlayerState()`

原版 `player-4de55b85.js` 的套路是：

1. 先 `getPlayingInfo()`
2. 再调用 `getPlayerState(cb)`
3. 把 `action` 补到 playerInfo 里

推荐你也这样写：

```ts
function getCurrentPlayerSnapshot(nativeSDK: any, xmlyPlayer: any) {
  return new Promise((resolve) => {
    let playingInfo = {};

    try {
      playingInfo = JSON.parse(xmlyPlayer.getPlayingInfo() || '{}');
    } catch {
      playingInfo = {};
    }

    nativeSDK.getPlayerState((isPlaying: number | boolean) => {
      resolve({
        ...playingInfo,
        action: isPlaying === 1 || isPlaying === true,
      });
    });
  });
}
```

---

## 14. 如何监听播放器事件

## 14.1 JS 层现成可见事件

从页面源码可见，最常监听的是：

### `$falcon.xmlyPlayer.trackChanged`
用于更新当前播放高亮。

```js
this.trackChanged = (albumSupplier, albumId, trackId) => {
  this.curPlayTrackId = parseInt(trackId || 0);
};
$falcon.xmlyPlayer.trackChanged.on(this.trackChanged);
```

### `$falcon.xmlyPlayer.playStatusChanged`
用于更新播放/暂停状态。

### `$falcon.xmlyPlayer.controlListenInterval`
用于家长管控的“连续收听超时”提醒。

## 14.2 Vue 里推荐的封装

```ts
export function useXmPlayerEvents(xmlyPlayer: any) {
  const currentTrackId = ref<string | number>('');
  const isPlaying = ref(false);

  let trackChangedHandler: any;
  let playStatusHandler: any;

  function bind() {
    trackChangedHandler = (_supplier: string, _albumId: string, trackId: string) => {
      currentTrackId.value = trackId;
    };

    playStatusHandler = (status: any) => {
      isPlaying.value = status === 1 || status === true;
    };

    xmlyPlayer.trackChanged?.on(trackChangedHandler);
    xmlyPlayer.playStatusChanged?.on(playStatusHandler);
  }

  function unbind() {
    xmlyPlayer.trackChanged?.off(trackChangedHandler);
    xmlyPlayer.playStatusChanged?.off(playStatusHandler);
  }

  onMounted(bind);
  onBeforeUnmount(unbind);

  return { currentTrackId, isPlaying };
}
```

---

## 15. 如何做“当前播放高亮”

原版做法很清晰：
- trackId 变了
- 对应曲目标题变橙色
- 下载图标也可能替换成“正在播放图标”

## 15.1 推荐实现

```vue
<span :class="['track-name', { playing: currentTrackId === track.trackId }]">
  {{ track.title }}
</span>
```

```css
.track-name {
  color: #fff;
}

.track-name.playing {
  color: #ff683d;
}
```

## 15.2 不建议
- 整行背景变很夸张
- 大量闪烁动画
- 同时改变太多元素

因为原版的设计是：
- **克制地提醒当前正在播放**
- 而不是用视觉轰炸告诉你“它在播”

---

## 16. 付费、购买、兑换与播放器的联动

播放器调用并不是孤立的，原版会在调用前做很多业务判断。

## 16.1 专辑页播放前常见判断

- 网络是否可用
- 专辑是否下架
- 当前曲目是否试听/付费
- 是否已登录
- 是否是会员
- 是否已购买单购专辑
- 是否可兑换
- 是否处于家长限制期

## 16.2 如果你要仿制，推荐把逻辑分三层

### 层 1：页面可点击判断

```ts
function canEnterPlay(track, album, userState) {}
```

### 层 2：权益分流

```ts
function resolvePlayBlockReason(track, album, userState) {
  // return 'need-login' | 'need-vip' | 'need-purchase' | 'need-exchange' | null
}
```

### 层 3：真正调用播放器

```ts
function invokePlayer(track, album) {}
```

这样你的代码不会写成一个巨型 `if/else`。

---

## 17. 歌词、字幕、收藏、删除这些高级动作怎么理解

从 JS Provider 和 `.so` 符号可见，播放器体系还支持：

- `downloadSubtitleFile`
- `getFavoriteState`
- `addToFavorite`
- `removeFromFavorite`
- `clearMediaList`
- `notifyMediaPlayAction`
- `getCurrentMediaCount`
- `delMedia`
- `delMedias`

这意味着你的列表 Provider 最好不要只实现播放顺序，还要预留这些动作位。

## 17.1 如果你暂时不做收藏功能
你也最好保留空实现：

```js
case 'getFavoriteState':
  cb && cb([0, JSON.stringify({ isFavorite: false })]);
  break;
```

这样至少协议完整，未来容易扩展。

---

## 18. `.so` 可见信息对调用方的补充意义

虽然我们不做反编译，但从符号和字符串可以确认一些非常有用的事实。

## 18.1 原生播放器真实能力

导出符号里有：
- `queryXxmFreePlayUrl`
- `queryXxmPayPlayUrl`
- `queryXmlyFreePlayUrl`
- `queryXmlyPayPlayUrl`
- `queryXmSwapAlbumPlayUrl`
- `querySwapConversionTrack`
- `downloadMediaLrcFile`
- `saveLyricFile`
- `emitRequirePurchase`
- `stopPlayParentControl`

这些说明：
- 原生层负责真正的 URL 查询与权益路由
- 还负责歌词下载
- 还负责购买提醒
- 还负责家长管控停播

所以前端层不需要也不应该去重做这些底层逻辑。

## 18.2 原生层已经认识这些业务字段

从字符串可见：
- `album_key`
- `media_id_key`
- `voice_user_id`
- `record_id`
- `album_info`
- `provider_info`

这说明 JS 协议里的字段不是“前端自己发明的约定”，而是底层明确消费的字段。

---

## 19. 你自己的项目里，最推荐的调用方案

如果你的目标是“做一个喜马拉雅式播放器接入层”，建议你做这三层封装：

## 19.1 `playerProtocol.ts`
负责定义：
- playInfo
- playOptions
- provider actions
- playlistType

## 19.2 `playerService.ts`
负责：
- `playTrack()`
- `pause()`
- `resume()`
- `openPlayer()`
- `getCurrentSnapshot()`
- `bindEvents()`

## 19.3 `playerProvider.ts`
负责：
- `entryAlbum`
- `loadMedia`
- `next`
- `previous`
- `random`
- `getCurrentAlbum`
- 收藏/字幕/删除等补充动作

这样页面就很干净，只写：

```ts
await playerService.playTrack({...});
playerService.openPlayer();
```

---

## 20. 如何播放第三方音频

这一节专门回答你提到的“第三方音频怎么播”。

先说结论：

- **这个播放器体系不是为“任意 URL 直塞播放”设计的**
- 它的核心前提是：
  - 有 `provider_info`
  - 有 `album_info`
  - 有 `media_info`
  - 播放器可以通过 Provider 持续向你的 JS 请求列表内容与媒体切换结果

所以，如果你要播放第三方音频，最稳妥的方法不是模仿网页播放器，而是：

1. 伪造一个“第三方专辑”上下文
2. 自己实现一个第三方 `mediaPlayerListProvider`
3. 让播放器通过 `mediaplayer_list` 协议向你的 Provider 取 URL、歌词、上下首

### 20.1 第三方音频接入的两种模式

#### 模式 A：伪装成一张专辑

适合：
- 你有一组第三方音频列表
- 想复用原播放器的上一首/下一首/随机/列表 UI
- 想保留统一播放器体验

你需要提供：
- 第三方专辑 ID
- 第三方专辑标题
- 第三方曲目列表
- 每首曲目的媒体 ID
- 每首曲目可解析得到的直链 URL
- 可选：歌词 URL / LRC 内容

#### 模式 B：伪装成单曲专辑

适合：
- 只有一首第三方音频
- 只是希望用原播放器播放，不太关心列表切换

做法：
- 把这首音频包装成 `album_media_cnt = 1`
- `media_info.media_id_key` 指向唯一 track
- Provider 里 `loadFirstMedia/loadMedia` 永远返回这一首即可

### 20.2 推荐的第三方专辑数据结构

建议你在 Vue 项目里先定义自己的第三方模型：

```ts
export interface ThirdPartyTrack {
  id: string;
  title: string;
  playUrl: string;
  duration?: number;
  cover?: string;
  lyricUrl?: string;
  lyricText?: string;
}

export interface ThirdPartyAlbum {
  id: string;
  title: string;
  cover?: string;
  tracks: ThirdPartyTrack[];
}
```

### 20.3 第三方 Provider 需要返回什么

播放器本质上并不认识“第三方音频”这个概念，它只认识 `mediaplayer_list` 协议。

所以你要做的是：
- 用 JS 把第三方曲目转换成播放器能理解的媒体实体
- 通过 Provider action 返回

至少要支持：
- `getCurrentAlbum`
- `entryAlbum`
- `loadMedia`
- `loadFirstMedia`
- `loadLastMedia`
- `previous`
- `next`
- `random`
- `downloadSubtitleFile`
- `getCurrentMediaCount`

### 20.4 第三方播放的最小协议示例

你可以自己封装一个 `playThirdPartyAlbum()`：

```ts
function playThirdPartyAlbum(album: ThirdPartyAlbum, startTrackId?: string) {
  const firstTrack = album.tracks.find(t => t.id === startTrackId) || album.tracks[0];
  if (!firstTrack) return;

  const playInfo = {
    media_list_type: 'xmplayer_media_list',
    provider_info: {
      type: 'mediaplayer_list',
      name: 'thirdparty_media_list',
      path: `falcon://${$appid}/mediaPlayerListProvider`,
    },
    album_info: {
      album_key: `third_${album.id}`,
      album_title: album.title,
      album_image_url: album.cover || '',
      album_media_cnt: album.tracks.length,
      appId: `${$appid}`,
      appName: '你的应用名',
      xmlyPlaylistType: 1,
      xmlyBeginTrackId: firstTrack.id,
      xmlyBreakSecond: 0,
      voice_user_id: '',
      record_id: '',
    },
    media_info: {
      media_source: 'mediaplayer_thirdparty_media',
      media_id_key: firstTrack.id,
    },
  };

  const playOptions = {
    mediaPlayerAiSubtitleMode: '0',
    mediaPlayerListButtonVisible: '1',
    mediaPlayerListClearButtonVisible: '1',
    mediaPlayerStoreButtonVisible: '0',
    speedRateSettingOption: '1',
  };

  mediaPlayerService.playAlbum(JSON.stringify(playInfo), JSON.stringify(playOptions), () => {
    NativeSDK.HandlePlayer('player');
  });
}
```

### 20.5 Provider 里如何返回第三方媒体

由于仓库里没有“第三方媒体实体”的现成 JS 示例，下面给你一个基于现有协议思路写的范例。

```ts
const thirdPartyState = {
  currentAlbum: null as ThirdPartyAlbum | null,
};

function findTrack(trackId: string) {
  return thirdPartyState.currentAlbum?.tracks.find(t => t.id === trackId) || null;
}

function makeMediaStatus(track: ThirdPartyTrack) {
  return JSON.stringify({
    media_info: {
      media_source: 'mediaplayer_thirdparty_media',
      media_id_key: track.id,
      media_title: track.title,
      media_url: track.playUrl,
      media_cover: track.cover || thirdPartyState.currentAlbum?.cover || '',
      media_duration: track.duration || 0,
    }
  });
}

function handleLoadMedia(params: any, cb: Function) {
  const track = findTrack(params.media_id_key || params.trackId || '');
  if (!track) {
    cb && cb([0, JSON.stringify({ code: -1, message: 'track not found' })]);
    return;
  }
  cb && cb([0, makeMediaStatus(track)]);
}
```

这里的重点不是字段名一定百分百精确，而是你要理解：
- 你的 Provider 必须把“trackId -> 可播媒体信息”的映射提供出来
- 播放器动作发生时，必须能根据 action 算出下一首是谁

### 20.6 第三方上下首示例

```ts
function getTrackIndex(trackId: string) {
  return thirdPartyState.currentAlbum?.tracks.findIndex(t => t.id === trackId) ?? -1;
}

function handleNext(params: any, cb: Function) {
  const tracks = thirdPartyState.currentAlbum?.tracks || [];
  const currentId = params.media_id_key || params.trackId || '';
  const currentIndex = getTrackIndex(currentId);
  const nextIndex = currentIndex >= 0 && currentIndex < tracks.length - 1 ? currentIndex + 1 : currentIndex;
  const nextTrack = tracks[nextIndex];
  if (!nextTrack) {
    cb && cb([0, JSON.stringify({ code: -1, message: 'no next track' })]);
    return;
  }
  cb && cb([0, makeMediaStatus(nextTrack)]);
}

function handlePrevious(params: any, cb: Function) {
  const tracks = thirdPartyState.currentAlbum?.tracks || [];
  const currentId = params.media_id_key || params.trackId || '';
  const currentIndex = getTrackIndex(currentId);
  const prevIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex;
  const prevTrack = tracks[prevIndex];
  if (!prevTrack) {
    cb && cb([0, JSON.stringify({ code: -1, message: 'no previous track' })]);
    return;
  }
  cb && cb([0, makeMediaStatus(prevTrack)]);
}
```

### 20.7 第三方音频接入时的注意事项

#### 1. `album_key` 自己定义，但要稳定
推荐：
```text
third_<albumId>
```

#### 2. `media_id_key` 必须唯一
不要直接用数组索引，最好使用稳定的第三方 trackId。

#### 3. `provider_info.path` 必须真的能被播放器连上
如果 path 对应的 Provider 没注册成功：
- 播放器会建联失败
- 列表、上下首、随机都无法工作

#### 4. 你需要自己解决第三方 URL 的可用性
原版喜马拉雅播放器底层会自己查 URL，是因为它知道自家接口。

你接第三方时：
- 最好在 Provider 返回媒体信息前，就已经拿到真实直链
- 不要指望播放器帮你解析第三方站点

#### 5. 最好对直链做缓存层
因为播放器在：
- 进入专辑
- 切歌
- 重播
- 随机
时，可能会多次向 Provider 要同一首。

建议缓存：
```ts
Map<trackId, resolvedPlayUrl>
```

---

## 21. 如何加载歌词 / 字幕

这一部分专门讲你提到的“加载歌词之类的”。

先说结论：

- 原版体系里，歌词/字幕能力不是页面自己写的，而是播放器协议的一部分
- JS 层可见入口是 `downloadSubtitleFile`
- 原生层可见能力包括：
  - `queryLyricContent`
  - `downloadMediaLrcFile`
  - `saveLyricFile`
  - `get_track_document_lrc`

也就是说：
- 对喜马拉雅自家内容，底层会自己查歌词并落地
- 对第三方内容，你更可能需要在 Provider 里自己补“歌词下载/返回逻辑”

### 21.1 原版歌词链路可以确认的事实

通过 `.so` 可见字符串能确认：

- 存在 `downloadSubtitleFile`
- 存在 `queryLyricContent`
- 存在 `saveLyricFile`
- 存在 `ximalayaos-api/openapi-fmxos/smallClientApi/tracks/get_track_document_lrc`
- 存在 `.lrc` 文件保存能力

所以原版大致链路是：

1. 播放器想要歌词
2. 通过 Provider action 调 `downloadSubtitleFile`
3. 原生侧或 Provider 配合查询歌词地址/内容
4. 原生侧保存成 `.lrc`
5. 播放器消费歌词文件或歌词回调

### 21.2 你自己的第三方歌词接入方案

对于第三方音频，建议你自己在 JS 层定义一套歌词处理器。

#### 数据结构建议

```ts
export interface ThirdPartyTrack {
  id: string;
  title: string;
  playUrl: string;
  duration?: number;
  lyricUrl?: string;
  lyricText?: string;
}
```

### 21.3 方案 A：Provider 里直接返回歌词文本

如果你的第三方接口直接给 LRC 内容，那么最简单。

```ts
async function loadLyricText(track: ThirdPartyTrack): Promise<string> {
  if (track.lyricText) return track.lyricText;
  if (!track.lyricUrl) return '';

  const res = await fetch(track.lyricUrl);
  return await res.text();
}
```

然后在 `downloadSubtitleFile` action 里处理：

```ts
async function handleDownloadSubtitleFile(params: any, cb: Function) {
  const track = findTrack(params.media_id_key || params.trackId || '');
  if (!track) {
    cb && cb([0, JSON.stringify({ code: -1, message: 'track not found' })]);
    return;
  }

  const lyricText = await loadLyricText(track);
  cb && cb([0, JSON.stringify({
    code: 0,
    trackId: track.id,
    lyricText,
  })]);
}
```

### 21.4 方案 B：自己保存成 `.lrc`

如果宿主允许你写文件，建议你自己把歌词落地为 `.lrc`，这样更接近原版。

```ts
function toLrcFileName(track: ThirdPartyTrack) {
  return `/tmp/${track.id}.lrc`;
}

async function saveLyricFile(track: ThirdPartyTrack, text: string) {
  const path = toLrcFileName(track);
  await someFileWrite(path, text);
  return path;
}
```

然后在 Provider 回调里返回：

```ts
async function handleDownloadSubtitleFile(params: any, cb: Function) {
  const track = findTrack(params.media_id_key || params.trackId || '');
  if (!track) {
    cb && cb([0, JSON.stringify({ code: -1, message: 'track not found' })]);
    return;
  }

  const lyricText = await loadLyricText(track);
  const lrcPath = await saveLyricFile(track, lyricText);

  cb && cb([0, JSON.stringify({
    code: 0,
    trackId: track.id,
    subtitleFile: lrcPath,
    subtitleType: 'lrc',
  })]);
}
```

### 21.5 方案 C：无歌词时返回空结果

如果第三方音频没有歌词，也建议明确返回成功但为空，而不是直接异常。

```ts
function handleNoLyric(trackId: string, cb: Function) {
  cb && cb([0, JSON.stringify({
    code: 0,
    trackId,
    lyricText: '',
    subtitleFile: '',
  })]);
}
```

这样播放器或上层 UI 比较容易处理。

### 21.6 给第三方音频做歌词缓存

推荐你做一个简单缓存：

```ts
const lyricCache = new Map<string, string>();

async function loadLyricText(track: ThirdPartyTrack): Promise<string> {
  if (lyricCache.has(track.id)) return lyricCache.get(track.id)!;

  let text = '';
  if (track.lyricText) {
    text = track.lyricText;
  } else if (track.lyricUrl) {
    const res = await fetch(track.lyricUrl);
    text = await res.text();
  }

  lyricCache.set(track.id, text);
  return text;
}
```

因为播放器可能会重复调用歌词下载动作。

### 21.7 如果你想在 Vue 页面里直接显示歌词

你甚至可以不完全依赖播放器，而是同步维护一份歌词状态。

```ts
export function useThirdPartyLyrics() {
  const lyricText = ref('');
  const currentTrackId = ref('');

  async function load(track: ThirdPartyTrack) {
    currentTrackId.value = track.id;
    lyricText.value = await loadLyricText(track);
  }

  return { lyricText, currentTrackId, load };
}
```

然后页面：

```vue
<template>
  <div class="lyric-panel">
    <pre>{{ lyricText }}</pre>
  </div>
</template>
```

这适合：
- 你暂时没法完全打通播放器字幕协议
- 但又想先在页面上看到歌词

---

## 22. 第三方音频 + 歌词的完整示例流程

下面给你一个更完整的接入思路。

### 22.1 准备专辑数据

```ts
const album: ThirdPartyAlbum = {
  id: 'demo_album_001',
  title: '第三方测试专辑',
  cover: 'https://example.com/cover.jpg',
  tracks: [
    {
      id: 'track_001',
      title: '第三方音频 1',
      playUrl: 'https://example.com/audio1.mp3',
      lyricUrl: 'https://example.com/audio1.lrc',
    },
    {
      id: 'track_002',
      title: '第三方音频 2',
      playUrl: 'https://example.com/audio2.mp3',
      lyricUrl: 'https://example.com/audio2.lrc',
    },
  ],
};
```

### 22.2 设置当前 Provider 数据源

```ts
thirdPartyState.currentAlbum = album;
```

### 22.3 调起播放

```ts
playThirdPartyAlbum(album, 'track_001');
```

### 22.4 Provider 响应 `loadMedia`

```ts
function handleLoadMedia(params, cb) {
  const track = findTrack(params.media_id_key);
  cb([0, makeMediaStatus(track)]);
}
```

### 22.5 Provider 响应歌词下载

```ts
async function handleDownloadSubtitleFile(params, cb) {
  const track = findTrack(params.media_id_key);
  const lyricText = await loadLyricText(track);
  cb([0, JSON.stringify({ code: 0, lyricText })]);
}
```

### 22.6 页面监听当前播放变化

```ts
xmlyPlayer.trackChanged.on((_supplier, _albumId, trackId) => {
  currentTrackId.value = trackId;
});
```

### 22.7 页面需要时自己同步加载歌词

```ts
watch(currentTrackId, async (id) => {
  const track = findTrack(id);
  if (track) {
    lyricText.value = await loadLyricText(track);
  }
});
```

---

## 23. 什么时候不适合走这套第三方接入方式

不适合场景：

1. 你只是单纯想网页里播一个 mp3
2. 你不需要统一播放器 UI
3. 你没有 Provider 能力
4. 你只是临时试听第三方 URL

这种场景更适合：
- 你自己做一个简化音频组件
- 不必强行接入这套“列表驱动播放器协议”

适合场景：
- 你确实想复刻喜马拉雅词典笔那套播放器体验
- 你希望支持统一的播放面板、列表、上下首、随机、歌词
- 你能控制 Provider 和宿主能力

---

## 24. 最后的实用结论

如果你要做：

### 播放第三方音频
最推荐：
- 把第三方音频包装成“第三方专辑 + 第三方 Provider”
- 让播放器继续走 `playAlbum` 协议

### 加载歌词
最推荐：
- 在 Provider 中实现 `downloadSubtitleFile`
- 自己解析第三方 LRC
- 能落地文件就落地 `.lrc`
- 不行就至少返回歌词文本，并在页面里同步显示

### 最小可行方案
你至少要实现：
- 一个第三方 album 数据结构
- 一个第三方 Provider
- `loadMedia`
- `next`
- `previous`
- `downloadSubtitleFile`
- 一个播放入口 `playThirdPartyAlbum()`

这样你就能让第三方音频也走进这套播放器体系里。

## 25. 最后的调用结论

如果你只记住一句话，请记住这个：

**在喜马拉雅词典笔体系里，正确调用播放器的方式不是“传 URL 播放”，而是“传播放上下文 + Provider 路径，让底层播放器自己去拉列表、查 URL、查歌词、管权益、管顺序”。**

也就是说，正确的开发姿势是：

1. 页面准备好 `albumSupplier / albumId / albumTitle / trackId / trackCount`
2. 调 `NativeSDK.SdkPlayTrack()`
3. 成功后调 `NativeSDK.HandlePlayer('player')`
4. 通过 `$falcon.xmlyPlayer` 监听播放状态与当前曲目变化
5. 用 `mediaPlayerListProvider` 负责列表协议

这就是它最核心的调用模式。
