---
"eyecite-ts": patch
---

fix: caseName backward search truncates at section-heading `Is`/`Are`/`Was`/`Were` boundary

In documents where a section heading repeats the case name —
common in legal briefs:

```
Des Roches v. California Physicians' Service Is Distinguishable
In Des Roches v. California Physicians' Service, 320 F.R.D. 486 (N.D. Cal. 2017), ...
```

— the case-name backward search absorbed the heading's text into
the defendant, producing
`caseName="Des Roches v. California Physicians' Service Is
Distinguishable In Des Roches v. California Physicians' Service"`.
The existing consolidated-caption recovery (#222) only truncates
at the first comma in the defendant; section headings have no
internal commas so the recovery didn't fire.

### Fix

After the multi-`v.` comma-truncation step, also check for a
standalone capitalized to-be verb (`Is`, `Are`, `Was`, `Were`)
inside the defendant. Real corporate / party names don't contain
these verbs as standalone tokens, so their presence is a reliable
heading-boundary signal. Truncate the defendant at the verb.

### Tests

7 new tests in `tests/extract/issueCaseNameHeadingBoundary.test.ts`:
heading + body with the same case name (3 variants — `Is`,
`Are`), plus regressions for `Anthem, Inc.` (real defendant
preserved), single citations with no heading, California
year-first form, and consolidated-caption first-comma trim.
Full 2949-test suite passes.
