#!/usr/bin/env python3
"""Second pass: resolve string-helper calls through local wrappers and closure vars."""
import base64
import json
import re
import urllib.parse

SRC = "/workspace/reverse/bili-1.1.4/out/bytecode.txt"
OUT = "/workspace/reverse/bili-1.1.4/out/bytecode.deobf.txt"
STRJSON = "/workspace/reverse/bili-1.1.4/out/strings.json"

ALPHA = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/="
STD = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
TR = str.maketrans(ALPHA, STD)


def repair(s):
    for _ in range(3):
        if not any(0x80 <= ord(c) <= 0xFF for c in s):
            break
        try:
            s2 = s.encode("latin1").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            break
        if s2 == s:
            break
        s = s2
    return s


def b64decode(s):
    t = s.translate(TR)
    t += "=" * (-len(t) % 4)
    try:
        raw = base64.b64decode(t)
        txt = urllib.parse.unquote_to_bytes(raw.decode("latin1")).decode("utf-8")
    except Exception:
        return None
    if not txt or any(ord(c) < 32 and c not in "\n\t" for c in txt):
        return None
    return repair(txt)


lines = open(SRC, encoding="utf-8").read().split("\n")

# ---- string table ----------------------------------------------------------
start = next(i for i, l in enumerate(lines)
             if l.startswith("function: _p73cC") and "parent:loc104" in lines[i + 3])
table, cur = {}, None
i = start
while i < len(lines) and not (lines[i].startswith("@@@") and i > start):
    m = re.match(r"\s+push_atom_value (.*)$", lines[i])
    if m:
        cur = m.group(1).strip()
        if len(cur) >= 2 and cur[0] == cur[-1] == '"':
            cur = cur[1:-1]
    m2 = re.match(r'\s+define_field "(\d+)"', lines[i])
    if m2:
        table[int(m2.group(1))] = cur
    i += 1
decoded = {k: b64decode(v) for k, v in table.items()}
json.dump({str(k): v for k, v in decoded.items()},
          open(STRJSON, "w", encoding="utf-8"), ensure_ascii=False, indent=0)

# ---- blocks ---------------------------------------------------------------
header = re.compile(r"^@@@ slot=(-?\d+) depth=(\d+)$")
blocks = []
for idx, line in enumerate(lines):
    m = header.match(line)
    if m:
        blocks.append({"slot": int(m.group(1)), "depth": int(m.group(2)),
                       "start": idx})
for n, b in enumerate(blocks):
    end = len(lines)
    for nb in blocks[n + 1:]:
        if nb["depth"] <= b["depth"]:
            end = nb["start"]
            break
    b["end"] = end
    b["opcodes_start"] = next((k for k in range(b["start"], end)
                               if lines[k].strip() == "opcodes:"), None)
    # parent (previous block one level up)
    b["parent"] = None
    for nb in reversed(blocks[:n]):
        if nb["depth"] == b["depth"] - 1:
            b["parent"] = nb
            break

instr_re = re.compile(r"^(?:\s*(\d+):\s*)?\s*([a-z][a-z0-9_]*)\s*(.*)$")
for b in blocks:
    res = []
    if b["opcodes_start"] is not None:
        for k in range(b["opcodes_start"] + 1, b["end"]):
            raw = lines[k]
            if not raw.strip():
                continue
            m = instr_re.match(raw)
            if m:
                res.append({"line": k, "label": m.group(1), "op": m.group(2),
                            "arg": m.group(3).strip()})
    b["instr"] = res

children = {}
for b in blocks:
    if b["parent"] is not None:
        children[(b["parent"]["start"], b["slot"])] = b

# ---- closure vars ---------------------------------------------------------
cv_re = re.compile(r"^\s*(\d+):\s*(.*?)\s+(parent|local):(loc|arg)(\d+)\s+(\w+)\s*$")
for b in blocks:
    b["closure"] = {}
    end = next((k for k in range(b["start"], b["end"])
                if lines[k].strip() == "stack_size:"), b["end"])
    for k in range(b["start"], end):
        m = cv_re.match(lines[k])
        if m:
            b["closure"][int(m.group(1))] = (m.group(3), int(m.group(5)))

# ---- wrappers -------------------------------------------------------------
put_re = re.compile(r"^(?:put_loc\d*|put_var_ref(?:_check)?)\s+(\d+)")
fcl_re = re.compile(r"^fclosure(?:8)?\s+(\d+)")


def wrapper_info(child):
    if child is None:
        return None
    first_arg = const = None
    has_sub = has_tail = False
    for ins in child["instr"]:
        if ins["op"] in ("get_arg0", "get_arg1"):
            if first_arg is None:
                first_arg = int(ins["op"][-1])
        elif ins["op"] in ("push_i8", "push_i16"):
            try:
                const = int(ins["arg"].split()[0])
            except ValueError:
                pass
        elif ins["op"] == "sub":
            has_sub = True
        elif ins["op"] == "tail_call":
            has_tail = True
    if has_sub and has_tail and first_arg is not None and const is not None:
        return first_arg, const + 147
    return None


for b in blocks:
    b["wrappers"] = {}
    for n, ins in enumerate(b["instr"]):
        m = fcl_re.match(ins["op"] + " " + ins["arg"])
        if not m:
            continue
        slot = int(m.group(1))
        for nxt in b["instr"][n + 1:n + 3]:
            mp = put_re.match(nxt["op"] + " " + nxt["arg"])
            if mp:
                info = wrapper_info(children.get((b["start"], slot)))
                if info:
                    b["wrappers"][int(mp.group(1))] = info
                break
    if b["depth"] == 0:
        b["wrappers"].setdefault(229, (0, 1110))

for b in blocks:
    if b["start"] == 111564:
        print("DEBUG play wrappers:", b["wrappers"])
        print("DEBUG play closure:", b["closure"])
        print("DEBUG children:", [(k, v["start"]) for k, v in children.items()
                                  if k[0] == 110578])


def resolve_var(b, n, seen=None):
    if seen is None:
        seen = set()
    key = (b["start"], n)
    if key in seen:
        return None
    seen.add(key)
    cv = b["closure"].get(n)
    if not cv:
        return b["wrappers"].get(n)
    kind, slot = cv
    if kind == "local":
        return b["wrappers"].get(slot)
    p = b["parent"]
    if p is None:
        return None
    if slot in p["wrappers"]:
        return p["wrappers"][slot]
    return resolve_var(p, slot, seen)


# ---- rewrite --------------------------------------------------------------
push_re = re.compile(r"^(push_i8|push_i16)\s+(-?\d+)")
ref_re = re.compile(r"^(get_loc\d*|get_var_ref(?:_check)?)\s+(\d+)")
out, i = [], 0
hits = missed = 0
while i < len(blocks) or i < len(lines):
    b = next((x for x in blocks if x["start"] == i), None)
    if b is None:
        out.append(lines[i])
        i += 1
        continue
    j = b["start"]
    ins_list = b["instr"]
    pos_by_line = {ins["line"]: n for n, ins in enumerate(ins_list)}
    while j < b["end"]:
        pos = pos_by_line.get(j)
        if pos is not None and pos + 3 < len(ins_list):
            i0, i1, i2, i3 = ins_list[pos:pos + 4]
            m0 = ref_re.match(i0["op"] + " " + i0["arg"])
            m1 = push_re.match(i1["op"] + " " + i1["arg"])
            m2 = push_re.match(i2["op"] + " " + i2["arg"])
            if m0 and m1 and m2 and i3["op"] == "call2" and i3["arg"].startswith("2"):
                slot = int(m0.group(2))
                info = (b["wrappers"].get(slot) if m0.group(1).startswith("get_loc")
                        else resolve_var(b, slot))
                if info:
                    arg_idx, offset = info
                    val = int(m1.group(2)) if arg_idx == 0 else int(m2.group(2))
                    text = decoded.get(val - offset)
                    if text is not None:
                        indent = re.match(r"^(\s*)", lines[i0["line"]]).group(1)
                        label = f"{i0['label']}:  " if i0["label"] else ""
                        out.append(f"{indent}{label}push_atom_value "
                                   f"{json.dumps(text, ensure_ascii=False)}")
                        hits += 1
                        j = i3["line"] + 1
                        continue
                missed += 1
        out.append(lines[j])
        j += 1
    i = b["end"]

open(OUT, "w", encoding="utf-8").write("\n".join(out))
print("decoded strings:", sum(1 for v in decoded.values() if v))
print("resolved calls:", hits, "unresolved:", missed)
