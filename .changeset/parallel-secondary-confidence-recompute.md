---
"eyecite-ts": patch
---

Recompute confidence for parallel-cite secondary citations after `inheritParallelCaseName` propagates the shared caption (#556).

`inheritParallelCaseName` runs as a post-pass and mutates `caseName` / `plaintiff` / `defendant` onto each secondary cite in a parallel-cite group (e.g. `93 S. Ct. 705` and `35 L. Ed. 2d 147` in `Roe v. Wade, 410 U.S. 113, 93 S. Ct. 705, 35 L. Ed. 2d 147 (1973)`). But each secondary's `confidence` was already locked in by `buildCaseCitation()` when its `caseName` was still `undefined`, so the score missed the `+0.15` caseName signal it now qualifies for. CAP-corpus audit (300 opinions): roughly 94% of citations that had a full case name, a year, and a court but landed under 0.7 confidence were parallel secondaries stuck at the pre-inheritance score.

Fix:

- Extract the case-citation confidence formula out of `buildCaseCitation` into a pure helper `computeCaseConfidence({ reporter, year, caseName, court, hasBlankPage })`.
- Call it from the original site (no behavior change for citations that don't go through inheritance).
- After `inheritParallelCaseName` mutates the caption fields on a secondary, recompute its confidence with the same helper so the inherited `caseName` registers in the score.

The recompute only fires on secondaries whose `caseName` was previously undefined (the inheritance loop already short-circuits for ones that already have one). Primary cites and non-parallel cites are untouched.

Concrete deltas for repros in the issue:

- `Roe v. Wade, 410 U.S. 113, 93 S. Ct. 705, 35 L. Ed. 2d 147 (1973)` — each secondary picks up +0.15 (`0.5 → 0.65` for the SCOTUS secondaries, bounded by the reporter-database lookup tracked separately by #555).
- `Nixon v. Nixon, 329 Pa. 256, 198 A. 154 (1938)` — `198 A. 154` rises from 0.70 to 0.85.
- `People v. Smith (2001) 24 Cal.4th 849 [102 Cal.Rptr.2d 731]` — `102 Cal.Rptr.2d 731` rises from 0.20 to 0.35.
