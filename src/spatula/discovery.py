"""Resolve the current patch coordinates from the site's own version manifest.

https://goldenspatula.com/act/jkxzlkFile/js/TH/config/versiondataconfig.js
is a list of every patch ever published, one entry per (mode, version), with
explicit relative URLs for each data file:

    {"version":"18.17.7", "season":"S18", "mode":"17", "name":"Space Gods",
     "is_newest_version":1, "version_start_time":"2026-07-17",
     "herourl":"/17/18.17.7-S18/chess.js", "traiturl":..., ...}

Two gotchas this module exists to handle:

  * `is_newest_version == 1` is true for FOUR entries - it means "newest
    within its game mode", not "newest overall". Taking the last entries of
    the list gives you mode 16 (Lore and Legends), a different game mode.
  * Sorting by version_start_time does not help either: mode 16 started
    2026-07-21, four days AFTER the mode 17 patch we actually want.

So the mode is pinned explicitly in config.MODE. When a mode we are not
tracking starts publishing newer patches (i.e. a new set launched), we warn
instead of silently switching to a different dataset.
"""
from __future__ import annotations

import json

import httpx

from . import config
from .clean import extract_json_payload
from .mojibake import fix

VERSION_CONFIG_URL = (
    "https://goldenspatula.com/act/jkxzlkFile/js/"
    f"{config.LOCALE}/config/versiondataconfig.js"
)

# manifest url-key -> our source name
URL_KEY_TO_NAME = {
    "herourl": "chess",
    "traiturl": "trait",
    "equipurl": "equip",
    "hexurl": "hex",
    "godurl": "god",
    "raceurl": "race",
    "joburl": "job",
    "legendurl": "legend",
    "galaxyurl": "galaxy",
    "missionurl": "mission",
    "adventureurl": "adventure",
    "goopurl": "goop",
    "tinyherourl": "tinyhero",
    "configurl": "config",
}


def fetch_manifest(client: httpx.Client | None = None) -> list[dict]:
    own = client is None
    client = client or httpx.Client(
        headers={"User-Agent": config.USER_AGENT},
        timeout=config.TIMEOUT_S,
        follow_redirects=True,
    )
    try:
        r = client.get(VERSION_CONFIG_URL)
        r.raise_for_status()
        text = r.content.decode("utf-8", errors="replace")
        return fix(json.loads(extract_json_payload(text)))
    finally:
        if own:
            client.close()


def newest_for_mode(entries: list[dict], mode: str) -> dict:
    """Newest published entry for one game mode."""
    same = [e for e in entries if str(e.get("mode")) == str(mode)]
    if not same:
        modes = sorted({str(e.get("mode")) for e in entries})
        raise LookupError(f"mode {mode!r} not in manifest. seen: {modes}")

    flagged = [e for e in same if str(e.get("is_newest_version")) == "1"]
    if len(flagged) == 1:
        return flagged[0]
    # fall back to latest start time if the flag is missing/ambiguous
    return max(same, key=lambda e: e.get("version_start_time", ""))


def check_for_newer_mode(entries: list[dict], current: dict) -> list[str]:
    """Return warnings if another mode has a more recent patch than ours.

    This is how a new set launch shows up - we do NOT auto-switch, because
    switching mode silently would swap the whole dataset underneath you.
    """
    warnings = []
    ours = current.get("version_start_time", "")
    for e in entries:
        if str(e.get("mode")) == str(current.get("mode")):
            continue
        if str(e.get("is_newest_version")) != "1":
            continue
        if e.get("version_start_time", "") > ours:
            warnings.append(
                f"mode {e['mode']} ({e.get('name')}) published "
                f"{e['version']}-{e['season']} on {e['version_start_time']}, "
                f"newer than tracked mode {current['mode']} "
                f"({current.get('name')}) {current['version']}-{current['season']} "
                f"from {ours}"
            )
    return warnings


def resolve(mode: str | None = None, client: httpx.Client | None = None) -> dict:
    """Resolve current coordinates + absolute per-file URLs for a mode."""
    mode = mode or config.MODE
    entries = fetch_manifest(client)
    entry = newest_for_mode(entries, mode)

    base = f"https://goldenspatula.com/act/jkxzlkFile/js/{config.LOCALE}"
    sources = {
        name: base + entry[key]
        for key, name in URL_KEY_TO_NAME.items()
        if entry.get(key)
    }

    season_num = str(entry["season"]).lstrip("Ss")
    # lineup lives on a different host path; only `channel` is not derivable
    # from the manifest, so it stays pinned in config.LINEUP_CHANNEL.
    sources["lineup_detail_total"] = (
        f"https://goldenspatula.com/act/jkxzlkJson/json/{config.LOCALE}"
        f"/lineupJson/m{season_num}/{config.LINEUP_CHANNEL}/{entry['mode']}"
        f"/lineup_detail_total.json"
    )

    return {
        "mode": str(entry["mode"]),
        "name": entry.get("name"),
        "version": entry["version"],
        "season": entry["season"],
        "start_time": entry.get("version_start_time"),
        "sources": sources,
        "warnings": check_for_newer_mode(entries, entry),
    }


def main() -> int:
    info = resolve()
    print(f"mode {info['mode']} ({info['name']})")
    print(f"  patch  {info['version']}-{info['season']}  since {info['start_time']}")
    print(f"  files  {len(info['sources'])}")
    for name, url in sorted(info["sources"].items()):
        print(f"    {name:20s} {url}")
    for w in info["warnings"]:
        print(f"\n  WARNING: {w}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
