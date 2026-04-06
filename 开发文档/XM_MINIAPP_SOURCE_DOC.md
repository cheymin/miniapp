# 喜马拉雅 miniapp 源码级接口与调用文档

本文档仅基于仓库内 `喜马拉雅/a/` 目录的可见 JavaScript 产物整理，目标是帮助你理解该 miniapp 的架构、调用链路、页面跳转、网络层、播放器/下载器/登录流程，以及宿主 API 在 JS 层的使用方式。

不包含任何 `.so` 逆向内容；凡是本文提到的能力，均来自现成源码中已经显式可见的封装、注释和调用点。

---

## 1. 文档范围与样本来源

主要分析文件：

- 应用入口：`喜马拉雅/a/app.js`
- 包清单：`喜马拉雅/a/manifest.json`
- Native 封装：`喜马拉雅/a/xmlyNativeSdk-6efe1704.js`
- URL/网络/用户封装：`喜马拉雅/a/user-04cca63a.js`
- 播放辅助：`喜马拉雅/a/player-4de55b85.js`
- 播放器 Provider：`喜马拉雅/a/providers/mediaPlayerListProvider.js`
- 专辑页：`喜马拉雅/a/album.js`
- 搜索页：`喜马拉雅/a/search.js`
- 下载页：`喜马拉雅/a/download.js`
- 下载中页：`喜马拉雅/a/downloadingPage.js`
- 已下载音频页：`喜马拉雅/a/downloadedTrackPage.js`
- 跳转 mixin：`喜马拉雅/a/link-814b36ca.js`
- 基础信息：`喜马拉雅/a/baseInfo-6924ebf1.js`
- 输入法组件：`喜马拉雅/a/index-e325bde8.js`
- 登录/支付轮询相关页：`喜马拉雅/a/login.js`、`喜马拉雅/a/pay.js`、`喜马拉雅/a/h5_activity.js`、`喜马拉雅/a/create_qrcode.js`

---

## 2. 应用整体形态

### 2.1 应用元信息

来源：`喜马拉雅/a/manifest.json:2-12`

- 应用名：`喜马拉雅少儿`
- appid：`8080292001695606`
- 版本：`5.0.00`
- QuickJS 版本：`20200705`
- `single-js-bundle = false`

这是一个 Falcon/QuickJS miniapp，编译产物已经被拆成大量页面、组件和共享模块文件。

### 2.2 页面注册

来源：`喜马拉雅/a/app.js:759-880`

该应用注册了大量页面，核心业务可分为：

- 首页与发现：`index`、`discovery`
- 专辑与播放：`album`、`share_album`
- 搜索：`search`
- 下载：`download`、`downloadedTrackPage`、`downloadingPage`、`downloadRequireVIPPage`
- 登录/支付：`login`、`pay`、`payment_options`、`h5_activity`、`h5_static_qr_code`、`create_qrcode`
- 用户中心：`personal`、`member`、`information`、`age_group`
- 学习内容：`learn_corner`、`poetry_*`、`encyclopedia_*`、`global_travel_*`
- 社交玩法：`friend_story_*`、`my_friend_*`
- 图书馆：`library_*`
- 家长管控：`parentControlPage`

### 2.3 Provider 注册

来源：`喜马拉雅/a/app.js:857-859`

注册了一个 Provider：

```json
{
  "mediaPlayerListProvider": "thirdparty-sdk/youdao/services/mediaPlayerListProvider.js"
}
```

对应本目录可读实现是：
- `喜马拉雅/a/providers/mediaPlayerListProvider.js`

这个 Provider 是播放列表数据源桥接层，供播放器服务按需加载专辑/音频列表。

---

## 3. App 启动流程

来源：`喜马拉雅/a/app.js:679-755`

`App.onLaunch()` 的关键流程：

1. 挂载全局 store：`$falcon.store = store`
2. 挂载埋点对象：`$falcon.UBT = UBT`
3. 挂载家长管控对象：`$falcon.parentControl = parentControl`
4. 创建底层模块实例：
   - `$falcon.xmlyPlayer = new xmlyPlayerModule.XmlyPlayer()`
   - `$falcon.xmlyDownload = new xmlyDownloadModule.XmlyDownload()`
5. 设置全局页面基类：`$falcon.useDefaultBasePageClass(BasePage)`
6. 初始化 NativeSDK：`NativeSDK.init()`
7. 初始化账号信息：`accountManager.init()`
8. 拉取家长管控配置：`parentControl.checkRefreshConfig()`
9. 获取设备主题名：`NativeSDK.globalModule().themeName()`
10. 拉取项目基础配置：`$falcon.store.dispatch('getProjectDictValueList')`
11. 注册全局监听器：播放器控制监听
12. 设置 `$falcon.appLaunchCompleted = true`
13. 触发全局事件：`appLaunchCompleted`

### 3.1 App 前后台埋点

来源：`喜马拉雅/a/app.js:723-739`

- `onShow()` 调用：`$falcon.UBT.appStart()`
- `onHide()` 调用：`$falcon.UBT.appExit(duration)`

说明整个应用强依赖统一埋点体系。

---

## 4. 全局状态模型（store）

来源：`喜马拉雅/a/app.js:82-123`

主要状态字段：

- `accountInfo`：当前登录用户信息
- `httpToken`：网络访问 token 缓存
  - `accessToken`
  - `tempToken`
  - `updateTime`
- `appBaseInfo`：应用基础配置字典
- `deviceId`
- `deviceIPAddress`
- `deviceModelName`
- `userGrade`
- `parentControlInfo`
- `playerInfo`
- `routerHistory`
- `app_boot_config`
- `fine_operator_config`
- `lib_level` 等图书馆配置
- `fetch_status`

### 4.1 store 能力

来源：`喜马拉雅/a/app.js:125-205`

暴露的方法：

- `dispatch(actionName, params)`
- `commit('SET_DATA', { key, value })`
- `clearAccountInfo()`
- `showToast(message)`
- `isNetworkConnected(toast?)`
- `getStorageItem(key)`
- `setStorageItem(key, value)`

### 4.2 本地存储读写

来源：`喜马拉雅/a/app.js:27-56`

优先使用：
- `$falcon.jsapi.storage.getStorage`
- `$falcon.jsapi.storage.setStorage`

浏览器回退到：
- `localStorage`

可见缓存键：
- `xmlyAccountInfo`
- `_xmLog`
- `configPauseDownload`
- 当前频道名等其它业务键

---

## 5. BasePage 与页面公共约定

来源：`喜马拉雅/a/app.js:400-448`

### 5.1 全局组件注入

`beforeVueInstantiate(Vue)` 会注册：

- `vControl`
- `vStatus`
- `vScrollTop`

### 5.2 页面 show/hide 统一逻辑

`onShow()`：
- 网络检测，失败时调用页面的 `showLoadingState(VStatus.LoadingFailure)`
- 若页面定义了 `recordRouterHistory`，会记录路由
- 若页面定义了 `onPageShow`，自动调用
- 若页面定义了 `traceEventPageView`，自动调用

`onHide()`：
- 若页面定义了 `onPageHide`，自动调用
- 若页面定义了 `traceEventPageExit`，自动调用

`onUnload()`：
- 若页面定义了 `unloadPage`，自动调用

### 5.3 结论

很多页面依赖这些约定方法而非原始生命周期，因此分析某个页面时，除了看自身 methods，也要考虑 BasePage 自动触发逻辑。

---

## 6. URL 配置中心

来源：`喜马拉雅/a/user-04cca63a.js:8-91`

该文件是整个 miniapp 的 URL 配置中心，聚合了大量接口地址。

### 6.1 小喜马（儿童）相关

- `getXxmAlbum`
- `getXxmAlbums`
- `getXxmTrackList`
- `queryPurchaseStatus`
- `getXxmPurchaseList`
- `getXxmPlayHistory`
- `getXxmSubscribeList`
- `getXxmBaby`
- `getXxmParent`
- `createBabyInfo`
- `editXxmBaby`
- `addSubscribeXxm`
- `deleteSubscribeXxm`
- `isSubscribeXxm`

### 6.2 大喜马相关

- `getDxmAlbum`
- `getDxmTrackList`
- `queryAlbumBoughtStatus`
- `addDeleteSubscribeXmly`
- `isSubscribeXmly`

### 6.3 搜索与专题

- `getSubject`
- `getSubjectCategory`
- `getChannelCardPage`
- `getBannerList`
- `getChannelWithContentCategory`
- `getContentCategory`
- `getContentCategoryAlbum`
- `get_ip_wall_ip_list`
- `get_ip_wall_ip_album_list`

### 6.4 登录与 token

- `getAppAccessToken`
- `refreshAppAccessToken`
- `getSecureAccessToken`

### 6.5 配置与客服

- `getProjectDictValueList`
- `get_configs_by_keys`
- `get_customer_service_info`
- `get_refined_operational_config`
- `get_app_boot_config`

### 6.6 家长管控与年龄段

- `set_age_grade`
- `get_age_grade`
- `get_all_limit`

---

## 7. 公共参数、签名、请求层

## 7.1 Common.getCommonParams

来源：`喜马拉雅/a/user-04cca63a.js:313-370`

它会补充：

- `device_model`
- `app_key`
- `client_os_type`
- `device_id`
- `sn`
- `version`
- `version_code`
- `product_type`
- `nonce`
- `timestamp`
- `device_id_type`
- `sig`

所以业务接口多数不自己拼签名，而是通过 `httpRequest` 统一完成。

## 7.2 签名生成

来源：`喜马拉雅/a/user-04cca63a.js:161-195`

签名策略：

1. 参数排序：`Utils.jsonSort()`
2. 优先调用原生签名：
   - `xmlyNativeSDK.computeHttpAPISig`
   - 兼容 `XySdkModule.js_sig_get`
3. 浏览器环境才回退 JS 计算

这说明实际设备上的签名通常交给原生，而不是纯 JS。

## 7.3 Service 封装

来源：`喜马拉雅/a/user-04cca63a.js:382-507`

设备上：
- 通过 `xmlyNativeSDK.request(...)` 发请求

浏览器：
- 通过 axios 模拟

设备上的关键点：
- 会把 number / boolean 转为字符串
- 结果是 `result.result` 字符串，需要再 `JSON.parse`
- 若联网环境被劫持成 HTML，会在 parse 阶段失败并返回 `{}`

## 7.4 httpRequest

来源：`喜马拉雅/a/user-04cca63a.js:508-734`

对外提供：

- `get(url, params)`
- `post(url, params, withJson)`
- `isEmptyObject(obj)`
- `interceptPredefineToken(params)`
- `obtainHttpToken()`
- `refreshTempToken()`
- `refreshAccessToken()`

### 7.4.1 token 占位符

支持两种预定义 token：

- `httpRequest.TokenAccess`
- `httpRequest.TokenNotNull`

使用示例：
```js
access_token: httpRequest.TokenAccess
```
或：
```js
access_token: 'Token.notNullToken'
```

### 7.4.2 刷新策略

- 登录用户：刷新 `accessToken`
- 未登录用户：刷新 `tempToken`
- 刷新结果写回 `$falcon.store.state.httpToken`

### 7.4.3 刷新失败处理

`refreshAccessToken()` 若返回 `error_no == 212`：

1. 清空账号
2. 弹出 toast
3. 触发 `accountChanged(login: false)`
4. `NativeSDK.logoutAccount(2)`
5. 跳转 `login`

这是全局登录失效退回机制。

---

## 8. Native SDK 源码级接口文档

来源：`喜马拉雅/a/xmlyNativeSdk-6efe1704.js:743-1020`

这是最重要的宿主能力 JS 封装层。

## 8.1 初始化

### `NativeSDK.init()`

位置：`喜马拉雅/a/xmlyNativeSdk-6efe1704.js:746-764`

传给原生 `xmlyNativeSDK.initSDK(initConfig)` 的参数：

- `versionName`
- `versionCode`
- `appKey`
- `appSecret`
- `appSN`
- `appSecretOpenPlatform`
- `macAddress`
- `deviceName`
- `debugMode`
- `useTestHttp`

### 8.2 设备相关

- `getDeviceType()`：`:766-772`
- `getSNInfo()`：`:773-780`
- `globalModule()`：`:1014-1016`
- `getSoundPlayerManager()`：`:1017-1019`

### 8.3 账号相关

- `loginAccount()`：`:785-808`
- `logoutAccount(logoutType)`：`:813-819`

`loginAccount()` 会把标准化后的：
- `tokenInfo`
- `babyInfoList`
- `uid`
- `nickName`
- `avatarUrl`
- `vipExpiryTimestamp`

同步到底层。

### 8.4 支付/兑换通知

- `notifyPurchased(param)`：`:823-832`
- `notifyExchange(albumId, trackId, supplierId)`：`:836-845`

### 8.5 播放控制

- `HandlePlayer('player')`：显示播放器
- `HandlePlayer('play')`：继续播放
- `HandlePlayer('pause')`：暂停
- `getCurrentAlbum(cb)`
- `getPlayerState(cb)`

### 8.6 系统输入法

- `startTextEdit(option)`：`:994-1013`
- `globalModule().textEditFinished.on(handler)`
- `globalModule().closeTextEdit(uuid)`

这是整个 miniapp 的统一键盘接入方式。

---

## 9. 播放器服务层（MediaPlayerService）

来源：`喜马拉雅/a/xmlyNativeSdk-6efe1704.js:211-688`

## 9.1 服务连接

播放器服务 URI：

```text
falcon://8001650599023931/mediaPlayerService
```

连接逻辑：
- 通过 `$service_proxy` 的 `ServiceProxy`
- 如果播放器 app 安装事件到达，会自动重连

## 9.2 可调用方法

### 基础控制
- `playAlbum(playInfo, playOptions, cb)`
- `showMediaPlayer(params)`
- `showPlayerGuide(params)`
- `pause()`
- `play()`
- `playNext()`
- `playPrev()`
- `playNextLrc()`
- `playPrevLrc()`
- `resetPlayer(cb)`

### 查询类
- `getCurrentMedia(cb)`
- `getCurrentAlbum(cb)`
- `getPlayState(cb)`
- `getIsPlaying(cb)`
- `getCurrentDuration(cb)`
- `getCurrentPos(cb)`
- `getProxy()`

## 9.3 事件订阅

- `onPlayStateChanged(callback)`
- `onMediaLoadError(callback)`
- `onMediaPlayError(callback)`
- `onNavToAppPage(callback)`
- `onCurrentMediaChanged(callback)`
- `onProgressChanged(callback)`
- `onCurrentAlbumChanged(callback)`
- `onAlreadyFirstMedia(callback)`
- `onAlreadyLastMedia(callback)`
- `off(token)`

代码中已经标了每种事件返回结构的大致字段。

---

## 10. `playAlbum` 协议文档

来源：
- 协议注释：`喜马拉雅/a/xmlyNativeSdk-6efe1704.js:263-308`
- 实际构造：`喜马拉雅/a/xmlyNativeSdk-6efe1704.js:943-984`

## 10.1 标准协议结构

### `playInfo`

```json
{
  "provider_info": {
    "type": "mediaplayer_list",
    "name": "",
    "path": "falcon://<appid>/mediaPlayerListProvider"
  },
  "album_info": {
    "album_title": "",
    "album_image_url": "",
    "album_image_file": "",
    "album_media_cnt": -1,
    "appName": "",
    "appId": "",
    "...": "业务字段"
  },
  "media_info": {
    "media_source": "",
    "media_id_key": "",
    "...": "业务字段"
  }
}
```

### `playOptions`

源码注释中可见的可选项：

- `supportPlayMode`
- `mediaPlayerAiSubtitleMode`
- `mediaPlayerListButtonVisible`
- `mediaPlayerListClearButtonVisible`
- `mediaPlayerStoreButtonVisible`
- `speedRateSettingOption`
- `supportRepeatSentence`
- `followReadVisibleOption`

## 10.2 喜马拉雅实际发给播放器的字段

```json
{
  "media_list_type": "xmplayer_media_list",
  "provider_info": {
    "type": "mediaplayer_list",
    "name": "xmplayer_media_list",
    "path": "falcon://8080292001695606/mediaPlayerListProvider"
  },
  "album_info": {
    "album_key": "<albumId>",
    "album_title": "<albumTitle>",
    "album_image_url": "",
    "album_media_cnt": "<trackCount>",
    "appId": "8080292001695606",
    "appName": "喜马拉雅少儿",
    "xmlyPlaylistType": 1,
    "xmlyBeginTrackId": "<trackId>",
    "xmlyBreakSecond": 0,
    "voice_user_id": "",
    "record_id": ""
  },
  "media_info": {
    "media_source": "mediaplayer_xmly_media",
    "media_id_key": "<trackId>"
  }
}
```

## 10.3 字段说明

### `provider_info`
- `type`: 固定 `mediaplayer_list`
- `name`: 列表提供器名称
- `path`: Provider 路径，播放器靠它拉列表

### `album_info`
- `album_key`: 专辑主键
- `album_title`: 专辑标题
- `album_media_cnt`: 专辑音频数
- `appId` / `appName`: 当前来源 miniapp
- `xmlyPlaylistType`:
  - `1` 普通播放列表
  - `2` 下载列表
  - `3` 换声列表
- `xmlyBeginTrackId`: 起播 track id
- `xmlyBreakSecond`: 续播位置（秒）
- `voice_user_id`: 声音定制相关
- `record_id`: 业务记录 id

### `media_info`
- `media_source`: 固定 `mediaplayer_xmly_media`
- `media_id_key`: 当前要播的 track id

## 10.4 albumId 特殊规则

来源：`喜马拉雅/a/xmlyNativeSdk-6efe1704.js:896-900`

大喜马专辑（`albumSupplier == 100008`）会被转换为：

```text
2_1_<albumId>
```

小喜马则直接用原 albumId。

这是播放链路里最不明显、但很关键的一条规则。

---

## 11. 播放列表 Provider 文档

来源：`喜马拉雅/a/providers/mediaPlayerListProvider.js`

## 11.1 Provider 类型

`getProviderType()` 返回：

```text
mediaplayer_list
```

## 11.2 支持的 action

由 `handleCommond()` 显式分发：

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

## 11.3 生命周期

- `onCreate()`：连接播放器服务
- `onConnected()`：发送 `providerReady`
- `onNewOptions()`：再次发送 `providerReady`
- `onCommand()`：响应播放器命令

## 11.4 结论

播放器并不直接读取页面数据，而是通过 Provider 回调 miniapp 来拉取当前专辑的媒体列表与控制行为。

---

## 12. 播放链路深度解析

这一节是“第 2 点”的第一部分：播放链路。

## 12.1 通用调用入口

所有页面最终都会收敛到：

- `NativeSDK.SdkPlayTrack(playInfo, callback)`

来源：
- `喜马拉雅/a/security_education_index.js:932`
- `喜马拉雅/a/history.js:172`
- `喜马拉雅/a/history_travel_chapter.js:74`
- `喜马拉雅/a/vAnswerLevelItem-f4115540.js:224`
- `喜马拉雅/a/index.js:4374`
- `喜马拉雅/a/global_travel_daily_station.js:1832`
- `喜马拉雅/a/album.js:411-419`

## 12.2 专辑页播放流程

来源：`喜马拉雅/a/album.js:207-260,339-419`

流程：

1. 点击曲目
2. `handlerPlay(item)` 检查网络
3. 记录任务/埋点
4. `playTrack(item)` 检查：
   - 专辑状态
   - 试听/付费/兑换逻辑
   - 未登录逻辑
   - 会员逻辑
5. 满足条件后调用：
   - `NativeSDK.SdkPlayTrack({...})`
6. 成功后：
   - `NativeSDK.HandlePlayer('player')`
   - 打开播放器界面

### 12.2.1 `playTrack()` 传入字段

```js
NativeSDK.SdkPlayTrack({
  albumSupplier: this.curAlbumInfo.supplier,
  albumId: this.curAlbumInfo.albumId,
  albumTitle: this.curAlbumInfo.title || '',
  albumTrackCount: this.curAlbumInfo.trackCount || 0,
  trackId: item.trackId,
  trackTitle: item.title || ''
});
```

## 12.3 查询当前播放信息

来源：`喜马拉雅/a/player-4de55b85.js:81-90`

```js
queryPlayerInfo(is_info = false)
```

内部读取：
- `$falcon.xmlyPlayer.getPlayingInfo()`
- 再结合 `NativeSDK.getPlayerState()` 补齐状态

### 12.3.1 当专辑变化时补专辑信息
`getTrackPlayer()`：`喜马拉雅/a/player-4de55b85.js:33-57`

如果当前 store 中 `playerInfo.albumId !== albumId`，则会：
- 小喜马：调用 `queryAlbumInfo()`
- 大喜马：调用 `queryDxAlbumInfo()`
- 再通过 `getPlayerState()` 补 `action` 状态
- 最终写回 `$falcon.store.state.playerInfo`

## 12.4 播放相关事件监听

常见页面监听：
- `trackChanged`
- `playStatusChanged`

样例：
- `喜马拉雅/a/album.js:101-103,146-178`
- `喜马拉雅/a/friend_story_album.js:182`
- `喜马拉雅/a/downloadedTrackPage.js:917-945`
- `喜马拉雅/a/answer_level_list.js:46`
- `喜马拉雅/a/global_travel_station.js:89`

说明页面的“当前播放高亮”主要依赖 `$falcon.xmlyPlayer` 事件，而非轮询。

---

## 13. 下载链路深度解析

这是“第 2 点”的第二部分：下载链路。

## 13.1 下载入口

专辑页下载逻辑：`喜马拉雅/a/album.js:457-604`

点击下载后的流程：

1. 检查是否已下载/下载中
2. 检查网络
3. 检查登录状态
4. 检查是否 VIP / 是否单购 / 是否已购买
5. 满足条件后调用：

```js
$falcon.xmlyDownload.downloadTrack(JSON.stringify({ ... }))
```

## 13.2 `downloadTrack` 可见参数结构

来源：`喜马拉雅/a/album.js:580-594`

```json
{
  "albumSupplier": "100014|100008",
  "albumId": "...",
  "albumTitle": "...",
  "albumImgUrl": "...",
  "albumPayType": 0,
  "albumIsPurchased": false,
  "trackId": "...",
  "trackTitle": "...",
  "trackType": 0,
  "trackIndex": 0,
  "trackDuration": 0
}
```

### 字段解释
- `albumSupplier`: 供应商编码
- `albumPayType`: 专辑付费类型
- `albumIsPurchased`: 是否已购
- `trackType`: 0 免费 / 1 试听 / 2 付费
- `trackIndex`: 曲目排序，用于下载列表顺序修正
- `trackDuration`: 时长

## 13.3 下载页（专辑列表）

来源：`喜马拉雅/a/download.js:23-181`

页面能力：
- 查询已下载专辑：`queryDownloadedAlbums()`
- 删除整个专辑：`deleteDownloadedAlbum()`
- 跳转下载中页面：`downloadingPage`
- 自动启动下载队列：`startDownloadingAllTask()`

### 13.3.1 主要事件

- `downloadTrackAllClean`
- `onQueryDownloadedAlbums`

### 13.3.2 专辑列表查询结果结构

回调 `onQueryDownloadedAlbums(jsonText)` 会映射为：

```json
{
  "dbIndex": 0,
  "albumSupplier": "100014",
  "supplier": "100014",
  "albumId": "...",
  "title": "...",
  "iconPath": "...",
  "payType": 0,
  "albumIsPurchased": false
}
```

## 13.4 下载中页面

来源：`喜马拉雅/a/downloadingPage.js:1005-1210`

页面监听：
- `onQueryDownloadingTasks`
- `onQueryTotalFileSize`
- `onDownloadStart`
- `onDownloadCompleted`
- `onDownloadFailure`

调用能力：
- `queryDownloadingTasks({ lastTaskId: 0 })`
- `pauseDownloadingAllTask()`
- `startDownloadingAllTask()`
- `deleteDownloadingTaskByTaskId(dbIndex)`
- `deleteDownloadingAllTask()`
- `getDownloadedAllFileSize()`
- `isDownloading()`

### 13.4.1 下载中任务映射结构

```json
{
  "dbIndex": 0,
  "title": "...",
  "albumId": "...",
  "trackId": "...",
  "downloadState": 0
}
```

### 13.4.2 暂停/恢复策略

- 进入删除模式时，如果正在下载，会自动暂停全部任务
- 退出删除模式时，如果之前是因删除模式暂停，则自动恢复
- 用户主动暂停/开始时，还会写本地配置：
  - `configPauseDownload = 'true'|'false'`

## 13.5 已下载音频页

来源：`喜马拉雅/a/downloadedTrackPage.js:900-1100`

页面能力：
- `queryDownloadedTracks({ albumDBIndex, pageNo, pageSize })`
- 监听 `trackChanged`
- 监听 `onQueryDownloadedTracks`
- 查询专辑购买状态
- 查询上次播放 track

### 13.5.1 读取已下载音频列表

回调映射为：

```json
{
  "trackId": "...",
  "title": "...",
  "trackType": 0
}
```

### 13.5.2 离线播放限制

已下载页播放前会按 `payType` 判断：
- `0/1`：免费或会员
  - 非 VIP 可能跳到 `downloadRequireVIPPage`
- `2`：单购
  - 未购买时弹精品购买确认框
  - 已购买则可播放

说明离线内容也不是无条件可播，仍受权益模型约束。

---

## 14. 登录与 token 链路深度解析

这是“第 2 点”的第三部分：登录/token 链路。

## 14.1 账号初始化

来源：`喜马拉雅/a/app.js:454-469`

`accountManager.init()`：
- 优先调用宿主：`xmlyNativeSDK.getAccountInfo({scope: 'all'})`
- 否则从本地缓存 `xmlyAccountInfo` 恢复

## 14.2 统一账号结构

来源：`喜马拉雅/a/user-04cca63a.js:812-858`

标准结构：

```json
{
  "uid": 0,
  "nickName": "",
  "avatarUrl": "",
  "vipExpiryTime": "",
  "tokenInfo": {
    "accessToken": "",
    "refreshToken": "",
    "cookie": "",
    "refreshTime": 7200
  },
  "babyInfoList": [
    {
      "babyId": 0,
      "nickName": "",
      "logoUrl": "",
      "birthday": "",
      "age": 0,
      "ageGroup": 0,
      "gender": 0
    }
  ]
}
```

## 14.3 移动端扫码登录回写

来源：`喜马拉雅/a/user-04cca63a.js:886-895`

`handleUserInfoFromMobileLogin(user_login)`：
1. `getUnionUserInfo(user_login)`
2. `setAccountInfo(accountInfo)`
3. 触发 `$falcon.trigger('accountChanged', { login: true })`
4. 调用 `NativeSDK.loginAccount()`

## 14.4 页面轮询二维码登录结果

相关页面：
- `喜马拉雅/a/login.js:159-218`
- `喜马拉雅/a/pay.js:128-204`
- `喜马拉雅/a/h5_activity.js:112-159`

轮询共同模式：

1. 页面先创建二维码
2. 拿到 `sid`
3. 每 3 秒轮询 `_getQrcodeStatusNew()`
4. 若返回：
   - `uid`：说明扫码登录成功，可执行 `handleUserInfoFromMobileLogin()`
   - `pay_status in [1,2]`：说明支付完成，执行购买后逻辑

## 14.5 token 刷新链路

来源：`喜马拉雅/a/user-04cca63a.js:659-733`

### 登录态
- 取 `accountInfo.tokenInfo.refreshToken`
- 调 `refreshAppAccessToken`
- 得到新的 `access_token`

### 未登录态
- 调 `getSecureAccessToken`
- 得到临时 token

### 失效处理
如果 `error_no == 212`：
- 清空账号
- toast
- 触发 `accountChanged(false)`
- `NativeSDK.logoutAccount(2)`
- 跳转登录页

## 14.6 页面如何感知登录变化

常见页面通过：
```js
$falcon.on('accountChanged', callback)
```

样例：
- `喜马拉雅/a/personal.js:49-52`
- `喜马拉雅/a/album.js:2600`
- `喜马拉雅/a/friend_story_album.js:2437`
- `喜马拉雅/a/friend_story_visitor_album.js:2081`

说明登录态变化是通过全局事件广播，而不是响应式 store 自动绑定完成的。

---

## 15. 搜索与跳转链路深度解析

这是“第 2 点”的第四部分：搜索/跳转链路。

## 15.1 搜索接口

来源：`喜马拉雅/a/search.js:24-70`

### 搜索专辑
```js
searchResult(keyValue, param)
```
调用：
```text
GET /ximalayaos-openapi-xxm/search/albums
```
参数：
- `q`
- `page`
- `count`
- `access_token: Token.notNullToken`
- `rows`
- `columns`

### 热搜榜单
- `get_hot_search_rank()`
- `get_hot_search_rank_bi()`

### 热搜角色
- `get_hot_ip_list()`

## 15.2 搜索输入法组件

来源：`喜马拉雅/a/index-e325bde8.js:6-132`

`InputPage` 的输入流程：

1. `inputFocus()` 时调用 `showTextEdit()`
2. `showTextEdit()` 内部调用：
   - `NativeSDK.startTextEdit({ text, maxlength, enterButtonText, inputType })`
3. 监听：
   - `NativeSDK.globalModule().textEditFinished.on(handler)`
4. 用户确认后：
   - `editFinishedClicked(result.text)`
5. 关闭输入法：
   - `NativeSDK.globalModule().closeTextEdit(uuid)`

这套模式也出现在：
- `my_friend_search.js`
- `user_feedback_input.js`

## 15.3 统一跳转 mixin

来源：`喜马拉雅/a/link-814b36ca.js:5-64`

### linkType 映射
- `2 -> album`
- `4 -> subject`
- `45 -> ip_wall_subject`
- `97 -> welfare`
- `98 -> discovery`
- `99 -> ip_wall_subject`
- `7 -> h5_activity`
- `9 -> index`

### `handlerLinkType(linktype, params)`
核心行为：
- `7` 强制跳到 `h5_activity`
- `9` 跳首页 `index`
- 其它按映射表走

## 15.4 首页 Banner/Card 跳转

来源：`喜马拉雅/a/index.js:640-699`

首页卡片跳转时，会先根据 linkType 改写 query：

- `2` 专辑：
  ```json
  { "id": linkOriginId, "title": name, "supplier": linkSupplierId }
  ```
- `4` 专题：
  ```json
  { "title": name, "id": linkOriginId }
  ```
- `7` H5：
  ```json
  { "title": name, "desc": description, "imgUrl": imgPath, "url": linkOriginId }
  ```

然后统一调用：
- `this.handlerLinkType(item.linkType, query)`

## 15.5 通用卡片跳转

来源：`喜马拉雅/a/vCardData-f991bbae.js:81-155`

对不同 `jumpType` 做 query 组装，再 `handlerLinkType()`。

说明全站卡片、banner、专题弹框等大都共享同一套 linkType 语义，而不是每页自行定义跳转。

---

## 16. 专辑供应商模型

来源：`喜马拉雅/a/user-04cca63a.js:11-13`

- 小喜马：`100014`
- 大喜马：`100008`

在页面里大量用于：
- 判定调用哪组接口
- 判定专辑是否受家长管控
- 判定播放 albumId 是否要转换
- 判定订阅/购买逻辑

---

## 17. 专辑信息查询辅助

来源：`喜马拉雅/a/player-4de55b85.js:1-26`

### 小喜马专辑
`queryAlbumInfo(albumId, imgSize = 240)`
- 调 `URL.getXxmAlbum`
- 会把 `cover_path` 复制到 `coverPath`

### 大喜马专辑
`queryDxAlbumInfo(ids = '')`
- 调 `URL.getDxmAlbum`

这两个函数是很多页面构建播放器/页面状态的公共入口。

---

## 18. 订阅能力

来源：`喜马拉雅/a/icon_album_operate_mark-ba32432d.js:7-125`

`subscribe_mixins` 暴露：

- `addXxmSubscribe(album_id)`
- `cancelXxmSubscribe(album_id)`
- `getIsXxmSubscribe(album_id)`
- `getIsDxmSubscribe(album_id)`
- `addorcancelDxmSubscribeList(album_id, operation_type)`
- `querySubscribeState(albumOption)`
- `subscribeAlbum(albumOption)`
- `unsubscribeAlbum(albumOption)`

策略：
- 小喜马走儿童体系接口
- 大喜马走主站订阅接口

---

## 19. 家长管控能力

来源：`喜马拉雅/a/app.js:475-677`

可见能力：

- `showControlPage(actionType, startTime)`
- `isLimitedAlbum(albumId, isXxmAlbum)`
- `isLimited()`
- `checkRefreshConfig(forceRefresh)`
- `queryConfigInfo()`
- `getIntervalMinute()`
- `getLimitStartEndText()`
- `resetControlInfo()`
- `formatMinute()`
- `parseHHmmToMinute()`

配置通过：
- `URL.get_all_limit`

同步到底层播放器通过：
- `xmlyNativeSDK.updateParentControl(...)`

这说明“时间限制/收听限制/专辑限制”并不是只在 UI 层控制，底层播放器也同步了一份约束。

---

## 20. 设备主题与布局适配

来源：
- `喜马拉雅/a/baseInfo-6924ebf1.js:28-36`
- `喜马拉雅/a/xmlyNativeSdk-6efe1704.js:707-708`
- 多个页面/组件中的 `themes`

主题与尺寸映射：

- `theme-plum -> 640`
- `theme-pineapple -> 560`
- `theme-x3/x3s/x5/coco -> 800`
- `theme-popcorn/y02-1 -> 936`
- `theme-almond/melon/... -> 960`
- `theme-y08 -> 1020`

页面常通过：
```js
NativeSDK.globalModule().themeName()
```
决定：
- 一行显示几个卡片
- 列表高度
- 热搜角色行数
- 样式主题选择

这是这个代码库中很重要的设备适配机制。

---

## 21. 埋点体系（UBT）

来源：`喜马拉雅/a/app.js:207-398`

公开方法：
- `exposureEvent(metaId, extra)`
- `clickEvent(metaId, extra)`
- `pageView(metaId, extra)`
- `pageExit(metaId, extra)`
- `appStart()`
- `appExit(duration)`

特点：
- 所有页面、卡片、专题、弹窗、下载、购买几乎都埋点
- 很多跳转前会先记录 `writeExtraInfo` / `writeBuyExtraInfo` 再埋点
- 使用 `xmrep` 体系批量上报

如果你后续想复刻交互链路，埋点点位也是识别业务路径的重要线索。

---

## 24. `.so` 符号与字符串扫描补充说明（仅基于静态可见信息）

说明：这一节不是反编译结果，而是对 `喜马拉雅/a/libs/libjsapi_xmly_arm64-cherry3566_20250609_110125_2094904810.so` 的导出符号、明文字符串和数据库建表语句做静态整理，用来补强前文对播放器/下载器实现的理解。

### 24.1 可确认存在的原生模块入口

通过导出符号可以确认，原生库至少注册了三类 JSAPI：

- `xm_download_module_init_jsapis`
- `xm_mediaplayer_medialist_module_init_jsapis`
- `xm_media_player_module_init_jsapis`

这与 JS 层对以下模块的依赖一一对应：

- `xmlyDownload`
- `xmlyPlayer`
- `xmMediaPlayerMediaList`

也就是说，前端看到的三个模块并不是散落的系统能力，而是同一个喜马拉雅原生库统一提供的三组接口。

### 24.2 播放器管理类的职责边界

从导出符号可见，`XmPlayerManager` 至少承担了以下职责：

#### 播放列表与导航
- `entryAlbum`
- `loadMore`
- `loadMedia`
- `loadFirstMedia`
- `loadLastMedia`
- `next`
- `previous`
- `random`
- `clearMediaList`
- `getCurrentMediaCount`
- `delMedia`
- `delMedias`

#### 播放态与事件
- `emitTrackChanged`
- `emitPlayStatusChanged`
- `emitPlayError`
- `emitRequirePurchase`
- `notifyMediaPlayAction`
- `notifyControlListenInterval`

#### 权益与收藏
- `getFavoriteState`
- `addToFavorite`
- `removeFromFavorite`
- `updatePurchasedAlbum`
- `onPurchaseChanged`
- `onExchangeChanged`

#### 歌词与字幕
- `queryLyricContent`
- `downloadMediaLrcFile`
- `saveLyricFile`
- `requestLyricUrlContent`

#### URL 获取与播放分流
- `queryXxmFreePlayUrl`
- `queryXxmPayPlayUrl`
- `queryXmlyFreePlayUrl`
- `queryXmlyPayPlayUrl`
- `queryXmSwapAlbumPlayUrl`
- `querySwapConversionTrack`
- `setMediaPlayerEmptyUrl`

这说明底层播放器实际上把“列表控制、权益判断、歌词下载、播放地址查询、事件广播”都包进了同一个管理器，而不仅仅是一个简单的 audio wrapper。

### 24.3 原生播放器与 JS Provider 的对应关系

符号中能看到：

- `XmPlayerListWrapper`
- `JSMediaListProxy<XmPlayerListWrapper>`

再结合 JS 层的 `mediaPlayerListProvider.js` 可以推断出完整的协议分层：

1. JS 页面构造 `playAlbum` 的 `provider_info.path`
2. 原生播放器通过 `mediaplayer_list` 协议连接 Provider
3. `XmPlayerListWrapper` 作为原生侧列表包装器，把 JS Provider 转成播放器可消费的数据源
4. `JSMediaListProxy` 负责将 `entryAlbum/loadMedia/next/random/...` 这些操作桥接到 QuickJS

这就是为什么 `playAlbum` 并不直接传整个曲目数组，而是传一个 Provider 路径。

### 24.4 播放 URL 的真实分流维度

从导出符号可以确认，原生层对播放 URL 的处理至少按 3 个维度分流：

#### 维度一：供应商
- `Xxm`：小喜马
- `Xmly`：大喜马

#### 维度二：权益
- `Free`
- `Pay`

#### 维度三：特殊播放模式
- `Swap` / `voice swap`

也就是说，播放器并非只有一个统一“getPlayUrl”接口，而是存在多条不同的请求路径和鉴权逻辑。JS 层把这些复杂度折叠成了 `SdkPlayTrack(playInfo)` 这种单入口。

### 24.5 声音定制 / 换声链路的底层痕迹

静态字符串中可以看到：

- `ximalayaos-voice-swap/api/swap_track/get_track_list`
- `ximalayaos-voice-swap/api/swap_track/get_play_url`
- `ximalayaos-voice-swap/api/swap_track/conversion_track`

配合 JS 层可见字段：

- `voice_user_id`
- `record_id`

可以相互印证：

1. JS 层会把 `voice_user_id` 和 `record_id` 写入 `album_info`
2. 原生层内部有专门的 voice-swap API
3. 播放器支持把普通音频切换为变声/配音版本

这不是单纯 UI 级别的“换声按钮”，而是原生播放器里明确存在的一条业务播放通道。

### 24.6 原生登录与签名能力

字符串中可以确认以下原生 API 行为：

#### 初始化
- `initSDK`
- `xmNativeAPI_init() versionCode=%s, versionName=%s`
- `xmNativeAPI_init() appKey=%s, appSN=%s`
- `xmNativeAPI_init() macAddress=%s, deviceName=%s`
- `xmNativeAPI_init() trackQualityLevel=%s`
- `xmNativeAPI_init() debugMode=%d`
- `xmNativeAPI_init() testHttp=%d`

#### 请求与公共参数
- `request()`
- `requestWithCommonParams()`
- `computeHttpAPISig()`
- `computeMD5()`
- `getUUID()`

#### 登录同步
- `loginAccount()`
- `logoutAccount()`
- `getAccountInfo()`
- `notifyPurchased()`
- `notifyExchange()`

这些字符串直接说明：JS 层的 `NativeSDK` 并不是凭空定义出来的，而是和原生导出接口一一对应。

### 24.7 token 刷新与退出逻辑的底层参与

静态字符串里可以看到：

- `refreshToken() token is null.`
- `refreshToken() refresh_token is expired! logout...`
- `ximalaya.oauth2.refresh_token_revoke`
- `ximalayaos-openapi-oauth2/oauth2/refresh_token`
- `ximalayaos-openapi-oauth2/oauth2/secure_access_token`

这意味着：

1. token 刷新并不只在 JS 逻辑层存在
2. 原生层本身也理解 refresh token 过期、临时 token 获取等概念
3. JS 层出现的 `requestWithCommonParams()` 很可能依赖原生侧自动拼公共参数、刷新 token、返回标准结构

### 24.8 下载器的数据模型与数据库结构

静态字符串直接暴露了下载数据库建表语句，说明本地下载系统至少维护 3 张表：

#### `downloadAlbum`
```sql
create table if not exists downloadAlbum(
  id integer primary key autoincrement,
  albumId varchar UNIQUE,
  albumTitle varchar,
  albumImgUrl varchar,
  albumType integer,
  createTime integer,
  updateTime integer
)
```

#### `downloadTrack`
```sql
create table if not exists downloadTrack(
  id integer primary key autoincrement,
  trackId varchar,
  trackTitle varchar,
  trackIndex integer,
  trackType integer,
  duration integer,
  fileSize integer,
  albumRefId integer,
  createTime integer,
  localPath varchar
)
```

#### `downloadTodo`
```sql
create table if not exists downloadTodo(
  id integer primary key autoincrement,
  albumId varchar,
  albumTitle varchar,
  albumImgUrl varchar,
  albumType integer,
  trackId varchar,
  trackTitle varchar,
  trackType integer,
  trackIndex integer,
  duration integer,
  fileSize integer,
  downloadState integer,
  createTime integer,
  downloadUrl varchar,
  localPath varchar
)
```

数据库文件名在字符串中可见为：
- `/XmDownload_v1.db`

### 24.9 下载器的字段校验规则

字符串还能直接看到若干参数校验报错：

- `downloadTrack() not key albumId, albumSupplier, albumTitle or albumImgUrl!`
- `queryDownloadedAlbumTracks() not key albumId or albumSupplier!`
- `queryDownloadingAlbumTracks() not key albumId or albumSupplier!`
- `deleteDownloadedAlbum() not key albumId or albumSupplier!`
- `deleteDownloadedTrack() not key albumId, trackId or albumSupplier!`
- `updateDownloadedAlbumPurchased() not key albumId, albumIsPurchased or albumSupplier!`
- `updateDownloadedAlbumPayType() not key albumId, albumPayType or albumSupplier!`

这可以反过来帮助确认 JS 层方法真正依赖哪些字段，不必只从调用点猜测。

### 24.10 本地歌词能力

从导出符号和字符串可以看到：

- `downloadMediaLrcFile`
- `saveLyricFile`
- `ximalayaos-api/openapi-fmxos/smallClientApi/tracks/get_track_document_lrc`
- 明文后缀 `.lrc`

这说明原生播放器不只是“播音频”，还负责：
- 查询歌词/字幕地址
- 下载歌词文件
- 存储本地 `.lrc`
- 回调歌词/字幕下载状态

### 24.11 播放器与购买/兑换/订阅的联动观察者

导出符号能看到两个内部观察者类：

- `XmPlayerManager::AccountObserver`
- `XmPlayerManager::SubscribeObserver`

以及它们的行为：

#### AccountObserver
- `onLogin`
- `onLogout`
- `onPurchase`
- `onExchange`

#### SubscribeObserver
- `subscribeChanged`
- `subscribeFailure`
- `resetCallback`

这说明播放器内部不是被动播放，而是订阅了账号/购买/兑换/订阅状态变化，从而在内容权益变化后刷新自身状态。

### 24.12 家长管控在原生侧的落点

导出符号中有：
- `stopPlayParentControl`
- `notifyControlListenInterval`

配合 JS 层：
- `updateParentControl(...)`
- `controlListenInterval.on(...)`

可以判断：

1. 家长管控不是单纯由页面阻止点击
2. 原生播放器自己知道何时该停止播放
3. 连续收听超时会触发控制事件，再由 JS 弹管控页面

### 24.13 “当前播放为空 URL”的保护逻辑

导出符号中有：
- `setMediaPlayerEmptyUrl`

这通常意味着：
- 即使某个 track 当前无法拿到真实播放 URL，播放器也会填充一个“空 URL 状态”并继续维持当前播放上下文
- JS 层因此仍然可能拿到有效的播放实体信息，但音频不可播

这类机制很适合处理：
- 付费未解锁
- URL 拉取失败
- 歌词失败但列表仍需继续显示

### 24.14 可直接据此补强前端建模的字段

如果你要在自己的仿制项目里把数据模型定义得更贴近原版，建议在以下实体里显式加上这些字段：

#### Album
- `albumId`
- `albumTitle`
- `albumImgUrl`
- `albumType`
- `albumIsPurchased`
- `voiceUserId`
- `recordId`

#### Track
- `trackId`
- `trackTitle`
- `trackIndex`
- `trackType`
- `duration`
- `fileSize`
- `downloadUrl`
- `localPath`
- `authorized`
- `isUserLimitFree`

#### PlayContext
- `albumSupplier`
- `albumKey`
- `xmlyPlaylistType`
- `xmlyBeginTrackId`
- `xmlyBreakSecond`
- `voice_user_id`
- `record_id`

这能让你的前端模型更接近它的真实底层协议。


---

## 22. 关键源码结论汇总

### 22.1 最关键的非直观点

1. **大喜马 albumId 播放前会转换成 `2_1_<albumId>`**
2. **播放器不是直接播 URL，而是通过 `playAlbum + Provider` 的列表协议工作**
3. **网络层的公共参数、签名、token 刷新大量交给原生 `xmlyNativeSDK` 处理**
4. **下载内容也受权益控制，并非下载后永远可离线播放**
5. **登录态变化主要依靠全局事件 `accountChanged` 驱动页面刷新**
6. **输入框不是 HTML input，而是系统输入法 `startTextEdit`**
7. **家长管控不仅限制 UI，也同步到底层播放器**
8. **全站跳转大量依赖统一 `linkType -> pageName` 映射，而不是每个页面自己写路由规则**

### 22.2 你最值得直接复用的 JS 层接口

#### NativeSDK
- `init()`
- `getDeviceType()`
- `getSNInfo()`
- `loginAccount()`
- `logoutAccount()`
- `notifyPurchased()`
- `notifyExchange()`
- `HandlePlayer()`
- `getCurrentAlbum()`
- `getPlayerState()`
- `SdkPlayTrack()`
- `startTextEdit()`
- `globalModule()`

#### xmlyDownload（从调用点可见）
- `downloadTrack(json)`
- `queryDownloadedAlbums()`
- `queryDownloadedTracks(json)`
- `queryDownloadingTasks(json)`
- `queryDownloadedAlbumTracks(json)`
- `queryDownloadingAlbumTracks(json)`
- `deleteDownloadedAlbum(json)`
- `deleteDownloadingTaskByTaskId(dbIndex)`
- `deleteDownloadingAllTask()`
- `pauseDownloadingAllTask()`
- `startDownloadingAllTask()`
- `getDownloadedAllFileSize()`
- `isDownloading()`

#### xmlyPlayer（从调用点可见）
- `getPlayingInfo()`
- `trackChanged.on/off()`
- `playStatusChanged.on/off()`
- `controlListenInterval.on()`

---

## 23. 最后说明

这份文档已经覆盖了你要求的两部分：

1. 深挖了第 2 点中最关键的链路：
   - 播放链路
   - 下载链路
   - 登录/token 链路
   - 搜索/跳转链路
2. 基于这些分析整理成了完整文档

如果你下一步要继续，我建议最有价值的方向有两个：

- 单独再出一份《播放器协议最小实现文档》
- 单独再出一份《xmlyDownload / xmlyPlayer / xmlyNativeSDK 页面调用索引表》
