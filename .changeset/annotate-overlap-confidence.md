---
"eyecite-ts": patch
---

Fix `annotate` producing malformed sentinels for overlapping core spans (#545).

When two citations' core `span.originalStart`/`originalEnd` ranges overlapped (e.g., a statute false-positive nested inside a case name's core span), `annotate` spliced both wraps and chopped one sentinel into the middle of the other's text, producing malformed output. Roughly 7% of opinions were affected.

The overlap detection added in #543 now applies to core-span wraps too, and is confidence-aware: when two wraps intersect, the citation with the higher `confidence` score wins and the other is surfaced via the `skipped` array. Nested wraps (one fully inside another) always keep the outer wrap. The `AnnotationResult.skipped` docstring is updated to reflect the new behaviour.
