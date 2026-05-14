---
"eyecite-ts": patch
---

fix: WV bare-section follow-ons inherit WV jurisdiction (#432)

Bare-section citations of the form `§ N-N-N` were always routed
to New Mexico (`NM`), because the `nm-bare-section` pattern
defaults to NM regardless of document context. In West Virginia
opinions, the conventional follow-on after one fully-qualified
`W.Va. Code §` or `Code 1931 §` reference is `§ 55-7B-7`,
`§ 61-3-12`, `§ 8-24-1`, etc. — **33 occurrences** mis-routed
to NM in WV-sample opinions.

### Fix

New `inheritBareSectionJurisdiction` post-extract pass in
`src/extract/extractCitations.ts`. Forward single-pass over
citations: tracks the most recent WV / NM jurisdictional context
established by a full-form statute citation, and reassigns
bare-section `NMSA 1978` citations to `W. Va. Code` (jurisdiction
`WV`) when WV context is active.

This is the fourth and final entry in the cross-jurisdiction
routing cluster: #54 (MSA→MN), #58 (R.C.→OH), #422 (I.C.→IN),
now this. Each used context-aware disambiguation rather than
hardcoding state precedence.

### Tests

6 new tests under `WV bare-section context propagation (#432)`
in `tests/extract/extractStatute.test.ts` covering: WV-context
inheritance, multi-bare inheritance, no-context default-to-NM,
NM-context regression, and WV→NM context switching mid-document.
Full 2792-test suite passes; no regressions.
