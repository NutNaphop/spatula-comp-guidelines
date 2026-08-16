"""The encoding repair is the part most likely to silently corrupt data:
it loops until it can no longer decode, so both under- and over-correcting
are real failure modes. These tests pin both directions.
"""
import pytest

from spatula.mojibake import fix, fix_str

THAI = "ยาสุโอะ"
MIXED = "Aatrox สร้างความเสียหาย 36 หน่วย"


def mangle(s: str, layers: int = 1) -> str:
    """Reproduce the upstream bug: UTF-8 bytes read back as windows-1252."""
    for _ in range(layers):
        s = s.encode("utf-8").decode("windows-1252")
    return s


@pytest.mark.parametrize("layers", [1, 2, 3])
def test_reverses_each_layer_count(layers):
    assert fix_str(mangle(THAI, layers)) == THAI


def test_leaves_clean_thai_untouched():
    # over-correction guard: already-correct text must survive unchanged
    assert fix_str(THAI) == THAI
    assert fix_str(MIXED) == MIXED


def test_leaves_ascii_untouched():
    assert fix_str("Rabadon's Deathcap") == "Rabadon's Deathcap"
    assert fix_str("") == ""


def test_mixed_latin_and_thai_round_trip():
    assert fix_str(mangle(MIXED, 2)) == MIXED


def test_walks_nested_structures():
    data = {"a": [{"name": mangle(THAI, 2)}], "n": 5, "ok": True, "none": None}
    assert fix(data) == {"a": [{"name": THAI}], "n": 5, "ok": True, "none": None}


def test_non_string_scalars_pass_through():
    assert fix(42) == 42
    assert fix(None) is None
