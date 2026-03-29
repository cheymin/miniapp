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

export type MusicPlayerOptions = {
    initialPath?: string;
    directory?: string;
};

const musicPlayer = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<MusicPlayerOptions>,
            
            currentSong: '' as string,
            songName: '' as string,
            artist: '未知艺术家' as string,
            currentDirectory: '/userdisk' as string,
            
            isPlaying: false,
            currentTime: 0,
            duration: 0,
            volume: 80,
            currentIndex: -1,
            
            playMode: 'list' as 'list' | 'random' | 'repeat',
            
            playlist: [] as Array<{ name: string; path: string; duration: string }>,
            
            shellInitialized: false
        };
    },

    computed: {
        progressPercent(): number {
            if (this.duration === 0) return 0;
            return (this.currentTime / this.duration) * 100;
        },
        
        playModeText(): string {
            const modes = {
                'list': '列表循环',
                'random': '随机播放',
                'repeat': '单曲循环'
            };
            return modes[this.playMode];
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
            this.currentSong = options.initialPath;
            this.songName = options.initialPath.split('/').pop()?.replace(/\.[^/.]+$/, '') || '';
            await this.scanMusic();
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

        async scanMusic() {
            if (!this.shellInitialized) {
                showError('Shell未初始化');
                return;
            }
            
            try {
                showLoading('正在扫描音乐...');
                
                const extensions = 'mp3|wav|flac|ogg|m4a|aac|wma';
                const cmd = `find "${this.currentDirectory}" -type f \\( -iname "*\\.\\(${extensions}\\)" \\) 2>/dev/null | sort`;
                
                const result = await Shell.exec(cmd);
                
                if (result && result.trim()) {
                    const songs = result.trim().split('\n').filter((s: string) => s);
                    
                    this.playlist = songs.map((path: string) => {
                        const name = path.split('/').pop() || '';
                        return {
                            name: name.replace(/\.[^/.]+$/, ''),
                            path,
                            duration: '00:00'
                        };
                    });
                    
                    showSuccess(`找到 ${this.playlist.length} 首音乐`);
                } else {
                    this.playlist = [];
                    showInfo('未找到音乐文件');
                }
            } catch (error: any) {
                console.error('扫描音乐失败:', error);
                showError('扫描音乐失败: ' + error.message);
            } finally {
                hideLoading();
            }
        },
        
        async selectDirectory() {
            openSoftKeyboard(
                () => this.currentDirectory,
                async (value: string) => {
                    this.currentDirectory = value;
                    await this.scanMusic();
                }
            );
        },

        async playSong(index: number) {
            if (index < 0 || index >= this.playlist.length) return;
            
            const song = this.playlist[index];
            this.currentSong = song.path;
            this.songName = song.name;
            this.currentIndex = index;
            this.currentTime = 0;
            
            await this.startPlaying();
        },

        async togglePlay() {
            if (!this.currentSong) {
                if (this.playlist.length > 0) {
                    await this.playSong(0);
                } else {
                    showError('请先扫描音乐');
                }
                return;
            }
            
            if (this.isPlaying) {
                await this.pauseMusic();
            } else {
                await this.resumeMusic();
            }
        },

        async startPlaying() {
            try {
                if (!this.shellInitialized) return;
                
                await Shell.exec('killall madplay 2>/dev/null || true');
                
                const cmd = `nohup madplay -v "${this.currentSong}" > /dev/null 2>&1 &`;
                await Shell.exec(cmd);
                
                this.isPlaying = true;
                showSuccess('开始播放');
                
                this.startProgressUpdate();
            } catch (error: any) {
                console.error('播放失败:', error);
                showError('播放失败: ' + error.message);
            }
        },

        async pauseMusic() {
            try {
                await Shell.exec('killall -STOP madplay 2>/dev/null || true');
                this.isPlaying = false;
                showInfo('已暂停');
            } catch (error: any) {
                console.error('暂停失败:', error);
            }
        },

        async resumeMusic() {
            try {
                await Shell.exec('killall -CONT madplay 2>/dev/null || true');
                this.isPlaying = true;
                showSuccess('继续播放');
            } catch (error: any) {
                console.error('继续播放失败:', error);
            }
        },

        async previousSong() {
            if (this.playlist.length === 0) return;
            
            let newIndex = this.currentIndex - 1;
            if (newIndex < 0) {
                newIndex = this.playlist.length - 1;
            }
            
            await this.playSong(newIndex);
        },

        async nextSong() {
            if (this.playlist.length === 0) return;
            
            let newIndex: number;
            
            if (this.playMode === 'random') {
                newIndex = Math.floor(Math.random() * this.playlist.length);
            } else if (this.playMode === 'repeat') {
                newIndex = this.currentIndex;
            } else {
                newIndex = (this.currentIndex + 1) % this.playlist.length;
            }
            
            await this.playSong(newIndex);
        },

        async increaseVolume() {
            this.volume = Math.min(100, this.volume + 10);
            showInfo(`音量: ${this.volume}%`);
        },

        async decreaseVolume() {
            this.volume = Math.max(0, this.volume - 10);
            showInfo(`音量: ${this.volume}%`);
        },

        toggleMode() {
            const modes: Array<'list' | 'random' | 'repeat'> = ['list', 'random', 'repeat'];
            const currentIndex = modes.indexOf(this.playMode);
            this.playMode = modes[(currentIndex + 1) % modes.length];
            showInfo(this.playModeText);
        },

        startProgressUpdate() {
            setInterval(async () => {
                if (this.isPlaying && this.currentTime < this.duration) {
                    this.currentTime += 1;
                    
                    if (this.currentTime >= this.duration) {
                        await this.nextSong();
                    }
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

export default musicPlayer;
