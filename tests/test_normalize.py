"""Validation exists to turn "upstream renamed a field" into a loud failure
instead of a silently empty artifact, so the failure paths matter most here.
"""
import copy

import pytest

from spatula import config
from spatula.normalize import ValidationError, _split_ids, validate


def make_artifact(n_comps=25, n_heroes=35) -> dict:
    heroes = {str(1000 + i): {"name": f"Hero{i}", "cost": 1, "traits": []}
              for i in range(n_heroes)}
    items = {"2016": {"name": "Rabadon's Deathcap"}}
    comps = [{
        "id": str(i),
        "name": f"Comp {i}",
        "tier": "S",
        "levels": {"8": [{"hero": "1000", "star": 2, "pos": "1,1",
                          "carry": True, "items": ["2016"]}]},
    } for i in range(n_comps)]
    return {
        "meta": {"schema_version": config.SCHEMA_VERSION, "version": "18.17.7"},
        "heroes": heroes, "items": items, "hexes": {}, "gods": {},
        "comps": comps, "_dangling": {},
    }


def test_accepts_a_healthy_artifact():
    assert validate(make_artifact()) == []


def test_rejects_too_few_comps():
    with pytest.raises(ValidationError, match="comps"):
        validate(make_artifact(n_comps=3))


def test_rejects_too_few_heroes():
    with pytest.raises(ValidationError, match="heroes"):
        validate(make_artifact(n_heroes=2))


def test_rejects_comp_with_no_units():
    art = make_artifact()
    art["comps"][0]["levels"] = {}
    with pytest.raises(ValidationError, match="no units"):
        validate(art)


def test_rejects_reference_to_missing_hero():
    art = make_artifact()
    art["comps"][0]["levels"]["8"][0]["hero"] = "does-not-exist"
    with pytest.raises(ValidationError, match="unknown hero"):
        validate(art)


def test_rejects_reference_to_missing_item():
    art = make_artifact()
    art["comps"][0]["levels"]["8"][0]["items"] = ["9999"]
    with pytest.raises(ValidationError, match="unknown item"):
        validate(art)


def test_rejects_empty_version():
    art = make_artifact()
    art["meta"]["version"] = ""
    with pytest.raises(ValidationError, match="version"):
        validate(art)


def test_a_few_dangling_refs_only_warn():
    # 1 unresolved out of ~50 refs - a comp written for an older patch
    art = make_artifact()
    art["_dangling"] = {"hex": 1}
    assert validate(art)  # non-empty warning list, no raise


def test_mass_dangling_refs_fail():
    """The scenario this whole guard exists for: upstream renames a field,
    every id stops resolving, and the artifact quietly empties out."""
    art = make_artifact()
    art["_dangling"] = {"hero": 500}
    with pytest.raises(ValidationError, match="did not resolve"):
        validate(art)


@pytest.mark.parametrize("raw,expected", [
    ("2016,2022", ["2016", "2022"]),
    ("310|402", ["310", "402"]),
    ("", []),
    (None, []),
    ("-1", []),
    ("  2016 , 2022  ", ["2016", "2022"]),
])
def test_split_ids(raw, expected):
    assert _split_ids(raw) == expected


def test_validate_does_not_mutate_input():
    art = make_artifact()
    before = copy.deepcopy(art)
    validate(art)
    assert art == before
