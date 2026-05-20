---
"eyecite-ts": patch
---

Reject short separator + numbered-list false positives in plain-text footnote detection (#541).

A signature block like `/s/ Judge Smith\n\n-----\n\n1. The first issue...` was mis-classified as a footnote section because the existing 5+ dashes/underscores separator pattern matched the decorative rule and the numbered list looked like markers. Citations in the numbered analysis were then annotated `inFootnote: true` incorrectly.

Tighten in two ways:
- Short separators (5..7 chars) now require the separator to appear at least 25% into the document. Long separators (8+ chars) bypass this gate.
- The digit-period marker pattern now requires the marker line to contain non-whitespace content after the period (`(\d+)\.\s+\S`), rejecting heading-style `1.\n\n`.
