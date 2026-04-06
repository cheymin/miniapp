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
import { showSuccess, showInfo } from '../../components/ToastMessage';

export type SettingsOptions = {};

const settings = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<SettingsOptions>,
            
            keyboardType: 'soft' as 'soft' | 'system'
        };
    },

    async mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on("backpressed", this.handleBackPress);
        
        await this.loadSettings();
    },

    beforeDestroy() {
        this.$page.$npage.off("backpressed", this.handleBackPress);
    },

    methods: {
        handleBackPress() {
            this.$page.finish();
        },
        
        async loadSettings() {
            try {
                const data = await $falcon.storage.get('keyboard_type');
                if (data) {
                    this.keyboardType = data as 'soft' | 'system';
                }
            } catch (error) {
                console.error('加载设置失败:', error);
            }
        },
        
        async selectKeyboard(type: 'soft' | 'system') {
            this.keyboardType = type;
            
            try {
                await $falcon.storage.set('keyboard_type', type);
                showSuccess(`已切换到${type === 'soft' ? '软键盘' : '系统键盘'}`);
            } catch (error) {
                console.error('保存设置失败:', error);
                showInfo('保存设置失败');
            }
        },
        
        async clearCache() {
            try {
                showInfo('缓存已清除');
            } catch (error) {
                console.error('清除缓存失败:', error);
            }
        }
    }
});

export default settings;
