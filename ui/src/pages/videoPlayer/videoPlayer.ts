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
import { openSoftKeyboard } from '../../utils/softKeyboardUtils';

export type VideoPlayerOptions = {
    initialPath?: string;
    directory?: string;
};

const videoPlayer = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<VideoPlayerOptions>,
            
            currentVideo: '' as string,
            videoName: '' as string,
            currentDirectory: '/userdisk' as string,
            videoList: [] as string[],
            currentVideoIndex: -1 as number,
            
            isPlaying: false,
            currentTime: 0,
            duration: 0,
            volume: 80,
            playbackSpeed: 1.0,
            
            shellInitialized: false,
            playProcess: null as any
        };
    },

    computed: {
        progressPercent(): number {
            if (this.duration === 0) return 0;
            return (this.currentTime / this.duration) * 100;
        }
    },

    async mounted() {
        await this.initializeShell();
        
        // 检查是否有初始路径参数
        const options = this.$page.loadOptions;
        if (options.directory) {
            this.currentDirectory = options.directory;
        }
        if (options.initialPath) {
            this.currentVideo = options.initialPath;
            this.videoName = options.initialPath.split('/').pop() || '';
            await this.selectVideo();
        }
    },

    methods: {
        async initializeShell() {
            try {
                if (!Shell || typeof Shell.initialize !== 'function') {
                    throw new Error('Shell模块不可用');
                }
                
                await Shell.initialize();
                this.shellInitialized = true;
            } catch (error: any) {
                console.error('Shell初始化失败:', error);
                showError('Shell初始化失败');
            }
        },

        async selectVideo() {
            if (!this.shellInitialized) {
                showError('Shell未初始化');
                return;
            }
            
            try {
                showLoading('正在扫描视频...');
                
                const extensions = 'mp4|avi|mkv|mov|flv|wmv|webm';
                const cmd = `find "${this.currentDirectory}" -type f \\( -iname "*\\.\\(${extensions}\\)" \\) 2>/dev/null | sort`;
                
                const result = await Shell.exec(cmd);
                
                if (result && result.trim()) {
                    this.videoList = result.trim().split('\n').filter((path: string) => path);
                    
                    if (this.videoList.length > 0) {
                        this.currentVideoIndex = 0;
                        this.currentVideo = this.videoList[0];
                        this.videoName = this.videoList[0].split('/').pop() || '';
                        showSuccess(`找到 ${this.videoList.length} 个视频`);
                    } else {
                        showError('未找到视频文件');
                    }
                } else {
                    showError('未找到视频文件');
                }
            } catch (error: any) {
                console.error('选择视频失败:', error);
                showError('选择视频失败: ' + error.message);
            } finally {
                hideLoading();
            }
        },
        
        async selectDirectory() {
            openSoftKeyboard(
                () => this.currentDirectory,
                async (value: string) => {
                    this.currentDirectory = value;
                    await this.selectVideo();
                }
            );
        },
        
        nextVideo() {
            if (this.videoList.length === 0) return;
            
            this.currentVideoIndex = (this.currentVideoIndex + 1) % this.videoList.length;
            this.currentVideo = this.videoList[this.currentVideoIndex];
            this.videoName = this.currentVideo.split('/').pop() || '';
            this.currentTime = 0;
            this.isPlaying = false;
        },
        
        prevVideo() {
            if (this.videoList.length === 0) return;
            
            this.currentVideoIndex = (this.currentVideoIndex - 1 + this.videoList.length) % this.videoList.length;
            this.currentVideo = this.videoList[this.currentVideoIndex];
            this.videoName = this.currentVideo.split('/').pop() || '';
            this.currentTime = 0;
            this.isPlaying = false;
        },

        async togglePlay() {
            if (!this.currentVideo) {
                showError('请先选择视频');
                return;
            }
            
            if (this.isPlaying) {
                await this.pauseVideo();
            } else {
                await this.playVideoFile();
            }
        },

        async playVideoFile() {
            try {
                if (!this.shellInitialized) {
                    showError('Shell未初始化');
                    return;
                }
                
                const cmd = `nohup mplayer -vo fbdev2 -ao alsa -volume ${this.volume} -speed ${this.playbackSpeed} "${this.currentVideo}" > /dev/null 2>&1 &`;
                await Shell.exec(cmd);
                
                this.isPlaying = true;
                showSuccess('开始播放');
                
                this.startProgressUpdate();
            } catch (error: any) {
                console.error('播放失败:', error);
                showError('播放失败: ' + error.message);
            }
        },

        async pauseVideo() {
            try {
                await Shell.exec('killall -STOP mplayer 2>/dev/null || true');
                this.isPlaying = false;
                showInfo('已暂停');
            } catch (error: any) {
                console.error('暂停失败:', error);
            }
        },

        async seekBackward() {
            if (!this.isPlaying) return;
            
            try {
                await Shell.exec('echo "seek -10" > /tmp/mplayer-fifo 2>/dev/null || true');
                this.currentTime = Math.max(0, this.currentTime - 10);
            } catch (error: any) {
                console.error('后退失败:', error);
            }
        },

        async seekForward() {
            if (!this.isPlaying) return;
            
            try {
                await Shell.exec('echo "seek 10" > /tmp/mplayer-fifo 2>/dev/null || true');
                this.currentTime = Math.min(this.duration, this.currentTime + 10);
            } catch (error: any) {
                console.error('快进失败:', error);
            }
        },

        async increaseVolume() {
            this.volume = Math.min(100, this.volume + 10);
            if (this.isPlaying) {
                await Shell.exec(`echo "volume ${this.volume}" > /tmp/mplayer-fifo 2>/dev/null || true`);
            }
        },

        async decreaseVolume() {
            this.volume = Math.max(0, this.volume - 10);
            if (this.isPlaying) {
                await Shell.exec(`echo "volume ${this.volume}" > /tmp/mplayer-fifo 2>/dev/null || true`);
            }
        },

        changeSpeed() {
            const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
            const currentIndex = speeds.indexOf(this.playbackSpeed);
            this.playbackSpeed = speeds[(currentIndex + 1) % speeds.length];
            showInfo(`播放速度: ${this.playbackSpeed}x`);
        },

        startProgressUpdate() {
            setInterval(async () => {
                if (this.isPlaying && this.currentTime < this.duration) {
                    this.currentTime += 1;
                }
            }, 1000);
        },

        formatTime(seconds: number): string {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    }
});

export default videoPlayer;
