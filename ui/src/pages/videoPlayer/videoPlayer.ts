import { defineComponent } from 'vue';
import { Shell } from 'langningchen';
import PageShell from '../../components/PageShell.vue';
import { showError, showSuccess, showInfo } from '../../components/ToastMessage';

export type VideoOptions = { initialPath?: string };

type Video = { name: string; path: string };

const EXTS = ['mp4', 'mkv', 'avi', 'mov', 'flv', 'webm', '3gp', 'm4v', 'rmvb'];

function getGlobal(): any {
    try { if (typeof globalThis !== 'undefined') return globalThis; } catch (e) {}
    try { if (typeof self !== 'undefined') return self; } catch (e) {}
    try { if (typeof window !== 'undefined') return window; } catch (e) {}
    try { return new Function('return this')(); } catch (e) { return null; }
}

function findCVPlayer(): any {
    try {
        const G = getGlobal();
        if (G && typeof G.cvplayer !== 'undefined') return G.cvplayer;
        if (G && typeof G.videoPlayer !== 'undefined') return G.videoPlayer;
        const falcon = ($falcon as any);
        if (falcon && falcon.jsapi) {
            if (falcon.jsapi.cvplayer) return falcon.jsapi.cvplayer;
            if (falcon.jsapi.videoPlayer) return falcon.jsapi.videoPlayer;
        }
        if (falcon && falcon.cvplayer) return falcon.cvplayer;
        return null;
    } catch (e) { return null; }
}

const videoPlayer = defineComponent({
    components: { PageShell },
    data() {
        return {
            $page: {} as FalconPage<VideoOptions>,
            shellInitialized: false,
            cvplayer: null as any,
            useNative: false,
            currentVideo: '',
            videoName: '',
            isPlaying: false,
            stateText: '就绪',
            playlist: [] as Video[],
            logs: [] as string[],
            playPos: 0,
        };
    },
    async mounted() {
        this.$page.$npage.setSupportBack(true);
        const backFn = () => {
            this.stopVideo();
            $falcon.navBack();
        };
        this.$page.$npage.on('backpressed', backFn);

        await this.init();
        const opts = this.$page.loadOptions;
        if (opts?.initialPath) {
            this.currentVideo = opts.initialPath;
            this.videoName = opts.initialPath.split('/').pop() || '';
        }
    },
    beforeDestroy() { this.stopVideo(); },
    methods: {
        log(msg: string) {
            console.log('[VideoPlayer]', msg);
            this.logs.unshift(msg);
            if (this.logs.length > 20) this.logs.pop();
        },
        async init() {
            try {
                await Shell.initialize();
                this.shellInitialized = true;
            } catch (e) { /* ignore */ }
            const cp = findCVPlayer();
            if (cp) {
                this.cvplayer = cp;
                this.useNative = true;
                this.log('✅ 找到 cvplayer');
            } else {
                this.log('⚠️ 未找到 cvplayer 模块，将降级到 Shell ffplay');
            }
            this.scanVideos();
        },
        async scanVideos() {
            try {
                let files: string[] = [];
                for (let i = 0; i < EXTS.length; i++) {
                    const out = await Shell.exec('find /userdisk -maxdepth 3 -type f -iname "*.' + EXTS[i] + '" 2>/dev/null');
                    const arr = (out || '').split('\n').filter((s: string) => s.trim());
                    files = files.concat(arr);
                }
                this.playlist = files.map((p: string) => ({ name: p.split('/').pop() || '', path: p }));
                this.log('找到 ' + this.playlist.length + ' 个视频');
            } catch (e) {
                this.playlist = [];
            }
        },
        selectVideo(index: number) {
            const v = this.playlist[index];
            if (!v) return;
            this.currentVideo = v.path;
            this.videoName = v.name;
            this.log('选中: ' + v.name);
        },
        async playVideo() {
            if (!this.currentVideo) { showError('请先选择视频'); return; }
            if (this.useNative) {
                await this.nativePlay();
            } else {
                await this.shellPlay();
            }
        },
        async nativePlay() {
            try {
                this.log('▶ cvplayer.setDataSource(' + this.currentVideo + ')');
                this.cvplayer.setDataSource(this.currentVideo);
                if (typeof this.cvplayer.setVideoSurface === 'function') {
                    this.cvplayer.setVideoSurface(0, 0, 320);
                }
                this.cvplayer.play(0);
                this.isPlaying = true;
                this.stateText = '播放中';
                showSuccess('▶ 播放中');
            } catch (e: any) {
                this.log('❌ native play: ' + e);
                showError('播放失败: ' + e);
            }
        },
        async shellPlay() {
            try {
                const cmd = 'ffplay -noborder -autoexit -x 320 -y 240 "' + this.currentVideo + '" >/dev/null 2>&1 &';
                this.log('▶ Shell: ' + cmd);
                await Shell.exec(cmd);
                this.isPlaying = true;
                showSuccess('▶ 已启动 ffplay');
            } catch (e: any) {
                showError('ffplay 启动失败');
            }
        },
        async pauseVideo() {
            if (!this.cvplayer || !this.cvplayer.pause) return;
            try { this.cvplayer.pause(); this.isPlaying = false; this.stateText = '已暂停'; } catch (e) {}
        },
        async resumeVideo() {
            if (!this.cvplayer || !this.cvplayer.resume) return;
            try { this.cvplayer.resume(); this.isPlaying = true; this.stateText = '播放中'; } catch (e) {}
        },
        async stopVideo() {
            if (!this.cvplayer || !this.cvplayer.stop) return;
            try { this.cvplayer.stop(); this.isPlaying = false; this.stateText = '已停止'; } catch (e) {}
        },
        togglePause() { this.isPlaying ? this.pauseVideo() : this.resumeVideo(); },
        openFileMgr() { $falcon.navTo('fileManager', {}); },
        useFileMgr(path: string) { this.currentVideo = path; this.videoName = path.split('/').pop() || ''; }
    }
});

export default videoPlayer;
