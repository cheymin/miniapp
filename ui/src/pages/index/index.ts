import { defineComponent } from 'vue';

export type IndexOptions = {};

const HOME_ITEMS = [
    { key: 'ai',          icon: '🤖', label: 'AI 助手',   desc: '对话' },
    { key: 'fileManager', icon: '📁', label: '文件管理',  desc: '浏览' },
    { key: 'videoPlayer', icon: '🎬', label: '视频播放',  desc: '本地视频' },
    { key: 'shell',       icon: '⌨️', label: 'Shell',    desc: '终端' },
    { key: 'imageViewer', icon: '🖼️', label: '图片查看',  desc: '浏览图片' },
    { key: 'update',      icon: '⬇️', label: '系统更新',  desc: 'OTA' },
];

const RAIL = [
    { page: 'index',       icon: '🏠', label: '首页' },
    { page: 'ai',          icon: '🤖', label: 'AI' },
    { page: 'fileManager', icon: '📁', label: '文件' },
    { page: 'videoPlayer', icon: '🎬', label: '视频' },
    { page: 'shell',       icon: '⌨️', label: '终端' },
    { page: 'imageViewer', icon: '🖼️', label: '图片' },
    { page: 'update',      icon: '⬇️', label: '更新' },
];

const index = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<IndexOptions>,
            version: '1.2.58',
            homeItems: HOME_ITEMS,
            rail: RAIL,
        };
    },
    computed: {
        rows(): typeof HOME_ITEMS[number][][] {
            const out: any[][] = [];
            for (let i = 0; i < HOME_ITEMS.length; i += 2) {
                out.push(HOME_ITEMS.slice(i, i + 2));
            }
            return out;
        }
    },
    methods: {
        open(pageName: string) { $falcon.navTo(pageName, {}); },
        go(item: typeof HOME_ITEMS[number]) { $falcon.navTo(item.key, {}); },
        goSettings() { $falcon.navTo('settings', {}); }
    }
});

export default index;
