<template>
  <div class="page">
    <!-- 左栏：探针 + 控制 -->
    <div class="bar">
      <text class="brand">VidPlayer</text>
      <text class="sub">A6P 终极探针</text>

      <div class="btn-row">
        <div class="btn btn-play" @click="onRunAll">
          <text class="btn-text">一键全测</text>
        </div>
      </div>

      <!-- 全局变量检查 -->
      <text class="diag-title">globalThis 状态</text>
      <text class="diag-line">typeof globalThis: {{ typeofGT }}</text>
      <text class="diag-line">$falcon: {{ gFalcon }}</text>
      <text class="diag-line">$jsapi: {{ gJsapi }}</text>
      <text class="diag-line">typeof require: {{ typeofRequire }}</text>

      <!-- 加载方式结果 -->
      <text class="diag-title">5 种加载方式</text>
      <text v-for="t in loadTests" :key="t.label" class="diag-line">
        {{ t.ok ? '✅' : '❌' }} {{ t.label }}
      </text>

      <!-- 播放控制 -->
      <text class="diag-title">播放控制</text>
      <div class="btn-row">
        <div :class="playing ? 'btn btn-stop' : 'btn btn-play'" @click="onTogglePlay">
          <text class="btn-text">{{ playing ? '停止' : '播放' }}</text>
        </div>
      </div>
      <text class="diag-line">URL:</text>
      <div class="input-wrap">
        <input class="url-input" :value="url" @input="onUrlInput" />
      </div>
    </div>

    <!-- 右栏：详细结果 -->
    <div class="right-col">
      <text class="diag-title">每种方式的完整错误/结果</text>
      <scroller class="log-scroll" scroll-y="true" scroll-into-view="log-bottom">
        <text class="res-block" v-for="t in loadTests" :key="'r' + t.label">
          <text class="res-head">{{ t.ok ? '✅' : '❌' }} {{ t.label }}</text>
          <text class="res-body">{{ t.detail }}</text>
        </text>
        <text class="res-block">
          <text class="res-head">globalThis 枚举</text>
          <text class="res-body">{{ globalKeys }}</text>
        </text>
        <text id="log-bottom"></text>
      </scroller>
    </div>
  </div>
</template>

<script>
import { runAllTests } from '../../services/probe.js';

export default {
  data() {
    return {
      url: 'https://www.w3schools.com/html/mov_bbb.mp4',
      playing: false,
      // 全局变量状态
      typeofGT: '-',
      gFalcon: '-',
      gJsapi: '-',
      typeofRequire: '-',
      globalKeys: '',
      // 5 种加载方式
      loadTests: [
        { label: "await import('player')", ok: null, detail: '未测试' },
        { label: "await import('mediaPlayer')", ok: null, detail: '未测试' },
        { label: "require('player')", ok: null, detail: '未测试' },
        { label: "require('mediaPlayer')", ok: null, detail: '未测试' },
        { label: "require('$jsapi/player')", ok: null, detail: '未测试' },
      ]
    };
  },

  onLoad() {
    this.onRunAll();
  },

  methods: {
    async onRunAll() {
      // 先检查全局变量
      this.typeofGT = typeof globalThis;
      try {
        const g = typeof globalThis !== 'undefined' ? globalThis : (typeof global !== 'undefined' ? global : null);
        this.gFalcon = g && g.$falcon ? '存在 (' + this.countKeys(g.$falcon) + ' keys)' : '无';
        this.gJsapi = g && g.$jsapi ? '存在 (' + this.countKeys(g.$jsapi) + ' keys)' : '无';
        this.globalKeys = g ? Object.getOwnPropertyNames(g).filter(k => k.startsWith('$')).join(', ') : '无 global';
      } catch (e) {
        this.globalKeys = 'error: ' + String(e);
      }

      // require
      try { this.typeofRequire = typeof require; } catch (e) { this.typeofRequire = 'error'; }

      // 跑全部测试
      const r = await runAllTests();
      const map = [
        ['await import(\'player\')', r.dynamicImport],
        ['await import(\'mediaPlayer\')', r.dynamicImportMedia],
        ['require(\'player\')', r.requirePlayer],
        ['require(\'mediaPlayer\')', r.requireMedia],
        ['require(\'$jsapi/player\')', r.requireJsapiPlayer],
      ];
      this.loadTests = map.map(([label, res]) => ({
        label,
        ok: res ? res.ok : null,
        detail: res ? JSON.stringify(res).slice(0, 500) : 'null'
      }));
    },

    countKeys(obj) {
      if (!obj) return 0;
      try { return Object.getOwnPropertyNames(obj).length; } catch (_) { return -1; }
    },

    onUrlInput(e) {
      this.url = (e && e.detail && e.detail.value) || this.url;
    },

    async onTogglePlay() {
      // 终极 probe 之后，如果有成功的模块，这里调用
      alert('先点"一键全测"看结果');
    }
  }
};
</script>

<style lang="less">
@import "var.less";
.page { flex-direction: row; background-color: @background-color; }
.bar { flex-direction: column; width: 300px; height: 600px; padding: 12px; background-color: @card-background-color; }
.brand { font-size: 26px; color: @accent; font-weight: bold; }
.sub { margin-top: 2px; font-size: 10px; color: @text-color-dim; }
.diag-title { margin-top: 12px; font-size: 12px; color: @accent; }
.diag-line { margin-top: 2px; font-size: 11px; color: @text-color; lines: 2; text-overflow: ellipsis; }
.btn-row { margin-top: 6px; }
.btn { height: 32px; border-radius: 4px; justify-content: center; align-items: center; }
.btn-play { background-color: @accent; }
.btn-stop { background-color: #5a2847; }
.btn-text { font-size: 13px; color: #ffffff; text-align: center; }
.input-wrap { margin-top: 4px; padding: 4px; border-radius: 4px; background-color: @background-color; }
.url-input { width: 272px; font-size: 12px; color: @text-color; }
.right-col { flex-direction: column; width: 480px; height: 600px; padding: 12px; }
.log-scroll { width: 480px; height: 550px; margin-top: 4px; padding: 6px; border-radius: 4px; background-color: @card-background-color; }
.res-block { margin-top: 6px; }
.res-head { font-size: 11px; color: @accent; }
.res-body { margin-top: 2px; font-size: 10px; color: @text-color; lines: 5; text-overflow: ellipsis; }
</style>
