---
"eyecite-ts": patch
---

fix: caseName field no longer absorbs trailing year, court+year, and parallel-citation tokens (#436)

The `caseName` field was absorbing content that doesn't belong to
the name itself: **451 confirmed boundary violations** across all
39 sampled states (379 trailing year `(YYYY)`, 9 trailing
court+year `(Court YYYY)`, 63 trailing parallel-cite start
`, NNN <reporter> NN`).

### Fix

After `extractCaseName` returns, strip trailing tokens from
`caseName` in `src/extract/extractCase.ts`:

- Trailing `(YYYY)` or `(Court YYYY)` paren → strip whole paren
- Trailing `, NNN <Reporter> NN` parallel-cite start → strip
- Trailing `, NNNN <STATE> NN` neutral-cite shape → strip

The CSM year-first form's year continues to be captured into
the `year` field by `extractCaseName`; only the surface text of
the case name is cleaned.

### Behavior changes

- `Holton v. F. H. Stoltze Land & Lumber Co. (1981), 195 Mont. 1`
  → `caseName="Holton v. F. H. Stoltze Land & Lumber Co."` (was
  `"Holton v. F. H. Stoltze Land & Lumber Co. (1981)"`)
- `United States v. Villano (10th Cir. 1987), 829 F.2d 1158`
  → `caseName="United States v. Villano"` (was `"... v. Villano
  (10th Cir. 1987)"`)
- `State v. Lane, 1998 MT 76, 962 P.2d 1190` → `caseName="State
  v. Lane"` on the P.2d cite (was `"State v. Lane, 1998 MT 76"`)

### Tests

3 new tests under `caseName trailing-token absorption (#436)`
in `tests/extract/extractCase.test.ts`. Full 2766-test suite
passes; no regressions.
