"""Step 2 - turn raw .js/.json downloads into clean UTF-8 JSON.

Two problems are handled here:

 1. The .js files are not pure JSON - they are usually wrapped in something
    like `var chess = [...]`, `window.chess = {...};` or `export default {...}`.
    extract_json_payload() finds the first balanced {...} / [...] block and
    parses that.

 2. The Thai text inside is multi-layer mojibake; mojibake.fix() reverses it.

Usage:
    python -m spatula.clean            # every file in data/raw
    python -m spatula.clean chess      # one source
"""
from __future__ import annotations

import argparse
import json
import sys

from . import config
from .mojibake import fix

OPEN = {"{": "}", "[": "]"}


def extract_json_payload(text: str) -> str:
    """Return the first balanced JSON object/array found in `text`.

    Skips over string literals so braces inside strings do not confuse the
    depth counter. Raises ValueError if nothing parseable is found.
    """
    text = text.lstrip("﻿").strip()

    start = next((i for i, c in enumerate(text) if c in OPEN), None)
    if start is None:
        raise ValueError("no '{' or '[' found in file")

    opener = text[start]
    closer = OPEN[opener]
    depth = 0
    in_str = False
    quote = ""
    escaped = False

    for i in range(start, len(text)):
        c = text[i]
        if in_str:
            if escaped:
                escaped = False
            elif c == "\\":
                escaped = True
            elif c == quote:
                in_str = False
            continue
        if c in "\"'":
            in_str, quote = True, c
        elif c == opener:
            depth += 1
        elif c == closer:
            depth -= 1
            if depth == 0:
                return text[start : i + 1]

    raise ValueError("unbalanced brackets - file may be truncated")


def load_raw(path) -> object:
    text = path.read_bytes().decode("utf-8", errors="replace")
    if path.suffix == ".json":
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass  # some .json endpoints are still JS-wrapped
    return json.loads(extract_json_payload(text))


def clean_one(name: str, path) -> tuple[str, int]:
    data = load_raw(path)
    fixed = fix(data)
    out = config.CLEAN / f"{name}.json"
    out.write_text(
        json.dumps(fixed, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    n = len(fixed) if isinstance(fixed, (list, dict)) else 1
    return out.name, n


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Parse + de-mojibake raw files.")
    ap.add_argument("names", nargs="*", help="subset of source names (default: all)")
    args = ap.parse_args(argv)

    raw_files = {
        p.stem: p for p in sorted(config.RAW.iterdir())
        if p.is_file() and not p.name.startswith("_")
    }
    if not raw_files:
        print(f"nothing in {config.RAW} - run `python -m spatula.fetch` first.",
              file=sys.stderr)
        return 1

    names = args.names or list(raw_files)
    rc = 0
    for name in names:
        path = raw_files.get(name)
        if path is None:
            print(f"  {name:24s} no raw file")
            rc = 1
            continue
        try:
            out_name, n = clean_one(name, path)
            print(f"  {name:24s} -> {out_name} ({n} top-level entries)")
        except (ValueError, json.JSONDecodeError) as e:
            print(f"  {name:24s} PARSE FAILED: {e}")
            rc = 1
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
