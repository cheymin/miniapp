#!/usr/bin/env python3
"""Emit a flat outline of every createElement in a module's main render function.

Usage: python3 flat_outline.py <dump.txt> [module]
Each line is `tag.class` plus any static/interpolated text found before the next
element. This is resilient to control flow, unlike full tree reconstruction.
"""
import re
import sys

sys.path.insert(0, __file__.rsplit('/', 1)[0])
from render_tree import decode_atom, parse_ops, split_functions

TAGS = {'div', 'text', 'image', 'scroller', 'input', 'textarea', 'video', 'span',
        'button', 'list', 'list-item', 'slider', 'switch', 'web', 'canvas'}


def main():
    path = sys.argv[1]
    lines = open(path, encoding='utf-8', errors='replace').read().splitlines()
    best = []
    for block in split_functions(lines):
        if '$createElement' not in ''.join(block):
            continue
        ops = parse_ops(block)
        if len(ops) > len(best):
            best = ops
    ops = best
    i = 0
    idx = 0
    while i < len(ops):
        off, op = ops[i]
        # Any get_loc2 pushes the local createElement wrapper; the next atom is the tag.
        if op.startswith('get_loc2') and i + 1 < len(ops) and ops[i + 1][1].startswith('push_atom_value '):
            tag = decode_atom(ops[i + 1][1][len('push_atom_value '):])
            if tag not in TAGS:
                i += 1
                continue
            idx += 1
            cls = ''
            texts = []
            j = i + 2
            limit = min(len(ops), i + 40)
            while j < limit:
                o = ops[j][1]
                if o.startswith('define_field staticClass'):
                    if j > 0 and ops[j - 2][1].startswith('push_atom_value '):
                        cls = decode_atom(ops[j - 2][1][len('push_atom_value '):])
                elif o.startswith('call_method'):
                    if j >= 2 and ops[j - 1][1].startswith('push_atom_value '):
                        val = decode_atom(ops[j - 1][1][len('push_atom_value '):])
                        if any('\u4e00' <= ch <= '\u9fff' for ch in val):
                            texts.append(val)
                elif o.startswith('get_loc2') and j + 1 < len(ops) and \
                        ops[j + 1][1].startswith('push_atom_value ') and \
                        decode_atom(ops[j + 1][1][len('push_atom_value '):]) in TAGS:
                    break
                j += 1
            line = '%4d  %s%s' % (idx, tag, ('.' + cls if cls else ''))
            if texts:
                line += '  "' + ' / '.join(texts) + '"'
            print(line)
            i += 1
        i += 1


if __name__ == '__main__':
    main()
