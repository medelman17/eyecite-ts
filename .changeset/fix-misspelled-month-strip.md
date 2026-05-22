---
"eyecite-ts": patch
---

fix(extract): misspelled / OCR-mangled month names stripped from court (#717)

Resolves #717. The date-strip pipeline only knew canonical month names
and abbreviations (`Jan`-`Dec`, `January`-`December`). Misspelled or
truncated month names (`Jaunary` for January, `Ferbuary` for February,
`Marc` for March, `Septmber` for September) leaked into the court field:

| input | before | after |
|---|---|---|
| `Smith, 100 F.2d 1 (9th Cir. Jaunary 15, 2020)` | court=`9th Cir. Jaunary` | court=`9th Cir.` ✓ |
| `Smith, 100 F.2d 1 (9th Cir. Ferbuary 2020)` | court=`9th Cir. Ferbuary` | court=`9th Cir.` ✓ |
| `Smith, 100 F.2d 1 (9th Cir. Marc 15, 2020)` | court=`9th Cir. Marc` | court=`9th Cir.` ✓ |

Added a fuzzy-match strip after the canonical month strip: if the
trailing word is Title-Case, 3-12 chars, starts with the same letter
as a month name, and has Levenshtein distance ≤ 2 from that month,
strip it. The first-letter constraint prevents real court abbreviations
like `Cal.` (distance 2 from `Jan`) from being mis-stripped.

A `NO_STRIP_TRAILING` blocklist (Cir, Ct, App, Sup, Dist, Div, etc.)
provides an explicit safety net for court abbreviation tokens.

8 regression tests in `tests/extract/issueMisspelledMonthStrip.test.ts`.
