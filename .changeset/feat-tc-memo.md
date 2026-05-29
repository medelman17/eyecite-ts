---
"eyecite-ts": minor
---

feat(extract): Tax Court Memorandum decisions (`T.C. Memo. YYYY-NNN`) (#324)

Resolves #324. Tax Court Memorandum decisions — the dominant authority
in U.S. Tax Court opinions and common in any federal tax-related
opinion — weren't recognized.

| input | before | after |
|---|---|---|
| `T.C. Memo. 2002-89` | 0 cites | neutral / court=`T.C. Memo.` / year=2002 / doc=89 ✓ |
| `Robida v. Commissioner, T.C. Memo. 1970-86` | 0 cites | neutral with caseName backscan ✓ |
| `Shollenberger v. Commissioner, T.C. Memo. 2009-306` | 0 cites | neutral ✓ |

Added a new `tc-memo` pattern in `neutralPatterns` and a matching
branch in `extractNeutral`. Treated as a neutral citation because the
year acts as the volume identifier. Requires the periodized `T.C.`
form (`TC Memo.` without periods does not match — strict to avoid
false positives).

4 regression tests in `tests/extract/issueTcMemo.test.ts`.
