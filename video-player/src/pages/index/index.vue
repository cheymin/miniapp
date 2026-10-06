<template>
  <div class="page">
    <div class="bar">
      <text class="brand">VidPlayer</text>
      <text class="sub">极限探针 v4</text>

      <text class="diag-title">全局变量检查（同步安全）</text>
      <text class="diag-line">1. typeof $import = {{ tyImport }}</text>
      <text class="diag-line">2. typeof $falcon = {{ tyFalcon }}</text>
      <text class="diag-line">3. typeof import() = {{ tyImportFn }}</text>
      <text class="diag-line">4. typeof require = {{ tyRequire }}</text>
      <text class="diag-line">5. typeof globalThis = {{ tyGT }}</text>
      <text class="diag-line">6. $import 是函数吗 = {{ importIsFn }}</text>

      <div class="btn-row">
        <div class="btn btn-play" @click="doDynImport">
          <text class="btn-text">点我：await import('player')</text>
        </div>
      </div>
      <div class="btn-row">
        <div class="btn btn-ctrl" @click="doDollarImport">
          <text class="btn-text">点我：$import('player')</text>
        </div>
      </div>
    </div>

    <div class="right-col">
      <text class="diag-title">结果 / 错误</text>
      <scroller class="log-scroll" scroll-y="true">
        <text v-for="(l, i) in logs" :key="i" :class="'log ' + (l.err ? 'log-err' : '')">{{ l.t }}</text>
      </scroller>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      tyImport: '?', tyFalcon: '?',
      tyRequire: '?', tyGT: '?', importIsFn: '?',
      logs: []
    };
  },
  onLoad() {
    // eslint-disable-next-line no-undef
    this.tyImport = typeof $import;
    // eslint-disable-next-line no-undef
    this.tyFalcon = typeof $falcon;
    this.tyRequire = typeof require;
    this.tyGT = typeof globalThis;
    // eslint-disable-next-line no-undef
    this.importIsFn = typeof $import === 'function';
    this._l('onLoad 完成');
  },
  methods: {
    _l(t, err) { this.logs.push({ t: String(t), err: !!err }); },
    async doDynImport() {
      this._l('await import("player")...');
      try {
        const m = await import('player');
        this._l('✅ 成功: ' + JSON.stringify(Object.getOwnPropertyNames(m || {})));
      } catch (e) {
        this._l('❌ 失败: ' + (e && e.message || String(e)), true);
      }
    },
    async doDollarImport() {
      this._l('$import("player")...');
      try {
        // eslint-disable-next-line no-undef
        const r = $import('player');
        if (r && typeof r.then === 'function') {
          const m = await r;
          this._l('✅ 成功(await): ' + JSON.stringify(Object.getOwnPropertyNames(m || {})));
        } else {
          this._l('✅ 成功(同步): ' + JSON.stringify(Object.getOwnPropertyNames(r || {})));
        }
      } catch (e) {
        this._l('❌ 失败: ' + (e && e.message || String(e)), true);
      }
    }
  }
};
</script>

<style lang="less">
@import "var.less";
.page { flex-direction: row; background-color: @background-color; }
.bar { flex-direction: column; width: 310px; height: 600px; padding: 12px; background-color: @card-background-color; }
.brand { font-size: 26px; color: @accent; font-weight: bold; }
.sub { margin-top: 2px; font-size: 10px; color: @text-color-dim; }
.diag-title { margin-top: 12px; font-size: 12px; color: @accent; }
.diag-line { margin-top: 2px; font-size: 11px; color: @text-color; lines: 3; text-overflow: ellipsis; }
.btn-row { margin-top: 6px; }
.btn { height: 32px; border-radius: 4px; justify-content: center; align-items: center; }
.btn-play { background-color: @accent; }
.btn-ctrl { background-color: @background-color; }
.btn-text { font-size: 12px; color: #ffffff; text-align: center; }
.right-col { flex-direction: column; width: 470px; height: 600px; padding: 12px; }
.log-scroll { width: 470px; height: 550px; margin-top: 4px; padding: 6px; border-radius: 4px; background-color: @card-background-color; }
.log { margin-top: 1px; font-size: 10px; font-family: monospace; lines: 4; text-overflow: ellipsis; }
.log-err { color: @danger; }
</style>
