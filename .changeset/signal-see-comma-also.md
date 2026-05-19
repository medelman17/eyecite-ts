---
"eyecite-ts": patch
---

Recognize `See, also,` (extra inter-word comma) as the `see also` signal.

Older typesetting variants in legal opinions sometimes insert an extra comma between `See` and `also`, producing forms like `See, also, The Plymouth, 70 U.S. (3 Wall.) 20`. The canonical `See also` worked; the comma-bearing variant was missed entirely (signal=undefined).

Both the prefix matcher (`SIGNAL_PATTERNS` in `detectStringCites.ts`) and the leading-signal scanner (`detectLeadingSignals`) now accept optional `\s*,?\s+` between `see` and `also`. Affects both `see also` and the combined `see also, e.g.` form.

Surfaced by a CAP-corpus signal-extraction audit on a 19th-century admiralty case. The canonical `See also` continues to extract identically.
