#!/usr/bin/env python3
"""Convert an extracted Loli Vue style JSON into a LESS file.

Usage: python3 style2less.py <style.json> <out.less> [--ns class-prefix]
The JSON is produced by extract_style.py from the QuickJS dump. Property names
are camelCase; pseudo/state suffixes such as "backgroundColor:active" are
converted into LESS pseudo selectors.
"""
import json
import re
import sys

CAMEL = re.compile(r'(?<!^)(?=[A-Z])')
PSEUDO = ('active', 'last-child', 'first-child', 'disabled', 'hover', 'focus')


def kebab(name):
    return CAMEL.sub('-', name).lower()


def clean_value(key, value):
    if isinstance(value, bool):
        return 'true' if value else 'false'
    if value is None:
        return 'null'
    s = str(value)
    # Artifact of string concatenation in the bytecode dump: 1"700" -> 700
    m = re.fullmatch(r'1"(\d+)"', s)
    if m:
        return m.group(1)
    if s.endswith('"'):
        s = s[:-1]
    if s.startswith('"'):
        s = s[1:]
    return s


def convert(style, namespace=None):
    out = []
    for selector, props in style.items():
        if not isinstance(props, dict):
            continue
        if selector.startswith('@') or ' ' in selector:
            continue
        base = selector
        state = None
        if ':' in selector:
            base, state = selector.split(':', 1)
            if state not in PSEUDO:
                state = None
        name = '.' + base
        if namespace:
            name = '.' + namespace + ' ' + name
        if state:
            name += ':' + state
        lines = ['%s {' % name]
        states = {}
        for key, value in props.items():
            if isinstance(value, dict):
                continue
            if ':' in key:
                base_key, state = key.split(':', 1)
                if state in PSEUDO:
                    states.setdefault(state, []).append((base_key, value))
                    continue
            lines.append('    %s: %s;' % (kebab(key), clean_value(key, value)))
        lines.append('}')
        out.append('\n'.join(lines))
        for state, items in states.items():
            state_lines = ['%s:%s {' % (name, state)]
            for key, value in items:
                state_lines.append('    %s: %s;' % (kebab(key), clean_value(key, value)))
            state_lines.append('}')
            out.append('\n'.join(state_lines))
    return '\n\n'.join(out) + '\n'


def main():
    src, dst = sys.argv[1], sys.argv[2]
    ns = None
    if '--ns' in sys.argv:
        ns = sys.argv[sys.argv.index('--ns') + 1]
    style = json.load(open(src, encoding='utf-8'))
    open(dst, 'w', encoding='utf-8').write(convert(style, ns))
    print(dst, len(style), 'selectors')


if __name__ == '__main__':
    main()
