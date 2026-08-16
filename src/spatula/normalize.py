"""Step 3 - join the id references and emit a single front-end artifact.

Input : data/clean/*.json  (parsed, de-mojibaked)
Output: data/artifact/comps.json

Shape:
    {
      "meta":   {version, season, mode, generated_at, ...},
      "heroes": {id: {name, cost, traits, icon, skill...}},   # only ones used
      "items":  {id: {name, icon, desc}},
      "hexes":  {id: {name, icon, desc, level}},
      "comps":  [{id, name, tier, author, tags, notes, levels, hexes, gods}]
    }

Entities are kept in lookup tables rather than inlined per comp - the same
champion shows up in many comps, so referencing by id keeps the payload small
and lets the UI render a champion detail panel from one place.

Dangling ids (a comp written for an older patch can reference a hex that no
longer exists) are dropped and counted in the run report rather than raising.
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from datetime import datetime, timezone

from . import config

ARTIFACT = config.DATA / "artifact"


def _load(name: str) -> dict:
    path = config.CLEAN / f"{name}.json"
    return json.loads(path.read_text(encoding="utf-8"))


def _split_ids(raw) -> list[str]:
    """'2016,2022' / '310|402' / '' -> list of ids, minus the -1 placeholder."""
    if raw is None:
        return []
    out = []
    for part in str(raw).replace("|", ",").split(","):
        part = part.strip()
        if part and part != "-1":
            out.append(part)
    return out


def build() -> dict:
    chess = _load("chess")
    equip = _load("equip")
    hexes = _load("hex")
    race = _load("race")["data"]
    job = _load("job")["data"]
    gods = {str(g["godId"]): g for g in _load("god")["data"]}
    lineups = _load("lineup_detail_total")["lineup_list"]

    hero_tbl, item_tbl, hex_tbl = chess["data"], equip["data"], hexes["data"]
    missing = Counter()

    def trait_names(hero: dict) -> list[str]:
        names = []
        for field, table in (("species", race), ("class", job)):
            for tid in _split_ids(hero.get(field)):
                if tid in table:
                    names.append(table[tid]["name"])
                else:
                    missing["trait"] += 1
        return names

    used_heroes: dict[str, dict] = {}
    used_items: dict[str, dict] = {}
    used_hexes: dict[str, dict] = {}
    used_gods: dict[str, dict] = {}

    def ref_hero(hid: str) -> str | None:
        if hid not in hero_tbl:
            missing["hero"] += 1
            return None
        if hid not in used_heroes:
            h = hero_tbl[hid]
            used_heroes[hid] = {
                "name": h.get("name"),
                "cost": int(h.get("price") or 0),
                "traits": trait_names(h),
                "icon": h.get("picture"),
                "skill_name": h.get("skillName"),
                "skill_desc": h.get("skillDesc"),
                "skill_icon": h.get("skillIcon"),
            }
        return hid

    def ref_item(iid: str) -> str | None:
        if iid not in item_tbl:
            missing["item"] += 1
            return None
        if iid not in used_items:
            e = item_tbl[iid]
            used_items[iid] = {
                "name": e.get("name"),
                "icon": e.get("picture"),
                "desc": e.get("basicDesc") or e.get("desc"),
            }
        return iid

    def ref_hex(xid: str) -> str | None:
        if xid not in hex_tbl:
            missing["hex"] += 1
            return None
        if xid not in used_hexes:
            x = hex_tbl[xid]
            used_hexes[xid] = {
                "name": x.get("name"),
                "icon": x.get("icon"),
                "desc": x.get("desc"),
                "level": x.get("level"),
            }
        return xid

    def ref_god(gid: str) -> str | None:
        if gid not in gods:
            missing["god"] += 1
            return None
        if gid not in used_gods:
            g = gods[gid]
            used_gods[gid] = {
                "name": g.get("godName"),
                "icon": g.get("godIcon"),
                "tips": g.get("godTips"),
            }
        return gid

    def build_gods(raw) -> list[dict]:
        """god_list is [{stage_num, god_id, wishes:[...]}], one pick per stage.

        `wishes` ids have no mapping table in the published data set, so they
        are passed through untouched for now.
        """
        out = []
        for pick in raw or []:
            if not isinstance(pick, dict):
                missing["god_shape"] += 1
                continue
            gid = ref_god(str(pick.get("god_id")))
            if gid is None:
                continue
            out.append({
                "stage": pick.get("stage_num"),
                "god": gid,
                "wishes": [str(w) for w in (pick.get("wishes") or [])],
            })
        return out

    comps = []
    for entry in lineups:
        try:
            detail = json.loads(entry["detail"])
        except (json.JSONDecodeError, KeyError):
            missing["detail_parse"] += 1
            continue

        levels: dict[str, list] = {}
        for level, units in (detail.get("levelMap") or {}).items():
            board = []
            for u in units:
                hid = ref_hero(str(u.get("hero_id") or ""))
                if hid is None:
                    continue
                board.append({
                    "hero": hid,
                    "star": u.get("star", 1),
                    "pos": u.get("location") or None,
                    "carry": bool(u.get("is_carry_hero")),
                    "items": [i for i in
                              (ref_item(x) for x in _split_ids(u.get("equipment_id")))
                              if i],
                })
            if board:
                levels[str(level)] = board

        hb = detail.get("hexbuff") or {}
        tags = [t.get("title")
                for grp in (detail.get("line_tag_group") or {}).values()
                for t in (grp.get("tags") or [])
                if t.get("title")]

        comps.append({
            "id": entry.get("id"),
            "name": detail.get("line_name"),
            "tier": entry.get("quality"),
            "author": (entry.get("lineupauthor_data") or {}).get("name"),
            "tags": tags,
            "difficulty": detail.get("difficulty_level") or None,
            "released": entry.get("rel_time"),
            "patch": f"{entry.get('simulator_edition')}-{entry.get('simulator_season')}",
            "final_level": max((int(k) for k in levels), default=None),
            "levels": levels,
            "hexes": {
                "recommended": [h for h in
                                (ref_hex(x) for x in _split_ids(hb.get("recomm"))) if h],
                "alternatives": [h for h in
                                 (ref_hex(x) for x in _split_ids(hb.get("replace"))) if h],
            },
            "gods": build_gods(detail.get("god_list")),
            "notes": {
                "early": detail.get("early_info") or None,
                "positioning": detail.get("location_info") or None,
                "items": detail.get("equipment_info") or None,
                "hex": detail.get("hex_info") or None,
                "god": detail.get("godreward_info") or None,
            },
        })

    # newest / highest tier first - the UI shows this order by default
    tier_rank = {"S": 0, "A": 1, "B": 2, "C": 3, "D": 4}
    comps.sort(key=lambda c: (tier_rank.get(c["tier"], 9), c["name"] or ""))

    return {
        "meta": {
            "schema_version": config.SCHEMA_VERSION,
            "version": chess.get("version"),
            "season": chess.get("season"),
            "set_id": chess.get("setId"),
            "mode": config.MODE,
            "source_time": chess.get("time"),
            "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "comp_count": len(comps),
        },
        "heroes": used_heroes,
        "items": used_items,
        "hexes": used_hexes,
        "gods": used_gods,
        "comps": comps,
        "_dangling": dict(missing),
    }


class ValidationError(Exception):
    """The artifact is structurally wrong - refuse to publish it."""


# If the upstream renames a field, ids stop matching and the artifact silently
# empties out. These floors turn that into a loud failure instead.
MIN_COMPS = 20
MIN_HEROES = 30
MIN_LEVELS_PER_COMP = 1
MAX_DANGLING_RATIO = 0.05


def validate(art: dict) -> list[str]:
    """Raise on anything that means the artifact must not be published;
    return a list of non-fatal warnings."""
    errors, warnings = [], []

    comps = art.get("comps") or []
    if len(comps) < MIN_COMPS:
        errors.append(f"only {len(comps)} comps (expected >= {MIN_COMPS})")
    if len(art.get("heroes") or {}) < MIN_HEROES:
        errors.append(f"only {len(art.get('heroes') or {})} heroes "
                      f"(expected >= {MIN_HEROES})")

    # every referenced id must exist in its lookup table
    for c in comps:
        if len(c.get("levels") or {}) < MIN_LEVELS_PER_COMP:
            errors.append(f"comp {c.get('id')} ({c.get('name')}) has no units")
        for units in (c.get("levels") or {}).values():
            for u in units:
                if u["hero"] not in art["heroes"]:
                    errors.append(f"comp {c.get('id')}: unknown hero {u['hero']}")
                for i in u["items"]:
                    if i not in art["items"]:
                        errors.append(f"comp {c.get('id')}: unknown item {i}")

    kept = sum(
        len(units) + sum(len(u["items"]) for u in units)
        for c in comps for units in (c.get("levels") or {}).values()
    )
    dropped = sum(art.get("_dangling", {}).values())
    seen = kept + dropped
    if seen and dropped / seen > MAX_DANGLING_RATIO:
        errors.append(f"{dropped} of {seen} refs did not resolve "
                      f"(> {MAX_DANGLING_RATIO:.0%}) - upstream shape may have changed")
    elif dropped:
        warnings.append(f"{dropped} dangling refs dropped: {art['_dangling']}")

    if not art["meta"].get("version"):
        errors.append("meta.version is empty")

    if errors:
        raise ValidationError("; ".join(errors[:10]))
    return warnings


def main() -> int:
    config.ensure_dirs()
    art = build()

    try:
        warnings = validate(art)
    except ValidationError as e:
        print(f"REFUSING TO PUBLISH: {e}", file=sys.stderr)
        return 1

    # published artifact - this is what the apps fetch
    out = config.WEB_DATA / "comps.json"
    out.write_text(json.dumps(art, ensure_ascii=False, separators=(",", ":")),
                   encoding="utf-8")
    # readable copy for debugging, not published
    ARTIFACT.mkdir(parents=True, exist_ok=True)
    pretty = ARTIFACT / "comps.pretty.json"
    pretty.write_text(json.dumps(art, ensure_ascii=False, indent=2), encoding="utf-8")

    m = art["meta"]
    print(f"patch {m['version']}-{m['season']}  schema v{m['schema_version']}  "
          f"comps={m['comp_count']}")
    print(f"  heroes={len(art['heroes'])} items={len(art['items'])} "
          f"hexes={len(art['hexes'])} gods={len(art['gods'])}")
    for w in warnings:
        print(f"  warning: {w}")
    print(f"  {out.relative_to(config.ROOT)}  {out.stat().st_size:>9,} bytes")
    print(f"  {pretty.relative_to(config.ROOT)}  {pretty.stat().st_size:>9,} bytes (debug)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
