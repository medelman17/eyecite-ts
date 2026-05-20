---
"eyecite-ts": patch
---

Anchor plain-text footnote markers at column 0 (#540).

`MARKER_SRC` previously began with `^\s*`, so indented numbered sub-list items inside a footnote body (`  1. `, `  2. `) were read as new footnote markers, splitting a single footnote into multiple spurious zones. Citations inside the same footnote were then misannotated as belonging to fabricated sibling footnotes, and the resolver's `"footnote"` scope refused to link them.

The marker pattern now requires the digit/`FN`/`[N]`/`n.` prefix to start at column 0 (no leading whitespace). Indented sub-lists inside footnote bodies are correctly treated as continuation text.
