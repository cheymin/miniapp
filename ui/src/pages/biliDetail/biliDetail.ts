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
import { Bilibili } from 'langningchen';
import type { BiliVideoInfo } from 'langningchen';
import { showError, showSuccess } from '../../components/ToastMessage';
import { hideLoading, showLoading } from '../../components/Loading';
import { formatPlayCount, formatDate } from '../../utils/biliUtils';

export type biliDetailOptions = {
    bvid: string;
};

const biliDetail = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<biliDetailOptions>,
            bvid: '',
            videoInfo: null as BiliVideoInfo | null,
            isDownloading: false,
            downloadProgress: 0,
            downloadStatus: '',
        };
    },

    mounted() {
        this.$page.$npage.setSupportBack(true);
        this.bvid = this.$page.loadOptions.bvid;
        if (!this.bvid) {
            showError('缺少 bvid 参数');
            return;
        }
        this.loadVideoInfo();
    },

    methods: {
        loadVideoInfo() {
            showLoading();
            Bilibili.getVideoInfo(this.bvid).then((info) => {
                this.videoInfo = info;
            }).catch((e) => {
                showError(e as string || '获取视频信息失败');
            }).finally(() => {
                hideLoading();
            });
        },

        startDownload() {
            if (!this.videoInfo || this.isDownloading) return;
            this.isDownloading = true;
            this.downloadProgress = 0;
            this.downloadStatus = '准备中...';

            Bilibili.on('bili_download_progress', (data) => {
                this.downloadProgress = data.progress;
                this.downloadStatus = data.status;
            });

            Bilibili.downloadAudio(this.bvid, this.videoInfo.title).then((path) => {
                showSuccess('已下载到: ' + path);
            }).catch((e) => {
                showError(e as string || '下载失败');
            }).finally(() => {
                this.isDownloading = false;
                this.downloadProgress = 0;
                this.downloadStatus = '';
            });
        },

        formatPlayCount,
        formatDate,
    },
});

export default biliDetail;
