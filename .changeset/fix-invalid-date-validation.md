---
"eyecite-ts": patch
---

fix(extract): impossible dates (Feb 30, Apr 31, Feb 29 non-leap) fall back to month-only (#716)

Resolves #716. `parseDate` accepted syntactically well-formed but
semantically impossible dates (`Feb 30`, `Apr 31`, `Feb 29` in non-leap
years), producing a syntactically valid ISO string for a date that
doesn't exist:

| input | before | after |
|---|---|---|
| `Feb 30 2020` | `iso="2020-02-30"`, `day=30` | `iso="2020-02"`, `day=undefined` ✓ |
| `Apr 31 2020` | `iso="2020-04-31"` | `iso="2020-04"` ✓ |
| `Feb 29 2021` (non-leap) | `iso="2021-02-29"` | `iso="2021-02"` ✓ |
| `Feb 29 2020` (leap) | `iso="2020-02-29"` | unchanged ✓ |

Added `isValidDate(year, month, day)` helper with leap-year awareness
(div-4, except centuries unless div-400). All four parseDate code paths
(abbreviated month, full month, ISO, European) now drop the `day`
field when invalid and return `{ year, month }` instead.

6 regression tests in `tests/extract/dates.invalidDate.test.ts`.
