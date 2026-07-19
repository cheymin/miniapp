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
import { Chat } from 'langningchen';
import { BalanceInfo, ConfigInfo } from '../../@types/langningchen';
import { showError, showSuccess, showInfo } from '../../components/ToastMessage';
import { hideLoading, showLoading } from '../../components/Loading';
import { openSoftKeyboard } from '../../utils/softKeyboardUtils';

export type chatSettingsOptions = {};

const chatSettings = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<chatSettingsOptions>,
            apiKey: '',
            baseUrl: '',
            modelName: '',
            maxTokens: 0,
            temperature: 0,
            topP: 0,
            systemPrompt: '',
            accessToken: '',
            userId: '',
            balanceInfo: null as BalanceInfo | null,
            balanceLoading: false,
            balanceError: '',
            configs: [] as ConfigInfo[],
            activeConfigId: '',
            showConfigMenu: false,
        };
    },

    mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on('backpressed', this.handleBackPress);
        try {
            Chat.initialize("/userdisk/database/langningchen-chat.db");
            this.loadConfigs();
            this.loadSettings();
            this.refreshBalance();
        } catch (e) {
            showError(e as string || 'Chat 初始化失败');
        }
    },

    beforeDestroy() {
        this.$page.$npage.off('backpressed', this.handleBackPress);
    },

    computed: {
        activeConfigName(): string {
            const c = this.configs.find((x: ConfigInfo) => x.id === this.activeConfigId);
            return c ? c.name : '无配置';
        }
    },

    methods: {
        handleBackPress() {
            if (this.showConfigMenu) {
                this.showConfigMenu = false;
            } else {
                this.$page.finish();
            }
        },

        loadConfigs() {
            try {
                Chat.getConfigList().then((configs) => {
                    this.configs = configs;
                    this.activeConfigId = Chat.getActiveConfigId();
                }).catch((e) => {
                    showError(e as string || '加载配置列表失败');
                });
            } catch (e) {
                showError(e as string || '加载配置列表失败');
            }
        },

        loadSettings() {
            try {
                const settings = Chat.getSettings();
                this.apiKey = settings.apiKey;
                this.baseUrl = settings.baseUrl;
                this.modelName = settings.modelName;
                this.temperature = settings.temperature;
                this.topP = settings.topP;
                this.maxTokens = settings.maxTokens;
                this.systemPrompt = settings.systemPrompt;
                this.accessToken = settings.accessToken;
                this.userId = settings.userId;
            } catch (e) {
                showError(e as string || '加载设置失败');
            }
        },

        refreshBalance() {
            if (this.balanceLoading) return;
            if (!this.accessToken || !this.userId) {
                this.balanceError = '请先填写访问令牌和用户ID';
                this.balanceInfo = null;
                return;
            }
            this.balanceLoading = true;
            this.balanceError = '';
            this.balanceInfo = null;
            Chat.getUserBalance().then((info: BalanceInfo) => {
                this.balanceInfo = info;
            }).catch((e) => {
                this.balanceError = `查询失败: ${e}`;
            }).finally(() => {
                this.balanceLoading = false;
            });
        },

        formatBalance(info: BalanceInfo): string {
            if (info.unlimited) return '无限额度';
            return `$${info.balance.toFixed(4)}`;
        },

        saveSettings() {
            try {
                Chat.setSettings(this.apiKey, this.baseUrl,
                    this.modelName, this.maxTokens,
                    this.temperature, this.topP, this.systemPrompt,
                    this.accessToken, this.userId);
                showSuccess('设置已保存');
                this.refreshBalance();
            } catch (e) {
                showError(e as string || '保存设置失败');
            }
        },

        toggleConfigMenu() {
            this.showConfigMenu = !this.showConfigMenu;
        },

        switchConfig(configId: string) {
            if (configId === this.activeConfigId) {
                this.showConfigMenu = false;
                return;
            }
            showLoading();
            Chat.setActiveConfigId(configId).then(() => {
                this.activeConfigId = configId;
                this.loadSettings();
                this.refreshBalance();
                showSuccess('已切换配置');
            }).catch((e) => {
                showError(`切换配置失败: ${e}`);
            }).finally(() => {
                hideLoading();
                this.showConfigMenu = false;
            });
        },

        createConfig() {
            openSoftKeyboard(
                () => '',
                (name) => {
                    if (!name.trim()) {
                        showError('配置名称不能为空');
                        return;
                    }
                    showLoading();
                    Chat.createConfig(name.trim()).then((newId: string) => {
                        return Chat.setActiveConfigId(newId).then(() => newId);
                    }).then((newId) => {
                        this.activeConfigId = newId;
                        return Chat.getConfigList();
                    }).then((configs) => {
                        this.configs = configs;
                        this.loadSettings();
                        this.refreshBalance();
                        showSuccess('已创建并切换到新配置');
                    }).catch((e) => {
                        showError(`创建配置失败: ${e}`);
                    }).finally(() => {
                        hideLoading();
                        this.showConfigMenu = false;
                    });
                }
            );
        },

        renameConfig(configId: string, currentName: string) {
            openSoftKeyboard(
                () => currentName,
                (name) => {
                    if (!name.trim()) {
                        showError('配置名称不能为空');
                        return;
                    }
                    Chat.updateConfigName(configId, name.trim()).then(() => {
                        return Chat.getConfigList();
                    }).then((configs) => {
                        this.configs = configs;
                        showSuccess('已重命名');
                    }).catch((e) => {
                        showError(`重命名失败: ${e}`);
                    });
                }
            );
        },

        removeConfig(configId: string) {
            if (this.configs.length <= 1) {
                showError('至少保留一个配置');
                return;
            }
            showLoading();
            Chat.deleteConfig(configId).then(() => {
                return Chat.getConfigList();
            }).then((configs) => {
                this.configs = configs;
                this.activeConfigId = Chat.getActiveConfigId();
                this.loadSettings();
                this.refreshBalance();
                showInfo('已删除配置');
            }).catch((e) => {
                showError(`删除配置失败: ${e}`);
            }).finally(() => {
                hideLoading();
            });
        },

        editApiKey() {
            openSoftKeyboard(
                () => this.apiKey,
                (value) => { this.apiKey = value; this.$forceUpdate(); }
            );
        },

        editBaseUrl() {
            openSoftKeyboard(
                () => this.baseUrl,
                (value) => {
                    this.baseUrl = value.endsWith('/') ? value : value + "/";
                    this.$forceUpdate();
                },
                (value) => {
                    if (!value.startsWith("http")) { return '基础 URL 需要以 http 开头'; }
                }
            );
        },

        editModelName() {
            openSoftKeyboard(
                () => this.modelName,
                (value) => { this.modelName = value; this.$forceUpdate(); }
            );
        },

        editMaxTokens() {
            openSoftKeyboard(
                () => this.maxTokens.toString(),
                (value) => { this.maxTokens = parseInt(value); this.$forceUpdate(); },
                (value) => {
                    const parsed = parseInt(value);
                    if (isNaN(parsed)) { return '请输入有效的数字'; }
                    if (parsed <= 0) { return 'Token 数量必须大于 0'; }
                }
            );
        },

        editTemperature() {
            openSoftKeyboard(
                () => this.temperature.toFixed(1),
                (value) => { this.temperature = parseFloat(value); this.$forceUpdate(); },
                (value) => {
                    const parsed = parseFloat(value);
                    if (isNaN(parsed)) { return '请输入有效的数字'; }
                    if (parsed < 0 || parsed > 2) { return '温度值必须在 0 到 2 之间'; }
                }
            );
        },

        editTopP() {
            openSoftKeyboard(
                () => this.topP.toFixed(1),
                (value) => { this.topP = parseFloat(value); this.$forceUpdate(); },
                (value) => {
                    const parsed = parseFloat(value);
                    if (isNaN(parsed)) { return '请输入有效的数字'; }
                    if (parsed < 0 || parsed > 1) { return 'Top-P 值必须在 0 到 1 之间'; }
                }
            );
        },

        editSystemPrompt() {
            openSoftKeyboard(
                () => this.systemPrompt,
                (value) => { this.systemPrompt = value; this.$forceUpdate(); }
            );
        },

        editAccessToken() {
            openSoftKeyboard(
                () => this.accessToken,
                (value) => { this.accessToken = value; this.$forceUpdate(); }
            );
        },

        editUserId() {
            openSoftKeyboard(
                () => this.userId,
                (value) => { this.userId = value; this.$forceUpdate(); },
                (value) => {
                    if (value && !/^\d+$/.test(value)) { return '用户ID必须是数字'; }
                }
            );
        },
    }
});

export default chatSettings;
