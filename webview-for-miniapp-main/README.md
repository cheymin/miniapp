一个适用于 **Falcon 小程序框架**（Vue 2.6.12）的轻量级 HTML 渲染组件。  
它能在嵌入式设备（X2500/X2600 等）上将远程 HTML 转换为 Falcon 原生组件进行渲染，支持基础样式、表单、图片和链接跳转。

---

## ✨ 特性

- 🔍 **纯 JS 解析，零浏览器依赖**  
  将 HTML 字符串解析为 Falcon 的 `div`、`text`、`image`、`input` 等原生组件。
- 🎨 **CSS 样式提取**  
  支持 `<style>` 标签内的简单选择器（标签、类、ID）与内联样式，安全过滤高危属性。
- 📝 **表单控件原生渲染**  
  支持 `input`、`textarea`、`button`、`select` 等控件。
- 🔗 **链接点击与页面跳转**  
  内部处理协议相对链接（`//`），并自动触发组件内导航。
- 🖼️ **图片自动加载**  
  支持 `img` 标签，自动替换 `https://` 为 `http://` 以兼容老旧环境。
- 🧠 **智能横向布局**  
  自动检测行内元素并启用 `flex-wrap`，实现导航栏、工具条等横向排列。
- 📱 **桌面端 User‑Agent**  
  请求时模拟 Chrome 浏览器，获得更适合大屏的 PC 版网页。
- 🔒 **HTTPS 自动降级**  
  当设备不支持 HTTPS 时，自动降级为 HTTP 请求（可配置）。
- 🧩 **零外部依赖，开箱即用**

---

## 📦 快速开始

### 1. 放置组件文件

将 `webview.vue` 放入 Falcon 项目的 `src/components/` 目录。

```
your-falcon-app/
  src/
    components/   组件/
      webview.vue
    pages/   页/
      index/   索引/
        index.vue
```

### 2. 在页面中使用

```html   “的”html
<template>   < template>
  <div style="flex:1">   < div style = "扩开:1" >
    <HtmlView url="http://www.baidu.com" />HtmlView url= “ quot;http://www.baidu.com" / ”
  </div>   < / div>
</template>

<script>
import HtmlView from '../../components/webview.vue'

export default {
  components: { HtmlView }
}
</script>
```

### 3. 监听链接跳转（可选）

```html
<HtmlView url="http://www.baidu.com" @navigate="handleNav" />
```

```js
methods: {
  handleNav(href) {
    console.log('即将跳转到:', href)
  }
}
```

---

## 📖 属性 Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `url` | String | **必填** | 要加载的网页地址，支持 `http://` 和 `https://`（真机环境下 HTTPS 正常，模拟器可能需降级）。 |

---

## 📢 事件 Events

| 事件名 | 参数 | 说明 |
|--------|------|------|
| `navigate` | `href: String` | 用户点击链接时触发，参数为跳转目标 URL。组件内部已实现页面跳转，监听该事件可做额外处理（如记录日志）。 |

---

## 🌐 兼容的网页类型

| 网站类型 | 效果 |
|----------|------|
| 静态文档、帮助页面 | ✅ 完美 |
| 百度、hao123 等传统网站 | ✅ 良好（排版基本正常） |
| 包含少量简单 JS 的页面 | ⚠️ 仅静态内容可见，JS 被忽略 |
| Bing、React/Vue SPA | ❌ 内容缺失（需浏览器执行 JS） |

> 注：本组件仅渲染静态 HTML+CSS，不执行 JavaScript。如需动态内容，可考虑服务端预渲染或引入更完整的浏览器内核。

---

## 🛠 如何工作

1. 使用 `$falcon.jsapi.http` 发起 HTTP 请求（自动处理 HTTPS 降级）。
2. 正则解析 HTML，构建节点树（跳过 `<script>` 标签）。
3. 提取 `<style>` 文本，生成简单的样式规则映射。
4. 递归渲染节点树，将 HTML 标签映射为 Falcon 的原生组件（`div`、`text`、`image`、`input` 等）。
5. 块级容器智能选择横向或纵向 flex 布局。

---

## ⚙ 高级配置（修改源码）

- **调整 User-Agent**：修改 `loadHtml` 方法中的 `headers` 对象。
- **放宽/收紧 CSS 过滤**：编辑 `filterCSSDeclarations` 方法中的白名单或黑名单。
- **禁用 HTTPS 自动降级**：注释掉 `loadHtml` 中 `replace('https://', 'http://')` 的代码。
- **自定义默认样式**：修改 `getCombinedStyle` 中的 `tagDefaults` 对象。
