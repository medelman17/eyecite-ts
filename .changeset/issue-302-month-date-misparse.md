---
"eyecite-ts": patch
---

fix: hard-reject `<day> <Month> <year>` phantom citations like `8 April 1988` (#302)

The state-reporter tokenizer's broad `<volume> <Word> <page>` pattern
was capturing date-shaped prose as phantom case citations:
`8 April 1988` became `volume=8, reporter="April", page=1988`. The
existing false-positive filter could catch these but only when callers
opted into `filterFalsePositives: true`; without the opt-in, the
phantoms flooded downstream consumers.

### Fix

Added a **hard-reject** pre-pass to `applyFalsePositiveFilters` that
unconditionally drops citations matching the date-shape pattern,
regardless of the caller's `filterFalsePositives` flag. The check
fires when:

1. `reporter` is one of the 12 English month names, AND
2. `volume` is a plausible day-of-month (1–31), AND
3. `page` is a plausible report year (1700 to current year + 5)

All three conditions must hold; any single legitimate-shaped value
keeps the citation in the pipeline (where the standard soft-flag pass
can still flag it). This narrow shape exists explicitly to avoid
collateral damage on cases where one component is a legitimate value.

### Why hard-reject (rather than soft-flag by default)

Soft-flagging would still emit the phantom citation with a low
confidence and a warning, but the citation would still appear in the
result array — and most downstream consumers treat the array as
"these are the citations." There is no policy under which `<day>
<Month> <year>` should be reported as a citation, so removing it is
correct under every caller policy.

### Tests

- 6 new unit tests in `tests/extract/filterFalsePositives.test.ts`
  under `month-name date misparse hard-reject (#302)`: covers
  representative day/month/year shapes for each of the 12 months and
  the two non-rejection boundaries (volume > 31, year < 1700).
- 4 new integration tests in `tests/integration/falsePositives.test.ts`
  exercising the full pipeline: `On 8 April 1988`, `On 15 May 2010`
  produce 0 citations; `100 F.3d 200` and `42 U.S.C. § 1983` baselines
  still extract.

Full 2421-test suite passes; no regressions.
