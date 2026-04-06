---
"eyecite-ts": patch
---

fix: prevent greedy false matches in position mapping lookahead (#161)

The `rebuildPositionMaps` lookahead found the *first* matching character,
not the *correct* one. When `normalizeDashes` expanded em-dashes (— → ---)
near text containing hyphens (e.g., page ranges like "110-115"), the
deletion lookahead grabbed the wrong "-", collapsing subsequent position
mappings and producing zero-length original spans on extracted citations.

The fix adds a confirmation check: a lookahead match is only accepted when
at least 3 characters after the match point also align. Both deletion and
insertion directions are searched simultaneously and the shorter confirmed
match wins, preventing greedy false matches.
