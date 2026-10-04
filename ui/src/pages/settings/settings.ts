import { defineComponent } from 'vue';
// === 原生 JSAPI 动态加载 ===
const __ln: any = (globalThis as any).langningchen || {};
const Shell: any = __ln.Shell || null;

export type SettingsOptions = {};

const RAIL = [
    { page: 'index', icon: '🏠', label: '首页' },
    { page: 'ai', icon: '🤖', label: 'AI' },
    { page: 'fileManager', icon: '📁', label: '文件' },
    { page: 'videoPlayer', icon: '🎬', label: '视频' },
    { page: 'shell', icon: '⌨️', label: '终端' },
    { page: 'imageViewer', icon: '🖼️', label: '图片' },
    { page: 'update', icon: '⬇️', label: '更新' },
];

const settings = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<SettingsOptions>,
            rail: RAIL,
            version: '1.2.58',
            useSystemKeyboard: true,
            fontScale: 'normal' as 'small' | 'normal' | 'large',
        };
    },
    mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on('backpressed', () => $falcon.navBack());
        try {
            const s = ($falcon as any).storage;
            if (s) {
                const v = s.getItem('useSystemKeyboard');
                if (v !== null && v !== undefined) this.useSystemKeyboard = v === 'true';
                const f = s.getItem('fontScale');
                if (f) this.fontScale = f;
            }
        } catch (e) {}
    },
    methods: {
        open(pageName: string) { $falcon.navTo(pageName, {}); },
        toggleKeyboard() {
            this.useSystemKeyboard = !this.useSystemKeyboard;
            try { ($falcon as any).storage.setItem('useSystemKeyboard', String(this.useSystemKeyboard)); } catch (e) {}
        },
        setFont(s: 'small' | 'normal' | 'large') {
            this.fontScale = s;
            try { ($falcon as any).storage.setItem('fontScale', s); } catch (e) {}
        },
        about() { $falcon.navTo('index', {}); },
        async reboot() { await Shell.exec('aiot restart'); }
    }
});

export default settings;
