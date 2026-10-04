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
import { Shell } from 'langningchen';
import { showError, showSuccess, showInfo } from '../../components/ToastMessage';
import { hideLoading, showLoading } from '../../components/Loading';

export type VideoPlayerOptions = {
    initialPath?: string;
    directory?: string;
};

// 安全获取全局对象（QuickJS 兼容）
function getGlobal(): any {
    if (typeof globalThis !== 'undefined') return globalThis;
    if (typeof self !== 'undefined') return self;
    if (typeof window !== 'undefined') return window;
    // eslint-disable-next-line no-new-func
    return new Function('return this')();
}

// 尝试在多个可能的命名空间找 cvplayer / videoPlayer 模块
function findCVPlayer(): any {
    try {
        const G = getGlobal();
        // 1. 作为全局变量
        if (typeof G.cvplayer !== 'undefined') {
            console.log('[VideoPlayer] 找到 cvplayer: global.cvplayer');
            return G.cvplayer;
        }
        if (typeof G.videoPlayer !== 'undefined') {
            console.log('[VideoPlayer] 找到 videoPlayer: global.videoPlayer');
            return G.videoPlayer;
        }
        // 2. $falcon.jsapi 下
        if (typeof ($falcon as any).jsapi !== 'undefined') {
            const j = ($falcon as any).jsapi;
            if (typeof j.cvplayer !== 'undefined') {
                console.log('[VideoPlayer] 找到 cvplayer: $falcon.jsapi.cvplayer');
                return j.cvplayer;
            }
            if (typeof j.videoPlayer !== 'undefined') {
                console.log('[VideoPlayer] 找到 videoPlayer: $falcon.jsapi.videoPlayer');
                return j.videoPlayer;
            }
        }
        // 3. $falcon 直接挂
        if (typeof ($falcon as any).cvplayer !== 'undefined') {
            console.log('[VideoPlayer] 找到 cvplayer: $falcon.cvplayer');
            return ($falcon as any).cvplayer;
        }
        // 4. 打印所有 $falcon 子键以便排查
        console.log('[VideoPlayer] $falcon 顶层 keys:', Object.keys($falcon));
        if (typeof ($falcon as any).jsapi !== 'undefined') {
            console.log('[VideoPlayer] $falcon.jsapi keys:', Object.keys(($falcon as any).jsapi));
        }
        // 5. 也扫一遍全局对象的属性找 cv 相关的
        const allNames = Object.getOwnPropertyNames(G);
        const cvRelated = allNames.filter(n => /cv|video|player/i.test(n));
        console.log('[VideoPlayer] global 里 cv/video/player 相关:', cvRelated);
        return null;
    } catch (e) {
        console.error('[VideoPlayer] findCVPlayer 异常:', e);
        return null;
    }
}

const VIDEO_WIDTH = 320;   // 设备横屏
const VIDEO_HEIGHT = 240; // 设备横屏

const videoPlayer = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<VideoPlayerOptions>,

            cvplayer: null as any,          // cvplayer / videoPlayer JSAPI 模块
            cvplayerReady: false as boolean,

            currentVideo: '' as string,
            videoName: '' as string,
            currentDirectory: '/userdisk' as string,

            isPlaying: false,
            currentPosition: 0,   // 毫秒
            duration: 0,          // 毫秒
            stateText: '就绪',

            playlist: [] as Array<{ name: string; path: string }>,

            shellInitialized: false,
            useNativePlayer: true as boolean,   // true=cvplayer, false=外部命令
            nativeLog: [] as string[],          // 调试日志
        };
    },

    async mounted() {
        await this.initializeShell();
        await this.initializeCVPlayer();

        const options = this.$page.loadOptions;
        if (options.directory) {
            this.currentDirectory = options.directory;
        }
        if (options.initialPath) {
            this.currentVideo = options.initialPath;
            this.videoName = (options.initialPath.split('/').pop() || '').replace(/\.[^/.]+$/, '');
            await this.scanVideos();
        }

        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on('backpressed', () => {
            this.stopVideo();
            this.$page.finish();
        });
    },

    beforeDestroy() {
        this.stopVideo();
    },

    methods: {
        log(msg: string) {
            const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
            console.log('[VideoPlayer]', msg);
            this.nativeLog.unshift(line);
            if (this.nativeLog.length > 30) {
                this.nativeLog.pop();
            }
        },

        async initializeShell() {
            try {
                if (!Shell || typeof Shell.initialize !== 'function') return;
                await Shell.initialize();
                this.shellInitialized = true;
            } catch (error: any) {
                console.error('Shell初始化失败:', error);
            }
        },

        async initializeCVPlayer() {
            this.log('正在探测 cvplayer / videoPlayer 模块...');
            const mod = findCVPlayer();
            if (!mod) {
                this.log('⚠️ 未找到 cvplayer 模块，将回退到外部命令模式');
                this.useNativePlayer = false;
                this.cvplayerReady = false;
                return;
            }
            this.cvplayer = mod;
            this.useNativePlayer = true;

            // 打印模块方法
            const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(mod) || mod)
                .filter(k => typeof mod[k] === 'function' && !k.startsWith('_'));
            this.log(`✅ 模块加载成功! 方法: ${methods.join(', ')}`);

            // 尝试 on() 订阅事件
            if (typeof (mod as any).on === 'function') {
                try {
                    (mod as any).on('onState', (arg: any) => {
                        this.log(`事件 onState: ${JSON.stringify(arg)}`);
                        // onState(int state)
                        const s = typeof arg === 'object' ? arg?.data : arg;
                        if (s === 0) { this.stateText = '已停止'; this.isPlaying = false; }
                        else if (s === 1) { this.stateText = '播放中'; this.isPlaying = true; }
                        else if (s === 2) { this.stateText = '已暂停'; this.isPlaying = false; }
                        this.$forceUpdate();
                    });
                } catch (e) {
                    this.log(`订阅 onState 失败: ${e}`);
                }
                try {
                    (mod as any).on('onComplete', () => {
                        this.log('事件 onComplete: 播放完成');
                        this.stateText = '已完成';
                        this.isPlaying = false;
                        this.$forceUpdate();
                    });
                } catch (e) {
                    /* ignore */
                }
                try {
                    (mod as any).on('onPosition', (arg: any) => {
                        // onPosition(int ms) 回调
                        const pos = typeof arg === 'object' ? (arg?.data ?? arg) : arg;
                        if (typeof pos === 'number') {
                            this.currentPosition = pos;
                            this.$forceUpdate();
                        }
                    });
                } catch (e) {
                    /* ignore */
                }
                try {
                    (mod as any).on('onInfo', (arg: any) => {
                        this.log(`事件 onInfo: ${JSON.stringify(arg)}`);
                    });
                } catch (e) {
                    /* ignore */
                }
                try {
                    (mod as any).on('onResumed', () => {
                        this.log('事件 onResumed');
                        this.stateText = '播放中';
                        this.isPlaying = true;
                        this.$forceUpdate();
                    });
                } catch (e) {
                    /* ignore */
                }
            }

            // 如果有 videoPlayer 模块，可能需要先 startService
            const G2 = getGlobal();
            const vp = G2.videoPlayer || (($falcon as any)?.jsapi?.videoPlayer);
            if (vp && typeof vp.startService === 'function') {
                try {
                    this.log('发现 videoPlayer，尝试 startService()...');
                    await vp.startService();
                    this.log('videoPlayer.startService() OK');
                } catch (e) {
                    this.log(`videoPlayer.startService() 失败: ${e}`);
                }
            }

            this.cvplayerReady = true;
            this.log('cvplayer 初始化完成 ✅');
            showSuccess('视频模块就绪 ✅');
        },

        async selectVideoFile() {
            try {
                this.log('打开文件管理器选择视频...');
                $falcon.navTo('fileManager', {
                    mode: 'select',
                    filter: 'video',
                    callback: (path: string) => {
                        if (path) {
                            this.currentVideo = path;
                            this.videoName = (path.split('/').pop() || '').replace(/\.[^/.]+$/, '');
                            this.log(`已选择: ${path}`);
                            showSuccess('已选择视频');
                        }
                    }
                });
            } catch (error: any) {
                showError('打开文件管理器失败: ' + error);
            }
        },

        async scanVideos() {
            if (!this.shellInitialized) {
                showError('Shell 未初始化');
                return;
            }
            try {
                showLoading('扫描视频中...');
                const exts = ['mp4', 'avi', 'mkv', 'mov', 'flv', 'wmv', 'webm', 'm4v', '3gp', 'rmvb'];
                const cmd = exts.map(e => `find "${this.currentDirectory}" -type f -iname "*.${e}" 2>/dev/null`).join(' || ');
                const result = await Shell.exec(cmd);
                hideLoading();

                if (result && result.trim()) {
                    const lines = result.trim().split('\n').filter((s: string) => s.trim());
                    this.playlist = lines.map((path: string) => ({
                        name: (path.split('/').pop() || '').replace(/\.[^/.]+$/, '') || '未知',
                        path: path.trim()
                    }));
                    showSuccess(`找到 ${this.playlist.length} 个视频`);
                } else {
                    this.playlist = [];
                    showInfo('未找到视频');
                }
            } catch (error: any) {
                hideLoading();
                showError('扫描失败: ' + error.message);
            }
        },

        selectVideo(index: number) {
            const v = this.playlist[index];
            if (!v) return;
            this.currentVideo = v.path;
            this.videoName = v.name;
            showInfo(`已选择: ${v.name}`);
        },

        async playVideo() {
            if (!this.currentVideo) {
                showError('请先选择视频');
                return;
            }

            if (this.useNativePlayer && this.cvplayerReady) {
                await this.nativePlay();
            } else {
                showError('cvplayer 未就绪，无法播放');
            }
        },

        async nativePlay() {
            try {
                showLoading('加载视频...');
                const cp = this.cvplayer;

                // 1. setDataSource
                this.log(`setDataSource: ${this.currentVideo}`);
                const dsRet = cp.setDataSource ? cp.setDataSource(this.currentVideo) : undefined;
                this.log(`setDataSource 返回: ${dsRet}`);

                // 2. setVideoSurface - 指定视频渲染到屏幕哪个位置
                // 屏幕 320x240，让视频全屏显示
                // 方法签名推断: setVideoSurface(int x, int y, int w)
                // h 可能从视频尺寸自动推算
                if (typeof cp.setVideoSurface === 'function') {
                    // 先尝试 (x, y, w) - 全屏 320 宽
                    this.log('setVideoSurface(0, 0, 320)...');
                    cp.setVideoSurface(0, 0, 320);
                } else {
                    this.log('⚠️ 模块没有 setVideoSurface 方法');
                }

                hideLoading();

                // 3. play
                this.log('play()...');
                cp.play(0);  // pos = 0 从头播

                this.stateText = '播放中';
                this.isPlaying = true;
                this.log('▶ 播放已启动');
                showSuccess('播放中 ▶');
            } catch (error: any) {
                hideLoading();
                this.log(`❌ nativePlay 异常: ${error}`);
                showError('播放失败: ' + error);
            }
        },

        async pauseVideo() {
            if (!this.cvplayer || !this.cvplayer.pause) return;
            try {
                this.cvplayer.pause();
                this.stateText = '已暂停';
                this.isPlaying = false;
                showInfo('⏸ 暂停');
            } catch (e: any) {
                showError('暂停失败: ' + e);
            }
        },

        async resumeVideo() {
            if (!this.cvplayer || !this.cvplayer.resume) return;
            try {
                this.cvplayer.resume();
                this.stateText = '播放中';
                this.isPlaying = true;
                showInfo('▶ 继续');
            } catch (e: any) {
                showError('继续失败: ' + e);
            }
        },

        async stopVideo() {
            if (!this.cvplayer || !this.cvplayer.stop) return;
            try {
                this.cvplayer.stop();
                this.stateText = '已停止';
                this.isPlaying = false;
                this.currentPosition = 0;
                this.log('⏹ 已停止');
            } catch (e: any) {
                this.log(`stop 失败: ${e}`);
            }
        },

        async seekForward() {
            if (!this.cvplayer || !this.cvplayer.seek) return;
            try {
                const newPos = Math.min(this.currentPosition + 5000, this.duration || 3600000);
                this.cvplayer.seek(newPos);
                showInfo(`跳转 +5s`);
            } catch (e: any) {
                showError('跳转失败: ' + e);
            }
        },

        async seekBackward() {
            if (!this.cvplayer || !this.cvplayer.seek) return;
            try {
                const newPos = Math.max(this.currentPosition - 5000, 0);
                this.cvplayer.seek(newPos);
                showInfo(`跳转 -5s`);
            } catch (e: any) {
                showError('跳转失败: ' + e);
            }
        },

        togglePlayPause() {
            if (this.isPlaying) {
                this.pauseVideo();
            } else {
                this.resumeVideo();
            }
        },

        formatTime(ms: number): string {
            if (!ms || ms < 0) return '00:00';
            const totalSec = Math.floor(ms / 1000);
            const m = Math.floor(totalSec / 60);
            const s = totalSec % 60;
            return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
    }
});

export default videoPlayer;
