---
"eyecite-ts": patch
---

fix(extract): date-strip handles dashed and ISO-format dates

The numeric-date strip in `stripDateFromCourt` only handled `M/D/YYYY`
(slash separator). Other common formats leaked partial date content
into the `court` field:

| input | before | after |
|---|---|---|
| `(9th Cir. 02-15-2020)` | `court="9th Cir. 02-15-"` | `court="9th Cir."` ✓ |
| `(9th Cir. 2020-02-15)` | `court="9th Cir. 2020-02-"` | `court="9th Cir."` ✓ |
| `(9th Cir. 2020/02/15)` | `court="9th Cir. 2020/02/"` | `court="9th Cir."` ✓ |

Extended to two regex alternatives:
- `\d{1,2}[/-]\d{1,2}[/-]\d{4}` — day-first or M/D forms
- `\d{4}[/-]\d{1,2}[/-]\d{1,2}` — ISO year-first forms

6 regression tests in `tests/extract/issueCourtDateFormatLeaks.test.ts`.
