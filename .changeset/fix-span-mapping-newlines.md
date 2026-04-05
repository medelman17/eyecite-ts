---
"eyecite-ts": patch
---

Fix span mapping when input text contains newlines (#134). The `rebuildPositionMaps` algorithm's deletion lookahead misinterpreted same-length character replacements (e.g., `\n` → ` `) as multi-character deletions, causing `originalStart`/`originalEnd` to point to wrong positions. Added a fast-path: when remaining text lengths are equal, all mismatches are treated as 1:1 replacements without lookahead.
