"""Step 1 - download the public static files.

Design notes:
  * Raw bytes are stored verbatim in data/raw/. Nothing is decoded here, so
    the mojibake repair stays a separate, re-runnable step.
  * Conditional GET (ETag / If-Modified-Since) means repeat runs usually cost
    a 304 and no body transfer.
  * A per-source cooldown + inter-request delay keeps the scheduled job from
    hammering the host.
  * robots.txt is honoured; run with --ignore-robots only if you have checked
    the site's terms yourself and are sure the path is meant to be public.

Usage:
    python -m spatula.fetch                # all sources in config.SOURCES
    python -m spatula.fetch chess trait    # only these
    python -m spatula.fetch --force        # ignore the cooldown
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

import httpx

from . import config
from .discovery import resolve


def _now() -> float:
    return time.time()


def load_manifest() -> dict:
    if config.MANIFEST.exists():
        return json.loads(config.MANIFEST.read_text(encoding="utf-8"))
    return {}


def save_manifest(m: dict) -> None:
    config.MANIFEST.write_text(
        json.dumps(m, indent=2, ensure_ascii=False), encoding="utf-8"
    )


def robots_allows(client: httpx.Client, url: str) -> bool:
    parsed = urlparse(url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
    rp = RobotFileParser()
    try:
        r = client.get(robots_url, timeout=10.0)
        if r.status_code >= 400:
            return True  # no robots.txt published -> nothing disallowed
        rp.parse(r.text.splitlines())
    except httpx.HTTPError:
        return True
    return rp.can_fetch(config.USER_AGENT, url)


def fetch_one(client: httpx.Client, name: str, url: str, manifest: dict,
              force: bool = False) -> str:
    """Download one source. Returns a short status string."""
    entry = manifest.get(name, {})

    age = _now() - entry.get("fetched_at", 0)
    if not force and age < config.MIN_REFETCH_INTERVAL_S:
        return f"skip (cooldown, {age / 3600:.1f}h old)"

    headers = {}
    if etag := entry.get("etag"):
        headers["If-None-Match"] = etag
    if lastmod := entry.get("last_modified"):
        headers["If-Modified-Since"] = lastmod

    last_err = None
    for attempt in range(1, config.MAX_RETRIES + 1):
        try:
            resp = client.get(url, headers=headers)
            break
        except httpx.HTTPError as e:
            last_err = e
            if attempt == config.MAX_RETRIES:
                raise
            time.sleep(2**attempt)
    else:  # pragma: no cover
        raise last_err  # type: ignore[misc]

    if resp.status_code == 304:
        entry["fetched_at"] = _now()
        manifest[name] = entry
        return "unchanged (304)"

    resp.raise_for_status()
    body = resp.content
    digest = hashlib.sha256(body).hexdigest()

    # Keep the original extension so .js vs .json stays visible downstream.
    ext = "".join(urlparse(url).path.rsplit(".", 1)[-1:]) or "txt"
    out = config.RAW / f"{name}.{ext}"
    changed = entry.get("sha256") != digest
    out.write_bytes(body)

    manifest[name] = {
        "url": url,
        "file": out.name,
        "sha256": digest,
        "bytes": len(body),
        "etag": resp.headers.get("ETag"),
        "last_modified": resp.headers.get("Last-Modified"),
        "content_type": resp.headers.get("Content-Type"),
        "fetched_at": _now(),
        "fetched_at_iso": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    return f"{'updated' if changed else 'same content'} ({len(body):,} bytes)"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Fetch Golden Spatula static data files.")
    ap.add_argument("names", nargs="*", help="subset of source names (default: all)")
    ap.add_argument("--force", action="store_true", help="ignore the refetch cooldown")
    ap.add_argument("--ignore-robots", action="store_true")
    ap.add_argument("--mode", default=None, help=f"game mode (default {config.MODE})")
    args = ap.parse_args(argv)

    config.ensure_dirs()
    info = resolve(mode=args.mode)
    sources = info["sources"]
    print(f"patch {info['version']}-{info['season']} "
          f"(mode {info['mode']} {info['name']}, since {info['start_time']})")
    for w in info["warnings"]:
        print(f"  WARNING: {w}")

    names = args.names or list(sources)
    unknown = [n for n in names if n not in sources]
    if unknown:
        print(f"unknown source(s): {', '.join(unknown)}", file=sys.stderr)
        return 1

    manifest = load_manifest()
    headers = {"User-Agent": config.USER_AGENT, "Accept": "*/*"}

    with httpx.Client(headers=headers, timeout=config.TIMEOUT_S,
                      follow_redirects=True) as client:
        for i, name in enumerate(names):
            url = urljoin(config.BASE_URL, sources[name])

            if not args.ignore_robots and not robots_allows(client, url):
                print(f"  {name:24s} BLOCKED by robots.txt -> {url}")
                continue

            if i:
                time.sleep(config.REQUEST_DELAY_S)
            try:
                status = fetch_one(client, name, url, manifest, force=args.force)
            except httpx.HTTPError as e:
                status = f"ERROR {type(e).__name__}: {e}"
            print(f"  {name:24s} {status}")

    save_manifest(manifest)
    print(f"\nmanifest -> {config.MANIFEST}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
