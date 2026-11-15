#!/usr/bin/env python3
"""Offline decryptor for bili-a6p-1.1.4-production.amr.

The application bundle is stored inside libjsapi_p73c240220fc98f0c.so as a
ChaCha20-Poly1305 ciphertext (8-byte nonce, 64-bit counter variant).

Cipher layout inside the .so image (virtual addresses, image base 0x10000):
    0x126D8  32-byte key part A
    0x126F8  32-byte key part B          -> key = A XOR B
    0x12718  4-byte initial counter high word (low word = 0)
    0x1271C  8-byte nonce
    0x12724  16-byte Poly1305 tag
    0x12734  75-byte AAD (JSON build metadata)
    0x1277F  0x55DB4 bytes ciphertext   -> QuickJS bytecode

Usage:
    python3 decrypt_bundle.py libjsapi_p73c240220fc98f0c.so [-o payload.bin]
"""

import argparse
import json
import struct

IMAGE_BASE = 0x10000
KEY_A = 0x126D8
KEY_B = 0x126F8
CTR_HI = 0x12718
NONCE = 0x1271C
TAG = 0x12724
AAD = 0x12734
CT = 0x1277F
CT_LEN = 0x55DB4


def off(vaddr):
    return vaddr - IMAGE_BASE


def rotl(x, n):
    return ((x << n) | (x >> (32 - n))) & 0xFFFFFFFF


def chacha_block(key, nonce8, counter):
    state = [0x61707865, 0x3320646E, 0x79622D32, 0x6B206574]
    state += list(struct.unpack("<8I", key))
    state += [counter & 0xFFFFFFFF, (counter >> 32) & 0xFFFFFFFF]
    state += list(struct.unpack("<2I", nonce8))
    x = state[:]
    for _ in range(10):
        for a, b, c, d in ((0, 4, 8, 12), (1, 5, 9, 13), (2, 6, 10, 14), (3, 7, 11, 15)):
            x[a] = (x[a] + x[b]) & 0xFFFFFFFF; x[d] = rotl(x[d] ^ x[a], 16)
            x[c] = (x[c] + x[d]) & 0xFFFFFFFF; x[b] = rotl(x[b] ^ x[c], 12)
            x[a] = (x[a] + x[b]) & 0xFFFFFFFF; x[d] = rotl(x[d] ^ x[a], 8)
            x[c] = (x[c] + x[d]) & 0xFFFFFFFF; x[b] = rotl(x[b] ^ x[c], 7)
        for a, b, c, d in ((0, 5, 10, 15), (1, 6, 11, 12), (2, 7, 8, 13), (3, 4, 9, 14)):
            x[a] = (x[a] + x[b]) & 0xFFFFFFFF; x[d] = rotl(x[d] ^ x[a], 16)
            x[c] = (x[c] + x[d]) & 0xFFFFFFFF; x[b] = rotl(x[b] ^ x[c], 12)
            x[a] = (x[a] + x[b]) & 0xFFFFFFFF; x[d] = rotl(x[d] ^ x[a], 8)
            x[c] = (x[c] + x[d]) & 0xFFFFFFFF; x[b] = rotl(x[b] ^ x[c], 7)
    return struct.pack("<16I", *[(x[i] + state[i]) & 0xFFFFFFFF for i in range(16)])


def chacha_xor(data, key, nonce8, counter):
    out = bytearray(len(data))
    for i in range(0, len(data), 64):
        stream = chacha_block(key, nonce8, counter + i // 64)
        chunk = data[i:i + 64]
        out[i:i + len(chunk)] = bytes(a ^ b for a, b in zip(chunk, stream))
    return bytes(out)


def poly1305(msg, key32):
    r = int.from_bytes(key32[:16], "little") & 0x0FFFFFFC0FFFFFFC0FFFFFFC0FFFFFFF
    s = int.from_bytes(key32[16:32], "little")
    p = (1 << 130) - 5
    acc = 0
    for i in range(0, len(msg), 16):
        chunk = msg[i:i + 16]
        n = int.from_bytes(chunk + b"\x01", "little")
        acc = ((acc + n) * r) % p
    return ((acc + s) % (1 << 128)).to_bytes(16, "little")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("so")
    ap.add_argument("-o", "--output", default="payload.bin")
    args = ap.parse_args()

    data = open(args.so, "rb").read()

    key = bytes(a ^ b for a, b in zip(data[off(KEY_A):off(KEY_B)], data[off(KEY_B):off(CTR_HI)]))
    ctr_hi = struct.unpack("<I", data[off(CTR_HI):off(NONCE)])[0]
    nonce = data[off(NONCE):off(TAG)]
    tag = data[off(TAG):off(AAD)]
    aad = data[off(AAD):off(CT)]
    ct = data[off(CT):off(CT) + CT_LEN]

    counter = ctr_hi << 32
    otk = chacha_block(key, nonce, counter)[:32]
    mac_in = (aad + b"\x00" * (-len(aad) % 16)
              + ct + b"\x00" * (-len(ct) % 16)
              + struct.pack("<QQ", len(aad), len(ct)))
    if poly1305(mac_in, otk) != tag:
        raise SystemExit("tag mismatch: wrong file or unsupported build")

    pt = chacha_xor(ct, key, nonce, counter + 1)
    open(args.output, "wb").write(pt)
    print("metadata:", json.loads(aad.decode("utf-8")))
    print("payload:", len(pt), "bytes ->", args.output)


if __name__ == "__main__":
    main()
