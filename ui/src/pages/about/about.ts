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

export type aboutOptions = {};

const about = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<aboutOptions>,
            
            // 项目信息
            projectName: 'min的工具箱',
            description: '这是我min和朋友们一起开发的软件 欢迎使用！',
            
            // 鸣谢信息
            credits: [
                { name: '@wyxdlz54188', role: '核心开发' },
                { name: '@langningchen', role: '核心开发' },
                { name: '@min', role: '核心开发' }
            ],
            
            // GitHub 信息
            githubRepo: 'penosext/miniapp',
            githubUrl: 'https://github.com/penosext/miniapp'
        };
    },
    
    mounted() {
        // 设置返回键支持
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on("backpressed", this.handleBackPress);
    },
    
    beforeDestroy() {
        this.$page.$npage.off("backpressed", this.handleBackPress);
    },
    
    methods: {
        // 处理返回键
        handleBackPress() {
            this.$page.finish();
        },
        
        // 打开GitHub页面
        openGitHub() {
            $falcon.trigger('open_url', this.githubUrl);
        },
        
        // 导航到更新页面
        goToUpdate() {
            $falcon.navTo("update", {});
        },
        
        // 获取鸣谢文本
        getCreditsText(): string {
            return this.credits.map(c => `${c.name} (${c.role})`).join('\n');
        }
    }
});

export default about;
