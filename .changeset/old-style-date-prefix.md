---
"eyecite-ts": patch
---

fix(extract): strip old-style date prefix from caseName + harvest year (#511)

The pre-Bluebook citation form `Name, YEAR, vol Reporter page` and the
more elaborate `Name, COURT, MONTH DAY, YEAR, vol Reporter page` left the
date/court tokens inside the captured `caseName` (e.g., `MacPherson v.
Buick Motor Co., 1916`).

Add two post-extract caseName trims (alongside the existing trailing
parenthetical / parallel-cite / neutral-cite trims):

- `,\s+(?:Cir|App|Ct|Dist).,\s+<Month> DD, YYYY` for the federal "circuit
  + filing date" prefix.
- `,\s+(?:17|18|19|20)\d{2}` for the bare-year prefix.

When a year is trimmed, surface it on the citation's `year` field so the
historical date isn't lost.
