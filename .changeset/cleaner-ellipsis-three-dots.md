---
"eyecite-ts": patch
---

Collapse the horizontal ellipsis (`…`, U+2026) to the ASCII 3-dot form during text cleaning instead of relying on the implicit NFKC compatibility decomposition (#548).

Earlier the only thing turning `…` into ASCII dots was `normalizeUnicode`'s call to `String.prototype.normalize("NFKC")`. That made the substitution opaque — readers could not tell from the cleaner pipeline that ellipses were being rewritten, and in the worst-cited audit case the expansion left cleaned text longer than the original span. `normalizeTypography` now performs the substitution explicitly with `…` → `...`, so the rewrite is visible, intentional, and capped at the standard Bluebook 3-dot form. The cleaner still expands 1 input character into 3 output characters, but the expansion is now bounded and documented rather than emerging as a side-effect of compatibility decomposition.
