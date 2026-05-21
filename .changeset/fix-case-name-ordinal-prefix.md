---
"eyecite-ts": patch
---

fix(extract): case-name backscan preserves ordinal-prefix party names

The numeric prefix in `V_CASE_NAME_REGEX` was `(?:\d[\d-]*\s+)?` — bare
digits only, with no ordinal-suffix support. When a real party name
began with an ordinal (`21st Century Fox`, `1st National Bank`,
`100th Anniversary`), the regex skipped the ordinal prefix entirely
because the digit-prefix branch couldn't consume `21st` and the
plaintiff branch started at the next uppercase letter.

| input | before | after |
|---|---|---|
| `21st Century Fox v. Smith, 100 F.2d 1` | `Century Fox v. Smith` | `21st Century Fox v. Smith` ✓ |
| `1st National Bank v. Smith, 100 F.2d 1` | `National Bank v. Smith` | `1st National Bank v. Smith` ✓ |
| `100th Anniversary v. Smith, 100 F.2d 1` | `Anniversary v. Smith` | `100th Anniversary v. Smith` ✓ |

Extended the numeric prefix to `(?:\d[\d-]*(?:st|nd|rd|th)?\s+)?` so
ordinal suffixes are absorbed. Bare-number prefixes (`12 Lincoln
Square`) and no-prefix names (`Smith v. Jones`) continue to work.

7 regression tests in `tests/extract/issueCaseNameOrdinalPrefix.test.ts`.
