<!--
    Copyright (C) 2025 Langning Chen

    This file is part of miniapp.

    miniapp is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    miniapp is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with miniapp.  If not, see <https://www.gnu.org/licenses/>.
-->

<script>
import { parseMarkdown } from '../utils/markdown';

export default {
    name: 'MarkdownView',
    props: {
        content: { type: String, default: '' }
    },
    methods: {
        openLink(url) {
            if (!url) return;
            try {
                if (typeof $falcon !== 'undefined' && url.indexOf('http') === 0) {
                    $falcon.navTo('browser', { url: url });
                }
            } catch (e) { /* 无浏览器页面则忽略 */ }
        },
        plainText(nodes) {
            if (!nodes || !nodes.length) return '';
            let out = '';
            for (const n of nodes) {
                if (n.type === 'text') out += (n.text || '');
                else if (n.children) out += this.plainText(n.children);
                else out += (n.text || '');
            }
            return out;
        },
        // 行内节点渲染为多个 <text> 兄弟，放在 row+wrap 容器里
        renderInline(h, nodes, extraStyle) {
            extraStyle = extraStyle || {};
            if (!nodes || !nodes.length) return [h('text', { style: extraStyle }, '')];
            const result = [];
            for (const n of nodes) {
                if (n.type === 'text') {
                    result.push(h('text', { style: Object.assign({}, extraStyle) }, n.text || ''));
                } else if (n.type === 'bold') {
                    result.push(h('text', {
                        style: Object.assign({ fontWeight: 'bold' }, extraStyle)
                    }, this.plainText(n.children)));
                } else if (n.type === 'italic') {
                    result.push(h('text', {
                        style: Object.assign({ fontStyle: 'italic' }, extraStyle)
                    }, this.plainText(n.children)));
                } else if (n.type === 'inlineCode') {
                    result.push(h('text', {
                        style: Object.assign({
                            fontFamily: 'monospace',
                            color: '#ce9178',
                            backgroundColor: '#2d2d2d'
                        }, extraStyle)
                    }, n.text || ''));
                } else if (n.type === 'link') {
                    result.push(h('text', {
                        style: Object.assign({ color: '#58a6ff' }, extraStyle),
                        on: { click: () => this.openLink(n.url) }
                    }, n.text || ''));
                } else if (n.children) {
                    const inner = this.renderInline(h, n.children, extraStyle);
                    for (const c of inner) result.push(c);
                }
            }
            return result;
        },
        renderNode(h, node) {
            if (node.type === 'heading') {
                const sizes = { 1: 22, 2: 20, 3: 18 };
                const size = sizes[node.level] || 18;
                const inline = this.renderInline(h, node.children, { fontSize: size + 'px', fontWeight: 'bold', color: '#ffffff' });
                return h('div', {
                    style: { flexDirection: 'row', flexWrap: 'wrap', marginTop: '6px', marginBottom: '2px' }
                }, inline);
            }
            if (node.type === 'codeBlock') {
                const code = node.text || '';
                const lang = node.lang ? h('text', {
                    style: { fontSize: '11px', color: '#858585', marginBottom: '4px' }
                }, node.lang) : null;
                const codeText = h('text', {
                    style: {
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        color: '#d4d4d4',
                        wordWrap: 'break-word'
                    }
                }, code);
                const children = [];
                if (lang) children.push(lang);
                children.push(codeText);
                return h('div', {
                    style: {
                        backgroundColor: '#1e1e1e',
                        borderRadius: '6px',
                        padding: '8px',
                        margin: '4px 0',
                        flexDirection: 'column'
                    }
                }, children);
            }
            if (node.type === 'list') {
                const items = (node.children || []).map((item, i) => {
                    const prefix = node.ordered ? ((i + 1) + '.') : '•';
                    return h('div', {
                        style: { flexDirection: 'row', flexWrap: 'wrap', marginTop: '2px', marginBottom: '2px' }
                    }, [
                        h('text', { style: { marginRight: '6px', color: '#9aa4b2' } }, prefix),
                        ...this.renderInline(h, item.children || [], {})
                    ]);
                });
                return h('div', {
                    style: { flexDirection: 'column', marginTop: '2px', marginBottom: '2px', paddingLeft: '4px' }
                }, items);
            }
            if (node.type === 'paragraph') {
                return h('div', {
                    style: { flexDirection: 'row', flexWrap: 'wrap', marginTop: '2px', marginBottom: '2px' }
                }, this.renderInline(h, node.children, {}));
            }
            // listItem / 其他兜底
            if (node.children) {
                return h('div', { style: { flexDirection: 'column' } },
                    (node.children || []).map(c => this.renderNode(h, c)));
            }
            return h('text', { style: {} }, node.text || '');
        }
    },
    render(h) {
        if (!this.content) {
            return h('div', { style: { flexDirection: 'column' } }, [h('text', { style: {} }, '')]);
        }
        let nodes = [];
        try {
            nodes = parseMarkdown(this.content);
        } catch (e) {
            return h('text', { style: {} }, this.content);
        }
        const vnodes = nodes.map(n => this.renderNode(h, n));
        return h('div', { style: { flexDirection: 'column' } }, vnodes);
    }
}
</script>
