import { defineComponent } from 'vue';
import { AI } from 'langningchen';

export type AiOptions = {};

type Msg = { id: number; role: 'user' | 'assistant'; text: string };

const RAIL = [
    { page: 'index', icon: '🏠', label: '首页' },
    { page: 'ai', icon: '🤖', label: 'AI' },
    { page: 'fileManager', icon: '📁', label: '文件' },
    { page: 'videoPlayer', icon: '🎬', label: '视频' },
    { page: 'shell', icon: '⌨️', label: '终端' },
    { page: 'imageViewer', icon: '🖼️', label: '图片' },
    { page: 'update', icon: '⬇️', label: '更新' },
];

let mid = 0;
const uid = () => ++mid;

const ai = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<AiOptions>,
            activeKey: 'ai',
            rail: RAIL,
            initialized: false,
            streaming: false,
            messages: [] as Msg[],
            lastMsgId: 0,
        };
    },
    async mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on('backpressed', () => $falcon.navBack());
        try {
            const cfg = await AI.getConfig();
            if (cfg && cfg.apiKey) {
                await AI.initialize(cfg);
                this.initialized = true;
            }
        } catch (e) {
            // AI 可能没初始化
        }
    },
    methods: {
        open(pageName: string) { $falcon.navTo(pageName, {}); },
        clearAll() { this.messages = []; },
        trySettings() { $falcon.navTo('settings', {}); },
        async quickInput(text: string) {
            if (!text || !this.initialized) return;
            const userMsg: Msg = { id: uid(), role: 'user', text };
            this.messages.push(userMsg);
            const assistantMsg: Msg = { id: uid(), role: 'assistant', text: '' };
            this.messages.push(assistantMsg);
            this.lastMsgId = assistantMsg.id;
            this.streaming = true;
            try {
                await AI.chat(text, (delta: string) => {
                    const m = this.messages.find(x => x.id === this.lastMsgId);
                    if (m) m.text += delta;
                });
            } catch (e: any) {
                const m = this.messages.find(x => x.id === this.lastMsgId);
                if (m) m.text = '(生成失败: ' + (e.message || e) + ')';
            }
            this.streaming = false;
        }
    }
});

export default ai;
