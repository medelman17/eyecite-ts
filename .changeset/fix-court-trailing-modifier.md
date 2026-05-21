---
"eyecite-ts": patch
---

fix(extract): year + trailing disposition modifier no longer leaks into court field

When a court parenthetical had `<court> <year> <modifier>` shape — e.g.,
`(9th Cir. 1990 mem.)`, `(2d Cir. 1990 unpublished)`,
`(D. Mass. 1990 per curiam)` — the year sat in the middle and the bare
trailing-`\d{4}` strip could not reach it. The full `<year> <modifier>`
chunk leaked into the `court` field:

| input | before | after |
|---|---|---|
| `Smith, 100 F.2d 1 (9th Cir. 1990 mem.)` | `court="9th Cir. 1990 mem."` | `court="9th Cir."` ✓ |
| `Smith, 100 F.2d 1 (9th Cir. 1990 unpublished)` | `court="9th Cir. 1990 unpublished"` | `court="9th Cir."` ✓ |
| `Smith, 100 F.2d 1 (9th Cir. 1990 per curiam)` | leaks | `court="9th Cir."` ✓ |
| `Smith, 100 F.2d 1 (9th Cir. 1990 en banc)` | leaks | `court="9th Cir."` ✓ |

Added an early-pass `\s*\d{4}\s+(?:mem\.?|unpub\.?|unpublished|per\s+curiam|en\s+banc|slip\s+op\.?|table|supp\.?)\s*$`
regex in `stripDateFromCourt` that lifts the year+modifier suffix before
the existing date-component strips run.

7 regression tests in `tests/extract/issueCourtWithTrailingModifier.test.ts`.
