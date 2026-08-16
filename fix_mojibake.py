"""Backwards-compatible CLI shim.

The implementation now lives in src/spatula/mojibake.py so the rest of the
pipeline can import it. This keeps the original command working:

    python fix_mojibake.py input.json output.json
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "src"))

from spatula.mojibake import main  # noqa: E402

if __name__ == "__main__":
    main()
