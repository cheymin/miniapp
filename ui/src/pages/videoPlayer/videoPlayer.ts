import { defineComponent } from 'vue';
import { Shell } from 'langningchen';

export type VideoPlayerOptions = { file?: string };

const VIDEO_EXT = ['mp4', 'mkv', 'avi', 'mov', 'flv', 'webm', '3gp', 'm4v', 'rmvb'];

const RAIL = [
    { page: 'index', icon: '🏠', label: '首页' },
    { page: 'ai', icon: '🤖', label: 'AI' },
    { page: 'fileManager', icon: '📁', label: '文件' },
    { page: 'videoPlayer', icon: '🎬', label: '视频' },
    { page: 'shell', icon: '⌨️', label: '终端' },
    { page: 'imageViewer', icon: '🖼️', label: '图片' },
    { page: 'update', icon: '⬇️', label: '更新' },
];

const videoPlayer = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<VideoPlayerOptions>,
            activeKey: 'videoPlayer',
            rail: RAIL,
            useNative: false,
            cvp: null as any,
            isPlaying: false,
            currentFile: '',
            playlist: [] as { name: string; path: string }[],
            logs: [] as string[],
        };
    },
    async mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on('backpressed', () => { this.stopVideo(); $falcon.navBack(); });
        try {
            this.cvp = ($falcon as any).jsapi.cvplayer;
            this.useNative = !!this.cvp;
            this.pushLog(this.useNative ? '检测到 cvplayer 原生模块' : '无 cvplayer，用 Shell+ffplay 降级');
        } catch (e) {
            this.pushLog('cvplayer 探测失败，降级 Shell');
        }
        await Shell.initialize().catch(() => {});
        // 初始扫描
        await this.scanVideos();
        const opts = this.$page.$options || (this.$page as any).options || {};
        if (opts.file) { this.currentFile = opts.file; await this.playVideo(); }
    },
    methods: {
        open(pageName: string) { $falcon.navTo(pageName, {}); },
        pushLog(s: string) { this.logs.unshift(s); if (this.logs.length > 20) this.logs.pop(); },
        async scanVideos() {
            try {
                const out = await Shell.exec('find /userdisk -maxdepth 4 -type f \\( ' +
                    VIDEO_EXT.map(e => `-iname '*.${e}'`).join(' -o ') + ' \\) 2>/dev/null | head -30');
                if (!out) return;
                const list: { name: string; path: string }[] = [];
                for (const line of out.split('\n')) {
                    const p = line.trim();
                    if (!p) continue;
                    list.push({ name: p.substring(p.lastIndexOf('/') + 1), path: p });
                }
                this.playlist = list;
                this.pushLog('扫描到 ' + list.length + ' 个视频');
            } catch (e) { this.pushLog('扫描失败'); }
        },
        async playVideo() {
            if (!this.currentFile && this.playlist.length > 0) this.currentFile = this.playlist[0].path;
            if (!this.currentFile) { this.pushLog('没有选中文件'); return; }
            this.stopVideo();
            if (this.useNative && this.cvp) {
                try {
                    await this.cvp.play(this.currentFile);
                    this.isPlaying = true;
                    this.pushLog('cvplayer.play(' + this.currentFile + ')');
                } catch (e: any) {
                    this.pushLog('原生播放失败: ' + (e.message || e));
                }
            } else {
                try {
                    await Shell.exec('ffplay -autoexit -framedrop -x 320 -y 240 "' + this.currentFile + '" &');
                    this.isPlaying = true;
                    this.pushLog('Shell+ffplay 启动');
                } catch (e) { this.pushLog('ffplay 启动失败'); }
            }
        },
        togglePause() {
            if (!this.isPlaying) return;
            if (this.useNative && this.cvp) {
                try { this.cvp.pause(); } catch (e) {}
            } else {
                Shell.exec('kill -STOP $(pgrep -f ffplay | head -1) 2>/dev/null || true');
            }
        },
        stopVideo() {
            if (this.useNative && this.cvp) {
                try { this.cvp.stop(); } catch (e) {}
            } else {
                Shell.exec('killall ffplay 2>/dev/null || true');
            }
            this.isPlaying = false;
        },
        selectVideo(i: number) {
            this.currentFile = this.playlist[i].path;
            this.playVideo();
        },
        openFileMgr() { $falcon.navTo('fileManager', {}); }
    }
});

export default videoPlayer;
