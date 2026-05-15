---
"eyecite-ts": patch
---

fix: caseName backward search stops at prior citation's `(YYYY)` paren when followed by a list connector

In citation lists with lowercase connectors like
`...(Del. 1984), and Rales v. Blasband, 634 A.2d 927 (Del. 1993)`,
the case-name backward search was crossing the previous
citation's `(YYYY)` closing paren and absorbing it into the
third citation's plaintiff:

```
got: caseName="Del. 1984), and Rales v. Blasband"
     plaintiff="Del. 1984), and Rales"
exp: caseName="Rales v. Blasband"
     plaintiff="Rales"
```

`SENTENCE_BOUNDARY_REGEX` (`[.)]\s+(?=[A-Z(])`) requires the
character after the boundary to be uppercase, so it skipped the
lowercase `and` connector and let the backward search continue.

### Fix

New `PRIOR_YEAR_PAREN_BOUNDARY_REGEX` recognizes
`<year>)\s*(?:,\s*(and|or|see|but\s+see|see\s+also|e\.g\.)|;)\s+`
as a citation boundary. The connector word is required so the
boundary doesn't false-positive on Montana / California
year-first captions where the comma after the year leads to a
parallel reporter (`Holton v. Co. (1981), 195 Mont. 1` — the
`, 195` is a reporter, not a list connector).

### Tests

7 new tests in `tests/extract/issueCaseNameYearParenBoundary.test.ts`:
three-case list with `, and`, two-case list with `, and`,
semicolon connector, `see also` connector, multi-period court
abbrev, and two regression sentinels (simple single citation,
first citation in a list). Full 2925-test suite passes;
existing #436 Montana-year-paren and #19 California-year-first
tests still pass.
