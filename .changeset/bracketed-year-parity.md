---
"eyecite-ts": patch
---

Fix: a bracketed year `[1992]` / `[2d Dept 2012]` (New York Official Reports / Court of Appeals style, and a common Bluebook variant) is now treated like a parenthesized year `(1992)` — it contributes the decision `year` and closes a parallel-reporter run so the cites share a `groupId` (#890). Previously the bracketed form silently lost both the year and the parallel grouping, affecting the large class of NY official-style citations (`N.Y.2d` + `N.Y.S.2d` + `N.E.2d` with a `[year]`). Recognition is year-specific (a bracket ending in a 1600–2099 year), so other bracket forms — `[U]` unpublished markers, editorial `[sic]`, and the California `[secondary cite]` parallel form — are unchanged.
