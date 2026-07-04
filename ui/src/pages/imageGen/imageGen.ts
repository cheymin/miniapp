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
import { AI, Shell } from 'langningchen';
import { showError, showSuccess } from '../../components/ToastMessage';
import { hideLoading, showLoading } from '../../components/Loading';
import { openSoftKeyboard } from '../../utils/softKeyboardUtils';

export type imageGenOptions = {};

const SIZE_OPTIONS = ['256x256', '512x512', '1024x1024'];
const DEFAULT_IMAGE_MODEL = 'dall-e-3';
const SAVE_DIR = '/userdisk/gallery';

const imageGen = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<imageGenOptions>,
            prompt: '',
            imageModel: DEFAULT_IMAGE_MODEL,
            size: '512x512',
            sizeOptions: SIZE_OPTIONS,
            sizeIndex: 1,
            generatedImage: '',
            isGenerating: false,
            shellInitialized: false,
            lastPrompt: '',
        };
    },

    mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on('backpressed', this.handleBackPress);
        try {
            AI.initialize();
            Shell.initialize().then(() => {
                this.shellInitialized = true;
            }).catch((e) => {
                console.error('Shell初始化失败:', e);
            });
        } catch (e) {
            showError(e as string || 'AI 初始化失败');
        }
    },

    beforeDestroy() {
        this.$page.$npage.off('backpressed', this.handleBackPress);
    },

    computed: {
        canGenerate(): boolean {
            return !this.isGenerating && this.prompt.trim().length > 0;
        }
    },

    methods: {
        handleBackPress() {
            this.$page.finish();
        },

        editPrompt() {
            openSoftKeyboard(
                () => this.prompt,
                (value) => { this.prompt = value; this.$forceUpdate(); }
            );
        },

        editImageModel() {
            openSoftKeyboard(
                () => this.imageModel,
                (value) => { this.imageModel = value; this.$forceUpdate(); }
            );
        },

        cycleSize() {
            this.sizeIndex = (this.sizeIndex + 1) % this.sizeOptions.length;
            this.size = this.sizeOptions[this.sizeIndex];
            this.$forceUpdate();
        },

        generate() {
            if (!this.canGenerate) return;
            const trimmedPrompt = this.prompt.trim();
            if (!trimmedPrompt) {
                showError('提示词不能为空');
                return;
            }

            this.isGenerating = true;
            this.generatedImage = '';
            showLoading();

            AI.generateImage(trimmedPrompt, this.size, this.imageModel).then((result: string) => {
                if (result.startsWith('http://') || result.startsWith('https://')) {
                    // 服务端返回了 URL（不支持 b64_json 的情况）
                    // 设备不支持 HTTPS，做降级处理
                    const url = result.replace('https://', 'http://');
                    this.generatedImage = url;
                } else if (result.startsWith('data:')) {
                    this.generatedImage = result;
                } else {
                    // 假定是裸 base64，包装为 data URI
                    this.generatedImage = 'data:image/png;base64,' + result;
                }
                this.lastPrompt = trimmedPrompt;
                showSuccess('图片生成成功');
            }).catch((e) => {
                showError(`生成失败: ${e}`);
            }).finally(() => {
                this.isGenerating = false;
                hideLoading();
            });
        },

        async saveToGallery() {
            if (!this.generatedImage) {
                showError('没有可保存的图片');
                return;
            }
            if (!this.shellInitialized) {
                showError('Shell 未初始化');
                return;
            }

            // 仅支持保存 data URI 形式的图片（包含 base64 数据）
            if (!this.generatedImage.startsWith('data:')) {
                showError('当前图片为 URL 形式，无法直接保存（设备不支持 HTTPS 下载）');
                return;
            }

            try {
                const base64Data = this.generatedImage.split(',')[1];
                if (!base64Data) {
                    showError('图片数据格式异常');
                    return;
                }

                // 确保保存目录存在
                await Shell.exec(`mkdir -p ${SAVE_DIR}`);

                // 生成文件名：aigen-时间戳.png
                const timestamp = Math.floor(Date.now() / 1000);
                const fileName = `aigen-${timestamp}.png`;
                const fullPath = `${SAVE_DIR}/${fileName}`;

                // 写入临时 base64 文件后用 base64 -d 解码为 PNG（避免 ARG_MAX 限制）
                const tmpB64 = `/tmp/aigen_${timestamp}.b64`;
                await Shell.exec(`echo -n '${base64Data}' > ${tmpB64}`);
                await Shell.exec(`base64 -d ${tmpB64} > ${fullPath}`);
                await Shell.exec(`rm -f ${tmpB64}`);

                const verifySize = (await Shell.exec(`stat -c %s ${fullPath} 2>/dev/null || echo 0`)).trim();
                if (verifySize === '0' || verifySize === '') {
                    showError('保存失败：文件写入异常');
                    return;
                }

                showSuccess(`已保存到 ${fullPath}`);
            } catch (e) {
                showError(`保存失败: ${e}`);
            }
        },

        clearImage() {
            this.generatedImage = '';
            this.lastPrompt = '';
            this.$forceUpdate();
        },

        openSettings() {
            $falcon.navTo('aiSettings', {});
        }
    }
});

export default imageGen;
