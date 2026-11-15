/**
 * 从 bili-a6p 1.1.4 字节码还原的播放器控制逻辑。
 *
 * 原始实现由这些已知符号拼成（来自解码后的字符串表）：
 *   BiliPlayer.vue / EmbeddedVideo.vue / SocialVideo.vue
 *   onDecoderOpen, openSegment, getFrameCounter, captionFrame,
 *   previewSeek, commitSeek, seek, pause, resume, stop,
 *   videoCanvas, canvas, audioPath, playLoading, buffering, playing,
 *   callBackVolumeValue, volume, duration, position
 *
 * 解码链路（设备端）：
 *   ffmpeg/curl 探测 duration -> 原生 canvasdecoder 打开 DASH 分片
 *   -> 每帧 captionFrame() 画到 canvas -> 音频由 volume/audioPath 播放
 *
 * 该文件是“逻辑还原”版本：原生能力通过 Bridge 注入，方便直接接入构建。
 */

export interface DecoderOpenOptions {
    /** DASH 视频轨 baseUrl / backupUrl，设备解码器直接吃 URL。 */
    url: string;
    backupUrl?: string[];
    /** 媒体头，原包由 biliio 统一注入 UA/Referer。 */
    headers?: Record<string, string>;
    /** 起始播放位置（秒） */
    startTime?: number;
    /** 音频轨地址；为 null 时静音 */
    audioPath?: string | null;
}

export interface NativeDecoder {
    onDecoderOpen(callback: () => void): void;
    openSegment(options: DecoderOpenOptions): Promise<void>;
    /** 当前解码到的帧序号（原实现用帧计数做时钟） */
    getFrameCounter(): number;
    /** 把当前帧画到 videoCanvas */
    captionFrame(): void;
    pause(): void;
    resume(): void;
    stop(): void;
    /** 跳转（秒） */
    seek(seconds: number): void;
    /** 拖动预览：只解一帧，不提交播放位置 */
    previewSeek(seconds: number): void;
    commitSeek(): void;
}

export interface NativeProcess {
    /** 原实现用 ffmpeg 探测：-show_entries format=duration -of csv=p=0 */
    exec(command: string): Promise<{ code: number; stdout: string; stderr: string }>;
}

export interface NativeVolume {
    setVolume(value: number): void;
    getVolume(): number;
    /** 原实现注册的音量回调 */
    callBackVolumeValue(callback: (value: number) => void): void;
}

export interface PlayerHooks {
    /** 播放中状态（用于隐藏加载动画） */
    onPlayingChange?(playing: boolean): void;
    /** 缓冲/加载状态 */
    onLoadingChange?(loading: boolean): void;
    onProgress?(position: number, duration: number): void;
    onError?(error: Error): void;
    onEnded?(): void;
}

/**
 * 用 ffmpeg 探测时长。原包命令（字符串表可证）：
 *   -analyzeduration 1500000 -probesize 524288
 *   -show_entries format=duration -of csv=p=0
 * 以及完整探测：
 *   -show_entries stream=codec_type,width,height,r_frame_rate:format=duration -of json
 */
export async function probeDuration(
    process: NativeProcess,
    url: string,
    headers: Record<string, string> = {}
): Promise<number> {
    const headerArgs = Object.entries(headers)
        .map(([k, v]) => `-headers "${k}: ${v}\\r\\n"`)
        .join(' ');
    const cmd =
        `ffmpeg -v error -analyzeduration 1500000 -probesize 524288 ${headerArgs} ` +
        `-show_entries format=duration -of csv=p=0 "${url}"`;
    const { code, stdout } = await process.exec(cmd);
    if (code !== 0) return 0;
    const value = parseFloat(stdout.trim().split('\n').pop() || '0');
    return Number.isFinite(value) ? value : 0;
}

export interface VideoSource {
    url: string;
    backupUrl?: string[];
    audioUrl?: string | null;
    duration?: number;
    headers?: Record<string, string>;
}

/**
 * 播放控制器，对应 BiliPlayer 中 play/openVideo/seek 等方法的核心状态机。
 */
export class PenPlayer {
    private decoder: NativeDecoder;
    private process: NativeProcess;
    private volume: NativeVolume;
    private hooks: PlayerHooks;

    private source: VideoSource | null = null;
    private duration = 0;
    private playing = false;
    private loading = false;
    private disposed = false;
    private frameBase = 0;
    private fps = 30;
    private timer: any = null;
    private lastPosition = 0;

    constructor(
        decoder: NativeDecoder,
        process: NativeProcess,
        volume: NativeVolume,
        hooks: PlayerHooks = {}
    ) {
        this.decoder = decoder;
        this.process = process;
        this.volume = volume;
        this.hooks = hooks;
        this.decoder.onDecoderOpen(() => {
            // 原实现：onDecoderOpen 后清 loading，开始拉帧
            this.setLoading(false);
            this.startFrameLoop();
        });
        this.volume.callBackVolumeValue((value) => {
            // 原实现把设备侧音量变化同步回 UI
            this.hooks.onProgress?.(this.lastPosition, this.duration);
        });
    }

    get isPlaying(): boolean {
        return this.playing;
    }

    get isLoading(): boolean {
        return this.loading;
    }

    get totalDuration(): number {
        return this.duration;
    }

    private setLoading(value: boolean) {
        if (this.loading === value) return;
        this.loading = value;
        this.hooks.onLoadingChange?.(value);
    }

    private setPlaying(value: boolean) {
        if (this.playing === value) return;
        this.playing = value;
        this.hooks.onPlayingChange?.(value);
    }

    /** 打开一个视频源：探测时长 -> 打开解码器 -> 等待 onDecoderOpen */
    async open(source: VideoSource): Promise<void> {
        this.stop();
        this.disposed = false;
        this.source = source;
        this.setLoading(true);
        this.hooks.onProgress?.(0, 0);

        try {
            this.duration = source.duration || 0;
            if (!this.duration) {
                this.duration = await probeDuration(this.process, source.url, source.headers);
            }
            if (this.disposed) return;

            await this.decoder.openSegment({
                url: source.url,
                backupUrl: source.backupUrl,
                headers: source.headers,
                startTime: 0,
                audioPath: source.audioUrl ?? null,
            });
            // 部分设备不会回调 onDecoderOpen，这里兜底启动
            this.setLoading(false);
            this.startFrameLoop();
        } catch (error) {
            this.fail(error as Error);
        }
    }

    /** 以备用地址重试一次（原实现 backup_url/backupUrl 逻辑） */
    async retryWithBackup(): Promise<void> {
        const backup = this.source?.backupUrl?.[0];
        if (!backup) return;
        await this.open({ ...this.source!, url: backup, backupUrl: [] });
    }

    play(): void {
        if (!this.source) return;
        this.decoder.resume();
        this.setPlaying(true);
        this.startFrameLoop();
    }

    pause(): void {
        this.decoder.pause();
        this.setPlaying(false);
        this.stopFrameLoop();
    }

    togglePlay(): void {
        this.playing ? this.pause() : this.play();
    }

    /** 拖动进度：先 previewSeek 显示一帧，松手 commitSeek 正式跳转 */
    previewSeek(seconds: number): void {
        this.decoder.previewSeek(this.clamp(seconds));
    }

    seek(seconds: number): void {
        const target = this.clamp(seconds);
        this.decoder.seek(target);
        this.decoder.commitSeek();
        this.frameBase = this.decoder.getFrameCounter();
        this.lastPosition = target;
        this.hooks.onProgress?.(target, this.duration);
        if (this.playing) this.decoder.resume();
    }

    stop(): void {
        this.stopFrameLoop();
        this.setPlaying(false);
        this.setLoading(false);
        if (this.source) {
            this.decoder.stop();
            this.source = null;
        }
    }

    dispose(): void {
        this.disposed = true;
        this.stop();
    }

    private clamp(seconds: number): number {
        if (!Number.isFinite(seconds)) return 0;
        return Math.max(0, Math.min(seconds, this.duration || seconds));
    }

    /**
     * 原实现以解码帧计数作为播放时钟：每帧读取 getFrameCounter()，
     * 换算成秒后更新 UI；到末尾时触发 ended。
     */
    private startFrameLoop(): void {
        if (this.timer != null) return;
        this.frameBase = this.decoder.getFrameCounter();
        this.setPlaying(true);
        const tick = () => {
            if (!this.playing || this.disposed) return;
            const frames = this.decoder.getFrameCounter() - this.frameBase;
            this.lastPosition = frames / this.fps;
            this.decoder.captionFrame();
            this.hooks.onProgress?.(this.lastPosition, this.duration);
            if (this.duration > 0 && this.lastPosition >= this.duration) {
                this.setPlaying(false);
                this.stopFrameLoop();
                this.hooks.onEnded?.();
                return;
            }
            this.timer = setTimeout(tick, 1000 / this.fps);
        };
        // 用 30fps 的调度驱动 captionFrame；真实设备上可由解码器回调驱动
        this.timer = setTimeout(tick, 0);
    }

    private stopFrameLoop(): void {
        if (this.timer != null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    private fail(error: Error): void {
        this.setLoading(false);
        this.setPlaying(false);
        this.stopFrameLoop();
        this.hooks.onError?.(error);
        // 原实现：失败后尝试 backupUrl
        void this.retryWithBackup();
    }
}
