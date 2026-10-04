import { defineComponent } from 'vue';
import { AI } from 'langningchen';
import PageShell from '../../components/PageShell.vue';

export type AIOptions = {};

type Msg = { id: string; role: string; text: string };

const ai = defineComponent({
    components: { PageShell },
    data() {
        return {
            $page: {} as FalconPage<AIOptions>,
            initialized: false,
            streaming: false,
            messages: [] as Msg[],
            currentInput: '',
            apiKeySet: false,
        };
    },
    mounted() {
        this.$page.$npage.setSupportBack(true);
        const backFn = () => $falcon.navBack();
        this.$page.$npage.on('backpressed', backFn);
        try {
            AI.initialize();
            this.initialized = true;
        } catch (e) {
            console.error('AI init failed', e);
        }
        this.messages.push({
            id: 'welcome',
            role: 'assistant',
            text: '你好！我是 AI 助手，有什么可以帮你的？\n（请先在设置里配置 API Key）'
        });
    },
    methods: {
        async send() {
            if (!this.currentInput.trim() || this.streaming) return;
            const userMsg = { id: 'u' + Date.now(), role: 'user', text: this.currentInput };
            this.messages.push(userMsg);
            const input = this.currentInput;
            this.currentInput = '';

            this.streaming = true;
            const aiMsg: Msg = { id: 'a' + Date.now(), role: 'assistant', text: '' };
            this.messages.push(aiMsg);

            try {
                AI.on('ai_stream', (chunk: string) => {
                    if (chunk && chunk.length > 0) {
                        aiMsg.text += chunk;
                        this.$forceUpdate();
                    }
                });
                await AI.addUserMessage(input);
                await AI.generateResponse();
            } catch (e: any) {
                aiMsg.text += '\n[错误] ' + (e && e.message ? e.message : String(e));
            } finally {
                this.streaming = false;
                this.$forceUpdate();
            }
        },
        // 快速输入 — 用 prompt 兜底（等系统键盘 API 挖出来再换）
        quickInput(text: string) {
            this.currentInput = text;
            this.send();
        },
        clearAll() {
            this.messages = [];
            this.messages.push({
                id: 'welcome',
                role: 'assistant',
                text: '已清空对话'
            });
        },
        trySettings() {
            $falcon.navTo('settings', {});
        }
    }
});

export default ai;
