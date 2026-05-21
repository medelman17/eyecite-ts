---
"eyecite-ts": patch
---

fix(extract): bare `Code § N` cites in DC opinions route to D.C. Code — #659

Both DC and VA write statute cites as bare `Code § N` without
jurisdiction prefix, and both use overlapping section formats (period-
laden `22-404.01` and no-period `22-404`). The existing
`extractVaBareCode` and GA pre-1983 extractors silently claimed every
bare `Code §` for VA or GA based on the section number's punctuation —
so DC opinions citing their own code came out as `Va. Code` or `Ga.
Code`, breaking jurisdictional filters.

New post-process pass `reassignDcCodeJurisdiction` walks citations in
document order, looks back ~400 chars for the most recent
jurisdiction signal (`D.C. Code`, `D.C. Cir.`, `D.C.`, `District of
Columbia` vs `Va.`, `Virginia`), and re-routes bare-`Code §` cites
tagged as VA or GA to DC when DC is the nearest signal.

Documented examples:
- `D.C. Code § 22-404(a). The court also considered Code § 22-404.01(a)(2).` → both DC
- `District of Columbia statute at issue is Code § 22-404(a)(2).` → DC (period-less section)
- `See Smith v. Jones, 500 F.2d 100 (D.C. Cir. 2010). Per Code § 22-404.01(a)(2), ...` → DC

Regression guards:
- `Code § 18.2-308.2` (no DC context) → still VA
- `Virginia Code § 8.01-581.17` → still VA
- VA opinion with subsequent bare cite → still VA
- Mixed `D.C. Code ... Va. Code ... Code § N` (VA is most recent) → VA

8 new tests in `tests/extract/issue659DcCodeJurisdiction.test.ts`.
