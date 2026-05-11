---
"eyecite-ts": patch
---

fix: Louisiana date-in-number citations + two-digit-year slash dates (#232)

Louisiana practice prepends a docket-style identifier and slash-date court
parenthetical before the reporter citation:

```
Herff Jones, Inc. v. Girouard, 07-393, p. 2 (La. App. 3d Cir. 10/3/07),
  966 So. 2d 1127, 1130
```

Previously the docket-prefix segment bled into the case name on the trailing
`So. 2d` / `So. 3d` citation, producing garbage like
`Herff Jones, Inc. v. Girouard, 07-393, p. 2 (La. App. 3d Cir. 10/3/07)`,
and the year/court/date metadata in the docket paren was dropped entirely
(no year, no court, no date on the citation).

### Changes

- **`parseDate` accepts two-digit years**. `10/3/07`, `2/15/10`, `6/30/20`
  now parse with century inferred at the 50 pivot (00-50 → 21st century,
  51-99 → 20th century). Four-digit years continue to parse as before.
- **LA docket-prefix excision in case-name scanback**. The new
  `LA_DOCKET_BOUNDARY_REGEX` recognizes the LA shape
  `NN-NNNN (La. ... M/D/YY)` (with optional `, p. N` pincite) when it sits
  between caption and reporter, splices it out of `precedingText` (leaving
  just `, `), and surfaces the docket paren's court + date.
- **Metadata transfer**. `extractCaseName` returns an optional
  `precedingDocketMeta` field; `processCaseToken` applies its court / year /
  date as fallback for the trailing reporter citation when that citation has
  no court paren of its own.

The Louisiana docket-prefix is not yet emitted as its own first-class
citation (linked via `detectParallel.ts` per the issue's full acceptance
criteria) — that remains follow-up work. The primary `So. 2d` / `So. 3d`
citation now carries clean caseName plus structured year / court / date.

### Tests

- **`parseDate` two-digit years**: 7 new tests in `tests/extract/dates.test.ts`
  covering the pivot, ranges, and 4-digit regression.
- **Louisiana citations**: 3 new fixtures (all three from the issue
  reproduction) + 2 regression controls (plain `(La. 2010)` and non-LA
  month-name dates).
