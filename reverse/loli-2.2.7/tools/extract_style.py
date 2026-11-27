#!/usr/bin/env python3
"""Extract the top-level Vue style object from a QuickJS bytecode dump.

Usage: python3 extract_style.py <dump.txt> <out.json>
The dump is produced by tools/dump_bc.c. This is a best-effort parser for the
literal object construction emitted by the Vue compiler at the end of the
module <eval> function.
"""
import json
import re
import sys


def unquote(s):
    s = s.strip()
    if s.startswith('"') and s.endswith('"'):
        try:
            return json.loads(s)
        except Exception:
            return s[1:-1]
    return s


def parse_number(s):
    s = s.strip()
    m = re.match(r'^-?\d+(?:\.\d+)?$', s)
    if not m:
        return s
    return float(s) if '.' in s else int(s)


def parse_value(text):
    text = text.strip()
    if text.startswith('push_atom_value '):
        return unquote(text[len('push_atom_value '):])
    if text.startswith('push_const8 '):
        v = text.split(': ', 1)[1]
        return parse_number(v)
    if text.startswith('push_i16 ') or text.startswith('push_i32 '):
        return parse_number(text.split(' ', 1)[1])
    if text.startswith('push_0 '):
        return 0
    if text.startswith('push_1 '):
        return 1
    if text.startswith('push_2 '):
        return 2
    if text.startswith('push_empty_string'):
        return ''
    if text == 'null':
        return None
    if text == 'true':
        return True
    if text == 'false':
        return False
    return '<expr>'


def extract(lines):
    start = None
    for i, line in enumerate(lines):
        if 'get_field2 assign' in line:
            start = i + 1
            break
    if start is None:
        raise SystemExit('Object.assign not found')

    # Object.assign(target, styleRoot): skip the target object.
    i = start
    if i >= len(lines) or lines[i].strip() != 'object':
        raise SystemExit('target object not found')
    i += 1

    # The next object is the style root.
    if i >= len(lines) or lines[i].strip() != 'object':
        raise SystemExit('style root not found')
    root = {}
    dict_stack = [root]
    values = [root]
    i += 1

    while i < len(lines):
        t = lines[i].strip()
        if t in ('call_method 3', 'put_field style'):
            break
        if t == 'object':
            d = {}
            dict_stack.append(d)
            values.append(d)
        elif t.startswith('define_field '):
            key = unquote(t[len('define_field '):])
            if values:
                val = values.pop()
                if isinstance(val, dict) and dict_stack and dict_stack[-1] is val:
                    dict_stack.pop()
                parent = dict_stack[-1] if dict_stack else None
                if isinstance(parent, dict):
                    parent[key] = val
        elif t.startswith('array_from '):
            n = int(t.split()[1])
            if n <= len(values):
                vals = values[-n:]
                del values[-n:]
                values.append(vals)
        elif t.startswith('push_') or t in ('null', 'true', 'false'):
            values.append(parse_value(t))
        elif t.startswith(('get_var', 'get_loc', 'get_field', 'fclosure', 'call', 'tail_call')):
            values.append('<expr>')
        i += 1

    return root


def main():
    path, out_json = sys.argv[1], sys.argv[2]
    lines = open(path, encoding='utf-8', errors='replace').read().splitlines()
    style = extract(lines)
    json.dump(style, open(out_json, 'w'), ensure_ascii=False, indent=2)
    print('selectors', len(style))
    print(', '.join(list(style)[:30]))


if __name__ == '__main__':
    main()
