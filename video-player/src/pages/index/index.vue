<template>
  <div class="page">
    <!-- 左栏：探测 + 控制 -->
    <div class="bar">
      <text class="brand">VidPlayer</text>
      <text class="sub">A6P 诊断版 · 800×600</text>

      <!-- 探测结果 -->
      <text class="diag-title">① 模块探测</text>
      <text class="diag-line">状态: {{ probeState }}</text>
      <text class="diag-line">模块: {{ result.moduleName || '未找到' }}</text>
      <text class="diag-line">manager: {{ result.manager ? '✓ 已获取' : '— 无' }}</text>

      <div class="btn-row">
        <div class="btn btn-ctrl" @click="onProbeAgain">
          <text class="btn-text">重新探测</text>
        </div>
      </div>

      <!-- 播放控制 -->
      <text class="diag-title">② 播放控制</text>
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

      <!-- API 列表 -->
      <text class="diag-title">③ 可用 API</text>
      <scroller class="api-scroll" scroll-y="true" scroll-into-view="api-bottom">
        <text class="api-head">module ({{ apiList.module.length }})</text>
        <text v-for="fn in apiList.module" :key="'m' + fn" class="api-item">{{ fn }}</text>
        <text class="api-head">manager ({{ apiList.manager.length }})</text>
        <text v-for="fn in apiList.manager" :key="'g' + fn" class="api-item api-m">{{ fn }}</text>
        <text id="api-bottom" class="api-bottom"></text>
      </scroller>
    </div>

    <!-- 右栏：URL + 完整错误日志 -->
    <div class="right-col">
      <text class="diag-title">视频地址</text>
      <div class="input-wrap">
        <input
          class="url-input"
          :value="url"
          @input="onUrlInput"
          placeholder="http://... 或 /local/file"
        />
      </div>

      <!-- 每个模块的 import() 错误详情 —— 这是关键！ -->
      <text class="diag-title">④ 每个模块的 import() 错误</text>
      <scroller class="err-scroll" scroll-y="true" scroll-into-view="err-bottom">
        <div v-for="(msg, name) in result.errors" :key="'e' + name" class="err-block">
          <text class="err-name">❌ import('{{ name }}') 失败</text>
          <text class="err-msg">{{ msg }}</text>
        </div>
        <text v-if="!hasAnyError" class="err-none">全部 import() 成功</text>
        <text id="err-bottom" class="err-bottom"></text>
      </scroller>

      <!-- 操作日志 -->
      <text class="diag-title">⑤ 操作日志</text>
      <scroller class="log-scroll" scroll-y="true" scroll-into-view="log-bottom">
        <text v-for="(line, i) in logs" :key="'l' + i"
              :class="'log-line ' + (line.err ? 'log-err' : line.ok ? 'log-ok' : 'log-info')">
          {{ line.text }}
        </text>
        <text id="log-bottom" class="log-bottom"></text>
      </scroller>
    </div>
  </div>
</template>

<script>
import {
  probe, resetCache,
  getAvailableApiList,
  play, pause as doPause, stop as doStop, resume as doResume,
  getPlayState, getCurrentPos, getDuration,
  formatTime, stringifyError
} from '../../services/player.js';

// 把 stringifyError 也导进来用
import * as playerMod from '../../services/player.js';

const DESIGN_WIDTH = 800;
const DESIGN_HEIGHT = 600;

export default {
  data() {
    return {
      url: 'https://www.w3schools.com/html/mov_bbb.mp4',
      playing: false,
      paused: false,
      currentState: '',
      currentPos: 0,
      durationMs: 0,
      result: { success: false, moduleName: null, manager: null, errors: {} },
      apiList: { module: [], manager: [] },
      probeState: '点击重新探测',
      logs: [],
      pollToken: null
    };
  },

  computed: {
    hasAnyError() {
      const e = this.result.errors;
      return e && Object.keys(e).length > 0;
    }
  },

  onLoad() {
    this._push('页面加载，开始模块探测...', false, true);
    this.onProbeAgain();
  },

  onUnload() {
    this.stopPoll();
  },

  methods: {
    _push(text, err, ok) {
      this.logs.push({ text: String(text), err: !!err, ok: !!ok });
      if (this.logs.length > 300) this.logs.shift();
    },

    async onProbeAgain() {
      this.probeState = '探测中...';
      resetCache();
      this._push('probe() 开始遍历候选模块...', false, false);

      const r = await probe();
      this.result = r;

      if (r.success) {
        this.probeState = '✓ 成功';
        this._push('✅ 找到模块: ' + r.moduleName + (r.manager ? ' + manager' : ''), false, true);
      } else {
        this.probeState = '✗ 失败';
        this._push('❌ 所有候选模块都 import() 失败', true, false);
        // 把每个错误也打到操作日志里一份
        for (const [name, err] of Object.entries(r.errors || {})) {
          this._push('  import("' + name + '"): ' + err, true, false);
        }
      }

      this.apiList = getAvailableApiList();
      this._push('module API: ' + this.apiList.module.length + ' 个', false, false);
      this._push('manager API: ' + this.apiList.manager.length + ' 个', false, false);
    },

    onUrlInput(e) {
      this.url = (e && e.detail && e.detail.value) || this.url;
    },

    async onTogglePlay() {
      if (!this.result.success) {
        this._push('⚠ 无可用模块，无法播放', true, false);
        return;
      }
      if (this.playing) {
        this._push('调 stop()...', false, false);
        const res = await doStop();
        this._push('stop() → ' + this._fmt(res), !!res.error, !res.error);
        this.playing = false; this.paused = false;
        this.stopPoll();
      } else {
        this._push('调 play() → URL: ' + this.url, false, false);
        const res = await play();
        this._push('play() → ' + this._fmt(res), !!res.error, !res.error);
        if (res.ok !== false) {
          this.playing = true; this.paused = false;
          this.startPoll();
        }
      }
    },

    async onPauseResume() {
      if (!this.playing) return;
      const res = this.paused ? await doResume() : await doPause();
      this._push((this.paused ? 'resume()' : 'pause()') + ' → ' + this._fmt(res), !!res.error, !res.error);
      if (res.ok !== false) this.paused = !this.paused;
    },

    _fmt(res) {
      if (!res) return 'null';
      const parts = [];
      if ('ok' in res) parts.push('ok=' + res.ok);
      if (res.fnUsed) parts.push('fn=' + res.fnUsed);
      if (res.error) parts.push('err=' + res.error);
      if (res.result !== undefined && typeof res.result !== 'object') parts.push('result=' + res.result);
      if (res.result && typeof res.result === 'object') parts.push('result=' + JSON.stringify(res.result).slice(0, 200));
      return parts.join(' | ');
    },

    startPoll() {
      this.stopPoll();
      this.pollToken = this.setInterval(async () => {
        try {
          const s = await getPlayState();
          const p = await getCurrentPos();
          const d = await getDuration();
          if (s && s.result !== undefined) this.currentState = String(s.result);
          if (p && typeof p.result === 'number') this.currentPos = p.result;
          if (d && typeof d.result === 'number') this.durationMs = d.result;
        } catch (e) {}
      }, 800);
    },
    stopPoll() {
      if (this.pollToken) { this.clearInterval(this.pollToken); this.pollToken = null; }
    }
  }
};
</script>

<style lang="less">
@import "var.less";

.page {
  flex-direction: row;
  background-color: @background-color;
}

.bar {
  flex-direction: column;
  width: 280px;
  height: 600px;
  padding: 10px;
  background-color: @card-background-color;
}

.brand {
  font-size: 26px;
  color: @accent;
  font-weight: bold;
}

.sub {
  margin-top: 2px;
  font-size: 10px;
  color: @text-color-dim;
}

.diag-title {
  margin-top: 10px;
  font-size: 12px;
  color: @accent;
}

.diag-line {
  margin-top: 2px;
  font-size: 11px;
  color: @text-color-dim;
  lines: 2;
  text-overflow: ellipsis;
}

.btn-row { margin-top: 5px; }

.btn {
  height: 32px;
  border-radius: 4px;
  justify-content: center;
  align-items: center;
}

.btn-play { background-color: @accent; }
.btn-stop { background-color: #5a2847; }
.btn-ctrl { background-color: @background-color; }

.btn-text {
  font-size: 13px;
  color: #ffffff;
  text-align: center;
}

.btn:active { opacity: 0.7; }

.api-scroll {
  width: 256px;
  height: 170px;
  margin-top: 5px;
  padding: 5px;
  border-radius: 4px;
  background-color: @background-color;
}

.api-head { margin-top: 3px; font-size: 10px; color: @accent; }
.api-item { margin-top: 1px; font-size: 10px; color: @text-color; }
.api-m { color: @accent; }
.api-bottom { height: 1px; }

.right-col {
  flex-direction: column;
  width: 496px;
  height: 600px;
  padding: 10px;
}

.input-wrap {
  margin-top: 4px;
  padding: 6px;
  border-radius: 4px;
  background-color: @card-background-color;
}

.url-input {
  width: 482px;
  font-size: 13px;
  color: @text-color;
}

.err-scroll {
  width: 496px;
  height: 130px;
  margin-top: 4px;
  padding: 5px;
  border-radius: 4px;
  background-color: @card-background-color;
}

.err-block {
  margin-top: 3px;
  flex-direction: column;
}

.err-name {
  font-size: 11px;
  color: @danger;
}

.err-msg {
  margin-top: 1px;
  font-size: 10px;
  color: @text-color;
  lines: 3;
  text-overflow: ellipsis;
}

.err-none {
  font-size: 11px;
  color: @accent;
}

.err-bottom { height: 1px; }

.log-scroll {
  width: 496px;
  height: 340px;
  margin-top: 4px;
  padding: 5px;
  border-radius: 4px;
  background-color: @card-background-color;
}

.log-line {
  font-size: 10px;
  font-family: monospace;
  margin-top: 1px;
  lines: 2;
  text-overflow: ellipsis;
}

.log-info { color: @text-color; }
.log-ok { color: @accent; }
.log-err { color: @danger; }
.log-bottom { height: 1px; }
</style>
