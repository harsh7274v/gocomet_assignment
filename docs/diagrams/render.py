#!/usr/bin/env python3
"""Render the diagrams embedded in the design docs to SVG + PNG.

The Mermaid code fences in docs/SIMPLE_HLD.md and docs/SCHEMA_DESIGN.md are
the source of truth. This script extracts them into docs/diagrams/source/,
then renders each one twice: a white-background SVG for the docs and a PNG
for slides / sharing. The hand-authored system overview SVG is copied as-is
and screenshotted to PNG with Chrome.

Usage:
    python3 docs/diagrams/render.py

Dependencies:
    - Node.js (for @mermaid-js/mermaid-cli / mmdc)
    - Google Chrome (used as the Puppeteer browser)

You can point the script at a specific mmdc binary with MMDC=... and at a
specific Chrome binary with PUPPETEER_EXECUTABLE_PATH=...
"""

from __future__ import annotations

import atexit
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import NoReturn

ROOT = Path(__file__).resolve().parents[2]
DIAGRAMS = Path(__file__).resolve().parent
SOURCE = DIAGRAMS / "source"
MERMAID_CONFIG = DIAGRAMS / "mermaid-config.json"
CHROME = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")

# Order matters: the Mermaid blocks are extracted in document order.
DOC_SOURCES = [
    (
        "docs/SIMPLE_HLD.md",
        [
            ("hld-system-architecture", "System architecture"),
            ("hld-bid-decision-flow", "Bid and extension decision flow"),
            ("hld-auction-lifecycle", "Auction lifecycle"),
            ("hld-websocket-events", "WebSocket event distribution"),
        ],
    ),
    (
        "docs/SCHEMA_DESIGN.md",
        [
            ("schema-relationship-map", "Schema relationship map"),
            ("schema-erd", "Full entity-relationship diagram"),
        ],
    ),
]

MERMAID_BLOCK = re.compile(r"```mermaid\s*\n(.*?)\n```", re.DOTALL)


def fail(message: str) -> NoReturn:
    print(f"error: {message}", file=sys.stderr)
    raise SystemExit(1)


def find_mmdc() -> list[str]:
    explicit = os.environ.get("MMDC")
    if explicit:
        return [explicit]
    found = shutil.which("mmdc")
    if found:
        return [found]
    return ["npx", "--yes", "@mermaid-js/mermaid-cli"]


def chrome_path() -> Path | None:
    explicit = os.environ.get("PUPPETEER_EXECUTABLE_PATH")
    if explicit:
        return Path(explicit)
    if CHROME.exists():
        return CHROME
    return None


def resolved_puppeteer_config() -> Path | None:
    executable = chrome_path()
    if executable is None:
        return None

    config: dict[str, object] = {
        "executablePath": str(executable),
        "args": ["--no-sandbox", "--disable-setuid-sandbox"],
    }

    handle = tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", prefix="mermaid-puppeteer-", delete=False
    )
    json.dump(config, handle)
    handle.close()
    path = Path(handle.name)
    atexit.register(path.unlink, missing_ok=True)
    return path


def extract_mermaid_blocks() -> list[tuple[str, str]]:
    rendered: list[tuple[str, str]] = []
    for relative_path, entries in DOC_SOURCES:
        doc = ROOT / relative_path
        if not doc.exists():
            fail(f"missing source document: {relative_path}")

        blocks = [block.strip() for block in MERMAID_BLOCK.findall(doc.read_text())]
        if len(blocks) != len(entries):
            fail(
                f"{relative_path}: expected {len(entries)} Mermaid blocks, "
                f"found {len(blocks)}"
            )

        for (name, label), block in zip(entries, blocks):
            output = SOURCE / f"{name}.mmd"
            output.write_text(
                f"%% Generated from {relative_path} — edit the document, not this file.\n"
                f"{block}\n"
            )
            print(f"  extracted {relative_path} -> source/{name}.mmd ({label})")
            rendered.append((name, label))
    return rendered


def render_mermaid(entries: list[tuple[str, str]], puppeteer: Path | None) -> None:
    mmdc = find_mmdc()
    common = ["-c", str(MERMAID_CONFIG)]
    if puppeteer is not None:
        common.extend(["-p", str(puppeteer)])

    for name, label in entries:
        source = SOURCE / f"{name}.mmd"
        svg = DIAGRAMS / f"{name}.svg"
        png = DIAGRAMS / f"{name}.png"

        print(f"  rendering {label} -> {name}.svg")
        subprocess.run(
            mmdc + ["-i", str(source), "-o", str(svg), "-b", "white"]
            + ["--no-font-embed"] + common,
            check=True,
        )
        print(f"  rendering {label} -> {name}.png")
        subprocess.run(
            mmdc + ["-i", str(source), "-o", str(png), "-b", "white"]
            + ["--size", "2600", "-s", "1.5"] + common,
            check=True,
        )


def render_overview_png() -> None:
    source = SOURCE / "hld-system-overview.svg"
    if not source.exists():
        fail("missing source/hld-system-overview.svg")

    svg = DIAGRAMS / "hld-system-overview.svg"
    shutil.copyfile(source, svg)
    print("  copied system overview -> hld-system-overview.svg")

    chrome = chrome_path()
    if chrome is None:
        print(
            "  ! Google Chrome not found; skipping hld-system-overview.png",
            file=sys.stderr,
        )
        return

    png = DIAGRAMS / "hld-system-overview.png"
    print("  screenshotting system overview -> hld-system-overview.png")
    result = subprocess.run(
        [
            str(chrome),
            "--headless=new",
            "--disable-gpu",
            "--hide-scrollbars",
            "--no-first-run",
            "--no-default-browser-check",
            "--force-device-scale-factor=2",
            "--window-size=1800,1080",
            f"--screenshot={png}",
            source.resolve().as_uri(),
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0 or not png.exists():
        fail(f"Chrome could not render the overview PNG:\n{result.stderr.strip()}")


def main() -> None:
    SOURCE.mkdir(parents=True, exist_ok=True)

    print("Extracting Mermaid sources from the docs…")
    entries = extract_mermaid_blocks()

    print("Rendering diagrams…")
    render_mermaid(entries, resolved_puppeteer_config())
    render_overview_png()

    print("\nDone. Open docs/diagrams/index.html to browse the atlas.")


if __name__ == "__main__":
    main()
