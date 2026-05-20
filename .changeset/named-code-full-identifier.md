---
"eyecite-ts": patch
---

fix(extract): named-code `code` carries the full identifier (#568)

Named-code citations like `Cal. Civ. Code § 51` previously dropped both
the jurisdiction prefix and the trailing `Code` / `Law` suffix, storing
only the cleaned body — `Civ.` instead of `Cal. Civ. Code`, `Penal`
instead of `N.Y. Penal Law`. Consumers couldn't reconstruct the original
identifier from the parsed citation.

`extractNamedCode` now stores the full identifier in `code`: the
jurisdiction prefix as it appeared in the source, plus the body (Code
name + suffix), e.g. `Cal. Civ. Code`, `Cal. Penal Code`, `California
Civil Code`, `N.Y. Penal Law`, `Tex. Penal Code`. Internal registry
lookups continue to use the cleaned body as the lookup key.

Three pre-existing tests (and one golden-corpus fixture) that asserted
the truncated body shape have been updated to the full identifier.
