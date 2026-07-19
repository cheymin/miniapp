import { $page } from '@tiki.vn/redux-tiki';
import { showToast } from '../../utils/toast';
import { Chat } from 'langningchen';

export default {
    data() {
        return {
            apiKey: '',
            baseUrl: '',
            modelName: '',
            maxTokens: 1000,
            temperature: 0.7,
            topP: 1.0,
            systemPrompt: ''
        };
    },
    onLoad() {
        this.loadSettings();
    },
    methods: {
        handleBackPress() {
            $page.back();
        },
        loadSettings() {
            try {
                const settings = Chat.getSettings();
                this.apiKey = settings.apiKey || '';
                this.baseUrl = settings.baseUrl || '';
                this.modelName = settings.modelName || '';
                this.maxTokens = settings.maxTokens || 1000;
                this.temperature = settings.temperature || 0.7;
                this.topP = settings.topP || 1.0;
                this.systemPrompt = settings.systemPrompt || '';
            } catch (e) {
                console.error('loadSettings error:', e);
            }
        },
        editApiKey() {
            const val = prompt('请输入 API 密钥', this.apiKey);
            if (val !== null) this.apiKey = val;
        },
        editBaseUrl() {
            const val = prompt('请输入基础 URL', this.baseUrl || 'https://api.openai.com/v1/');
            if (val !== null) this.baseUrl = val;
        },
        editModelName() {
            const val = prompt('请输入模型名称', this.modelName || 'deepseek-chat');
            if (val !== null) this.modelName = val;
        },
        editTemperature() {
            const val = prompt('请输入温度 (0.0 - 2.0)', String(this.temperature));
            if (val !== null) {
                const num = parseFloat(val);
                if (!isNaN(num) && num >= 0 && num <= 2) this.temperature = num;
            }
        },
        editTopP() {
            const val = prompt('请输入 Top-P (0.0 - 1.0)', String(this.topP));
            if (val !== null) {
                const num = parseFloat(val);
                if (!isNaN(num) && num >= 0 && num <= 1) this.topP = num;
            }
        },
        editMaxTokens() {
            const val = prompt('请输入最大长度', String(this.maxTokens));
            if (val !== null) {
                const num = parseInt(val, 10);
                if (!isNaN(num) && num > 0) this.maxTokens = num;
            }
        },
        editSystemPrompt() {
            const val = prompt('请输入系统提示词', this.systemPrompt);
            if (val !== null) this.systemPrompt = val;
        },
        saveSettings() {
            try {
                Chat.setSettings(
                    this.apiKey,
                    this.baseUrl,
                    this.modelName,
                    this.maxTokens,
                    this.temperature,
                    this.topP,
                    this.systemPrompt
                );
                showToast('设置已保存');
                setTimeout(() => $page.back(), 500);
            } catch (e) {
                showToast('保存失败: ' + e.message);
            }
        }
    }
};
