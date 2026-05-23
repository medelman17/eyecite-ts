---
"eyecite-ts": patch
---

fix(extract): bare `§§ N, M` lists (no code prefix) get lower confidence (#726)

Resolves #726. `detectBareSectionLists` produced statute citations
from `§§ 1983, 1985` (bare section-list with no code prefix) at
confidence 0.5 — same as a real statute. The `code` field defaulted
to the literal `§` character, which isn't a meaningful code
identifier.

Lowered confidence to 0.3 when the only code marker is `§` (no
surrounding `Code`/`Code Ann.` prefix). Downstream consumers can now
confidently filter these out at the 0.5 threshold unless they
specifically want unbound section refs.

| input | before | after |
|---|---|---|
| `§§ 1983, 1985` | confidence=0.5 | confidence=0.3 ✓ |
| `Code §§ 19.2-81 and 18.2-266` (with `Code` prefix) | confidence=0.5 | unchanged ✓ |
| `42 U.S.C. § 1983` (real code) | unchanged | unchanged ✓ |

3 regression tests in `tests/extract/issueBareSectionConfidence.test.ts`.
