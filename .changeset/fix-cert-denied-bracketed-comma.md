---
"eyecite-ts": patch
---

fix(extract): `cert. denied[,]` (bracketed comma) detects subsequent history (#526)

Resolves #526. The `cert. denied` history-signal regex required the
next char to be whitespace / comma / semicolon / paren / EOF — `[`
was not admitted. The `cert. denied[,]` form (bracketed comma — an
editorial-insertion convention used by some reporters) silently
dropped the subsequent-history clause. Both the parent's
`subsequentHistoryEntries` and the child's `subsequentHistoryOf`
back-pointer were lost.

| input | before | after |
|---|---|---|
| `cert. denied[,] 479 U.S. 1059` | no history | parent=`[cert_denied]`, child back-points ✓ |
| `cert. denied, 479 U.S. 1059` (canonical) | unchanged | unchanged ✓ |

Fix: extended the lookahead character class to include `[`.

2 regression tests in `tests/extract/issueCertDeniedBracketedComma.test.ts`.
