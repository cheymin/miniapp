<template>
  <div class="page">
    <HtmlView url="https://www.baidu.com"/>
  </div>
</template>

<script>
import HtmlView from '../../components/webview.vue'

export default {
  components: { HtmlView },
  methods: {
    handleNav(href) {
      console.log('跳转链接:', href)
      // 例如你可以在这里重新设置 HtmlView 的 url 来加载新页面
      this.currentUrl = href
    }
  }
}
</script>

<style scoped>
.page {
  flex: 1;
  background-color: white;
}
</style>