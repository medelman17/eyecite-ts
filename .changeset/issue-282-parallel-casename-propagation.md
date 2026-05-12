---
"eyecite-ts": patch
---

fix: propagate `caseName` from primary to parallel-cite secondaries (#282)

For parallel reporter citations like `Roe v. Wade, 410 U.S. 113, 93 S. Ct. 705,
35 L. Ed. 2d 147 (1973)`, only the primary cite carried the shared caption;
the secondaries had `caseName === undefined` even though they refer to the
same case. The disambiguation fix in #281 prevented secondaries from leaking
the prior reporter cite into their own caseName — this PR fills in the
correct caption rather than `undefined`.

### Root cause

`detectParallelCitations` already populates the shared `groupId` on every
cite in a group and the `parallelCitations` array on the primary, but no
pass propagates the caption metadata. The per-cite case-name scanner only
runs for cites that have a directly preceding caption — by construction
only the first cite in the group does.

### Fix

Added `inheritParallelCaseName` (modeled on the existing
`inheritSubsequentHistoryCaseName` pass for #224 history-chain children).
Runs at "Step 4.6" in `extractCitations`, immediately after the
subsequent-history inheritance pass so a primary that inherited from a
history chain root still flows that caption to its parallels.

Joins on `groupId`, takes the first cite per group that has a `caseName`
(the primary by construction), and copies `caseName`, `plaintiff`,
`defendant`, `plaintiffNormalized`, `defendantNormalized`, and
`proceduralPrefix` onto every other cite in the same group. Does not
overwrite an existing `caseName` on a secondary (defensive — shouldn't
happen, but pinned by test). Does not touch `spans` or `fullSpan` — the
secondary's own citation core is unchanged.

### Tests

4 new tests under `Parallel Citation caseName Propagation (#282)` in
`tests/integration/fullPipeline.test.ts`:

- Roe v. Wade (3 reporters) — all 3 cites carry `Roe v. Wade` + `Roe` / `Wade`
- Nixon v. Nixon (2 reporters)
- People v. Smith (California bracketed parallel: `(2001) 24 Cal.4th 849
  [102 Cal.Rptr.2d 731]`)
- Single non-parallel cite — baseline that propagation doesn't touch
  cites without a `groupId`

Full 2372-test suite passes; no regressions.
