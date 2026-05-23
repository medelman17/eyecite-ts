---
"eyecite-ts": patch
---

fix(score): `inheritSubsequentHistoryCaseName` recomputes child confidence (#613)

Resolves #613. `inheritSubsequentHistoryCaseName` mutated `caseName` /
`plaintiff` / `defendant` onto subsequent-history child citations
AFTER `buildCaseCitation` had already locked in their confidence
score. The +0.15 caseName bonus never fired for the child.

This is the same bug pattern as #556 (parallel-cite secondaries),
fixed there in PR #611. Mechanical port: call `computeCaseConfidence`
on each child after the caption mutation.

| input | before | after |
|---|---|---|
| `Smith v. Jones, 100 F.2d 1 (9th Cir. 1990), aff'd, 200 U.S. 5` | child confidence missed caseName bonus | child confidence ≥ 0.9 ✓ |
| `Smith v. Jones, 100 F.2d 1, rev'd, 200 U.S. 5` | child confidence missed caseName bonus | child confidence ≥ 0.9 ✓ |
| `Smith v. Jones, 100 F.2d 1` (standalone) | unchanged | unchanged ✓ |

3 regression tests in `tests/extract/issueSubsequentHistoryConfidence.test.ts`.
