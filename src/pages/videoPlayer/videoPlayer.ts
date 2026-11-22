// Copyright (C) 2025 Langning Chen
//
// This file is part of miniapp.
//
// miniapp is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// miniapp is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with miniapp.  If not, see <https://www.gnu.org/licenses/>.

import { defineComponent } from 'vue';
import { showError } from '../../components/ToastMessage';
import { exec, statPath } from '../../utils/nativeShell';
import { normalizeImageUrl } from '../../utils/imageUtils';

export type videoPlayerOptions = {
    path?: string;
};

// 设备屏幕为 560x170，抽帧直接按屏幕尺寸补齐黑边，避免页面再缩放。
const SCREEN_WIDTH = 560;
const SCREEN_HEIGHT = 170;
// 抽帧帧率：兼顾流畅度与设备解码能力
const PLAY_FPS = 15;
// 抽帧只写 /tmp，不碰 /userdisk。
const CACHE_ROOT = '/tmp/cheymin-player';
const LEGACY_CACHE = '/userdisk/.cheymin/player';
const PREBUFFER_FRAMES = 8;

function shellQuote(value: string): string {
    return `'${value.replace(/'/g, "'\\''")}'`;
}

function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) { return '00:00'; }
    const total = Math.floor(seconds);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

const videoPlayer = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<videoPlayerOptions>,
            path: '',
            dir: '',
            pidFile: '',
            audioPidFile: '',

            ffmpegReady: false,
            ffmpegBin: '/usr/bin/ffmpeg',
            ffplayBin: 'ffplay',
            audioBackend: '' as '' | 'aplay' | 'ffplay',
            useSetsid: false,
            audioReady: false,
            hasAudio: false,
            duration: 0,
            totalFrames: 0,
            fps: PLAY_FPS,

            playing: false,
            buffering: false,
            ended: false,
            controlsVisible: true,
            frameSrc: '',
            index: 0,
            position: 0,
            message: '正在准备播放...',
            timer: null as any,
            stallSince: 0,
            playStartAt: 0,
            playStartPosition: 0,

            seeking: false,
            seekRatio: 0,
            wasPlayingBeforeSeek: false,
            lastSeekTouch: 0,
        };
    },

    computed: {
        progressPercent(): number {
            if (this.duration <= 0) { return 0; }
            const value = (this.position / this.duration) * 100;
            return Math.max(0, Math.min(100, value));
        },

        displayPercent(): number {
            if (this.seeking) { return Math.max(0, Math.min(100, this.seekRatio * 100)); }
            return this.progressPercent;
        },

        timeText(): string {
            const current = this.seeking && this.duration > 0 ? this.seekRatio * this.duration : this.position;
            return `${formatTime(current)} / ${this.duration > 0 ? formatTime(this.duration) : '--:--'}`;
        },

        hintText(): string {
            if (this.ended) { return '播放结束'; }
            if (this.buffering) { return '缓冲中...'; }
            if (this.hasAudio && !this.audioReady) { return '无音频输出（缺少 aplay/ffplay）'; }
            if (!this.playing) { return '已暂停'; }
            return '';
        },

        fileName(): string {
            const parts = this.path.split('/');
            return parts[parts.length - 1] || this.path;
        },
    },

    mounted() {
        const page = this.$page as any;
        const options = (page.loadOptions || page.options || {}) as videoPlayerOptions;
        this.path = (options.path || '').trim();
        if (!this.path) {
            showError('缺少视频路径');
            return;
        }
        this.dir = `${CACHE_ROOT}/${Date.now()}`;
        this.pidFile = `${this.dir}/video.pid`;
        this.audioPidFile = `${this.dir}/audio.pid`;
        this.initialize();
    },

    unmounted() {
        this.shutdown();
    },

    methods: {
        async initialize() {
            try {
                // 清掉旧版本写在 /userdisk 下的缓存，以及可能残留的临时目录
                await exec(
                    `rm -rf ${shellQuote(LEGACY_CACHE)} ${shellQuote(CACHE_ROOT)}; ` +
                    `mkdir -p ${shellQuote(this.dir)}`
                );
            } catch (e) {
                showError(String(e || '无法创建缓存目录'));
                return;
            }

            const ffmpegPath = await this.safeExec('command -v ffmpeg 2>/dev/null');
            this.ffmpegBin = ffmpegPath.trim() || '/usr/bin/ffmpeg';

            const version = await this.safeExec(`${shellQuote(this.ffmpegBin)} -version 2>&1 | head -n 1`);
            this.ffmpegReady = !!version && /version/i.test(version) && !/not found/i.test(version);
            if (!this.ffmpegReady) {
                this.message = '设备未找到 ffmpeg，无法解码视频';
                showError(this.message);
                return;
            }

            // 音频输出：优先 ALSA 的 aplay，其次 ffplay
            const aplay = await this.safeExec('command -v aplay 2>/dev/null');
            if (aplay.trim()) {
                this.audioBackend = 'aplay';
            } else {
                const ffplay = await this.safeExec('command -v ffplay 2>/dev/null');
                if (ffplay.trim()) {
                    this.audioBackend = 'ffplay';
                    this.ffplayBin = ffplay.trim();
                }
            }
            this.audioReady = !!this.audioBackend;

            const setsid = await this.safeExec('command -v setsid 2>/dev/null');
            this.useSetsid = !!setsid.trim();

            const ok = await this.probeMedia();
            if (!ok) { return; }
            await this.start(0, false);
        },

        async safeExec(command: string): Promise<string> {
            try {
                return await exec(command);
            } catch (e) {
                return '';
            }
        },

        async probeMedia(): Promise<boolean> {
            const cmd = `${shellQuote(this.ffmpegBin)} -hide_banner -i ${shellQuote(this.path)} 2>&1 | head -n 80`;
            const text = await this.safeExec(cmd);

            const durationMatch = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(text);
            if (durationMatch) {
                this.duration =
                    Number(durationMatch[1]) * 3600 +
                    Number(durationMatch[2]) * 60 +
                    Number(durationMatch[3]);
            }
            this.hasAudio = /Stream #\S+.*: Audio:/.test(text);

            if (!/Stream #/.test(text) && !this.duration) {
                const line = text.split('\n').find((item) => item.trim()) || '无法解析视频';
                this.message = line.trim();
                showError(this.message);
                return false;
            }

            if (this.duration > 0) {
                this.totalFrames = Math.floor(this.duration * this.fps);
            }
            this.message = '';
            return true;
        },

        async diagnose(fromSeconds: number): Promise<string> {
            const input = this.buildInputArgs(fromSeconds);
            const args = [
                shellQuote(this.ffmpegBin), '-hide_banner', '-loglevel', 'error', '-nostdin',
                ...input,
                '-frames:v', '1', '-y', shellQuote(`${this.dir}/diagnose.jpg`),
            ].join(' ');
            const out = await this.safeExec(`( ${args} ) 2>&1 | head -n 2`);
            const detail = (out || '').trim();
            return detail ? `无法播放：${detail}` : '无法播放：取帧超时（请检查文件是否存在）';
        },

        framePath(index: number): string {
            return `${this.dir}/f_${String(index).padStart(5, '0')}.jpg`;
        },

        async start(fromSeconds: number, clearFrames: boolean, autoplay = true) {
            this.stopClock();
            await this.killAll();

            if (clearFrames) {
                await this.safeExec(`rm -f ${shellQuote(this.dir)}/*.jpg`);
                this.frameSrc = '';
            }

            const position = Math.max(0, fromSeconds);
            this.position = position;
            this.index = Math.floor(position * this.fps);
            this.ended = false;
            this.buffering = true;
            this.playing = autoplay;
            this.stallSince = 0;

            await this.spawnVideo(this.index, position);

            const first = await this.waitForFrame(this.index, 10000);
            if (!first) {
                this.buffering = false;
                this.playing = false;
                this.message = await this.diagnose(position);
                showError(this.message);
                await this.killAll();
                return;
            }

            this.frameSrc = normalizeImageUrl(this.framePath(this.index));
            this.buffering = false;
            this.message = '';

            if (!autoplay) {
                // 暂停状态下拖动进度：只取一帧作为预览，然后停掉后台解码
                this.playing = false;
                await this.killAll();
                return;
            }

            // 预缓冲：先让 ffmpeg 多产出几帧，避免起播后每帧都等解码。
            const preTarget = this.totalFrames > 0
                ? Math.min(this.index + PREBUFFER_FRAMES, this.totalFrames - 1)
                : this.index + PREBUFFER_FRAMES;
            await this.waitForFrame(preTarget, 1200);

            // 首帧已上屏再起音频，让声音和画面从同一个位置开始
            if (this.hasAudio && this.audioReady) {
                await this.spawnAudio(position);
            }

            // 以真实时间为主时钟，帧率波动时按目标帧号追赶，避免累计延迟。
            this.playStartAt = Date.now();
            this.playStartPosition = position;
            this.scheduleTick();
        },

        /**
         * 后台起一个独立进程组执行脚本，退出时整组回收，避免残留 ffmpeg 占 CPU。
         */
        spawnDetached(pidFile: string, script: string) {
            const quoted = shellQuote(script);
            const launch = this.useSetsid
                ? `setsid sh -c ${quoted} >/dev/null 2>&1 &`
                : `sh -c ${quoted} >/dev/null 2>&1 &`;
            return exec(`( ${launch} echo $! > ${shellQuote(pidFile)} )`);
        },

        spawnVideo(startIndex: number, fromSeconds: number) {
            const filter =
                `fps=${this.fps},` +
                `scale=${SCREEN_WIDTH}:${SCREEN_HEIGHT}:force_original_aspect_ratio=decrease,` +
                `pad=${SCREEN_WIDTH}:${SCREEN_HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=black`;
            const input = this.buildInputArgs(fromSeconds);
            const args = [
                shellQuote(this.ffmpegBin), '-hide_banner', '-loglevel', 'error', '-nostdin', '-re',
                ...input,
                '-an', '-sn', '-dn',
                '-vf', shellQuote(filter),
                '-q:v', '4',
                '-start_number', String(startIndex),
                '-y',
                shellQuote(`${this.dir}/f_%05d.jpg`),
            ].join(' ');
            return this.spawnDetached(this.pidFile, args);
        },

        spawnAudio(fromSeconds: number) {
            if (this.audioBackend === 'aplay') {
                const input = this.buildInputArgs(fromSeconds);
                const ff = [
                    shellQuote(this.ffmpegBin), '-hide_banner', '-loglevel', 'error', '-nostdin', '-re',
                    ...input,
                    '-vn', '-ac', '2', '-ar', '48000', '-f', 's16le', '-',
                ].join(' ');
                // ffmpeg 解出 PCM 直接管道给 aplay，边解边放，不用等整段转换完
                // 采样率对齐固件音频 HAL 的 48k，避免 aplay 因采样率不匹配静音
                return this.spawnDetached(
                    this.audioPidFile,
                    `${ff} 2>/dev/null | aplay -q -f S16_LE -c 2 -r 48000 >/dev/null 2>&1`
                );
            }

            if (this.audioBackend === 'ffplay') {
                const args = [
                    shellQuote(this.ffplayBin), '-nodisp', '-autoexit', '-loglevel', 'quiet',
                    ...(fromSeconds > 0 ? ['-ss', fromSeconds.toFixed(3)] : []),
                    '-i', shellQuote(this.path),
                ].join(' ');
                return this.spawnDetached(this.audioPidFile, args);
            }

            return Promise.resolve('');
        },

        buildInputArgs(fromSeconds: number): string[] {
            const args: string[] = [];
            if (fromSeconds > 0) {
                args.push('-ss', fromSeconds.toFixed(3));
            }
            if (/^https?:\/\//i.test(this.path)) {
                args.push(
                    '-user_agent', shellQuote('Mozilla/5.0 (X11; Linux armv7l) AppleWebKit/537.36'),
                    '-referer', shellQuote('https://www.bilibili.com/')
                );
            }
            args.push('-i', shellQuote(this.path));
            return args;
        },

        async waitForFrame(index: number, timeout: number): Promise<boolean> {
            const startAt = Date.now();
            while (Date.now() - startAt < timeout) {
                const entry = await statPath(this.framePath(index));
                if (entry) { return true; }
                await this.sleep(120);
            }
            return false;
        },

        sleep(ms: number): Promise<void> {
            return new Promise((resolve) => setTimeout(resolve, ms));
        },

        scheduleTick() {
            const interval = Math.max(40, Math.round(1000 / this.fps));
            this.timer = setTimeout(() => this.tick(), interval);
        },

        async tick() {
            if (!this.playing) { return; }

            if (this.totalFrames > 0 && this.index >= this.totalFrames - 1) {
                this.playing = false;
                this.ended = true;
                this.buffering = false;
                await this.killAll();
                return;
            }

            const elapsed = (Date.now() - this.playStartAt) / 1000;
            const target = Math.floor((this.playStartPosition + elapsed) * this.fps);
            if (target <= this.index) {
                this.scheduleTick();
                return;
            }

            const entry = await statPath(this.framePath(target));
            if (!this.playing) { return; }

            if (entry) {
                this.index = target;
                this.position = target / this.fps;
                this.frameSrc = normalizeImageUrl(this.framePath(target));
                this.buffering = false;
                this.stallSince = 0;
                this.scheduleTick();
                return;
            }

            // 帧还没生产出来：保持当前画面，进入缓冲状态
            this.buffering = true;
            if (!this.stallSince) {
                this.stallSince = Date.now();
            } else if (Date.now() - this.stallSince > 8000) {
                // 无法拿到时长时，用长时间无新帧判定播放结束
                this.playing = false;
                this.ended = true;
                this.buffering = false;
                this.stallSince = 0;
                await this.killAll();
                return;
            }
            this.timer = setTimeout(() => this.tick(), 70);
        },

        stopClock() {
            if (this.timer != null) {
                clearTimeout(this.timer);
                this.timer = null;
            }
        },

        async killAll() {
            await this.killPid(this.pidFile);
            await this.killPid(this.audioPidFile);
            // 兜底：清掉可能残留的解码进程（模式里带 []，避免 pkill 匹配到自己）
            await this.safeExec(
                'pkill -f "cheymin[-]player/" 2>/dev/null; ' +
                'pkill -f "[.]cheymin/player/" 2>/dev/null; true'
            );
        },

        async killPid(pidFile: string) {
            if (!pidFile) { return; }
            const file = shellQuote(pidFile);
            await this.safeExec(
                `if [ -f ${file} ]; then P=$(cat ${file}); ` +
                `kill -TERM -$P 2>/dev/null || kill -TERM $P 2>/dev/null; ` +
                `rm -f ${file}; fi`
            );
        },

        async shutdown() {
            this.playing = false;
            this.stopClock();
            await this.killAll();
            await this.safeExec(`rm -rf ${shellQuote(CACHE_ROOT)}`);
        },

        togglePlay() {
            if (this.ended) {
                this.start(0, true);
                return;
            }
            if (this.playing) {
                this.pause();
            } else {
                this.resume();
            }
        },

        pause() {
            this.playing = false;
            this.stopClock();
            this.killAll();
            this.$forceUpdate();
        },

        resume() {
            this.start(this.position, false);
        },

        seekBy(delta: number) {
            let target = this.position + delta;
            if (target < 0) { target = 0; }
            if (this.duration > 0 && target > this.duration - 0.5) {
                target = Math.max(0, this.duration - 0.5);
            }
            this.seekTo(target);
        },

        seekTo(seconds: number) {
            const wasPlaying = this.playing;
            this.start(seconds, true, wasPlaying);
        },

        seekPointRatio(event: any): number {
            const list = (event && (event.touches || event.changedTouches)) || [];
            const item = list[0] || (event && event.detail) || {};
            const x = item.clientX !== undefined ? item.clientX : (item.pageX !== undefined ? item.pageX : item.screenX);
            // 进度条左右各留 8px
            const ratio = ((Number(x) || 0) - 8) / (SCREEN_WIDTH - 16);
            return Math.max(0, Math.min(1, ratio));
        },

        beginSeek(event: any) {
            if (this.duration <= 0) { return; }
            this.lastSeekTouch = Date.now();
            this.seeking = true;
            this.seekRatio = this.seekPointRatio(event);
            this.wasPlayingBeforeSeek = this.playing;
            if (this.playing) {
                this.playing = false;
                this.stopClock();
                this.killAll();
            }
        },

        updateSeek(event: any) {
            if (!this.seeking) { return; }
            this.lastSeekTouch = Date.now();
            this.seekRatio = this.seekPointRatio(event);
        },

        endSeek(event: any) {
            if (!this.seeking) { return; }
            this.lastSeekTouch = Date.now();
            this.seekRatio = this.seekPointRatio(event);
            this.seeking = false;
            const target = Math.max(0, Math.min(this.duration - 0.2, this.seekRatio * this.duration));
            this.start(target, true, this.wasPlayingBeforeSeek);
        },

        seekTap(event: any) {
            if (Date.now() - this.lastSeekTouch < 600) { return; }
            if (this.duration <= 0) { return; }
            const ratio = this.seekPointRatio(event);
            this.start(Math.max(0, Math.min(this.duration - 0.2, ratio * this.duration)), true, true);
        },

        toggleFullscreen() {
            this.controlsVisible = !this.controlsVisible;
            this.$forceUpdate();
        },

        toggleControls() {
            this.controlsVisible = !this.controlsVisible;
            this.$forceUpdate();
        },

        goBack() {
            this.shutdown();
            this.$page.finish();
        },
    },
});

export default videoPlayer;
