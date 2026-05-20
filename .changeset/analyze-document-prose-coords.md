---
"eyecite-ts": patch
---

Fix `analyzeDocument` prose-span coordinate confusion (#535, #536).

`computeProseOffsets` derived prose-span boundaries via `getCitationStart` / `getCitationEnd`, which return CLEAN-text coordinates, then wrote those same numbers into the output `Span`'s `originalStart` / `originalEnd`. For any text where cleaning shifts positions (HTML, smart quotes, collapsed whitespace, Unicode normalization — i.e., most real opinions), slicing the original text with the wrong coordinates produced invalid prose text. Roughly 25% of opinions were affected, with cumulative drift up to 40+ characters.

`computeProseOffsets` now tracks both clean and original cursors independently, reading each citation's `span.clean*` and `span.original*` (or `fullSpan` when present) directly. Two new helpers `getCitationOriginalStart` / `getCitationOriginalEnd` mirror the existing clean-coord helpers.

`analyzeDocument`'s `transformationMap` option is no longer needed for correctness — citations already carry both coordinate systems — but the option remains in the signature for API compatibility (its value is unused; previously declared as `_transformationMap`, which was itself the cause of #536).

Surfaced by a CAP-corpus `analyzeDocument` quality audit.
