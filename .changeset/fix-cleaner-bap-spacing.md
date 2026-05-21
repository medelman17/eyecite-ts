---
"eyecite-ts": patch
---

fix(clean): preserve space in `<X>. <N>th Cir.` court parentheticals

The reporter-spacing cleaner's general ordinal-suffix rule
(`([A-Za-z])\.\s+(\d+[a-z]+)` → collapse) blindly stripped the space
before any ordinal token, even when the ordinal was a circuit number
rather than a reporter edition:

| input | before | after |
|---|---|---|
| `B.A.P. 9th Cir.` | `B.A.P.9th Cir.` | `B.A.P. 9th Cir.` ✓ |
| `Bankr. 9th Cir.` | `Bankr.9th Cir.` | `Bankr. 9th Cir.` ✓ |
| `La. App. 3d Cir.` | `La. App.3d Cir.` | `La. App. 3d Cir.` ✓ |

Fix: anchor the ordinal with `\b` to defeat greedy backtracking, then
add a negative lookahead `(?!\s+Cir\.)` so the collapse skips circuit
numbers. Reporter editions (`Wis. 2d`, `F. Supp. 2d`, `So. 2d`, `Cal.
Rptr. 2d`) continue to collapse correctly.

Pre-existing Louisiana date-in-number tests (#232) that pinned the
buggy `La. App.3d Cir.` form are updated to expect the canonical
Bluebook T7 form `La. App. 3d Cir.`.

6 regression tests in `tests/extract/issueCleanerBAPSpacing.test.ts`.
