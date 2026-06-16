---
"eyecite-ts": patch
---

Fix: a bracketed year `[1992]` / `[2d Dept 2012]` (New York Official Reports / Court of Appeals style, and a common Bluebook variant) is now treated like a parenthesized year `(1992)` — it contributes the decision `year` and closes a parallel-reporter run so the cites share a `groupId` (#890). Previously the bracketed form silently lost both the year and the parallel grouping, affecting the large class of NY official-style citations (`N.Y.2d` + `N.Y.S.2d` + `N.E.2d` with a `[year]`).

Recognition is restricted to a genuine year bracket — a `[…]` ending in a 1600–2099 year that is **not** a bracketed parallel cite — so `[U]` markers, the California `(year) [secondary cite]` form (including one whose page looks year-like, e.g. `[20 Cal.Rptr.2d 1995]`), and year-free editorial brackets like `[sic]` are unchanged. An editorial bracket that itself ends in a stray year (`[sic 1992]`) is read as a year exactly as the round-paren `(sic 1992)` already is — bracket/paren parity.
