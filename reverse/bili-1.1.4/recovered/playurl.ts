/**
 * 从 bili-a6p 1.1.4 的 QuickJS 字节码还原的取流逻辑。
 *
 * 对应原始实现中的函数/字符串：
 *   /x/web-interface/wbi/view        -> 视频详情（pages/cid）
 *   /x/player/wbi/v2                 -> 播放器信息
 *   /x/player/wbi/playurl            -> UGC 取流（dash + durl）
 *   /pgc/view/web/season             -> 番剧/影视详情
 *   /pgc/player/web/v2/playurl       -> PGC 取流
 *   /xlive/web-room/v2/index/getRoomPlayInfo -> 直播取流
 *
 * 注意：WBI 签名、Cookie、UA/Referer 在原包中由原生 biliio 模块统一处理，
 * 这里抽象为 request()，由宿主注入。
 */

export interface RequestOptions {
    headers?: Record<string, string>;
    cookie?: string;
    timeout?: number;
}

export interface HttpClient {
    /** 返回解析后的 JSON；失败时抛出异常。 */
    request<T = any>(url: string, options?: RequestOptions): Promise<T>;
    /** 返回文本（用于 m3u8/flv 探测）。 */
    text(url: string, options?: RequestOptions): Promise<string>;
}

export interface VideoTarget {
    kind: 'video' | 'bangumi' | 'live';
    bvid?: string;
    aid?: number;
    cid?: number;
    epId?: number;
    seasonId?: number;
    roomId?: number;
}

export interface DashStream {
    id: number;
    baseUrl: string;
    backupUrl: string[];
    bandwidth: number;
    codecid: number;
    width?: number;
    height?: number;
    frameRate?: string;
}

export interface PlayInfo {
    kind: VideoTarget['kind'];
    duration: number;
    video: DashStream[];
    audio: DashStream[];
    /** durl 兜底（非 dash 接口或直播回放） */
    durl: { url: string; backupUrl: string[]; length: number }[];
    title: string;
    currentQn: number;
    acceptQuality: number[];
}

const UGC_VIEW = 'https://api.bilibili.com/x/web-interface/wbi/view';
const UGC_PLAYER = 'https://api.bilibili.com/x/player/wbi/v2';
const UGC_PLAYURL = 'https://api.bilibili.com/x/player/wbi/playurl';
const PGC_SEASON = 'https://api.bilibili.com/pgc/view/web/season';
const PGC_PLAYURL = 'https://api.bilibili.com/pgc/player/web/v2/playurl';
const LIVE_API = 'https://api.live.bilibili.com';

/** fnval: DASH(16) | HDR(64) | 4K(128) | DolbyAudio(256) | DolbyVision(512) | 8K(1024) | AV1(2048) */
const FNVAL_DASH = 16 | 64 | 128 | 256 | 512 | 1024 | 2048;

function pickDash(data: any): { video: DashStream[]; audio: DashStream[] } {
    const dash = data?.dash;
    if (!dash) return { video: [], audio: [] };
    const mapVideo = (v: any): DashStream => ({
        id: v.id,
        baseUrl: v.baseUrl || v.base_url,
        backupUrl: v.backupUrl || v.backup_url || [],
        bandwidth: v.bandwidth,
        codecid: v.codecid,
        width: v.width,
        height: v.height,
        frameRate: v.frameRate || v.frame_rate,
    });
    const mapAudio = (a: any): DashStream => ({
        id: a.id,
        baseUrl: a.baseUrl || a.base_url,
        backupUrl: a.backupUrl || a.backup_url || [],
        bandwidth: a.bandwidth,
        codecid: a.codecid,
    });
    return { video: (dash.video || []).map(mapVideo), audio: (dash.audio || []).map(mapAudio) };
}

function pickDurl(data: any): PlayInfo['durl'] {
    return (data?.durl || []).map((d: any) => ({
        url: d.url,
        backupUrl: d.backup_url || d.backupUrl || [],
        length: d.length || 0,
    }));
}

/** 设备端只保证 AVC 硬解，优先 codecid=7，其次按分辨率/带宽降级。 */
export function selectStream(streams: DashStream[], preferHeight = 720): DashStream | null {
    if (!streams.length) return null;
    const avc = streams.filter((s) => s.codecid === 7);
    const pool = avc.length ? avc : streams;
    const below = pool.filter((s) => (s.height || 0) <= preferHeight);
    const candidates = below.length ? below : pool;
    return candidates.slice().sort((a, b) => {
        const ha = (a.height || 0) * 1000 + a.bandwidth / 1000;
        const hb = (b.height || 0) * 1000 + b.bandwidth / 1000;
        return hb - ha;
    })[0];
}

export class BiliPlayApi {
    constructor(private http: HttpClient) {}

    async getUgcPlayInfo(bvid: string, cid: number, qn = 80): Promise<PlayInfo> {
        const view = await this.http.request<any>(`${UGC_VIEW}?bvid=${bvid}`);
        if (view.code !== 0) throw new Error(view.message || '视频信息获取失败');

        const player = await this.http.request<any>(
            `${UGC_PLAYER}?bvid=${bvid}&cid=${cid}`
        );
        const title = view.data?.title || '';

        const params = [
            `bvid=${bvid}`,
            `cid=${cid}`,
            `qn=${qn}`,
            'fnver=0',
            `fnval=${FNVAL_DASH}`,
            'fourk=1',
        ].join('&');
        const play = await this.http.request<any>(`${UGC_PLAYURL}?${params}`);
        if (play.code !== 0) throw new Error(play.message || '取流失败');

        const { video, audio } = pickDash(play.data);
        return {
            kind: 'video',
            duration: view.data?.duration || 0,
            video,
            audio,
            durl: pickDurl(play.data),
            title,
            currentQn: play.data?.quality || qn,
            acceptQuality: play.data?.accept_quality || player.data?.accept_quality || [],
        };
    }

    async getPgcPlayInfo(epId: number, qn = 80): Promise<PlayInfo> {
        const season = await this.http.request<any>(
            `${PGC_SEASON}?ep_id=${epId}`
        );
        if (season.code !== 0) throw new Error(season.message || '番剧信息获取失败');

        const params = [
            `ep_id=${epId}`,
            `qn=${qn}`,
            'fnver=0',
            `fnval=${FNVAL_DASH}`,
            'fourk=1',
        ].join('&');
        const play = await this.http.request<any>(`${PGC_PLAYURL}?${params}`);
        if (play.code !== 0) throw new Error(play.message || '取流失败');

        const result = play.result || play.data;
        const { video, audio } = pickDash(result);
        return {
            kind: 'bangumi',
            duration: season.result?.episodes?.find((e: any) => e.id === epId)?.duration || 0,
            video,
            audio,
            durl: pickDurl(result),
            title: season.result?.season_title || '',
            currentQn: result?.quality || qn,
            acceptQuality: result?.accept_quality || [],
        };
    }

    /**
     * 直播：先取房间信息，再取 playurl；返回的 URL 是 FLV/HLS 流。
     * segment_index 用于分片拉流（原实现中的 &segment_index=）。
     */
    async getLivePlayInfo(roomId: number, qn = 10000): Promise<{
        url: string;
        backupUrl: string[];
        protocol: string;
        title: string;
    }> {
        const info = await this.http.request<any>(
            `${LIVE_API}/xlive/web-room/v2/index/getRoomPlayInfo?room_id=${roomId}` +
            `&protocol=0,1&format=0,1,2&codec=0,1&qn=${qn}&platform=web&ptype=8`
        );
        if (info.code !== 0) throw new Error(info.message || '直播信息获取失败');
        const playurl = info.data?.playurl_info?.playurl;
        const stream = playurl?.stream?.[0];
        const format = stream?.format?.[0];
        const codec = format?.codec?.[0];
        const host = playurl?.g_qn_desc?.[0]?.host ?? '';
        const base = codec?.base_url || '';
        const url = base.startsWith('http') ? base : `https://${host}${base}`;
        return {
            url,
            backupUrl: (codec?.url_info || []).map(
                (u: any) => (u.host ? `https://${u.host}${u.base_url}` : u.base_url)
            ).filter(Boolean),
            protocol: format?.format_name || 'flv',
            title: info.data?.room_info?.title || `直播间 ${roomId}`,
        };
    }
}
