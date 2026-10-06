<template>
  <div class="page">
    <!-- 左栏：品牌 + 控制 -->
    <div class="bar">
      <text class="brand">VidPlayer</text>

      <!-- 模块检测状态 -->
      <text class="status-line">{{ moduleText }}</text>

      <!-- URL 输入 -->
      <text class="label">视频地址</text>
      <div class="input-wrap">
        <input
          class="url-input"
          :value="url"
          @input="onUrlInput"
          placeholder="http://... 或 /local/path.mp4"
        />
      </div>

      <!-- 视频区域预览框（native 直接写 fbdev，这里做个指示） -->
      <text class="label">显示区域</text>
      <text class="rect-text">x={{ rect.x }} y={{ rect.y }} w={{ rect.width }} h={{ rect.height }}</text>

      <!-- 控制按钮 -->
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

      <!-- 进度显示 -->
      <div v-if="playing" class="progress">
        <text class="time-text">{{ timeText }}</text>
        <text class="state-text">{{ stateLabel }}</text>
      </div>

      <!-- 错误提示 -->
      <text v-if="errorMsg" class="error-text">{{ errorMsg }}</text>

      <text class="hint-text">320×240 横屏 · import('player')</text>
    </div>

    <!-- 右栏：视频占位（native 视频覆盖全屏，这里仅做视觉） -->
    <div class="video-zone">
      <image
        class="video-bg"
        src="assets/app_icon.png"
        :width="videoWidth"
        :height="videoHeight"
      ></image>
      <text class="video-hint">{{ playing ? '播放中…' : '视频区域' }}</text>
    </div>
  </div>
</template>

<script>
import {
  open as playerOpen,
  pause as playerPause,
  resume as playerResume,
  stop as playerStop,
  release as playerRelease,
  status as playerStatus,
  hasModule,
  formatTime,
  describeError,
  PLAYER_STATE
} from '../../services/player.js';

// 逻辑画布 800 宽，A6P 320x240 物理横屏
// 视频区域占大部分右栏，缩放后对应物理 280x190 左右
const DESIGN_WIDTH = 800;
const DESIGN_HEIGHT = Math.round(240 * 800 / 320); // ≈ 600

export default {
  data() {
    return {
      url: 'https://www.w3schools.com/html/mov_bbb.mp4',
      playing: false,
      paused: false,
      state: PLAYER_STATE.IDLE,
      currentMs: 0,
      durationMs: 0,
      moduleOk: false,
      errorMsg: '',
      pollToken: null,
      videoWidth: 0,
      videoHeight: 0,
      rect: { x: 0, y: 0, width: 0, height: 0 }
    };
  },

  computed: {
    moduleText() {
      return this.moduleOk ? '✓ 播放器模块已加载' : '✗ 播放器模块缺失';
    },
    stateLabel() {
      const map = {
        idle: '待机',
        playing: '播放中',
        paused: '已暂停',
        ended: '播放结束',
        error: '错误'
      };
      return map[this.state] || this.state;
    },
    timeText() {
      if (!this.durationMs) return formatTime(this.currentMs);
      return formatTime(this.currentMs) + ' / ' + formatTime(this.durationMs);
    }
  },

  async onLoad() {
    // 计算视频区域：右栏扣除边距
    // 左栏宽约 220 (逻辑)，剩下给右栏
    const barW = 240;
    const margin = 16;
    const vw = DESIGN_WIDTH - barW - margin * 2;
    const vh = Math.round(vw * 240 / 320); // 保持 320:240 比例
    const vx = barW + margin;
    const vy = Math.round((DESIGN_HEIGHT - vh) / 2);
    this.videoWidth = vw;
    this.videoHeight = vh;
    this.rect = { x: vx, y: vy, width: vw, height: vh };

    // 检测模块
    this.moduleOk = await hasModule();
  },

  onUnload() {
    this.stopPoll();
    if (this.playing) {
      playerStop();
      playerRelease();
    }
  },

  methods: {
    onUrlInput(e) {
      this.url = e.detail && e.detail.value ? e.detail.value : e.value;
    },

    async onTogglePlay() {
      if (this.playing) {
        // 停止
        this.stopPoll();
        await playerStop();
        await playerRelease();
        this.playing = false;
        this.paused = false;
        this.state = PLAYER_STATE.IDLE;
        this.currentMs = 0;
        this.errorMsg = '';
      } else {
        // 开始
        if (!this.url) {
          this.errorMsg = '请先输入视频地址';
          return;
        }
        if (!this.moduleOk) {
          this.errorMsg = '播放器模块不可用，请确认 libs/libjsapi_player.so 存在';
          return;
        }
        this.errorMsg = '';
        const res = await playerOpen({
          input: this.url,
          startMs: 0,
          durationMs: 0,
          fps: 24,
          audio: true,
          transpose: 1,
          rect: this.rect
        });
        if (res && res.ok !== false) {
          this.playing = true;
          this.paused = false;
          this.state = res.state || PLAYER_STATE.PLAYING;
          if (res.duration) this.durationMs = res.duration;
          this.startPoll();
        } else {
          this.errorMsg = describeError(res && res.code, res && res.error);
          this.state = PLAYER_STATE.ERROR;
        }
      }
    },

    async onPauseResume() {
      if (!this.playing) return;
      if (this.paused) {
        const res = await playerResume();
        if (res && res.ok !== false) {
          this.paused = false;
          this.state = PLAYER_STATE.PLAYING;
        }
      } else {
        const res = await playerPause();
        if (res && res.ok !== false) {
          this.paused = true;
          this.state = PLAYER_STATE.PAUSED;
        }
      }
    },

    startPoll() {
      this.stopPoll();
      this.pollToken = this.setInterval(async () => {
        try {
          const s = await playerStatus();
          if (s && typeof s === 'object') {
            this.state = s.state || this.state;
            if (typeof s.position === 'number') this.currentMs = s.position;
            if (typeof s.duration === 'number') this.durationMs = s.duration;
            if (this.state === PLAYER_STATE.ENDED || this.state === 'ended') {
              this.stopPoll();
              this.playing = false;
              this.paused = false;
            }
            if (this.state === PLAYER_STATE.ERROR || this.state === 'error') {
              this.stopPoll();
              this.playing = false;
              this.paused = false;
              this.errorMsg = describeError(s.code, s.error);
            }
          }
        } catch (e) {
          // 忽略轮询错误
        }
      }, 500);
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
.page {
  display: flex;
  width: 800px;
  height: 600px;
  background-color: #1a1a2e;
}

.bar {
  display: flex;
  flex-direction: column;
  width: 240px;
  height: 600px;
  padding: 16px;
  background-color: #16213e;
}

.brand {
  font-size: 28px;
  font-weight: bold;
  color: #0f3460;
  letter-spacing: 2px;
}

.status-line {
  margin-top: 8px;
  font-size: 14px;
  color: #e94560;
}

.label {
  margin-top: 16px;
  font-size: 14px;
  color: #a8a8b3;
}

.input-wrap {
  margin-top: 6px;
  padding: 8px;
  background-color: #0f3460;
  border-radius: 4px;
}

.url-input {
  width: 208px;
  font-size: 14px;
  color: #eaeaea;
  background-color: transparent;
}

.rect-text {
  margin-top: 4px;
  font-size: 12px;
  color: #a8a8b3;
  font-family: monospace;
}

.btn-row {
  margin-top: 12px;
}

.btn {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 44px;
  background-color: #0f3460;
  border-radius: 6px;
}

.btn-play {
  background-color: #e94560;
}

.btn-stop {
  background-color: #533483;
}

.btn-ctrl {
  background-color: #1d4a70;
}

.btn-text {
  font-size: 18px;
  color: #eaeaea;
  font-weight: bold;
}

.progress {
  margin-top: 16px;
}

.time-text {
  font-size: 16px;
  color: #00ff88;
  font-family: monospace;
}

.state-text {
  margin-top: 4px;
  font-size: 14px;
  color: #a8a8b3;
}

.error-text {
  margin-top: 12px;
  font-size: 14px;
  color: #ff6b6b;
}

.hint-text {
  margin-top: auto;
  font-size: 12px;
  color: #5a5a6a;
}

.video-zone {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 544px;
  height: 600px;
  background-color: #0a0a14;
  margin: 16px;
  border-radius: 8px;
}

.video-bg {
  opacity: 0.15;
}

.video-hint {
  position: absolute;
  font-size: 20px;
  color: #5a5a6a;
}
</style>
