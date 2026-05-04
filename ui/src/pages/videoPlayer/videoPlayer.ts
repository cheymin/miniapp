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
            
            playMode: 'ffplay' as 'ffplay' | 'mpv' | 'vlc',
            
            playlist: [] as Array<{ name: string; path: string }>,
            
            shellInitialized: false
        };
    },

    computed: {
        playModeText(): string {
            const modes = {
                'ffplay': 'FFplay播放器',
                'mpv': 'MPV播放器',
                'vlc': 'VLC播放器'
            };
            return modes[this.playMode];
        }
    },

    async mounted() {
        await this.initializeShell();
        
        const options = this.$page.loadOptions;
        if (options.directory) {
            this.currentDirectory = options.directory;
        }
        if (options.initialPath) {
            this.currentVideo = options.initialPath;
            this.videoName = options.initialPath.split('/').pop()?.replace(/\.[^/.]+$/, '') || '';
            await this.scanVideos();
        }
    },

    methods: {
        async initializeShell() {
            try {
                if (!Shell) {
                    throw new Error('Shell对象未定义');
                }
                
                if (typeof Shell.initialize !== 'function') {
                    throw new Error('Shell.initialize方法不存在');
                }
                
                await Shell.initialize();
                this.shellInitialized = true;
                
            } catch (error: any) {
                console.error('Shell模块初始化失败:', error);
                showError('Shell模块初始化失败');
                this.shellInitialized = false;
            }
        },

        selectPlayMode(mode: 'ffplay' | 'mpv' | 'vlc') {
            this.playMode = mode;
            showInfo(`已切换到 ${this.playModeText}`);
        },

        async selectVideoFile() {
            try {
                showLoading('正在打开文件管理器...');
                
                $falcon.navTo('fileManager', {
                    mode: 'select',
                    filter: 'video',
                    returnPage: 'videoPlayer',
                    callback: (path: string) => {
                        if (path) {
                            this.currentVideo = path;
                            this.videoName = path.split('/').pop()?.replace(/\.[^/.]+$/, '') || '';
                            hideLoading();
                            showSuccess('已选择视频文件');
                        }
                    }
                });
                
            } catch (error: any) {
                hideLoading();
                showError('打开文件管理器失败: ' + error.message);
            }
        },

        async scanVideos() {
            if (!this.shellInitialized) {
                showError('Shell模块未初始化');
                return;
            }

            try {
                showLoading('正在扫描视频文件...');
                
                const videoExtensions = ['mp4', 'avi', 'mkv', 'mov', 'flv', 'wmv', 'webm', 'm4v'];
                const findCommands = videoExtensions.map(ext => 
                    `find "${this.currentDirectory}" -type f -name "*.${ext}" 2>/dev/null`
                ).join(' || ');
                
                const result = await Shell.exec(findCommands);
                
                if (result && result.trim()) {
                    const videos = result.trim().split('\n').filter(path => path.trim());
                    
                    this.playlist = videos.map(path => ({
                        name: path.split('/').pop()?.replace(/\.[^/.]+$/, '') || '未知视频',
                        path: path.trim()
                    }));
                    
                    hideLoading();
                    showSuccess(`找到 ${this.playlist.length} 个视频文件`);
                } else {
                    this.playlist = [];
                    hideLoading();
                    showInfo('未找到视频文件');
                }
                
            } catch (error: any) {
                hideLoading();
                showError('扫描视频文件失败: ' + error.message);
            }
        },

        selectVideo(index: number) {
            const video = this.playlist[index];
            if (video) {
                this.currentVideo = video.path;
                this.videoName = video.name;
                showInfo(`已选择: ${video.name}`);
            }
        },

        async playVideo() {
            if (!this.currentVideo) {
                showError('请先选择视频文件');
                return;
            }

            if (!this.shellInitialized) {
                showError('Shell模块未初始化');
                return;
            }

            try {
                showLoading('正在启动播放器...');
                
                let playCommand = '';
                
                switch (this.playMode) {
                    case 'ffplay':
                        playCommand = `ffplay -fs -autoexit "${this.currentVideo}" &`;
                        break;
                    case 'mpv':
                        playCommand = `mpv --fullscreen "${this.currentVideo}" &`;
                        break;
                    case 'vlc':
                        playCommand = `vlc --fullscreen "${this.currentVideo}" &`;
                        break;
                    default:
                        playCommand = `ffplay -fs -autoexit "${this.currentVideo}" &`;
                }
                
                await Shell.exec(playCommand);
                
                hideLoading();
                showSuccess(`${this.playModeText} 已启动`);
                
            } catch (error: any) {
                hideLoading();
                showError('播放失败: ' + error.message);
            }
        },

        async stopVideo() {
            if (!this.shellInitialized) {
                showError('Shell模块未初始化');
                return;
            }

            try {
                showLoading('正在停止播放器...');
                
                let killCommand = '';
                
                switch (this.playMode) {
                    case 'ffplay':
                        killCommand = 'killall ffplay';
                        break;
                    case 'mpv':
                        killCommand = 'killall mpv';
                        break;
                    case 'vlc':
                        killCommand = 'killall vlc';
                        break;
                    default:
                        killCommand = 'killall ffplay';
                }
                
                await Shell.exec(killCommand);
                
                hideLoading();
                showSuccess('播放器已停止');
                
            } catch (error: any) {
                hideLoading();
                showError('停止失败: ' + error.message);
            }
        }
    }
});

export default videoPlayer;
