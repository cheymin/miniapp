#!/usr/bin/env python3
"""批量把 .js.bin 的原子表导出为 strings/<module>.txt，并生成 manifest 索引。

用法: python3 dump_strings.py <pkg_dir> <out_dir>
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atoms import parse

MAX_BYTES = 190 * 1024


def dump_one(path, out_path, name):
    n, atoms, end, total = parse(path)
    lines = []
    lines.append("# %s" % name)
    lines.append("# atoms=%d bytecode_off=%d file_size=%d" % (len(atoms), end, total))
    lines.append("# 格式: <atom_index>\\t<atom_text>（\\n 已转义为字面量 \\\\n）")
    lines.append("")
    used = sum(len(x) + 1 for x in lines)
    truncated = 0
    for i, a in enumerate(atoms):
        t = a.replace("\n", "\\n").replace("\t", "\\t")
        if len(t) > 400:
            t = t[:400] + "…[len=%d]" % len(a)
        line = "%5d\t%s" % (i, t)
        if used + len(line.encode()) + 1 > MAX_BYTES:
            truncated = len(atoms) - i
            break
        lines.append(line)
        used += len(line.encode()) + 1
    if truncated:
        lines.append("")
        lines.append("# …另有 %d 条原子因体积限制未展开（多为内联 base64 数据/表格数据）" % truncated)
    with open(out_path, "w") as f:
        f.write("\n".join(lines) + "\n")
    return len(atoms), end, total


def main():
    pkg, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    rows = []
    for f in sorted(os.listdir(pkg)):
        if not f.endswith(".js.bin"):
            continue
        name = f[:-7]
        n, end, total = dump_one(os.path.join(pkg, f), os.path.join(out, name + ".txt"), name)
        rows.append((name, n, end, total))
        print("%-28s atoms=%-5d off=%-7d size=%d" % (name, n, end, total))
    with open(os.path.join(out, "_index.txt"), "w") as fh:
        for name, n, end, total in rows:
            fh.write("%s\t%d\t%d\t%d\n" % (name, n, end, total))


if __name__ == "__main__":
    main()
