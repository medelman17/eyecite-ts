---
"eyecite-ts": patch
---

fix(extract): parseDate handles `Mon., DD, YYYY` (comma after period) (#554)

Resolves the remaining sub-issue of #554. `parseDate` dropped month/day
for the `Mon., DD, YYYY` form (comma immediately after the period).
The other non-canonical forms (ISO, European, slash, missing-space-
after-period) had already been fixed by prior PRs.

| input | before | after |
|---|---|---|
| `Jan., 15, 2020` | year=2020, month/day dropped | full date ✓ |
| `Feb., 9, 2015` | year=2015, month/day dropped | full date ✓ |
| `Jan. 15, 1990` (canonical) | full date | unchanged ✓ |
| `Jan.15, 1990` (no space) | full date | unchanged ✓ |
| `Jan 15, 1990` (no period) | full date | unchanged ✓ |

Fix: extended the abbreviated-month regex separator alternation from
`(?:\.?\s+|\.\s*)` to `(?:\.?,?\s+|\.,?\s*)` to accept an optional
comma between the period and the day.

5 regression tests in `tests/extract/issueParseDateCommaAfterPeriod.test.ts`.
