---
"eyecite-ts": patch
---

fix(extract): accept N.J.S.A. with inter-letter spacing (`N. J. S. A.`)
(#593)

The previous NJ regex fragment required no whitespace between the
inter-letter periods, so `N. J. S. A. 2:100-26` (whitespace between
every letter — common in older NJ Super and NJ reporters) failed to
tokenize. Documented as 38 hits across a 600-opinion sample.

`src/data/stateStatutes.ts` — extend the NJ regex fragment from
`N\.?J\.?\s*S(?:tat)?\.?\s*A?\.?` to
`N\.?\s*J\.?\s*S(?:tat)?\.?\s*A?\.?` so whitespace is permitted
between every letter pair. Same tolerance pattern already used for
Pennsylvania (`Pa.C.S.` / `Pa. C.S.` / `Pa. C. S.`) and Ohio
(`R.C.` / `R. C.`). Canonical citation remains `N.J.S.A.` (Bluebook).
