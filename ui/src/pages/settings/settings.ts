import { defineComponent } from 'vue';
import PageShell from '../../components/PageShell.vue';

export type SettingsOptions = {};

const settings = defineComponent({
    components: { PageShell },
    data() {
        return {
            $page: {} as FalconPage<SettingsOptions>,
            version: '1.2.58',
            useSystemKeyboard: false,   // true=尝试系统键盘, false=自研软键盘
            theme: 'dark',               // 主题（目前只有 dark）
            showRailIcons: true,         // 左栏图标
            fontScale: 'normal',         // 字体档位
        };
    },
    async mounted() {
        this.$page.$npage.setSupportBack(true);
        const backFn = () => $falcon.navBack();
        this.$page.$npage.on('backpressed', backFn);

        // 从本地存储读取设置
        try {
            const saved = await $falcon.storage.get('miniapp_settings');
            if (saved) {
                const s = JSON.parse(saved);
                this.useSystemKeyboard = !!s.useSystemKeyboard;
                this.theme = s.theme || 'dark';
                this.fontScale = s.fontScale || 'normal';
            }
        } catch (e) { /* ignore */ }
    },
    beforeDestroy() {
        try {
            this.$page.$npage.off('backpressed');
        } catch (e) { /* ignore */ }
    },
    methods: {
        async saveSettings() {
            try {
                await $falcon.storage.set('miniapp_settings', JSON.stringify({
                    useSystemKeyboard: this.useSystemKeyboard,
                    theme: this.theme,
                    fontScale: this.fontScale,
                }));
            } catch (e) { /* ignore */ }
        },
        toggleKeyboard() {
            this.useSystemKeyboard = !this.useSystemKeyboard;
            this.saveSettings();
        },
        toggleRail() {
            this.showRailIcons = !this.showRailIcons;
        },
        setFont(s: string) {
            this.fontScale = s;
            this.saveSettings();
        },
        async checkStorage() {
            try {
                const info = await $falcon.jsapi.storage.getStorageInfo({});
                alert(`存储: ${info.keys.length} 个键, ${info.currentSize}KB`);
            } catch (e) {
                alert('存储查询失败');
            }
        },
        about() {
            alert('min的工具箱 v' + this.version + '\n为 A6P 词典笔打造');
        },
        reboot() {
            if (confirm('确认重启应用？')) {
                $falcon.closeApp();
            }
        }
    }
});

export default settings;
