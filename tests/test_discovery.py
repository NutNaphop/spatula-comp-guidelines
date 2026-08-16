"""Mode selection is the trap in versiondataconfig.js: `is_newest_version`
is per-mode, and the newest *date* can belong to a mode we do not track.
"""
import pytest

from spatula.discovery import check_for_newer_mode, newest_for_mode

ENTRIES = [
    {"mode": "17", "version": "18.17.5", "season": "S18", "name": "Space Gods",
     "is_newest_version": 0, "version_start_time": "2026-06-11"},
    {"mode": "17", "version": "18.17.7", "season": "S18", "name": "Space Gods",
     "is_newest_version": 1, "version_start_time": "2026-07-17"},
    # different mode, published LATER - must never be picked for mode 17
    {"mode": "16", "version": "18.16.2", "season": "S18", "name": "Lore and Legends",
     "is_newest_version": 1, "version_start_time": "2026-07-21"},
]


def test_picks_flagged_entry_for_the_requested_mode():
    assert newest_for_mode(ENTRIES, "17")["version"] == "18.17.7"


def test_does_not_leak_across_modes():
    assert newest_for_mode(ENTRIES, "16")["version"] == "18.16.2"


def test_last_entry_heuristic_would_have_been_wrong():
    # guards the actual bug: taking the tail of the list picks mode 16
    assert ENTRIES[-1]["mode"] != "17"
    assert newest_for_mode(ENTRIES, "17") is not ENTRIES[-1]


def test_falls_back_to_latest_start_time_within_mode():
    unflagged = [{**e, "is_newest_version": 0} for e in ENTRIES if e["mode"] == "17"]
    assert newest_for_mode(unflagged, "17")["version"] == "18.17.7"


def test_unknown_mode_raises_with_the_available_modes():
    with pytest.raises(LookupError, match="16"):
        newest_for_mode(ENTRIES, "99")


def test_warns_when_another_mode_is_newer():
    warnings = check_for_newer_mode(ENTRIES, newest_for_mode(ENTRIES, "17"))
    assert len(warnings) == 1
    assert "Lore and Legends" in warnings[0]


def test_no_warning_when_tracked_mode_is_newest():
    warnings = check_for_newer_mode(ENTRIES, newest_for_mode(ENTRIES, "16"))
    assert warnings == []
