/**
 * msdk 音乐播放链路还原稿（appid 8001687764241342, v1.15.5）
 * ---------------------------------------------------------------------------
 * 涉及模块：
 *   apps_music.js        QQ 音乐页（搜索 / 榜单 / 歌单 / 登录 / 下载 / 遥控）
 *   music-shared.js      共享：时长探测、下载、队列 UI、sendMusicCommand
 *   playlist.js          歌单：本地歌单 CRUD、音乐文件夹、B站视频入歌单
 *   system-volume.js     系统音量（Audio 优先，require('volume') 回退）
 *   desktop.js/limit.js  桌面主页：music_command 的执行端
 *   timetable1.js        旧版桌面 chunk，内嵌完整 __audioBackend（Audio/Video 双实现）
 *
 * 依据：
 *   字节码原子表（apps_music / music-shared / playlist / system-volume / timetable1）
 *   + libjsapi_bridge.so 已注册方法名（Audio: play/seek/getState/poll/setVolume/...）
 *   + ffmpeg/alsa 命令字符串
 *
 * 标注「推断」处为命名/参数顺序推定，非反汇编确认。
 */

/* ===========================================================================
 * 1. bridge 与事件总线
 * =========================================================================*/

interface AudioBridge {
  /** 从 startMs 开始播放本地文件或 http(s) 直链 */
  play(path: string, startMs?: number): void;
  seek(positionMs: number): void;
  /** 推断返回：{ status: 'playing'|'paused'|'ended'|'stopped', position, duration, volume } */
  getState(): AudioState;
  /** 拉取增量事件，事件体 { type, progress, message, stateChange, state } */
  poll(): AudioEvent[];
  setVolume(percent: number): void;
  getSystemVolume(): VolumeInfo;
  setSystemVolume(percent: number, device?: string): void;
  setAudioOutput(device: string): void;
  getAudioOutput(): { device: string } | string;
  listAudioDevices(): AudioDevice[];
}

interface VideoBridge {
  getInfo(): any;
  playAudio(url: string, opts?: { startMs?: number; volume?: number }): void; // 推断 opts
  pauseAudio(): void;
  resumeAudio(): void;
  seekAudio(ms: number): void;
  getAudioInfo(): { playing: boolean; position: number; duration: number };
  isAudioPlaying(): boolean;
  setAudioVolume(v: number): void;
  setMuted(muted: boolean): void;
  setPlaybackRate(rate: number): void;
  getProxyUrl(url: string): string;
  pollMediaKeys(): MediaKeyEvent[];
  setUseCanvasPlayer(on: boolean): void;
  getFrameCounter(): number;
  configureDanmakuOverlay(cfg: any): void;
  renderDanmakuFrame(frame: any): void;
  clearDanmakuOverlay(): void;
}

interface Bridge {
  Audio: AudioBridge;
  Video: VideoBridge;
  Shell: { exec(cmd: string): number; execAsync(cmd: string): Promise<{ code: number; out: string }> };
  Files: { listFiles(dir: string): Array<{ name: string; isDir: boolean; size: number }> };
  Fetch: { fetch(url: string, init?: any): Promise<{ status: number; body: string }>; downloadFile(u: string, p: string): Promise<any> };
  Dbase: { read(t: string, k: string): any; write(t: string, k: string, v: any): void; remove(t: string, k: string): void };
}

declare function require(name: string): any;
declare const $falcon: {
  on(ev: string, cb: (...a: any[]) => void): void;
  off(ev: string, cb: (...a: any[]) => void): void;
  trigger(ev: string, ...args: any[]): void;
  navTo(url: string): void;
};

const bridge: Bridge = require('bridge');

/* ===========================================================================
 * 2. 数据模型
 * =========================================================================*/

interface Song {
  song_mid: string;        // QQ 音乐 mid
  title: string;
  singer?: string;
  album?: string;
  cover?: string;
  quality?: string;        // 'F000'|'M800'|'M500'|'C400'
  duration_ms?: number;
  is_local?: boolean;
  local_path?: string;
  localPath?: string;
  playUrl?: string;        // resolvePlayUrl() 解析出的可播放直链
}

interface PlayQueueState {
  songs: Song[];
  index: number;                 // 当前 index
  mode: 'order' | 'random';      // toggle_mode
  playing: boolean;
  position: number;
  duration: number;
  volume: number;                // 0-100
  playbackRate: number;          // cycle_speed: 0.75/1/1.25/1.5/2
}

/** 队列/歌单/登录态都落在 Dbase（表名取自 store-830d3ef4） */
const KEY_QUEUE = 'desktop_play_queue';
const KEY_PLAYLISTS = 'desktop_playlists';
const KEY_STATE = 'desktop_player_state';
const KEY_CREDENTIALS = 'qqmusic_credentials';
const KEY_HISTORY = 'qqmusic_listen_history';
const KEY_LOCAL_SONGS = 'qqmusic_local_songs';
const KEY_LAST_REFRESH = 'qqmusic_last_refresh_v2';
const MUSIC_DIR = '/userdisk/loli/music/qqmusic';

/* ===========================================================================
 * 3. 播放端：__audioBackend（Audio 新引擎 / Video 旧引擎）
 * =========================================================================*/

/**
 * timetable1 中的 `__audioBackend` 是一个统一适配层：
 *   新固件：Audio 模块（独立 ffmpeg + ALSA 播放器，支持暂停/恢复/seek/系统音量）
 *   旧固件：Video 模块的音频子接口（playAudio/pauseAudio/...，功能少但兼容）
 * 选择依据是 platform.js 的 nativeAudioEgress / alsa-ffmpeg 探测结果。
 */
class AudioBackend {
  private impl: 'audio' | 'video';
  private audio: AudioBridge;
  private video: VideoBridge;

  constructor() {
    const p: any = require('./platform-56cd6f66.js');
    this.audio = bridge.Audio;
    this.video = bridge.Video;
    this.impl = p.nativeAudioEgress || p.alsaFfmpeg ? 'audio' : 'video'; // 推断
  }

  play(song: Song, startMs = 0) {
    const src = (song.is_local || song.local_path ? song.local_path : song.playUrl) || '';
    this.currentSrc = src;
    if (this.impl === 'audio') {
      this.audio.play(src, startMs);            // 关键：第二参数是起始毫秒
    } else {
      this.video.playAudio(this.video.getProxyUrl(src), { startMs });
    }
  }

  pause() {
    if (this.impl === 'audio') {
      // Audio 的 JS 注册表只有 play/seek/getState/poll/setVolume/...，并没有 pause/resume；
      // C++ 里存在 AudioBridge::pause，但未注册到 JS。上层只能「记住位置 + 停止」实现暂停。
      this.pausedAt = this.audio.getState().position;
      const anyAudio = this.audio as any;
      if (typeof anyAudio.stop === 'function') anyAudio.stop();
      else this.audio.setVolume(0);              // 兜底：静音模拟（真实实现需真机确认）
    } else {
      this.video.pauseAudio();
    }
  }

  resume() {
    if (this.impl === 'audio') {
      this.audio.setVolume(this.volume);
      this.audio.play(this.currentSrc, this.pausedAt);
    } else {
      this.video.resumeAudio();
    }
  }

  seek(ms: number) {
    if (this.impl === 'audio') this.audio.seek(ms);
    else this.video.seekAudio(ms);
  }

  setVolume(percent: number) {
    this.volume = clamp(percent, 0, 100);
    if (this.impl === 'audio') this.audio.setVolume(this.volume);
    else this.video.setAudioVolume(this.volume);
  }

  setRate(rate: number) {
    // Audio 引擎通过重开 ffmpeg 并追加 atempo 实现（native 侧串两个 atempo，范围 0.5~2.0）
    if (this.impl === 'audio') this.audio.seek(this.audio.getState().position); // 推断：seek 触发重开
    else this.video.setPlaybackRate(rate);
  }

  /** 每 500ms 轮询一次；Audio 用 poll() 事件，Video 用 getAudioInfo() 拉状态 */
  tick(): Partial<PlayQueueState> {
    if (this.impl === 'audio') {
      for (const ev of this.audio.poll()) {
        if (ev.type === 'progress') return { position: ev.progress };
        if (ev.type === 'stateChange') return { playing: ev.state === 'playing' };
        if (ev.state === 'ended') return { playing: false, position: 0 };
      }
      const s = this.audio.getState();
      return { playing: s.status === 'playing', position: s.position, duration: s.duration };
    }
    const info = this.video.getAudioInfo();
    return { playing: info.playing, position: info.position, duration: info.duration };
  }

  private pausedAt = 0;
  private volume = 100;
  private currentSrc = '';
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

/* ===========================================================================
 * 4. 桌面播放端：消费 music_command
 * =========================================================================*/

const backend = new AudioBackend();
let queue: PlayQueueState = loadQueue();
let tickTimer: number | null = null;

function loadQueue(): PlayQueueState {
  return bridge.Dbase.read('desktop', KEY_QUEUE) || {
    songs: [], index: 0, mode: 'order', playing: false, position: 0, duration: 0, volume: 100, playbackRate: 1,
  };
}

function persist() {
  bridge.Dbase.write('desktop', KEY_QUEUE, queue);
  bridge.Dbase.write('desktop', KEY_STATE, {
    song: queue.songs[queue.index] || null,
    index: queue.index,
    status: queue.playing ? 'playing' : 'paused',
    position: queue.position,
    duration: queue.duration,
    mode: queue.mode,
    volume: queue.volume,
    playbackRate: queue.playbackRate,
    updatedAt: Date.now(),
  });
}

/** desktop.js / limit.js / timetable1 都会 bind 同一个事件 */
$falcon.on('music_command', (payload: { action: string; song?: Song; list?: Song[]; index?: number; volume?: number }) => {
  handleMusicCommand(payload);
});

function handleMusicCommand(p: { action: string; song?: Song; list?: Song[]; index?: number; volume?: number }) {
  switch (p.action) {
    case 'play_song':
      if (!p.song) return;
      queue.songs = [p.song, ...queue.songs.filter(s => s.song_mid !== p.song!.song_mid)];
      queue.index = 0;
      playCurrent(0);
      break;

    case 'play_list':
      queue.songs = p.list ? [...p.list] : queue.songs;
      queue.index = 0;
      playCurrent(0);
      break;

    case 'play_list_at':
      queue.songs = p.list ? [...p.list] : queue.songs;
      queue.index = p.index || 0;
      playCurrent(queue.index);
      break;

    case 'play_next':
      advance(1);
      break;

    case 'add_queue':
      if (p.song) queue.songs.push(p.song);
      break;

    case 'remove_queue_item':
      if (typeof p.index === 'number') queue.songs.splice(p.index, 1);
      break;

    case 'clear_queue':
      queue.songs = []; queue.index = 0; queue.playing = false;
      backend.pause();
      break;

    case 'toggle':
      queue.playing ? backend.pause() : backend.resume();
      queue.playing = !queue.playing;
      break;

    case 'prev':
      advance(-1);
      break;

    case 'toggle_mode':
      queue.mode = queue.mode === 'order' ? 'random' : 'order';
      break;

    case 'volume_set':
      queue.volume = clamp(p.volume ?? queue.volume, 0, 100);
      backend.setVolume(queue.volume);
      break;

    case 'vol_up':
      queue.volume = clamp(queue.volume + 10, 0, 100);
      backend.setVolume(queue.volume);
      break;

    case 'vol_down':
      queue.volume = clamp(queue.volume - 10, 0, 100);
      backend.setVolume(queue.volume);
      break;

    case 'cycle_speed':
      queue.playbackRate = nextRate(queue.playbackRate);
      backend.setRate(queue.playbackRate);
      break;
  }
  persist();
}

function playCurrent(index: number) {
  const song = queue.songs[index];
  if (!song) return;
  backend.play(song, 0);
  queue.index = index;
  queue.playing = true;
  queue.position = 0;
  queue.duration = song.duration_ms || 0;
  bridge.Dbase.write('desktop', KEY_HISTORY, upsertHistory(song));
  startTick();
}

function advance(step: number) {
  if (!queue.songs.length) return;
  const next = queue.mode === 'random'
    ? Math.floor(Math.random() * queue.songs.length)
    : (queue.index + step + queue.songs.length) % queue.songs.length;
  playCurrent(next);
}

function nextRate(r: number) {
  const rates = [0.75, 1, 1.25, 1.5, 2];
  return rates[(rates.indexOf(r) + 1) % rates.length];
}

function startTick() {
  if (tickTimer) return;
  tickTimer = setInterval(() => {
    const s = backend.tick();
    Object.assign(queue, s);
    if (!queue.playing && queue.songs.length && s.position === 0) advance(1); // 自然播完
    persist();
  }, 500) as unknown as number;
}

function upsertHistory(song: Song) {
  const hist: Song[] = bridge.Dbase.read('desktop', KEY_HISTORY) || [];
  return [song, ...hist.filter(s => s.song_mid !== song.song_mid)].slice(0, 200);
}

/* ===========================================================================
 * 5. apps_music：QQ 音乐远端接口
 * =========================================================================*/

/** endpoints-cad58d87：API 基址（多线路时由 base 模块切换） */
const API = 'https://api.loliyc.com';
const QUALITY_CHAIN = ['F000|flac', 'M800|mp3', 'M500|mp3', 'C400|m4a'];

/** 扫码登录：generate 拿 qrsig + 二维码，poll 长轮询；成功后 cookie 落到 Dbase 并 refresh */
async function loginByQrcode() {
  const gen = await get(`${API}/music/login/qrcode/generate`);
  renderQr(gen.qrcode);                        // 交给 qr-async 模块渲染
  const timer = setInterval(async () => {
    const r = await get(`${API}/music/login/qrcode/poll?qrsig=${encodeURIComponent(gen.qrsig)}`);
    if (r.code === 0) {
      clearInterval(timer);
      bridge.Dbase.write('qqmusic', KEY_CREDENTIALS, r.cookie);
      await get(`${API}/music/cookie/refresh`);
      loadUserPlaylists();
    }
  }, 2000);
}

async function search(keyword: string, page = 1) {
  return get(`${API}/music/search`, { keyword, page });          // 返回 songs[]，含 song_mid/title/singer
}

async function hot(limit = 30) { return get(`${API}/music/hot?limit=${limit}`); }
async function toplist(topId: number) { return get(`${API}/music/toplist?top_id=${topId}`); }

/** 取播放地址：先 multi（一次拿多档音质），失败再单档降级 */
async function resolvePlayUrl(song: Song, prefer = 'F000') {
  const order = QUALITY_CHAIN.filter(q => q.startsWith(prefer)).concat(QUALITY_CHAIN);
  const multi = await get(`${API}/music/song/url/multi`, { mid: song.song_mid, quality: order.join(',') });
  for (const q of order) {
    const u = multi?.[q] || multi?.[q.split('|')[0]];
    if (u) return { url: u, quality: q };
  }
  const single = await get(`${API}/music/song/url`, { mid: song.song_mid, quality: order[order.length - 1] });
  return { url: single.url, quality: order[order.length - 1] };
}

/** 点击播放：解析地址 → 交给桌面播放器（不自己解码） */
async function playSong(song: Song) {
  const { url, quality } = await resolvePlayUrl(song);
  const full = { ...song, quality, playUrl: url };
  sendMusicCommand({ action: 'play_song', song: full });
}

async function playList(list: Song[], index = 0) {
  sendMusicCommand({ action: 'play_list_at', list, index });
}

function loadUserPlaylists() {
  return Promise.all([
    get(`${API}/music/user/playlists`),     // 自建歌单
    get(`${API}/music/user/favorites`),     // 我喜欢
  ]);
}

function playlistDetail(id: string) { return get(`${API}/music/playlist/${id}`); }

function sendMusicCommand(payload: Record<string, any>) {
  // music-shared 里的同名方法：统一从这里发，桌面页收到后执行
  $falcon.trigger('music_command', payload);
}

async function get(path: string, query?: Record<string, any>) {
  let url = API + path;
  if (query) {
    const qs = Object.entries(query).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
    url += (url.includes('?') ? '&' : '?') + qs;
  }
  const r = await bridge.Fetch.fetch(url, { method: 'GET', headers: authHeaders() });
  return JSON.parse(r.body);
}

function authHeaders() {
  const ck = bridge.Dbase.read('qqmusic', KEY_CREDENTIALS);
  return ck ? { Cookie: ck.cookie || ck } : {};
}

/* ===========================================================================
 * 6. music-shared：本地缓存 / 时长探测 / 下载
 * =========================================================================*/

/** 下载当前歌曲到 /userdisk/loli/music/qqmusic/<mid>.<ext> */
async function downloadCurrentSong(song: Song) {
  if (!song) return showToast('当前没有可下载的歌曲');
  if (isSongDownloading(song.song_mid)) return showToast('当前歌曲正在下载');
  const { url, quality } = await resolvePlayUrl(song);
  const ext = quality.endsWith('|flac') ? 'flac' : quality.endsWith('|m4a') ? 'm4a' : 'mp3';
  const path = `${MUSIC_DIR}/${song.song_mid}.${ext}`;
  await bridge.Shell.execAsync(`mkdir -p ${MUSIC_DIR}`);
  const task = await bridge.Fetch.downloadFile(url, path);
  task.onProgress?.((p: number) => setSongDownloading(song.song_mid, p));

  const duration = await probeLocalDurationMs(path);
  const record: Song = { ...song, is_local: true, local_path: path, duration_ms: duration, quality };
  bridge.Dbase.write('qqmusic', KEY_LOCAL_SONGS, [...(bridge.Dbase.read('qqmusic', KEY_LOCAL_SONGS) || []), record]);
}

/**
 * 时长探测：优先 ffprobe，缺失时用 ffmpeg -i 的 "Duration:" 行。
 * 命令字符串与 music-shared 中一致（注意引号转义）。
 */
async function probeLocalDurationMs(path: string): Promise<number> {
  const cmd =
    `sh -c 'if [ ! -s "${escapeShellDoubleQuoted(path)}" ]; then exit 0; fi; ` +
    `if command -v ffprobe >/dev/null 2>&1; then ` +
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${escapeShellDoubleQuoted(path)}" 2>/dev/null; ` +
    `else ffmpeg -i "${escapeShellDoubleQuoted(path)}" 2>&1 | sed -n "s/.*Duration: \\([0-9:.]*\\).*/\\1/p" | head -n 1; fi'`;
  const r = await bridge.Shell.execAsync(cmd);
  return parseDurationOutput(r.out.trim());
}

function parseDurationOutput(out: string): number {
  if (/^\d+(\.\d+)?$/.test(out)) return Math.round(parseFloat(out) * 1000);   // 秒
  const m = out.match(/^(\d+):(\d+):(\d+(?:\.\d+)?)$/);
  if (!m) return 0;
  return (parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3])) * 1000;
}

function escapeShellDoubleQuoted(s: string) { return s.replace(/[\\"$`]/g, '\\$&'); }

/** 队列 UI 操作全部转成命令，不在本地改播放状态 */
const queueActions = {
  clearQueue: () => sendMusicCommand({ action: 'clear_queue' }),
  removeQueueSong: (index: number) => sendMusicCommand({ action: 'remove_queue_item', index }),
  togglePlayPause: () => sendMusicCommand({ action: 'toggle' }),
  playPrev: () => sendMusicCommand({ action: 'prev' }),
  playNext: () => sendMusicCommand({ action: 'play_next' }),
  togglePlayMode: () => sendMusicCommand({ action: 'toggle_mode' }),
};

/* ===========================================================================
 * 7. playlist.js / system-volume.js
 * =========================================================================*/

/** 歌单：本地歌单 + 音乐文件夹扫描 + B 站视频入歌单 */
interface Playlist { id: string; title: string; songs: Song[]; source?: 'qq' | 'local' | 'bili'; }

function savePlaylists(list: Playlist[]) { bridge.Dbase.write('desktop', KEY_PLAYLISTS, list); }

function scanMusicFolder(dir = MUSIC_DIR): Song[] {
  // Files 模块负责列目录，Shell 负责 ffprobe 补时长
  const files = bridge.Files.listFiles(dir);
  return files.filter(f => /\.(mp3|flac|m4a|wav|ogg|aac)$/i.test(f.name)).map(f => ({
    song_mid: f.name, title: f.name.replace(/\.[^.]+$/, ''), is_local: true,
    local_path: `${dir}/${f.name}`,
  }));
}

/**
 * system-volume：优先 Audio 原生音量；无 Audio 时回退 require('volume') 模块；
 * 再不行用 'bridge:/raw=?getVolume' 形式读取宿主音量（system-volume 中的 bridge: 前缀）。
 */
const volumeImpl = (() => {
  if (bridge.Audio && typeof bridge.Audio.getSystemVolume === 'function') return 'audio';
  try { require('volume'); return 'volume'; } catch { return 'host'; }
})();

export function getSystemVolume(): number {
  if (volumeImpl === 'audio') {
    const v = bridge.Audio.getSystemVolume() as any;
    return typeof v === 'number' ? v : (v.percent ?? 0);
  }
  if (volumeImpl === 'volume') return require('volume').Volume.getVolume();
  return 0; // 推断：host 模式通过 bridge:/raw=?getVolume 读取，返回值未在字节码中出现常量
}

export function setSystemVolume(v: number) {
  const pct = Math.round(clamp(v, 0, 100));
  if (volumeImpl === 'audio') return bridge.Audio.setSystemVolume(pct);
  if (volumeImpl === 'volume') return require('volume').Volume.setVolume(pct);
}
