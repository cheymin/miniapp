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
import { showSuccess, showError, showInfo } from '../../components/ToastMessage';
import { showLoading, hideLoading } from '../../components/Loading';
import { openSoftKeyboard } from '../../utils/softKeyboardUtils';
import { Shell } from 'langningchen';

export type PlaylistOptions = {};

interface Track {
    name: string;
    path: string;
}

const playlist = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<PlaylistOptions>,
            
            playlist: [] as Track[],
            currentTrackIndex: -1,
            isPlaying: false
        };
    },

    async mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on("backpressed", this.handleBackPress);
        
        await this.loadPlaylist();
    },

    beforeDestroy() {
        this.$page.$npage.off("backpressed", this.handleBackPress);
    },

    methods: {
        handleBackPress() {
            this.$page.finish();
        },
        
        async loadPlaylist() {
            try {
                const data = await $falcon.storage.get('music_playlist');
                if (data) {
                    this.playlist = JSON.parse(data);
                }
            } catch (error) {
                console.error('加载歌单失败:', error);
            }
        },
        
        async savePlaylist() {
            try {
                await $falcon.storage.set('music_playlist', JSON.stringify(this.playlist));
            } catch (error) {
                console.error('保存歌单失败:', error);
            }
        },
        
        addMusic() {
            openSoftKeyboard(
                () => '',
                async (value: string) => {
                    if (!value.trim()) {
                        showError('请输入音乐文件路径');
                        return;
                    }
                    
                    try {
                        showLoading('检查文件...');
                        const result = await Shell.exec(`test -f "${value}" && echo "exists"`);
                        hideLoading();
                        
                        if (result.trim() !== 'exists') {
                            showError('文件不存在');
                            return;
                        }
                        
                        const name = value.split('/').pop() || value;
                        this.playlist.push({ name, path: value });
                        await this.savePlaylist();
                        showSuccess('已添加到歌单');
                    } catch (error) {
                        hideLoading();
                        console.error('添加音乐失败:', error);
                        showError('添加失败');
                    }
                }
            );
        },
        
        removeTrack(index: number) {
            this.playlist.splice(index, 1);
            if (this.currentTrackIndex === index) {
                this.currentTrackIndex = -1;
                this.isPlaying = false;
            } else if (this.currentTrackIndex > index) {
                this.currentTrackIndex--;
            }
            this.savePlaylist();
            showInfo('已从歌单移除');
        },
        
        async playTrack(index: number) {
            if (index < 0 || index >= this.playlist.length) {
                showError('无效的曲目索引');
                return;
            }
            
            const track = this.playlist[index];
            this.currentTrackIndex = index;
            
            try {
                const playInfo = {
                    provider_info: {
                        type: 'mediaplayer_list',
                        name: 'local_music_list',
                        path: 'falcon://local/musicPlayerListProvider'
                    },
                    album_info: {
                        album_key: 'local_music',
                        album_title: '本地音乐',
                        album_media_cnt: this.playlist.length,
                        appId: 'local',
                        appName: '本地音乐播放器'
                    },
                    media_info: {
                        media_source: 'local_file',
                        media_id_key: track.path,
                        media_title: track.name
                    }
                };
                
                if (($falcon as any).playAlbum) {
                    await ($falcon as any).playAlbum(playInfo, {});
                    showSuccess('开始播放: ' + track.name);
                    this.isPlaying = true;
                } else {
                    showError('系统播放器不可用');
                }
            } catch (error) {
                console.error('播放失败:', error);
                showError('播放失败');
            }
        },
        
        async playMusic() {
            if (this.currentTrackIndex === -1 && this.playlist.length > 0) {
                await this.playTrack(0);
            } else if (($falcon as any).HandlePlayer) {
                ($falcon as any).HandlePlayer('play');
                this.isPlaying = true;
                showInfo('继续播放');
            }
        },
        
        pauseMusic() {
            if (($falcon as any).HandlePlayer) {
                ($falcon as any).HandlePlayer('pause');
                this.isPlaying = false;
                showInfo('已暂停');
            }
        },
        
        stopMusic() {
            if (($falcon as any).HandlePlayer) {
                ($falcon as any).HandlePlayer('pause');
                this.isPlaying = false;
                this.currentTrackIndex = -1;
                showInfo('已停止');
            }
        },
        
        async prevTrack() {
            if (this.playlist.length === 0) {
                showError('歌单为空');
                return;
            }
            
            const newIndex = this.currentTrackIndex <= 0 
                ? this.playlist.length - 1 
                : this.currentTrackIndex - 1;
            await this.playTrack(newIndex);
        },
        
        async nextTrack() {
            if (this.playlist.length === 0) {
                showError('歌单为空');
                return;
            }
            
            const newIndex = (this.currentTrackIndex + 1) % this.playlist.length;
            await this.playTrack(newIndex);
        },
        
        showPlayer() {
            if (($falcon as any).HandlePlayer) {
                ($falcon as any).HandlePlayer('player');
            } else {
                showError('系统播放器不可用');
            }
        }
    }
});

export default playlist;
