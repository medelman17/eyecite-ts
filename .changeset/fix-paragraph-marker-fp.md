---
"eyecite-ts": patch
---

Fix ~233 false positive case citations caused by paragraph/footnote markers (e.g., ¶2) being misidentified as citation volumes (#128). Single-digit volumes (1-9) with unrecognized reporters are now flagged by the false-positive filter, using reporters-db validation when loaded or an expanded prose-word blocklist as fallback.
