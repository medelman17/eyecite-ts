---
"eyecite-ts": patch
---

test: regression fixtures for California year-first form (#263)

Eight regression tests covering the specific fixtures from issue #263 — all
documented California-style citations with year-first parentheticals between
caption and reporter that previously dropped caseName/plaintiff/defendant.

#263 reported 100% caseName-extraction failure on cluster 2636992 (People v.
Talibdeen, Cal. SC 2002) and ~5% on cluster 2252939 (In re Marriage of
Falcone & Fyke, Cal. Ct. App. 2008). All eight fixtures from the bug report
now pass — the underlying parser fix landed in #270 — and these tests pin
the behavior so any regression surfaces immediately.

Fixtures: `People v. Tillman (2000)`, `(People v. Tillman (2000))`,
`In re Marriage of Bower (2002)`, `(People v. Rubalcava (2000))`,
`In re Sophia B. (1988)`, `(Khan v. Medical Board (1993))`,
`People v. Smith (2001) ... [102 Cal.Rptr.2d 731]` (parallel form).
