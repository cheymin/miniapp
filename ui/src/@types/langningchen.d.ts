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

import * as langningchen from './langningchen';

export declare class AI {
    static initialize(): void;
    static getCurrentPath(): langningchen.ConversationNode[];
    static getChildNodes(nodeId: string): string[];
    static switchToNode(nodeId: string): void;
    static getCurrentNodeId(): string;
    static getRootNodeId(): string;
    static getCurrentConversationId(): string;

    static addUserMessage(message: string): Promise<void>;
    static generateResponse(): Promise<string>;
    static stopGeneration(): void;
    static getModels(): Promise<string[]>;
    static getUserBalance(): Promise<langningchen.BalanceInfo>;
    static generateImage(prompt: string, size?: string, model?: string): Promise<string>;

    static getConversationList(): Promise<langningchen.ConversationNode[]>;
    static createConversation(title?: string): Promise<void>;
    static loadConversation(conversationId: string): Promise<void>;
    static deleteConversation(conversationId: string): Promise<void>;
    static updateConversationTitle(conversationId: string, title: string): Promise<void>;

    static setSettings(apiKey: string, baseUrl: string, modelName: string, maxTokens: number, temperature: number, topP: number, systemPrompt: string, accessToken: string, userId: string): void;
    static getSettings(): langningchen.SettingsResponse;

    // 多配置管理
    static getConfigList(): Promise<langningchen.ConfigInfo[]>;
    static createConfig(name?: string): Promise<string>;
    static deleteConfig(configId: string): Promise<boolean>;
    static updateConfigName(configId: string, name: string): Promise<boolean>;
    static getActiveConfigId(): string;
    static setActiveConfigId(configId: string): Promise<boolean>;

    static on(event: 'ai_stream', callback: (data: string) => void): void;
}

export declare class IME {
    static initialize(): Promise<void>;
    static getCandidates(rawPinyin: string): langningchen.Candidate[];
    static updateWordFrequency(pinyin: langningchen.Pinyin, hanZi: string): void;
    static splitPinyin(rawPinyin: string): langningchen.Pinyin;
}

export declare class ScanInput {
    static initialize(): Promise<void>;
    static deinitialize(): Promise<void>;
    static on(event: 'scan_input', callback: (data: string) => void): void;
}

export declare class Shell {
    static initialize(): Promise<void>;
    static exec(command: string): Promise<string>;
}

export declare class Penshell {
    static initialize(): Promise<void>;
    static exec(command: string): Promise<string>;
    static write(input: string): void;
    static sendCtrlC(): void;
    static getWorkingDirectory(): string;
    static close(): void;
    static isRunning(): boolean;

    static on(event: 'penshell_output', callback: (data: string) => void): void;
}
