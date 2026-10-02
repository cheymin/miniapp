// 全新主页 — 卡片网格 + 底部 TabBar

import { defineComponent } from 'vue';

export type IndexOptions = {};

// 四个分类, 图标用中文单字 (Falcon 字体一定支持, Unicode 符号靠不住)
const CATEGORIES: {
    label: string;
    icon: string;
    items: { icon: string; label: string; page: string }[];
}[] = [
    {
        label: '核心', icon: '核',
        items: [
            { icon: 'AI',   label: 'AI助手',    page: 'ai' },
            { icon: '文',   label: '文本编辑',  page: 'fileEditor' },
            { icon: '档',   label: '文件管理',  page: 'fileManager' },
            { icon: '网',   label: '浏览器',    page: 'browser' },
            { icon: '终',   label: 'Penshell',  page: 'penshell' },
            { icon: '端',   label: '终端',      page: 'shell' },
        ],
    },
    {
        label: '媒体', icon: '媒',
        items: [
            { icon: '图',   label: '图库',      page: 'gallery' },
            { icon: '看',   label: '看图',      page: 'imageViewer' },
            { icon: '音',   label: '音乐',      page: 'musicPlayer' },
            { icon: '视',   label: '视频',      page: 'videoPlayer' },
        ],
    },
    {
        label: '工具', icon: '工',
        items: [
            { icon: 'WiFi', label: 'WiFi认证',  page: 'wifiLogin' },
            { icon: '算',   label: '计算器',    page: 'calculator' },
            { icon: '换',   label: '单位换算',  page: 'unitConverter' },
            { icon: '码',   label: '扫码',      page: 'softKeyboard' },
        ],
    },
    {
        label: '系统', icon: '系',
        items: [
            { icon: '设',   label: '设备信息',  page: 'deviceinfo' },
            { icon: '⟲',   label: '系统更新',  page: 'update' },
            { icon: '⋯',   label: '杂项',      page: 'misc' },
            { icon: '关',   label: '关于',      page: 'about' },
        ],
    },
];

const index = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<IndexOptions>,
            version: 'v1.2.55',
            tabs: CATEGORIES.map(c => ({ icon: c.icon, label: c.label })),
            activeTab: 0,
        };
    },

    computed: {
        // 把当前分类 items 每行 3 个手动分 row (Falcon 不支持 flex-wrap)
        rows(): typeof CATEGORIES[number]['items'][][] {
            var items = CATEGORIES[this.activeTab] ? CATEGORIES[this.activeTab].items : [];
            var out: typeof CATEGORIES[number]['items'][][] = [];
            for (var i = 0; i < items.length; i += 3) {
                out.push(items.slice(i, i + 3));
            }
            return out;
        },
    },

    methods: {
        openPage(pageName: string) {
            $falcon.navTo(pageName, {});
        },
    },
});

export default index;
