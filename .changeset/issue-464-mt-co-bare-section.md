---
"eyecite-ts": patch
---

fix: extend bare-section jurisdiction context to MT (MCA) and CO (C.R.S.) (#464)

The #432 fix introduced per-document context propagation for
bare-section citations (`§ N-N-N`), but only recognized West
Virginia (`W.Va. Code`). **29 occurrences** across MT (17) and
CO (12) in the v0.16.2 replay were still routed to NM:

| State | Trigger | Example |
|---|---|---|
| MT | `, MCA` postfix | `§§ 49-2-205 and -303, MCA` |
| CO | `C.R.S.` context | `C.R.S. § 13-25-126; § 13-25-130` |

### Fix

Generalized `inheritBareSectionJurisdiction` (step 4.7) to a
table-driven override map covering WV, CO, and MT. Additionally,
when a bare `§ N-N-N` is followed within the same sentence by a
`, MCA` (or `, M.C.A.`) postfix, the citation is rerouted to MT
even without preceding C.R.S./W.Va. Code context.

### Tests

8 new tests in `tests/extract/issue464MtCoBareSection.test.ts`:
MT trailing-postfix in list, MT standalone (regression), MT
same-paragraph not-attached postfix, CO `C.R.S.` propagation, CO
`Colo. Rev. Stat.` propagation, NM default preserved, WV (#432)
regression, NMSA regression. Full 2909-test suite passes.
