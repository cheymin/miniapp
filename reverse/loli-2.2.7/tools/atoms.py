#!/usr/bin/env python3
"""QuickJS 20200705 字节码原子表提取器（词典笔小程序 .js.bin）。

文件布局：
    u8  version (0x01)
    leb128 atom_count
    atom[atom_count]: uleb128 hdr, 其中 hdr = (char_count << 1) | is_wide
        is_wide=0 -> char_count 字节 latin1(ASCII)
        is_wide=1 -> char_count*2 字节 UTF-16LE

用法:
    python3 atoms.py <file.js.bin> [--json out.json] [--txt out.txt]
"""
import sys
import json


def leb128(d, i):
    r = 0
    s = 0
    while True:
        b = d[i]
        i += 1
        r |= (b & 0x7F) << s
        if not (b & 0x80):
            break
        s += 7
    return r, i


def parse(path):
    d = open(path, "rb").read()
    i = 0
    if d and d[0] == 1:
        i = 1
    n, i = leb128(d, i)
    atoms = []
    for _ in range(n):
        if i >= len(d):
            break
        hdr, i = leb128(d, i)
        wide = hdr & 1
        chars = hdr >> 1
        if wide:
            raw = d[i:i + chars * 2]
            i += chars * 2
            atoms.append(raw.decode("utf-16le", "replace"))
        else:
            raw = d[i:i + chars]
            i += chars
            atoms.append(raw.decode("latin1"))
    return n, atoms, i, len(d)


def main():
    p = sys.argv[1]
    n, atoms, end, total = parse(p)
    if "--json" in sys.argv:
        out = sys.argv[sys.argv.index("--json") + 1]
        json.dump(atoms, open(out, "w"), ensure_ascii=False, indent=1)
    if "--txt" in sys.argv:
        out = sys.argv[sys.argv.index("--txt") + 1]
        with open(out, "w") as f:
            for idx, a in enumerate(atoms):
                f.write("%5d\t%s\n" % (idx, a.replace("\n", "\\n")))
    print("declared=%d parsed=%d bytecode_off=%d/%d" % (n, len(atoms), end, total))
    print(json.dumps(atoms[:25], ensure_ascii=False))


if __name__ == "__main__":
    main()
