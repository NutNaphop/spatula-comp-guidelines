"""Central config: paths and source file registry."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
RAW = DATA / "raw"        # bytes exactly as downloaded
CLEAN = DATA / "clean"    # parsed + mojibake-fixed JSON
WEB_DATA = ROOT / "web" / "data"   # published artifact, served as-is
DB_PATH = DATA / "tft.sqlite3"
MANIFEST = RAW / "_manifest.json"   # etag / last-modified / hash per source


def ensure_dirs() -> None:
    """Create the working directories. Called by the entry points rather than
    at import time, so that importing the package has no side effects."""
    for d in (RAW, CLEAN, WEB_DATA):
        d.mkdir(parents=True, exist_ok=True)


BASE_URL = "https://goldenspatula.com/"

# Bumped whenever the published artifact changes shape. Clients compare against
# this and refuse to render rather than misreading a newer layout.
#   1 - initial: meta/heroes/items/hexes/gods/comps
SCHEMA_VERSION = 1

# --- version coordinates -----------------------------------------------------
# discovery.py reads the site's own versiondataconfig.js and derives the patch
# and every file URL from it, so nothing below needs touching on a patch bump.
LOCALE = "TH"

# Game mode is PINNED on purpose. `is_newest_version` in the manifest means
# "newest within its mode" (4 entries carry it), so there is no such thing as
# a single global newest. mode 17 = "Space Gods" = TFT Set 17 / S18 assets.
# A new set arrives as a NEW mode id - discovery warns instead of switching.
MODE = "17"

# The lineup URL (.../lineupJson/m18/29/17/) is the one path segment not
# present in the manifest. 29 == the `channel` field on lineup records.
LINEUP_CHANNEL = "29"

# Source URLs are resolved at runtime by discovery.resolve(); nothing is
# hardcoded here on purpose.

# --- politeness / fetch behaviour -------------------------------------------
USER_AGENT = "spatula-comp-dataset/0.1 (personal research; contact: you@example.com)"
REQUEST_DELAY_S = 2.0     # gap between requests within one run
TIMEOUT_S = 30.0
MAX_RETRIES = 3
# Refuse to re-download a source more often than this (protects against
# accidental hammering when a scheduled job misfires).
MIN_REFETCH_INTERVAL_S = 6 * 60 * 60
