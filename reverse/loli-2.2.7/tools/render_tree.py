#!/usr/bin/env python3
"""Reconstruct a readable template outline from a QuickJS dump of a Vue module.

The dump is produced by tools/dump_bc.c. Vue's compiled render functions are a
sequence of $createElement calls; this script runs a small stack machine over
the opcodes of every depth=1 function and prints tag/class/text structures.

Usage: python3 render_tree.py <dump.txt> [--atoms-only]
"""
import re
import sys

ESCAPE = re.compile(r'\\u([0-9a-fA-F]{4})')


def decode_atom(text):
    text = text.strip()
    if len(text) >= 2 and text[0] == '"' and text[-1] == '"':
        text = text[1:-1]
    raw = bytearray()
    i = 0
    while i < len(text):
        if text[i] == '\\' and i + 5 < len(text) and text[i + 1] == 'u':
            raw.append(int(text[i + 2:i + 6], 16) & 0xFF)
            i += 6
        elif text[i] == '\\' and i + 1 < len(text):
            nxt = text[i + 1]
            raw.extend({'n': b'\n', 't': b'\t', 'r': b'\r', '"': b'"', '\\': b'\\'}.get(nxt, nxt.encode()))
            i += 2
        else:
            raw.extend(text[i].encode('utf-8'))
            i += 1
    try:
        return raw.decode('utf-8')
    except UnicodeDecodeError:
        return raw.decode('latin-1')


def split_functions(lines):
    blocks, current = [], None
    for line in lines:
        if line.startswith('/* ===== function'):
            if current is not None:
                blocks.append(current)
            current = []
        elif current is not None:
            current.append(line)
    if current is not None:
        blocks.append(current)
    return blocks


def opcodes(block):
    for idx, line in enumerate(block):
        if line.strip() == 'opcodes:':
            return [l.strip() for l in block[idx + 1:] if l.strip()]
    return []


def unwrap(v):
    if isinstance(v, tuple):
        if v[0] in ('atom', 'text', 'num', 'lit', 'expr', 'obj', 'arr'):
            return unwrap(v[1])
        return str(v)
    return v


def class_names(v):
    v = unwrap(v)
    if isinstance(v, list):
        return ' '.join(str(unwrap(c)) for c in v)
    if v is None:
        return ''
    return str(v)


def fmt_value(v):
    if isinstance(v, dict):
        parts = []
        for k, val in v.items():
            if k == 'staticClass':
                cls = class_names(val)
                if cls:
                    parts.append('class=' + cls)
            elif k == 'staticStyle':
                parts.append('style=' + str(unwrap(val)))
            else:
                parts.append('%s=%s' % (k, unwrap(val)))
        return ' '.join(parts)
    return str(unwrap(v))


def parse_ops(block):
    out = []
    in_ops = False
    for line in block:
        if line.strip() == 'opcodes:':
            in_ops = True
            continue
        if not in_ops:
            continue
        m = re.match(r'\s*(\d+):\s+(.*)$', line)
        if m:
            out.append((int(m.group(1)), m.group(2).strip()))
    return out


def depth_delta(ops_slice):
    """Approximate net stack effect of a skipped branch (values ignored)."""
    depth = 0
    for _, op in ops_slice:
        if op.startswith('push_atom_value') or op == 'object' or op.startswith(
                ('get_loc', 'get_arg', 'get_var_ref', 'push_this', 'fclosure8',
                 'get_field2', 'push_0', 'push_1', 'push_2', 'push_3', 'push_4',
                 'push_5', 'push_6', 'push_7', 'push_i8', 'push_i16', 'push_i32',
                 'push_const8', 'push_const', 'push_true', 'push_false',
                 'push_null', 'push_undefined', 'push_empty_string')):
            depth += 1
        elif op.startswith('array_from '):
            depth += 1 - int(op.split()[1])
        elif op.startswith('define_field'):
            depth -= 1
        elif op.startswith(('call3 ', 'tail_call ', 'call2 ', 'call')):
            try:
                depth -= int(op.split()[1])
            except (IndexError, ValueError):
                depth -= 1
        elif op.startswith('call_method'):
            try:
                depth -= int(op.split()[1]) + 1
            except (IndexError, ValueError):
                depth -= 1
        elif op.startswith(('if_true', 'if_false', 'drop', 'put_field', 'put_loc', 'set_loc')):
            depth -= 1
        elif op == 'dup':
            depth += 1
        elif op.startswith('get_field '):
            pass
        elif op.startswith('goto'):
            break
    return max(0, depth)


def build(ops):
    """Linear emulation of the render function.

    Conditional jumps fall through (true branch); forward gotos are followed so
    the else branch is skipped. Backward jumps terminate (v-for loops are shown
    once). Stack effects are approximate but keep createElement calls aligned.
    """
    index = {off: i for i, (off, _) in enumerate(ops)}
    stack = []
    pc = 0
    guard = 0

    def pop(n=1):
        n = min(n, len(stack))
        out = stack[-n:] if n else []
        del stack[-n:]
        return out

    def top_obj():
        for v in reversed(stack):
            if v[0] == 'obj':
                return v
        return None

    while pc < len(ops) and guard < 60000:
        guard += 1
        off, op = ops[pc]
        pc += 1
        if op.startswith('push_atom_value '):
            stack.append(('atom', decode_atom(op[len('push_atom_value '):])))
        elif op == 'object':
            stack.append(('obj', {}))
        elif op.startswith('array_from '):
            n = int(op.split()[1])
            vals = [v for v in pop(n) if v[0] not in ('fn', 'recv', 'mfn')]
            stack.append(('arr', vals))
        elif op.startswith('define_field '):
            key = op[len('define_field '):].strip()
            val = pop(1)
            parent = top_obj()
            if parent is not None and val:
                parent[1][key] = val[0][1]
        elif op in ('push_0', 'push_1', 'push_2', 'push_3', 'push_4', 'push_5', 'push_6', 'push_7'):
            stack.append(('num', op[-1]))
        elif op.startswith(('push_i8', 'push_i16', 'push_i32', 'push_const8', 'push_const')):
            nums = re.findall(r'-?\d+', op)
            stack.append(('num', nums[-1] if nums else '0'))
        elif op in ('push_true', 'push_false', 'push_null', 'push_undefined', 'push_empty_string'):
            stack.append(('lit', {'push_true': True, 'push_false': False, 'push_empty_string': ''}.get(op)))
        elif op.startswith('get_loc2'):
            stack.append(('fn', None))
        elif op.startswith('fclosure8'):
            stack.append(('fn', None))
        elif op.startswith('get_field2 '):
            stack.append(('mfn', op.split(None, 1)[1]))
        elif op.startswith('call_method'):
            try:
                argc = int(op.split()[1])
            except (IndexError, ValueError):
                argc = 0
            args = pop(argc)
            fn = pop(1)
            pop(1)  # receiver (pushed before get_field2)
            name = fn[0][1] if fn and fn[0][0] == 'mfn' else ''
            if name in ('_v', '_s'):
                text = unwrap(args[0]) if args else ''
                stack.append(('text', '<' + str(text) + '>'))
            else:
                stack.append(('expr', '<' + name + '>'))
        elif op.startswith(('call3 ', 'tail_call ', 'call2 ', 'call ')):
            if op.startswith('tail_call') and __import__('os').environ.get('RT_DEBUG'):
                print('TAILCALL stack:', [(v[0], str(v[1])[:40]) for v in stack], file=sys.stderr)
            try:
                argc = int(op.split()[1])
            except (IndexError, ValueError):
                argc = 0
            args = pop(argc)
            pop(1)  # function
            if len(args) >= 2 and args[0][0] == 'atom' and args[1][0] == 'obj':
                tag = args[0][1]
                config = args[1][1]
                children = []
                if len(args) >= 3:
                    third = args[2]
                    if third[0] == 'arr':
                        children = third[1]
                    else:
                        children = [third]
                stack.append(('node', (tag, config, children)))
            else:
                stack.append(('expr', '<call>'))
            if op.startswith('tail_call'):
                break
        elif op.startswith('goto'):
            target = re.findall(r'\d+', op)
            if target:
                t = int(target[-1])
                if t > off and t in index:
                    skipped = ops[pc:index[t]]
                    for _ in range(depth_delta(skipped)):
                        stack.append(('expr', '<alt>'))
                    pc = index[t]
                elif t <= off:
                    break
        elif op.startswith(('if_true', 'if_false')):
            pop(1)
        elif op == 'dup':
            if stack:
                stack.append(stack[-1])
        elif op == 'drop':
            pop(1)
        elif op in ('add', 'strict_eq', 'strict_neq', 'gt', 'lt', 'gte', 'lte', 'get_array_el'):
            pop(2)
            stack.append(('expr', '<' + op + '>'))
        elif op == 'lnot':
            pop(1)
            stack.append(('expr', '<lnot>'))
        elif op == 'get_length':
            pop(1)
            stack.append(('expr', '<len>'))
        elif op.startswith('get_field '):
            pop(1)
            stack.append(('expr', '<' + op.split(None, 1)[1] + '>'))
        elif op.startswith(('get_loc', 'get_arg', 'get_var_ref', 'push_this')):
            stack.append(('expr', '<var>'))
        elif op.startswith('set_name'):
            pass
        elif op.startswith(('put_field', 'put_loc', 'set_loc')):
            pop(1)
        elif op.startswith(('return', 'tail_call_method', 'throw')):
            break
    return stack


def emit(node, depth=0):
    if node[0] == 'node':
        tag, config, children = node[1]
        cls = class_names(config.get('staticClass'))
        attr = '.' + cls.replace(' ', '.') if cls else ''
        print('%s<%s%s>' % ('  ' * depth, tag, attr))
        for child in children:
            if child[0] in ('text', 'atom'):
                print('%s  "%s"' % ('  ' * depth, unwrap(child)))
            elif child[0] == 'node':
                emit(child, depth + 1)
            elif child[0] == 'arr':
                emit(child, depth + 1)
    elif node[0] == 'arr':
        for child in node[1]:
            emit(child, depth)


def main():
    lines = open(sys.argv[1], encoding='utf-8', errors='replace').read().splitlines()
    atoms_only = '--atoms-only' in sys.argv
    if atoms_only:
        for line in lines:
            if 'push_atom_value ' in line:
                print(decode_atom(line.split('push_atom_value ', 1)[1]))
        return
    for i, block in enumerate(split_functions(lines)):
        if not any('$createElement' in l for l in block):
            continue
        ops = parse_ops(block)
        if not ops:
            continue
        print('\n# ---- render function %d ----' % i)
        for node in build(ops):
            if node[0] == 'node':
                emit(node)


if __name__ == '__main__':
    main()
