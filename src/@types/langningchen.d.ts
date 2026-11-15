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
    static getUserBalance(): Promise<number>;

    static getConversationList(): Promise<langningchen.ConversationNode[]>;
    static createConversation(title?: string): Promise<void>;
    static loadConversation(conversationId: string): Promise<void>;
    static deleteConversation(conversationId: string): Promise<void>;
    static updateConversationTitle(conversationId: string, title: string): Promise<void>;

    static setSettings(apiKey: string, baseUrl: string, modelName: string, maxTokens: number, temperature: number, topP: number, systemPrompt: string): void;
    static getSettings(): langningchen.SettingsResponse;

    static on(event: 'ai_stream', callback: (data: string) => void): void;
}

export declare class ScanInput {
    static initialize(): Promise<void>;
    static deinitialize(): Promise<void>;
    static on(event: 'scan_input', callback: (data: string) => void): void;
}

export declare class Shell {
    static initialize(): Promise<void>;
    static exec(command: string): Promise<string>;
    static list(path: string): Promise<string>;
    static stat(path: string): Promise<string>;
    static mkdir(path: string): Promise<boolean>;
    static remove(path: string): Promise<boolean>;
    static rename(from: string, to: string): Promise<boolean>;
    static copy(from: string, to: string): Promise<boolean>;
    static readText(path: string): Promise<string>;
    static writeText(path: string, content: string): Promise<boolean>;
    static exists(path: string): Promise<boolean>;
}
