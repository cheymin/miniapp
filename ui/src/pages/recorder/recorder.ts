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
import { showError, showSuccess } from '../../components/ToastMessage';
import { hideLoading, showLoading } from '../../components/Loading';

export type RecorderOptions = {};

interface RecordingItem {
    filename: string;
    filepath: string;
    duration: number;
    createTime: number;
    size: number;
}

const recorder = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<RecorderOptions>,
            
            recordings: [] as RecordingItem[],
            isRecording: false as boolean,
            recordingTime: 0 as number,
            recordingTimer: null as any,
            
            currentPlayingFile: '' as string,
            isPlaying: false as boolean,
            
            saveDirectory: '/userdisk/Music/录音' as string,
            
            shellInitialized: false
        };
    },

    computed: {
        formattedRecordingTime(): string {
            const minutes = Math.floor(this.recordingTime / 60);
            const seconds = this.recordingTime % 60;
            return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    },

    async mounted() {
        this.$page.$npage.on("backpressed", this.handleBackPress);
        await this.initializeShell();
        await this.ensureDirectory();
        await this.loadRecordings();
    },
    
    beforeDestroy() {
        this.$page.$npage.off("backpressed", this.handleBackPress);
        this.stopRecording();
    },

    methods: {
        handleBackPress() {
            if (this.isRecording) {
                this.stopRecording();
            } else {
                $falcon.navBack();
            }
        },

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

        async ensureDirectory() {
            if (!this.shellInitialized) return;
            
            try {
                await Shell.exec(`mkdir -p "${this.saveDirectory}"`);
            } catch (error: any) {
                console.error('创建目录失败:', error);
            }
        },

        async loadRecordings() {
            if (!this.shellInitialized) {
                showError('Shell未初始化');
                return;
            }
            
            try {
                showLoading('加载中...');
                
                const cmd = `find "${this.saveDirectory}" -type f \\( -iname "*.wav" -o -iname "*.mp3" -o -iname "*.m4a" -o -iname "*.ogg" -o -iname "*.aac" \\) 2>/dev/null | sort -r`;
                const result = await Shell.exec(cmd);
                
                this.recordings = [];
                
                if (result && result.trim()) {
                    const files = result.trim().split('\n').filter((path: string) => path);
                    
                    for (const filepath of files) {
                        const filename = filepath.split('/').pop() || '';
                        const statResult = await Shell.exec(`stat -c "%Y %s" "${filepath}" 2>/dev/null || stat -f "%m %z" "${filepath}" 2>/dev/null`);
                        
                        let createTime = 0;
                        let size = 0;
                        
                        if (statResult && statResult.trim()) {
                            const parts = statResult.trim().split(' ');
                            if (parts.length >= 2) {
                                createTime = parseInt(parts[0]) * 1000;
                                size = parseInt(parts[1]);
                            }
                        }
                        
                        this.recordings.push({
                            filename,
                            filepath,
                            duration: 0,
                            createTime,
                            size
                        });
                    }
                }
            } catch (error: any) {
                console.error('加载录音列表失败:', error);
                showError('加载录音列表失败');
            } finally {
                hideLoading();
            }
        },

        async startRecording() {
            if (!this.shellInitialized) {
                showError('Shell未初始化');
                return;
            }
            
            if (this.isRecording) return;
            
            try {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `录音_${timestamp}.wav`;
                const filepath = `${this.saveDirectory}/${filename}`;
                
                const cmd = `arecord -d 3600 -f cd -t wav "${filepath}" > /dev/null 2>&1 &`;
                await Shell.exec(cmd);
                
                this.isRecording = true;
                this.recordingTime = 0;
                this.currentPlayingFile = filepath;
                
                this.recordingTimer = setInterval(() => {
                    this.recordingTime++;
                }, 1000);
                
                showSuccess('开始录音');
            } catch (error: any) {
                console.error('开始录音失败:', error);
                showError('开始录音失败');
            }
        },

        async stopRecording() {
            if (!this.isRecording) return;
            
            try {
                if (this.recordingTimer) {
                    clearInterval(this.recordingTimer);
                    this.recordingTimer = null;
                }
                
                await Shell.exec('killall arecord 2>/dev/null || true');
                
                this.isRecording = false;
                
                await this.loadRecordings();
                showSuccess('录音已保存');
            } catch (error: any) {
                console.error('停止录音失败:', error);
                showError('停止录音失败');
            }
        },

        async playRecording(filepath: string) {
            if (!this.shellInitialized) {
                showError('Shell未初始化');
                return;
            }
            
            try {
                if (this.isPlaying && this.currentPlayingFile === filepath) {
                    await Shell.exec('killall aplay 2>/dev/null || true');
                    this.isPlaying = false;
                    this.currentPlayingFile = '';
                    return;
                }
                
                await Shell.exec('killall aplay 2>/dev/null || true');
                
                this.currentPlayingFile = filepath;
                this.isPlaying = true;
                
                await Shell.exec(`aplay "${filepath}"`);
                
                this.isPlaying = false;
                this.currentPlayingFile = '';
            } catch (error: any) {
                console.error('播放录音失败:', error);
                showError('播放录音失败');
                this.isPlaying = false;
            }
        },

        async deleteRecording(filepath: string) {
            if (!this.shellInitialized) {
                showError('Shell未初始化');
                return;
            }
            
            try {
                await Shell.exec(`rm -f "${filepath}"`);
                await this.loadRecordings();
                showSuccess('删除成功');
            } catch (error: any) {
                console.error('删除录音失败:', error);
                showError('删除录音失败');
            }
        },

        formatDuration(seconds: number): string {
            const minutes = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        },

        formatSize(bytes: number): string {
            if (bytes < 1024) return `${bytes} B`;
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        },

        formatTime(timestamp: number): string {
            const date = new Date(timestamp);
            return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
        }
    }
});

export default recorder;
