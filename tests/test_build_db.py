"""The database is rebuilt from the artifact every run, so the risk is not
corruption over time - it is a join or a view silently returning nothing
after the artifact changes shape.
"""
import sqlite3

import pytest

from spatula.build_db import load


@pytest.fixture
def artifact():
    return {
        "meta": {"schema_version": 2, "version": "18.17.7", "season": "S18"},
        "heroes": {
            "h1": {"name": "Rammus", "cost": 4, "traits": ["Bastion", "Meeple"]},
            "h2": {"name": "Aatrox", "cost": 1, "traits": ["Brawler"]},
        },
        "items": {"i1": {"name": "Blue Buff"}, "i2": {"name": "Deathblade"}},
        "hexes": {"x1": {"name": "Calculated Loss", "level": "2"}},
        "gods": {},
        "tags": {"t1": "Fast 8"},
        "tag_groups": [],
        "comps": [
            {
                "id": "c1", "name": "Rammus Wall", "tier": "S", "author": "tester",
                "released": "2026-07-17", "patch": "18.17.7-S18", "final_level": 8,
                "tags": ["t1"],
                "hexes": {"recommended": ["x1"], "alternatives": []},
                "levels": {
                    "6": [{"hero": "h2", "star": 2, "pos": "2,3", "carry": False,
                           "items": []}],
                    "8": [
                        {"hero": "h1", "star": 2, "pos": "1,4", "carry": True,
                         "items": ["i1", "i2"]},
                        {"hero": "h2", "star": 1, "pos": None, "carry": False,
                         "items": []},
                    ],
                },
            }
        ],
    }


@pytest.fixture
def conn(artifact):
    c = sqlite3.connect(":memory:")
    load(artifact, c)
    yield c
    c.close()


def one(conn, sql):
    return conn.execute(sql).fetchone()


def test_loads_every_level_not_just_the_final_board(conn):
    assert one(conn, "SELECT COUNT(*) FROM placement")[0] == 3


def test_splits_board_position_into_row_and_col(conn):
    row, col = one(conn, "SELECT row, col FROM placement WHERE hero_id='h1'")
    assert (row, col) == (1, 4)


def test_keeps_a_unit_that_has_no_position(conn):
    row, col = one(
        conn, "SELECT row, col FROM placement WHERE hero_id='h2' AND level=8"
    )
    assert (row, col) == (None, None)


def test_records_item_order(conn):
    rows = conn.execute(
        "SELECT item_id FROM placement_item WHERE hero_id='h1' ORDER BY slot"
    ).fetchall()
    assert [r[0] for r in rows] == ["i1", "i2"]


def test_explodes_traits_into_their_own_rows(conn):
    traits = conn.execute(
        "SELECT trait FROM hero_trait WHERE hero_id='h1' ORDER BY trait"
    ).fetchall()
    assert [t[0] for t in traits] == ["Bastion", "Meeple"]


def test_hero_usage_counts_only_the_final_board(conn):
    rows = dict(conn.execute("SELECT name, comps FROM hero_usage").fetchall())
    # Aatrox is on both the level 6 and level 8 boards but counts once
    assert rows == {"Rammus": 1, "Aatrox": 1}


def test_hero_usage_marks_the_carry(conn):
    carry = one(conn, "SELECT as_carry FROM hero_usage WHERE name='Rammus'")[0]
    assert carry == 1


def test_carry_items_only_lists_items_on_carries(conn):
    rows = conn.execute("SELECT hero, item FROM carry_items ORDER BY item").fetchall()
    assert rows == [("Rammus", "Blue Buff"), ("Rammus", "Deathblade")]


def test_hex_recommendation_kind_is_kept(conn):
    kind = one(conn, "SELECT kind FROM comp_hex WHERE comp_id='c1'")[0]
    assert kind == "recommended"


def test_rejects_an_unknown_hex_kind(conn):
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute("INSERT INTO comp_hex VALUES ('c1', 'x1', 'maybe')")


def test_meta_survives_as_readable_values(conn):
    value = one(conn, "SELECT value FROM meta WHERE key='version'")[0]
    assert value == '"18.17.7"'
