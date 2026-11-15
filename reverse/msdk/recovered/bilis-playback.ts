/**
 * apps_bilis 取流 / 播放还原稿（msdk v1.15.5, appid 8001687764241342）
 * ---------------------------------------------------------------------------
 * 依据：apps_bilis.js.bin 原子表、video-e680eea0.js.bin、player-shared-de500b41.js.bin、
 *       libjsapi_bridge.so 的 Video / Shell / Fetch 方法表与 ffmpeg 命令串。
 * 标注「推断」处为参数顺序/字段名推定。
 */

declare function require(name: string): any;
declare const $falcon: { trigger(ev: string, ...a: any[]): void; navTo(u: string): void };

const bridge = require('bridge');
const API = 'https://api.loliyc.com';          // endpoints-cad58d87

/* ===========================================================================
 * 1. 登录与设备指纹（直连 B 站，不等同于自有代理）
 * =========================================================================*/

const BILI_COOKIE_KEYS = ['SESSDATA', 'bili_jct', 'DedeUserID', 'DedeUserID__ckMd5', 'sid', 'buvid3', 'buvid4', 'b_nut', 'buvid_fp', 'bili_ticket'];

interface Credentials {
  cookie: string;           // 拼好的 "k=v; k=v" 串
  dedeUserID?: string;
  refreshToken?: string;
  createdAt?: number;
}

function buildCookieHeader(cred: Credentials) {
  return cred.cookie;       // 播放/详情请求统一带上，附 Referer: https://www.bilibili.com
}

/** 首次启动补齐 buvid：/x/frontend/finger/spi 返回 b_3 / b_4 */
async function ensureBuvid() {
  const r = await fetchBili('https://api.bilibili.com/x/frontend/finger/spi', 'GET');
  return { buvid3: r.data.b_3, buvid4: r.data.b_4 };
}

/** wbi 签名所需的 imgKey / subKey 来自 nav 接口的 wbi_img */
async function fetchWbiKeys() {
  const nav = await fetchBili('https://api.bilibili.com/x/web-interface/nav', 'GET');
  const img = nav.data.wbi_img.img_url.split('/').pop()!.split('.')[0];
  const sub = nav.data.wbi_img.sub_url.split('/').pop()!.split('.')[0];
  return { imgKey: img, subKey: sub };
}

/** WebTicket：部分 playurl 需要，key_id=ec02 + hexsign + ts + csrf */
async function genWebTicket(imgKey: string, subKey: string) {
  const ts = Math.floor(Date.now() / 1000);
  return fetchBili(
    `https://api.bilibili.com/bapis/bilibili.api.ticket.v1.Ticket/GenWebTicket?key_id=ec02&hexsign=${imgKey}${subKey}&context%5Bts%5D=${ts}`,
    'POST', { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
}

/* ===========================================================================
 * 2. 取流：详情 → playurl（走自有代理，返回 audio_url / durl）
 * =========================================================================*/

/** 视频详情（由代理返回，字段与 B 站 view 接口一致） */
async function getVideoDetail(bvid: string) {
  return apiGet(`/bili/video/url/${encodeURIComponent(bvid)}`);   // 推断：兼作详情+播放地址入口
}

/**
 * 取播放地址：
 *   - 普通稿件：POST /bili/video/url  { bvid, cid, platform, ... }
 *   - 番剧：    POST /bili/bangumi/url { ep_id, cid, platform }
 * 代理端（api.loliyc.com）负责 wbi 签名、Cookie 透传与 https 直链转发，
 * 返回值里同时给出：
 *   durl[]                     —— 视频分段
 *   audio_url                  —— 主音轨（DASH 时）
 *   direct_audio_url           —— 未转码直链
 *   original_audio_url         —— 原始音轨
 *   background_audio_url       —— 后台听（仅音轨，体积更小）
 */
async function getPlayUrls(opts: { bvid?: string; cid?: number; epId?: string; platform: string }) {
  const url = opts.epId ? `${API}/bili/bangumi/url` : `${API}/bili/video/url`;
  const body = opts.epId
    ? { ep_id: opts.epId, cid: opts.cid, platform: opts.platform }
    : { bvid: opts.bvid, cid: opts.cid, platform: opts.platform };
  return apiPost(url, body);      // 返回 { durl, audio_url, direct_audio_url, original_audio_url, background_audio_url }
}

/** 代理直链不可直连时，再包一层本地音频代理（Shell.getAudioProxyUrl） */
function proxifyAudio(url: string, referer = 'https://www.bilibili.com') {
  if (/^https?:\/\//.test(url) && !needsProxy(url)) return url;
  return bridge.Shell.getAudioProxyUrl(url, referer);   // 推断第二参数
}

/** player-shared 中的 isBiliVideoUrl：这些域名/参数组合必须走代理 */
function isBiliVideoUrl(u: string) {
  return /(bilibili\.com|bilivideo\.com|akamaized\.net|mountaintoys\.cn|hdslb\.com)/.test(u)
    || /os=mcdn/.test(u) || /bvc=vod/.test(u);
}
const needsProxy = (u: string) => isBiliVideoUrl(u);

/* ===========================================================================
 * 3. 播放：视频用 Video 模块（画布/fb0），后台听用 Video.playAudio
 * =========================================================================*/

/**
 * 结论：apps_bilis **使用 bridge 原生播放器**，没有走 <video>/JS 解码。
 *   - 视频：video-e680eea0 组件 → Video.setUseCanvasPlayer(true) 时逐帧取
 *           Video.getFrameCounter() 渲染；否则直接由 native 写 /dev/fb0。
 *   - 音频：ffmpeg 解码 → ALSA（可 bluealsa 蓝牙），支持 atempo 倍速与 adelay 音画同步。
 */
function playVideo(videoUrl: string, audioUrl: string, startMs = 0) {
  const v = bridge.Video;
  // 1) 画布模式（受 platform.canvasDefault 控制）
  v.setUseCanvasPlayer(!!require('./platform-56cd6f66.js').canvasDefault);
  // 2) 音轨与音画同步
  v.setAudioTrack(audioUrl ? 'external' : 'internal');   // 推断：'external' 表示单独音轨
  v.setAvSyncDelayMs(0);
  // 3) 起播（ffmpeg 同时 fork 解码与 ALSA sink）
  v.play(videoUrl);
  // 4) 弹幕（可选）
  v.configureDanmakuOverlay({ enabled: true, scale: 1 });
}

/** 后台听视频：只播音轨，停止视频解码 */
function playBackgroundAudio(playUrls: any, startMs = 0) {
  const audio = playUrls.background_audio_url || playUrls.audio_url || playUrls.direct_audio_url || playUrls.original_audio_url;
  if (!audio) return;
  bridge.Video.playAudio(proxifyAudio(audio), { startMs });   // 推断 opts
  bridge.Video.setAudioVolume(100);
  bridge.Video.setMuted(false);
}

/** 状态同步：Video.getAudioInfo() 是权威进度源；Video.pollMediaKeys() 处理耳机键 */
function bindPlayerTicker(intervalMs = 500) {
  setInterval(() => {
    const info = bridge.Video.getAudioInfo();      // { playing, position, duration }
    $falcon.trigger('bili_player_state', { ...info });
    for (const k of bridge.Video.pollMediaKeys() || []) {
      // 耳机播放/暂停/上一首/下一首
      if (k === 'play_pause') $falcon.trigger('bili_toggle');
      if (k === 'next') $falcon.trigger('bili_next');
    }
  }, intervalMs);
}

/** 本地缓存播放：下载后用 Audio 引擎播放（离线/后台更省电） */
async function playLocalCache(path: string, startMs = 0) {
  bridge.Audio.play(path, startMs);                // Audio.play(path, startMs)
}

/* ===========================================================================
 * 4. 其它 B 站接口（均由自有代理转发）
 * =========================================================================*/

const BILI_PROXY_PATHS = [
  '/bili/video/related/',          // 相关推荐
  '/bili/recommend',               // 首页推荐
  '/bili/hot?limit=',              // 热门
  '/bili/search',                  // 搜索
  '/bili/up/videos',               // UP 主投稿
  '/bili/video/collection',        // 合集
  '/bili/video/collection/',       // 合集详情
  '/bili/bangumi/detail',          // 番剧详情
  '/bili/video/danmaku/',          // 弹幕（XML/Protobuf 由代理转 JSON）
];

function apiGet(path: string) { return request('GET', API + path); }
function apiPost(path: string, body: any) { return request('POST', API + path, body); }
function fetchBili(url: string, method: string, extra?: any) { return request(method, url, undefined, extra); }

async function request(method: string, url: string, body?: any, extra?: any) {
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 9) AppleWebKit/537.36',
    Referer: 'https://www.bilibili.com',
    ...(extra?.headers || {}),
  };
  const cred = loadCredentials();
  if (cred && /bilibili\.com/.test(url)) headers.Cookie = buildCookieHeader(cred);
  const r = await bridge.Fetch.fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = JSON.parse(r.body);
  if (j.code !== 0 && j.code !== undefined && /bilibili\.com/.test(url)) {
    // 登录态失效：清 cookie 并跳登录页（字节码中「请求失败 (code=…)」文案）
    if (j.code === -101) $falcon.trigger('bili_relogin');
  }
  return j;
}

function loadCredentials(): Credentials | null {
  return bridge.Dbase.read('bili', 'BILI_CREDENTIALS') || null;   // 表名来自 apps_bilis
}
