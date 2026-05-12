---
"eyecite-ts": patch
---

fix: extract court from CSM year-first parenthetical `(court year)` (#293)

California Style Manual citations place the court+year parenthetical
**before** the volume-reporter-page rather than after:
`Camden I Condominium Assn. v. Dunkle (11th Cir. 1991) 946 F.2d 768`.
The existing year-first machinery (#19) captured the year but dropped
the court — `court` ended up `undefined` even though `(11th Cir. ...)`
explicitly states it.

Surfaced by a 200-opinion modern-era sweep as the **largest** field-
extraction gap (195 instances) — California opinions are the largest
single-jurisdiction body of US case law and use CSM almost universally,
so federal cites within California opinions show this pattern dozens of
times per opinion.

### Fix

Two pieces:

1. `V_CASE_NAME_REGEX` and `PROCEDURAL_PREFIX_REGEX` now accept an
   optional court prefix inside the CSM trailing paren:
   `\((?:([^)]*?\.[^)]*?)\s+)?(\d{4})\)`. The court text must contain
   a period so loose forms like `(March 1991)` aren't mis-attributed as
   courts — Bluebook T7 court abbreviations all contain at least one
   period. Group 3 = court (optional), group 4 = year.
2. Both consumer sites build a `precedingDocketMeta` payload when both
   court and year are captured. The existing Louisiana-docket meta
   handler at the consumer end (`extractCase.ts` line ~2502) already
   propagates `precedingDocketMeta.court` onto the citation as
   fallback when no trailing court paren is present.

Year-only CSM (`In re K.F. (2009)`) continues to work via the dedicated
`year`/`yearStart`/`yearEnd` fields — unchanged for that path. Trailing-
paren form still wins when both forms are present (defensive — extremely
rare in practice).

### Tests

5 new tests under `CSM year-first with court (#293)` in
`tests/extract/extractCase.test.ts`:

- `(11th Cir. 1991)` in v. form — court="11th Cir.", year=1991
- `(2d Cir. 2005)` in v. form
- `(9th Cir. 2014)` in procedural-prefix form
- Year-only `(2013)` — court undefined, no regression
- Year-only procedural prefix `In re K.F. (2009)` — court undefined,
  no regression

Full 2384-test suite passes; no regressions.
