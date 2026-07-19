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

export type MdNodeType =
    | 'paragraph'
    | 'heading'
    | 'codeBlock'
    | 'list'
    | 'listItem'
    | 'inlineCode'
    | 'bold'
    | 'italic'
    | 'link'
    | 'text';

export interface MdNode {
    type: MdNodeType;
    level?: number;
    lang?: string;
    ordered?: boolean;
    text?: string;
    url?: string;
    children?: MdNode[];
}

function parseInline(text: string): MdNode[] {
    const nodes: MdNode[] = [];
    let remaining = text;

    while (remaining.length > 0) {
        let matched = false;

        const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
            nodes.push({
                type: 'link',
                text: linkMatch[1],
                url: linkMatch[2],
            });
            remaining = remaining.substring(linkMatch[0].length);
            matched = true;
            continue;
        }

        const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
        if (boldMatch) {
            nodes.push({
                type: 'bold',
                children: [{ type: 'text', text: boldMatch[1] }],
            });
            remaining = remaining.substring(boldMatch[0].length);
            matched = true;
            continue;
        }

        const italicMatch = remaining.match(/^\*([^*]+)\*/);
        if (italicMatch) {
            nodes.push({
                type: 'italic',
                children: [{ type: 'text', text: italicMatch[1] }],
            });
            remaining = remaining.substring(italicMatch[0].length);
            matched = true;
            continue;
        }

        const inlineCodeMatch = remaining.match(/^`([^`]+)`/);
        if (inlineCodeMatch) {
            nodes.push({
                type: 'inlineCode',
                text: inlineCodeMatch[1],
            });
            remaining = remaining.substring(inlineCodeMatch[0].length);
            matched = true;
            continue;
        }

        if (!matched) {
            let nextSpecial = remaining.length;
            const patterns = [
                /\[/,
                /\*\*/,
                /\*/,
                /`/,
            ];
            for (const pat of patterns) {
                const idx = remaining.search(pat);
                if (idx !== -1 && idx < nextSpecial) {
                    nextSpecial = idx;
                }
            }
            const textChunk = remaining.substring(0, nextSpecial);
            if (textChunk.length > 0) {
                nodes.push({ type: 'text', text: textChunk });
            }
            remaining = remaining.substring(nextSpecial);
        }
    }

    return nodes;
}

export function parseMarkdown(text: string): MdNode[] {
    const lines = text.split('\n');
    const nodes: MdNode[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        if (line.startsWith('```')) {
            const lang = line.substring(3).trim();
            const codeLines: string[] = [];
            i++;
            while (i < lines.length && !lines[i].startsWith('```')) {
                codeLines.push(lines[i]);
                i++;
            }
            i++;
            nodes.push({
                type: 'codeBlock',
                lang: lang,
                text: codeLines.join('\n'),
            });
            continue;
        }

        const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            nodes.push({
                type: 'heading',
                level: level,
                children: parseInline(headingMatch[2]),
            });
            i++;
            continue;
        }

        const ulMatch = line.match(/^-\s+(.*)$/);
        if (ulMatch) {
            const items: MdNode[] = [];
            while (i < lines.length) {
                const m = lines[i].match(/^-\s+(.*)$/);
                if (!m) break;
                items.push({
                    type: 'listItem',
                    children: parseInline(m[1]),
                });
                i++;
            }
            nodes.push({
                type: 'list',
                ordered: false,
                children: items,
            });
            continue;
        }

        const olMatch = line.match(/^\d+\.\s+(.*)$/);
        if (olMatch) {
            const items: MdNode[] = [];
            while (i < lines.length) {
                const m = lines[i].match(/^\d+\.\s+(.*)$/);
                if (!m) break;
                items.push({
                    type: 'listItem',
                    children: parseInline(m[1]),
                });
                i++;
            }
            nodes.push({
                type: 'list',
                ordered: true,
                children: items,
            });
            continue;
        }

        if (line.trim() === '') {
            i++;
            continue;
        }

        const paraLines: string[] = [line];
        i++;
        while (i < lines.length && lines[i].trim() !== '' &&
            !lines[i].startsWith('#') &&
            !lines[i].startsWith('- ') &&
            !lines[i].match(/^\d+\.\s+/) &&
            !lines[i].startsWith('```')) {
            paraLines.push(lines[i]);
            i++;
        }
        nodes.push({
            type: 'paragraph',
            children: parseInline(paraLines.join(' ')),
        });
    }

    return nodes;
}
