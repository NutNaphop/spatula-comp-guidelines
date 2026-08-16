"""
Utility to fix the multi-layer mojibake encoding found in Golden Spatula's
static JSON data files (chess.js, trait.js, equip.js, hex.js, god.js, etc.)

The Thai text in these files was accidentally re-encoded multiple times
(UTF-8 bytes -> interpreted as Windows-1252 -> re-encoded to UTF-8 -> repeat).
This script reverses that process.

Usage:
    python3 fix_mojibake.py input.json output.json
"""
import json
import sys

# WHATWG windows-1252 mapping for byte range 0x80-0x9F (matches browser
# TextDecoder("windows-1252") behavior, including passthrough for the
# "undefined" code points that Python's built-in cp1252 codec rejects).
CP1252_MAP = {
    0x80: 0x20AC, 0x81: 0x0081, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E,
    0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6, 0x89: 0x2030,
    0x8A: 0x0160, 0x8B: 0x2039, 0x8C: 0x0152, 0x8D: 0x008D, 0x8E: 0x017D,
    0x8F: 0x008F, 0x90: 0x0090, 0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201C,
    0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014, 0x98: 0x02DC,
    0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x0153, 0x9D: 0x009D,
    0x9E: 0x017E, 0x9F: 0x0178,
}
REVERSE_MAP = {v: k for k, v in CP1252_MAP.items()}


def char_to_byte(codepoint):
    if codepoint < 0x80 or 0xA0 <= codepoint <= 0xFF:
        return codepoint
    return REVERSE_MAP.get(codepoint)


def fix_once(s):
    """Try to reverse ONE layer of mojibake. Returns None if `s` doesn't
    look like it was double-encoded this way."""
    raw = bytearray()
    for ch in s:
        b = char_to_byte(ord(ch))
        if b is None:
            return None
        raw.append(b)
    try:
        return bytes(raw).decode('utf-8')
    except UnicodeDecodeError:
        return None


def fix_str(s, max_layers=6):
    cur = s
    for _ in range(max_layers):
        nxt = fix_once(cur)
        if nxt is None:
            break
        cur = nxt
    return cur


def fix(obj):
    if isinstance(obj, str):
        return fix_str(obj)
    if isinstance(obj, dict):
        return {k: fix(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [fix(v) for v in obj]
    return obj


def main():
    if len(sys.argv) != 3:
        print("Usage: python3 fix_mojibake.py <input.json> <output.json>")
        sys.exit(1)

    with open(sys.argv[1], 'r', encoding='utf-8') as f:
        data = json.load(f)

    fixed = fix(data)

    with open(sys.argv[2], 'w', encoding='utf-8') as f:
        json.dump(fixed, f, ensure_ascii=False, indent=2)

    print(f"Done. Wrote fixed JSON to {sys.argv[2]}")


if __name__ == '__main__':
    main()