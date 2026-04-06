# 如何在 Vue 中写出“喜马拉雅词典笔风格”的 UI

本文档面向“要在 Vue 项目里实现喜马拉雅词典笔风格界面”的开发者，目标不是只讲审美，而是给出可以直接落地的实现方法、组件拆分、状态组织、样式约束和页面编写套路。

内容基于仓库中 `喜马拉雅/a/` 的现有源码产物整理，重点参考了：

- `app.js`
- `index.js`
- `search.js`
- `album.js`
- `vControl-e1dbdb70.js`
- `vStatus-8ace4b89.js`
- `CardListComponent-2eb18b8a.js`
- `index-e325bde8.js`
- `vNavBack-cfdb141b.js`

---

## 1. 先理解：喜马拉雅风格不是“几种颜色”，而是一整套页面骨架

如果只抄它的颜色和圆角，最后做出来只是“像一点”。

真正决定它气质的是下面这 5 件事：

1. **左侧固定控制栏**
2. **主内容整体右移**
3. **深色背景 + 半透明卡片**
4. **设备主题档位式适配**
5. **统一状态组件、统一弹窗、统一输入交互**

所以在 Vue 里复刻时，正确顺序应该是：

- 先建骨架组件
- 再建主题 token
- 再建内容组件
- 最后拼页面

不要直接从页面开始硬写。

---

## 2. 适合使用的 Vue 组织方式

推荐目录结构：

```text
src/
  components/
    xm-shell/
      LeftRail.vue
      PageTitle.vue
      PageContainer.vue
      StatusLayer.vue
      XmToast.vue
      XmDialog.vue
    xm-content/
      XmCardGrid.vue
      XmAlbumHeader.vue
      XmTrackList.vue
      XmTrackItem.vue
      XmHotSearchRank.vue
      XmInputTrigger.vue
  composables/
    useXmTheme.ts
    useXmLayout.ts
    useXmStatus.ts
    useXmPlayerState.ts
  styles/
    xm-tokens.css
    xm-theme.css
    xm-helpers.css
  pages/
    home/
    search/
    album/
    download/
```

如果你是 Vue 3，建议：
- 组合式 API 做状态组织
- 单文件组件做页面
- CSS Variables 或者 JS theme map 做主题切换

如果你是 Vue 2，也能做，但建议至少把：
- 主题 token
- 页面骨架
- 状态组件
抽出来。

---

## 3. 先做主题 token，而不是先写样式

喜马拉雅词典笔风格的核心在于“多设备档位 + 一套视觉基因”。

## 3.1 推荐 token

先定义一套 token：

```css
:root {
  --xm-left-rail-width: 80px;
  --xm-title-height: 80px;
  --xm-title-padding-left: 90px;
  --xm-content-margin-left: 80px;

  --xm-color-bg: #0c0c30;
  --xm-color-card: rgba(255, 255, 255, 0.16);
  --xm-color-mask: rgba(0, 0, 0, 0.69);
  --xm-color-text-primary: #ffffff;
  --xm-color-text-secondary: rgba(255, 255, 255, 0.68);
  --xm-color-text-tertiary: rgba(255, 255, 255, 0.5);
  --xm-color-accent: #ff683d;

  --xm-radius-card: 20px;
  --xm-radius-panel: 16px;
  --xm-radius-pill: 24px;

  --xm-font-title: 28px;
  --xm-font-body: 28px;
  --xm-font-card: 24px;
  --xm-font-small: 22px;

  --xm-space-4: 4px;
  --xm-space-6: 6px;
  --xm-space-8: 8px;
  --xm-space-12: 12px;
  --xm-space-14: 14px;
  --xm-space-16: 16px;
  --xm-space-18: 18px;
  --xm-space-20: 20px;
}
```

## 3.2 设备档位 token

喜马拉雅不是完全流式响应式，而是按设备档位切多套尺寸。

建议在 Vue 中用一个 composable 或 store 管理：

```ts
export type XmThemeName =
  | 'theme-plum'
  | 'theme-pineapple'
  | 'theme-coco'
  | 'theme-x3s'
  | 'theme-popcorn'
  | 'theme-y02-1'
  | 'theme-almond'
  | 'theme-melon'
  | 'theme-y08';

export function useXmTheme() {
  const themeName = ref<XmThemeName>('theme-almond');

  const themeMetrics = computed(() => {
    switch (themeName.value) {
      case 'theme-pineapple':
        return {
          titleHeight: '48px',
          titlePaddingLeft: '60px',
          fontTitle: '20px',
          fontCard: '20px',
          cardImageSize: '100px',
        };
      case 'theme-coco':
      case 'theme-x3s':
        return {
          titleHeight: '80px',
          titlePaddingLeft: '90px',
          fontTitle: '28px',
          fontCard: '24px',
          cardImageSize: '128px',
        };
      default:
        return {
          titleHeight: '80px',
          titlePaddingLeft: '90px',
          fontTitle: '28px',
          fontCard: '24px',
          cardImageSize: '154px',
        };
    }
  });

  return { themeName, themeMetrics };
}
```

要点：
- **不要只改字体**
- 要整套改：
  - 标题高度
  - 卡片尺寸
  - 一行数量
  - 边距
  - 页面高度

---

## 4. 页面骨架组件必须先做

## 4.1 `LeftRail.vue`

它对应喜马拉雅的 `vControl`。

### 职责
- 返回
- 搜索
- 更多
- 中间辅助按钮
- 首页头像入口

### Vue 实现建议

```vue
<template>
  <aside class="xm-left-rail">
    <button class="xm-rail-btn" @click="$emit('back')">
      <slot name="back">返回</slot>
    </button>

    <div class="xm-rail-main">
      <slot />
    </div>

    <button class="xm-rail-btn" @click="$emit('more')">
      <slot name="more">更多</slot>
    </button>
  </aside>
</template>

<style scoped>
.xm-left-rail {
  position: fixed;
  top: 0;
  left: 0;
  width: var(--xm-left-rail-width);
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
  z-index: 99;
}

.xm-rail-btn {
  width: 52px;
  height: 52px;
  margin: 16px 14px;
  border: 0;
  background: transparent;
  color: var(--xm-color-text-primary);
  transform-origin: center;
}

.xm-rail-btn:active {
  transform: scale(0.95);
}
</style>
```

### 关键原则
- 左栏必须固定定位
- 宽度固定为 80px
- 主内容永远不要压到左栏下面
- 所有页面都尽量复用这一个骨架组件

## 4.2 `PageTitle.vue`

对应原版大量页面共享的：
- `height: 80px`
- `paddingLeft: 90px`

```vue
<template>
  <header class="xm-page-title">
    <h1 class="xm-page-title__text">
      <slot />
    </h1>
    <div class="xm-page-title__extra">
      <slot name="extra" />
    </div>
  </header>
</template>

<style scoped>
.xm-page-title {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: var(--xm-title-height);
  line-height: var(--xm-title-height);
  padding-left: var(--xm-title-padding-left);
  display: flex;
  align-items: center;
  z-index: 9;
}

.xm-page-title__text {
  font-size: var(--xm-font-title);
  color: var(--xm-color-text-primary);
  opacity: 0.68;
  font-weight: 400;
  margin: 0;
}

.xm-page-title__extra {
  margin-left: auto;
  margin-right: 16px;
}
</style>
```

## 4.3 `PageContainer.vue`

对应原版内容区的统一右移。

```vue
<template>
  <section class="xm-page-container">
    <slot />
  </section>
</template>

<style scoped>
.xm-page-container {
  margin-left: var(--xm-content-margin-left);
  min-height: 100vh;
  padding-right: 12px;
  box-sizing: border-box;
}
</style>
```

---

## 5. 背景层的正确写法

喜马拉雅风格不是纯色背景，而是：
- 深色底色
- 叠加氛围背景图
- 内容浮在卡片上

推荐做一个通用背景容器：

```vue
<template>
  <div class="xm-bg-page" :style="pageStyle">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  bgImage?: string;
  bgColor?: string;
}>();

const pageStyle = computed(() => ({
  backgroundColor: props.bgColor || '#0c0c30',
  backgroundImage: props.bgImage ? `url(${props.bgImage})` : undefined,
  backgroundSize: 'cover',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'bottom',
}));
</script>

<style scoped>
.xm-bg-page {
  min-height: 100vh;
  color: var(--xm-color-text-primary);
}
</style>
```

### 原则
- 背景图尽量偏底部
- 颜色必须兜底
- 纹理不要太复杂
- 白色文字在任何主题下都要有对比度

---

## 6. 如何写“喜马拉雅式卡片”

## 6.1 网格卡片组件：`XmCardGrid.vue`

可直接借鉴 `CardListComponent` 的思路。

### 特征
- 图片优先
- 文字居中
- 支付/会员角标贴右上角
- 锁定蒙层覆盖整张图
- 点击前先做限制判断

### Vue 组件草图

```vue
<template>
  <div class="xm-card-grid">
    <article
      v-for="item in items"
      :key="item.id || item.albumId"
      class="xm-card-grid__item"
      @click="handleClick(item)"
    >
      <div class="xm-card-grid__image-wrapper">
        <img :src="item.iconPath || item.cover" class="xm-card-grid__image" />

        <img
          v-if="item.markIcon"
          :src="item.markIcon"
          class="xm-card-grid__mark"
        />

        <div v-if="item.locked" class="xm-card-grid__lock-mask">
          <img :src="lockIcon" class="xm-card-grid__lock-icon" />
        </div>
      </div>

      <div class="xm-card-grid__text">
        <span class="xm-ellipsis">{{ item.title }}</span>
      </div>
    </article>
  </div>
</template>
```

### 样式重点

```css
.xm-card-grid {
  margin-left: 80px;
  display: flex;
  flex-wrap: wrap;
}

.xm-card-grid__item {
  width: 176px;
  margin-bottom: 18px;
}

.xm-card-grid__image-wrapper {
  position: relative;
  width: 154px;
  height: 154px;
  border-radius: 20px;
  overflow: hidden;
}

.xm-card-grid__mark {
  position: absolute;
  right: 0;
  top: 0;
  width: 60px;
  height: 24px;
}

.xm-card-grid__lock-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.69);
}

.xm-card-grid__text {
  width: 154px;
  margin-top: 6px;
  text-align: center;
  color: #fff;
  font-size: 24px;
}
```

### 必须注意
- 图和文的宽度要对齐
- 文本默认只允许一行省略
- 锁定遮罩不能改变布局
- 角标不要撑开图片容器

---

## 7. 如何写“喜马拉雅式曲目列表”

这是最有辨识度的一块，尤其在 `album.js` 的 `vUnittrack` 里体现很明显。

## 7.1 结构

每一行曲目建议拆成：
- 标题区
- 状态角标区
- 右侧下载按钮区
- 当前播放态区

## 7.2 Vue 组件建议

```vue
<template>
  <div class="xm-track-list">
    <div
      v-for="(track, index) in tracks"
      :key="track.trackId"
      class="xm-track-item"
      @click="$emit('play-track', track)"
    >
      <div class="xm-track-item__title">
        <span
          class="xm-track-item__name xm-ellipsis"
          :class="{ 'is-playing': currentTrackId === track.trackId }"
        >
          {{ track.title }}
        </span>

        <img v-if="track.markIcon" :src="track.markIcon" class="xm-track-item__mark" />
      </div>

      <button
        v-if="showDownloadButton"
        class="xm-track-item__download"
        @click.stop="$emit('download-track', { track, index })"
      >
        <img :src="resolveDownloadIcon(track)" class="xm-track-item__download-icon" />
      </button>
    </div>
  </div>
</template>
```

## 7.3 样式关键点

```css
.xm-track-item {
  position: relative;
  width: 100%;
  margin-bottom: 18px;
  padding: 0 18px;
  display: flex;
  align-items: center;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.16);
}

.xm-track-item__title {
  width: 100%;
  margin: 24px 9px;
  display: flex;
  align-items: center;
}

.xm-track-item__name {
  max-width: 83%;
  color: #fff;
  font-size: 28px;
  line-height: 32px;
}

.xm-track-item__name.is-playing {
  color: #ff683d;
}

.xm-track-item__download {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  width: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
}

.xm-track-item__download-icon {
  width: 36px;
  height: 36px;
}
```

## 7.4 业务层建议

曲目组件不要只管样式，要让它支持这些状态：

- 当前播放
- 会员 / 免费 / 单购 / 兑换角标
- 下载中
- 已下载
- 删除模式
- 权益限制

推荐 props：

```ts
interface TrackItemVM {
  trackId: string | number;
  title: string;
  type?: number;
  markIcon?: string;
  downloading?: boolean;
  downloaded?: boolean;
  locked?: boolean;
}
```

---

## 8. 如何写“喜马拉雅式状态组件”

原版的 `vStatus` 做得很好，建议直接仿思路，不要每页手搓加载、空态、错误态。

## 8.1 统一状态枚举

```ts
export enum XmPageStatus {
  Success = 0,
  Loading = 1,
  Empty = 2,
  Error = 3,
  NeedLogin = 4,
}
```

## 8.2 Vue 组件实现建议

```vue
<template>
  <div v-if="status !== XmPageStatus.Success" class="xm-status-layer">
    <div class="xm-status-inner">
      <template v-if="status === XmPageStatus.Loading">
        <slot name="loading-icon">
          <div class="xm-loading-placeholder" />
        </slot>
        <p class="xm-status-text">{{ textLoading }}</p>
      </template>

      <template v-else-if="status === XmPageStatus.Empty">
        <slot name="empty-icon" />
        <p class="xm-status-text">{{ textEmpty }}</p>
      </template>

      <template v-else-if="status === XmPageStatus.Error">
        <slot name="error-icon" />
        <p class="xm-status-text">{{ textError }}</p>
        <button class="xm-status-btn" @click="$emit('retry')">重试</button>
      </template>

      <template v-else-if="status === XmPageStatus.NeedLogin">
        <slot name="login-icon" />
        <p class="xm-status-text">{{ textNeedLogin }}</p>
        <button class="xm-status-btn" @click="$emit('login')">登录</button>
      </template>
    </div>
  </div>
</template>
```

## 8.3 样式原则
- 文案弱化，不要过于刺眼
- 错误态不要大红大紫
- 居中对齐
- 尽量保持页面背景仍然可见

---

## 9. 如何写“喜马拉雅式输入组件”

原版不是传统浏览器输入，而是：
- 页面展示输入框外观
- 触发系统输入法
- 输入结果回填

如果你只是做普通 Vue Web，也仍然建议保留这个“交互形态”。

## 9.1 外观层实现

```vue
<template>
  <div class="xm-input-trigger" @click="$emit('activate')">
    <img v-if="icon" :src="icon" class="xm-input-trigger__icon" />
    <span class="xm-input-trigger__text">
      {{ modelValue || placeholder }}
    </span>
  </div>
</template>
```

## 9.2 样式要点

```css
.xm-input-trigger {
  width: 100%;
  height: 80px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  background: rgba(255,255,255,0.16);
  color: #fff;
  font-size: 28px;
  padding-left: 62px;
  position: relative;
}

.xm-input-trigger__icon {
  position: absolute;
  left: 16px;
  width: 44px;
  height: 44px;
}
```

## 9.3 如果你也有系统输入法桥接

那就照原版思路封装：

```ts
export function useXmNativeTextEdit(nativeSDK: any) {
  const inputTaskUuid = ref('');

  function openTextEdit(options: Record<string, any>) {
    inputTaskUuid.value = nativeSDK.startTextEdit(options);
  }

  function bindFinished(handler: (text: string) => void) {
    const fn = (uuid: string, jsonData: string) => {
      if (uuid !== inputTaskUuid.value) return;
      const result = JSON.parse(jsonData);
      if (result.editConfirmed) {
        handler((result.text || '').replace(/\n/g, ''));
      }
      nativeSDK.globalModule().closeTextEdit?.(inputTaskUuid.value);
      inputTaskUuid.value = '';
    };

    nativeSDK.globalModule().textEditFinished?.on(fn);
    return fn;
  }

  function close() {
    nativeSDK.globalModule().closeTextEdit?.(inputTaskUuid.value);
    inputTaskUuid.value = '';
  }

  return { inputTaskUuid, openTextEdit, bindFinished, close };
}
```

---

## 10. 如何在 Vue 中实现多主题适配

喜马拉雅的主题适配是它最值得学的工程点之一。

## 10.1 不建议完全依赖媒体查询

因为它面对的是：
- 固定型号设备
- 非标准浏览器
- 横向屏幕
- 预设宽度档位

所以建议：
- 通过 `themeName` 直接切 token
- 而不是只用 `@media`

## 10.2 推荐写法

```ts
const themePresetMap = {
  'theme-pineapple': {
    pageTitleHeight: '48px',
    pageTitlePaddingLeft: '60px',
    cardWidth: '100px',
    cardTextSize: '20px',
  },
  'theme-coco': {
    pageTitleHeight: '80px',
    pageTitlePaddingLeft: '90px',
    cardWidth: '128px',
    cardTextSize: '24px',
  },
  default: {
    pageTitleHeight: '80px',
    pageTitlePaddingLeft: '90px',
    cardWidth: '154px',
    cardTextSize: '24px',
  },
};
```

然后通过 `provide/inject` 或全局 store 下发。

## 10.3 一定要成组调整

例如卡片缩小时，同时调整：
- 卡片容器宽度
- 图片尺寸
- 标题宽度
- 字体大小
- 列间距

不要只缩图片，不缩文字。

---

## 11. 页面实现套路：以“搜索页”为例

## 11.1 推荐页面结构

```vue
<template>
  <XmPageBackground :bg-image="bgImage">
    <LeftRail @back="goBack" @more="openMore" />
    <PageTitle>搜索</PageTitle>

    <PageContainer>
      <section class="xm-search-page">
        <XmInputTrigger
          :model-value="keyword"
          placeholder="搜索内容"
          @activate="openSearchInput"
        />

        <XmHotSearchRank
          :rank-list="rankList"
          :role-list="roleList"
          @choose-rank="handleChooseRank"
          @choose-role="handleChooseRole"
          @refresh-role="refreshRoleList"
        />

        <XmStatusLayer
          :status="status"
          @retry="searchAgain"
        />

        <XmCardGrid
          v-if="status === XmPageStatus.Success"
          :items="resultList"
          @item-click="openAlbum"
        />
      </section>
    </PageContainer>
  </XmPageBackground>
</template>
```

## 11.2 逻辑要点

- 默认不空白：先加载热搜榜和热搜角色
- 搜索动作触发后再展示结果
- 无结果与失败要分开
- 点击卡片前先判断是否被限制

---

## 12. 页面实现套路：以“专辑页”为例

## 12.1 推荐结构

```vue
<template>
  <XmPageBackground :bg-image="bgImage">
    <LeftRail @back="goBack" @more="toggleMore" />
    <PageTitle>{{ album.title }}</PageTitle>

    <PageContainer>
      <XmAlbumHeader
        :album="album"
        :purchase-info="purchaseInfo"
        :is-vip="isVip"
      />

      <XmTrackList
        :tracks="trackList"
        :current-track-id="currentTrackId"
        :show-download-button="showDownloadButton"
        @play-track="handlePlayTrack"
        @download-track="handleDownloadTrack"
      />
    </PageContainer>

    <XmDialog v-model:open="showPayDialog" />
    <XmDialog v-model:open="showExchangeDialog" />
  </XmPageBackground>
</template>
```

## 12.2 逻辑层原则

专辑页不要把逻辑都堆在组件内部，建议拆 composable：

- `useAlbumPageData()`
- `useAlbumPlayerActions()`
- `useAlbumPurchaseState()`
- `useAlbumDownloadState()`

这样才不会像压缩后的 `album.js` 一样变成巨型文件。

---

## 13. 如何在 Vue 中做“喜马拉雅式轻交互”

## 13.1 点击反馈

统一用：

```css
.xm-clickable:active {
  transform: scale(0.95);
}
```

## 13.2 动画原则

原版并不炫技，推荐：
- toast：短入短出
- 弹窗：轻微上浮
- 下载中：旋转图标
- loading：帧动画或低负担图像动画

不要：
- 大量 spring 动画
- 复杂 3D 翻转
- 长时间 easing

---

## 14. 如何组织业务状态，才能像原版那样稳定

## 14.1 推荐拆分

### 页面 UI 状态
- `loading`
- `empty`
- `error`
- `dialog open`
- `delete mode`

### 播放状态
- `currentTrackId`
- `isPlaying`
- `currentAlbumId`
- `playError`

### 下载状态
- `downloadedIds`
- `downloadingIds`
- `taskStateMap`

### 权益状态
- `isLogin`
- `isVip`
- `isPurchase`
- `purchaseInfo`

### 设备状态
- `themeName`
- `deviceSizePreset`

## 14.2 重要原则

**不要让组件自己悄悄决定太多业务状态。**

原版压缩产物里逻辑非常集中，是因为编译后难以拆分。你在 Vue 源码里应该反着来：
- 业务状态上收
- 样式组件下放
- 交互通过事件向上传递

---

## 15. 推荐的样式工具类

建议你提前准备这些工具类：

```css
.xm-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.xm-card-bg {
  background: rgba(255,255,255,0.16);
  border-radius: 20px;
}

.xm-page-content {
  margin-left: 80px;
}

.xm-accent {
  color: #ff683d;
}

.xm-text-secondary {
  color: rgba(255,255,255,0.68);
}

.xm-text-tertiary {
  color: rgba(255,255,255,0.5);
}
```

这样写页面时会快很多。

---

## 16. 最小可落地组件清单

如果你今天就要开始写，建议优先实现这 8 个组件：

1. `LeftRail.vue`
2. `PageTitle.vue`
3. `PageBackground.vue`
4. `StatusLayer.vue`
5. `XmDialog.vue`
6. `XmInputTrigger.vue`
7. `XmCardGrid.vue`
8. `XmTrackList.vue`

只要这 8 个做对，页面风格基本就出来了。

---

## 17. 最后的实现建议

如果你的目标是“像喜马拉雅词典笔”，请按这个顺序做：

### 第一步
实现主题 token 和 `useXmTheme()`

### 第二步
实现页面骨架：
- 左栏
- 标题
- 背景
- 状态层

### 第三步
实现内容组件：
- 卡片网格
- 曲目列表
- 输入触发器

### 第四步
实现页面：
- 搜索页
- 专辑页
- 下载页
- 个人中心页

### 第五步
统一把：
- toast
- dialog
- loading
- 空态
- 删除模式
全部收口到公共组件

这样出来的项目，不只是“像”，而且会像原版一样稳定、耐维护。
