<template>
  <div class="page">
    <div class="bar">
      <text class="brand">VidPlayer</text>
      <text class="sub">A6P 安全探针 · v3</text>

      <div class="btn-row">
        <div class="btn btn-play" @click="onProbe">
          <text class="btn-text">探测 SO</text>
        </div>
      </div>

      <text class="diag-title">① $falcon 全局</text>
      <text class="diag-line">typeof $falcon: {{ typeofFalcon }}</text>
      <text v-if="falconKeys.length" class="diag-line">keys: {{ falconKeys.slice(0, 8).join(', ') }}</text>
      <text v-if="falconFns.length" class="diag-line">fns: {{ falconFns.slice(0, 6).join(', ') }}</text>

      <text class="diag-title">② import('player')</text>
      <text class="diag-line">{{ playerOk ? '✅' : '❌' }} {{ playerResult }}</text>

      <text class="diag-title">③ import('mediaPlayer')</text>
      <text class="diag-line">{{ mediaOk ? '✅' : '❌' }} {{ mediaResult }}</text>

      <!-- 播放控制 -->
      <text class="diag-title">④ 播放测试</text>
      <div class="input-wrap">
        <input class="url-input" :value="url" @input="onUrlInput" />
      </div>
      <div class="btn-row">
        <div :class="playing ? 'btn btn-stop' : 'btn btn-play'" @click="onTogglePlay">
          <text class="btn-text">{{ playing ? '停止' : '播放' }}</text>
        </div>
      </div>
      <div v-if="playing" class="btn-row">
        <div class="btn btn-ctrl" @click="onPauseResume">
          <text class="btn-text">{{ paused ? '继续' : '暂停' }}</text>
        </div>
      </div>
    </div>

    <div class="right-col">
      <text class="diag-title">详细错误</text>
      <scroller class="log-scroll" scroll-y="true">
        <text v-for="(line, i) in logs" :key="i" :class="'log ' + (line.err ? 'log-err' : 'log-ok')">
          {{ line.text }}
        </text>
      </scroller>
    </div>
  </div>
</template>

<script>
import {
  probe, resetCache, getAvailableApiList,
  play, pause as doPause, stop as doStop, resume as doResume,
  openPlayer, release, status, safeStringify, formatTime
} from '../../services/player.js';

export default {
  data() {
    return {
      url: 'https://www.w3schools.com/html/mov_bbb.mp4',
      playing: false,
      paused: false,
      logs: [],
      // 探测结果
      typeofFalcon: '?',
      falconKeys: [],
      falconFns: [],
      playerOk: null,
      playerResult: '未探测',
      mediaOk: null,
      mediaResult: '未探测',
      apiList: { module: [], manager: [], falcon: [] }
    };
  },

  onLoad() {
    // 不自动跑任何东西！避免黑屏重启
    this._push('页面加载，点击"探测 SO"开始', false, true);
    // 但 $falcon 检查是同步安全的（PenBili 也是这么干的）
    try {
      // eslint-disable-next-line no-undef
      this.typeofFalcon = typeof $falcon;
      // eslint-disable-next-line no-undef
      if (typeof $falcon !== 'undefined') {
        // eslint-disable-next-line no-undef
        this.falconKeys = Object.getOwnPropertyNames($falcon);
        // eslint-disable-next-line no-undef
        this.falconFns = this.falconKeys.filter(k => {
          try { return typeof $falcon[k] === 'function'; } catch (_) { return false; }
        });
      }
    } catch (e) {
      this._push('$falcon 检查异常: ' + safeStringify(e), true, false);
    }
  },

  methods: {
    _push(text, err, ok) {
      this.logs.push({ text: String(text), err: !!err, ok: !!ok });
      if (this.logs.length > 100) this.logs.shift();
    },

    async onProbe() {
      this._push('开始 probe()...', false, false);
      resetCache();

      try {
        const r = await probe();
        this.apiList = getAvailableApiList();

        if (!r) {
          this._push('probe 返回 null', true, false);
          return;
        }

        // player 错误
        const pErr = r.errors['player'];
        this.playerOk = r.success && r.moduleName === 'player';
        this.playerResult = this.playerOk
          ? '成功, keys=' + (this.apiList.module.length || 0)
          : (pErr || (r.errors['mediaPlayer'] ? 'player 未试' : '未知'));

        // mediaPlayer 错误
        const mErr = r.errors['mediaPlayer'];
        this.mediaOk = r.success && r.moduleName === 'mediaPlayer';
        this.mediaResult = this.mediaOk
          ? '成功, manager=' + (r.manager ? '✓' : '无')
          : (mErr || '未试');

        this._push('probe 完成. success=' + r.success + ' moduleName=' + r.moduleName, r.success, true);
        if (pErr) this._push('import("player"): ' + pErr, true, false);
        if (mErr) this._push('import("mediaPlayer"): ' + mErr, true, false);

        this._push('$falcon fns: ' + this.apiList.falcon.join(', '), false, false);
      } catch (e) {
        this._push('probe() 抛异常: ' + safeStringify(e), true, false);
      }
    },

    onUrlInput(e) {
      this.url = (e && e.detail && e.detail.value) || this.url;
    },

    async onTogglePlay() {
      if (this.playing) {
        const res = await doStop();
        this._push('stop: ' + JSON.stringify(res), !!res.error, !res.error);
        this.playing = false; this.paused = false;
      } else {
        // player 模块需要 open()，mediaPlayer 可能直接 play()
        let res;
        const r = await probe();
        if (r && r.moduleName === 'player') {
          res = await openPlayer({
            input: this.url,
            rect: { x: 0, y: 0, width: 800, height: 600 },
            fps: 24, audio: true, transpose: 1
          });
        } else {
          res = await play();
        }
        this._push('play/open: ' + JSON.stringify(res).slice(0, 300),
                   !!res.error, !res.error);
        if (res.ok !== false) {
          this.playing = true; this.paused = false;
        }
      }
    },

    async onPauseResume() {
      const res = this.paused ? await doResume() : await doPause();
      this._push((this.paused ? 'resume' : 'pause') + ': ' + JSON.stringify(res),
                 !!res.error, !res.error);
      if (res.ok !== false) this.paused = !this.paused;
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
.btn-stop { background-color: #5a2847; }
.btn-ctrl { background-color: @background-color; }
.btn-text { font-size: 13px; color: #ffffff; text-align: center; }
.input-wrap { margin-top: 4px; padding: 4px; border-radius: 4px; background-color: @background-color; }
.url-input { width: 286px; font-size: 12px; color: @text-color; }
.right-col { flex-direction: column; width: 470px; height: 600px; padding: 12px; }
.log-scroll { width: 470px; height: 550px; margin-top: 4px; padding: 6px; border-radius: 4px; background-color: @card-background-color; }
.log { margin-top: 1px; font-size: 10px; font-family: monospace; lines: 3; text-overflow: ellipsis; }
.log-ok { color: @accent; }
.log-err { color: @danger; }
</style>
