# Diagram Atlas

Static SVG and PNG renders of the diagrams in `docs/SIMPLE_HLD.md` and
`docs/SCHEMA_DESIGN.md`.

## Browse

Open [`index.html`](./index.html) in a browser. It is a plain, offline page —
no server or build step required. Click any preview to inspect it, use the
arrow keys to move between diagrams, and download the SVG or PNG from the card
or the inspector.

## Contents

| File | Source | Description |
|---|---|---|
| `hld-system-overview.svg/.png` | hand-authored SVG | Four-layer system overview: client, gateway, engines, storage |
| `hld-system-architecture.svg/.png` | `SIMPLE_HLD.md` §1 | Component architecture and wiring |
| `hld-bid-decision-flow.svg/.png` | `SIMPLE_HLD.md` §3 | Bid validation, ranking, and extension decision flow |
| `hld-auction-lifecycle.svg/.png` | `SIMPLE_HLD.md` §4 | DRAFT → SCHEDULED → ACTIVE → CLOSED / FORCE_CLOSED / CANCELLED |
| `hld-websocket-events.svg/.png` | `SIMPLE_HLD.md` §5 | Real-time WebSocket fan-out |
| `schema-relationship-map.svg/.png` | `SCHEMA_DESIGN.md` §2.1 | Compact seven-table relationship map |
| `schema-erd.svg/.png` | `SCHEMA_DESIGN.md` §2.2 | Full column-level entity-relationship diagram |

The white-background SVGs are used by the Markdown documents. The PNGs use the
same background and are intended for slides, chat, and other places that do not
handle SVG well.

## Regenerate

The Mermaid code fences inside the two Markdown documents are the source of
truth. After editing a diagram there, run:

```bash
python3 docs/diagrams/render.py
```

The script extracts the Mermaid blocks, writes copies to `source/`, renders
each diagram to SVG and PNG, and regenerates `hld-system-overview.png` from
the hand-authored overview SVG.

Requirements:

- Node.js and `@mermaid-js/mermaid-cli` (the script uses `mmdc` from `PATH`,
  the `MMDC` environment variable, or `npx --yes @mermaid-js/mermaid-cli` as a
  fallback).
- Google Chrome, used as Mermaid CLI's headless browser and for the overview
  screenshot. Override its location with `PUPPETEER_EXECUTABLE_PATH` if needed.

Example with a local Mermaid CLI install:

```bash
MMDC=/path/to/node_modules/.bin/mmdc python3 docs/diagrams/render.py
```
