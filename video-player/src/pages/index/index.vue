<template>
  <div class="page">
    <!-- 左栏：品牌 + 控制 + 诊断 -->
    <div class="bar">
      <text class="brand">VidPlayer</text>
      <text class="sub">A6P · 320×240</text>

      <!-- 模块诊断 -->
      <text class="diag-title">模块探测</text>
      <text class="diag-line">模块: {{ moduleName || '探测中...' }}</text>
      <text class="diag-line">manager: {{ managerOk ? '✓ 已获取' : '— 无' }}</text>

      <!-- 操作按钮 -->
      <div class="btn-row">
        <div class="btn btn-ctrl" @click="onProbeAgain">
          <text class="btn-text">重新探测</text>
        </div>
      </div>

      <!-- 播放控制区 -->
      <text class="diag-title">播放控制</text>
      <div class="btn-row">
        <div :class="playing ? 'btn btn-stop' : 'btn btn-play'" @click="onTogglePlay">
          <text class="btn-text">{{ playing ? '停止' : '播放' }}</text>
        </div>
      </div>
      <div class="btn-row">
        <div class="btn btn-ctrl" @click="onPauseResume">
          <text class="btn-text">{{ paused ? '继续' : '暂停' }}</text>
        </div>
      </div>

      <!-- 状态显示 -->
      <text v-if="playing || currentState" class="diag-line">
        状态: {{ currentState }} · {{ timeText }}
      </text>
      <text v-if="errorMsg" class="diag-line diag-error">{{ errorMsg }}</text>

      <!-- 可用 API 列表 -->
      <text class="diag-title">可用 API</text>
      <scroller class="api-scroll" scroll-y="true">
        <text class="api-head">{{ apiList.module ? 'module (' + apiList.module.length + ')' : '' }}</text>
        <text v-for="fn in apiList.module" :key="'m' + fn" class="api-item">{{ fn }}</text>
        <text class="api-head">{{ apiList.manager ? 'manager (' + apiList.manager.length + ')' : '' }}</text>
        <text v-for="fn in apiList.manager" :key="'g' + fn" class="api-item api-item-m">{{ fn }}</text>
      </scroller>
    </div>

    <!-- 右栏：日志输出 + URL -->
    <div class="right-col">
      <text class="diag-title">视频地址</text>
      <div class="input-wrap">
        <input
          class="url-input"
          :value="url"
          @input="onUrlInput"
          placeholder="http://.../path.mp4 或 /local/file"
        />
      </div>

      <text class="diag-title">console 日志</text>
      <scroller class="log-scroll" scroll-y="true">
        <text v-for="(line, i) in logs" :key="'l' + i" class="log-line" :class="{ 'log-err': line.err, 'log-ok': line.ok }">
          {{ line.text }}
        </text>
      </scroller>
    </div>
  </div>
</template>

<script>
import {
  probe, resetCache,
  getModuleName, getManager,
  getAvailableApiList,
  play, pause as doPause, stop as doStop, resume as doResume,
  getPlayState, getCurrentPos, getDuration,
  formatTime
} from '../../services/player.js';

// 逻辑画布 800×600（A6P 物理 320×240，2.5x 缩放）
const DESIGN_WIDTH = 800;
const DESIGN_HEIGHT = 600;

export default {
  data() {
    return {
      url: 'https://www.w3schools.com/html/mov_bbb.mp4',
      playing: false,
      paused: false,
      currentState: '',
      moduleName: '',
      managerOk: false,
      apiList: { module: [], manager: [] },
      logs: [],
      pollToken: null
    };
  },

  computed: {
    timeText() {
      return formatTime(this.currentPos) + ' / ' + formatTime(this.durationMs);
    }
  },

  onLoad() {
    // monkey-patch console 收集日志到 UI
    const self = this;
    this._origLog = console.log;
    this._origWarn = console.warn;
    this._origErr = console.error;
    console.log = function () {
      self._pushLog(Array.prototype.slice.call(arguments).join(' '), false, true);
      self._origLog.apply(console, arguments);
    };
    console.warn = function () {
      self._pushLog(Array.prototype.slice.call(arguments).join(' '), false, false);
      self._origWarn.apply(console, arguments);
    };
    console.error = function () {
      self._pushLog(Array.prototype.slice.call(arguments).join(' '), true, false);
      self._origErr.apply(console, arguments);
    };
    this._pushLog('页面加载完成', false, true);
    this.onProbeAgain();
  },

  onUnload() {
    this.stopPoll();
    console.log = this._origLog;
    console.warn = this._origWarn;
    console.error = this._origErr;
  },

  methods: {
    _pushLog(text, err, ok) {
      this.logs.push({ text: String(text), err: !!err, ok: !!ok });
      if (this.logs.length > 200) this.logs.shift();
    },

    async onProbeAgain() {
      resetCache();
      this._pushLog('开始探测 mediaPlayer / player 模块...', false, false);
      const r = await probe();
      if (r) {
        this.moduleName = r.moduleName;
        this.managerOk = !!r.manager;
        this._pushLog('✅ 模块: ' + r.moduleName + (r.manager ? ' + manager' : ''), false, true);
      } else {
        this.moduleName = '无';
        this.managerOk = false;
        this._pushLog('❌ 所有模块加载失败', true, false);
      }
      this.apiList = getAvailableApiList();
      this._pushLog('module API: ' + (this.apiList.module || []).length + ' 个, manager API: ' + (this.apiList.manager || []).length + ' 个', false, false);
      // 打印完整 API 列表到 console（沙箱看不到 UI 时能用 logcat 看到）
      this._origLog('[VidPlayer] module APIs:', this.apiList.module);
      this._origLog('[VidPlayer] manager APIs:', this.apiList.manager);
    },

    onUrlInput(e) {
      this.url = e.detail && e.detail.value ? e.detail.value : e.value;
    },

    async onTogglePlay() {
      if (this.playing) {
        this._pushLog('调 stop()...', false, false);
        const res = await doStop();
        this._pushLog('stop 返回: ' + JSON.stringify(res), !!res.error, !res.error);
        this.playing = false;
        this.paused = false;
        this.currentState = 'stopped';
        this.stopPoll();
      } else {
        this._pushLog('调 play()...', false, false);
        this._pushLog('URL: ' + this.url, false, false);
        const res = await play();
        this._pushLog('play 返回: ' + JSON.stringify(res), !!res.error, !res.error);
        if (res.ok !== false) {
          this.playing = true;
          this.paused = false;
          this.currentState = 'playing';
          this.startPoll();
        } else {
          this.playing = false;
          this.currentState = 'error: ' + (res.error || 'unknown');
        }
      }
    },

    async onPauseResume() {
      if (!this.playing) return;
      if (this.paused) {
        this._pushLog('调 resume()...', false, false);
        const res = await doResume();
        this._pushLog('resume 返回: ' + JSON.stringify(res), !!res.error, !res.error);
        if (res.ok !== false) {
          this.paused = false;
          this.currentState = 'playing';
        }
      } else {
        this._pushLog('调 pause()...', false, false);
        const res = await doPause();
        this._pushLog('pause 返回: ' + JSON.stringify(res), !!res.error, !res.error);
        if (res.ok !== false) {
          this.paused = true;
          this.currentState = 'paused';
        }
      }
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
        } catch (e) { /* ignore */ }
      }, 800);
    },

    stopPoll() {
      if (this.pollToken) {
        this.clearInterval(this.pollToken);
        this.pollToken = null;
      }
    }
  }
};
</script>

<style lang="less">
@import "var.less";

.page {
  display: flex;
  width: 800px;
  height: 600px;
  background-color: @background-color;
}

.bar {
  display: flex;
  flex-direction: column;
  width: 280px;
  height: 600px;
  padding: 12px;
  background-color: @card-background-color;
}

.brand {
  font-size: 28px;
  color: @accent;
  font-weight: bold;
}

.sub {
  margin-top: 2px;
  font-size: 11px;
  color: @text-color-dim;
}

.diag-title {
  margin-top: 12px;
  font-size: 13px;
  color: @accent;
}

.diag-line {
  margin-top: 3px;
  font-size: 12px;
  color: @text-color-dim;
  lines: 2;
  text-overflow: ellipsis;
}

.diag-error {
  color: @danger;
}

.btn-row {
  margin-top: 6px;
}

.btn {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 36px;
  border-radius: 4px;
}

.btn-play {
  background-color: @accent;
}

.btn-stop {
  background-color: #5a2847;
}

.btn-ctrl {
  background-color: @background-color;
}

.btn-text {
  font-size: 14px;
  color: #ffffff;
  text-align: center;
}

.btn:active {
  opacity: 0.7;
}

.api-scroll {
  width: 256px;
  height: 200px;
  margin-top: 6px;
  background-color: @background-color;
  border-radius: 4px;
  padding: 6px;
}

.api-head {
  font-size: 11px;
  color: @accent;
  margin-top: 4px;
}

.api-item {
  font-size: 11px;
  color: @text-color;
  margin-top: 1px;
}

.api-item-m {
  color: @accent;
}

.right-col {
  display: flex;
  flex-direction: column;
  width: 496px;
  height: 600px;
  padding: 12px;
}

.input-wrap {
  margin-top: 6px;
  padding: 8px;
  background-color: @card-background-color;
  border-radius: 4px;
}

.url-input {
  width: 480px;
  font-size: 14px;
  color: @text-color;
  background-color: transparent;
}

.log-scroll {
  width: 496px;
  height: 450px;
  margin-top: 6px;
  background-color: @card-background-color;
  border-radius: 4px;
  padding: 6px;
}

.log-line {
  font-size: 11px;
  color: @text-color;
  font-family: monospace;
  margin-top: 1px;
  lines: 2;
  text-overflow: ellipsis;
}

.log-err {
  color: @danger;
}

.log-ok {
  color: @accent;
}
</style>
