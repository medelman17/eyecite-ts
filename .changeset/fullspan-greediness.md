---
"eyecite-ts": patch
---

Fix case name backward search extending too far — fullSpan now correctly stops at sentence boundaries and previous citation parentheticals instead of reaching back to position 0. Fixes #114.
