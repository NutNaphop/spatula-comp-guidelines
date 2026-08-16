"""Golden Spatula TFT comp dataset toolkit."""
import sys

__version__ = "0.1.0"

# Windows consoles default to the locale codepage (cp874 on a Thai system),
# which raises UnicodeEncodeError as soon as we print Thai champion names.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        try:
            _stream.reconfigure(encoding="utf-8", errors="replace")
        except (ValueError, OSError):  # detached / non-tty stream
            pass
