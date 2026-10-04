import { defineComponent } from 'vue';
import LeftRail from '../../components/LeftRail.vue';

export type IndexOptions = {};

// 7 个核心功能
const HOME_ITEMS = [
    { key: 'ai',          icon: '🤖', label: 'AI 助手',   desc: '对话' },
    { key: 'fileManager', icon: '📁', label: '文件管理',  desc: '浏览' },
    { key: 'videoPlayer', icon: '🎬', label: '视频播放',  desc: '本地视频' },
    { key: 'shell',       icon: '⌨️', label: 'Shell',    desc: '终端' },
    { key: 'imageViewer', icon: '🖼️', label: '图片查看',  desc: '浏览图片' },
    { key: 'update',      icon: '⬇️', label: '系统更新',  desc: 'OTA' },
];

const RAIL_ITEMS = [
    { key: 'home', key2: 'index',  page: 'index',       icon: '🏠', label: '首页' },
    { key: 'ai',   key2: 'ai',     page: 'ai',          icon: '🤖', label: 'AI' },
    { key: 'file', key2: 'file',   page: 'fileManager', icon: '📁', label: '文件' },
    { key: 'video',key2: 'video',  page: 'videoPlayer', icon: '🎬', label: '视频' },
    { key: 'term', key2: 'term',   page: 'shell',       icon: '⌨️', label: '终端' },
    { key: 'img',  key2: 'img',    page: 'imageViewer', icon: '🖼️', label: '图片' },
    { key: 'upd',  key2: 'upd',    page: 'update',      icon: '⬇️', label: '更新' },
];

const index = defineComponent({
    components: { LeftRail },
    data() {
        return {
            $page: {} as FalconPage<IndexOptions>,
            version: '1.2.58',
            railItems: RAIL_ITEMS,
            homeItems: HOME_ITEMS,
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
        open(item: typeof HOME_ITEMS[number]) {
            $falcon.navTo(item.key, {});
        }
    }
});

export default index;
