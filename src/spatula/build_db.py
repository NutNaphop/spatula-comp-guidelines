"""Step 4 - load the artifact into SQLite for ad-hoc analysis.

This is a side branch, not part of what the apps consume: they read
comps.json. The database exists so meta questions are one query instead of a
script - "which champion appears in the most S-tier comps", "which items
always go on the carry", "what changed between two patches".

Rebuilt from scratch each run; comps.json is the source of truth.

Usage:
    python -m spatula.build_db
    sqlite3 data/tft.sqlite3 "SELECT * FROM hero_usage LIMIT 10"
"""
from __future__ import annotations

import json
import sqlite3
import sys

from . import config

SCHEMA = """
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);

CREATE TABLE hero (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cost INTEGER NOT NULL,
    traits TEXT NOT NULL          -- ' / ' joined, also see hero_trait
);
CREATE TABLE hero_trait (
    hero_id TEXT NOT NULL REFERENCES hero(id),
    trait TEXT NOT NULL,
    PRIMARY KEY (hero_id, trait)
);
CREATE TABLE item (id TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE hex (id TEXT PRIMARY KEY, name TEXT NOT NULL, level TEXT);
CREATE TABLE tag (id TEXT PRIMARY KEY, name TEXT NOT NULL);

CREATE TABLE comp (
    id TEXT PRIMARY KEY,
    name TEXT,
    tier TEXT,
    author TEXT,
    released TEXT,
    patch TEXT,
    final_level INTEGER
);
CREATE TABLE comp_tag (
    comp_id TEXT NOT NULL REFERENCES comp(id),
    tag_id TEXT NOT NULL REFERENCES tag(id),
    PRIMARY KEY (comp_id, tag_id)
);
CREATE TABLE comp_hex (
    comp_id TEXT NOT NULL REFERENCES comp(id),
    hex_id TEXT NOT NULL REFERENCES hex(id),
    kind TEXT NOT NULL CHECK (kind IN ('recommended', 'alternative')),
    PRIMARY KEY (comp_id, hex_id, kind)
);

-- one row per champion placed on a board, at a given player level
CREATE TABLE placement (
    comp_id TEXT NOT NULL REFERENCES comp(id),
    level INTEGER NOT NULL,
    hero_id TEXT NOT NULL REFERENCES hero(id),
    star INTEGER NOT NULL,
    row INTEGER,
    col INTEGER,
    carry INTEGER NOT NULL
);
CREATE INDEX placement_comp ON placement(comp_id, level);
CREATE INDEX placement_hero ON placement(hero_id);

CREATE TABLE placement_item (
    comp_id TEXT NOT NULL,
    level INTEGER NOT NULL,
    hero_id TEXT NOT NULL,
    item_id TEXT NOT NULL REFERENCES item(id),
    slot INTEGER NOT NULL
);
CREATE INDEX placement_item_hero ON placement_item(hero_id, item_id);

-- how often each champion shows up on final boards, and how often as carry
CREATE VIEW hero_usage AS
SELECT h.name, h.cost,
       COUNT(*) AS comps,
       SUM(p.carry) AS as_carry,
       SUM(CASE WHEN c.tier = 'S' THEN 1 ELSE 0 END) AS in_s_tier
FROM placement p
JOIN hero h ON h.id = p.hero_id
JOIN comp c ON c.id = p.comp_id
WHERE p.level = c.final_level
GROUP BY h.id
ORDER BY comps DESC;

-- which items are actually built on carries
CREATE VIEW carry_items AS
SELECT h.name AS hero, i.name AS item, COUNT(*) AS times
FROM placement_item pi
JOIN placement p ON p.comp_id = pi.comp_id
                AND p.level = pi.level
                AND p.hero_id = pi.hero_id
JOIN hero h ON h.id = pi.hero_id
JOIN item i ON i.id = pi.item_id
WHERE p.carry = 1
GROUP BY h.id, i.id
ORDER BY times DESC;
"""


def load(artifact: dict, conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)

    conn.executemany(
        "INSERT INTO meta VALUES (?, ?)",
        [(k, json.dumps(v, ensure_ascii=False)) for k, v in artifact["meta"].items()],
    )
    conn.executemany(
        "INSERT INTO hero VALUES (?, ?, ?, ?)",
        [(hid, h["name"], h["cost"], " / ".join(h["traits"]))
         for hid, h in artifact["heroes"].items()],
    )
    conn.executemany(
        "INSERT INTO hero_trait VALUES (?, ?)",
        [(hid, t) for hid, h in artifact["heroes"].items() for t in set(h["traits"])],
    )
    conn.executemany(
        "INSERT INTO item VALUES (?, ?)",
        [(i, v["name"]) for i, v in artifact["items"].items()],
    )
    conn.executemany(
        "INSERT INTO hex VALUES (?, ?, ?)",
        [(i, v["name"], v.get("level")) for i, v in artifact["hexes"].items()],
    )
    conn.executemany(
        "INSERT INTO tag VALUES (?, ?)", list(artifact["tags"].items())
    )

    for c in artifact["comps"]:
        conn.execute(
            "INSERT INTO comp VALUES (?, ?, ?, ?, ?, ?, ?)",
            (c["id"], c["name"], c["tier"], c["author"], c["released"], c["patch"],
             c["final_level"]),
        )
        conn.executemany(
            "INSERT OR IGNORE INTO comp_tag VALUES (?, ?)",
            [(c["id"], t) for t in c["tags"]],
        )
        conn.executemany(
            "INSERT OR IGNORE INTO comp_hex VALUES (?, ?, ?)",
            [(c["id"], h, "recommended") for h in c["hexes"]["recommended"]]
            + [(c["id"], h, "alternative") for h in c["hexes"]["alternatives"]],
        )

        for level, units in c["levels"].items():
            for u in units:
                row, col = (u["pos"].split(",") + [None])[:2] if u["pos"] else (None, None)
                conn.execute(
                    "INSERT INTO placement VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (c["id"], int(level), u["hero"], u["star"],
                     int(row) if row else None, int(col) if col else None,
                     int(bool(u["carry"]))),
                )
                conn.executemany(
                    "INSERT INTO placement_item VALUES (?, ?, ?, ?, ?)",
                    [(c["id"], int(level), u["hero"], item, slot)
                     for slot, item in enumerate(u["items"])],
                )
    conn.commit()


def main() -> int:
    path = config.WEB_DATA / "comps.json"
    if not path.exists():
        print(f"{path} not found - run `python -m spatula.normalize` first.",
              file=sys.stderr)
        return 1

    artifact = json.loads(path.read_text(encoding="utf-8"))

    config.DB_PATH.unlink(missing_ok=True)
    with sqlite3.connect(config.DB_PATH) as conn:
        load(artifact, conn)
        counts = {
            t: conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
            for t in ("comp", "hero", "item", "hex", "tag", "placement",
                      "placement_item")
        }
        top = conn.execute(
            "SELECT name, comps, as_carry FROM hero_usage LIMIT 5"
        ).fetchall()

    print(f"{config.DB_PATH.relative_to(config.ROOT)}  "
          f"{config.DB_PATH.stat().st_size:,} bytes")
    print("  " + "  ".join(f"{k}={v}" for k, v in counts.items()))
    print("  most used champions:")
    for name, comps, carry in top:
        print(f"    {name:<16} {comps:>3} comps  ({carry} as carry)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
