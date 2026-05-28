---
"eyecite-ts": patch
---

fix(extract): page ranges in non-Federal case citations followed by a year (#705 partial)

Case citations written as `<vol> <reporter> <pageStart>-<pageEnd> (<year>)`
now extract for the U.S./S.Ct./L.Ed. and generic state-reporter patterns
(the Federal Reporter already accepts page ranges). Previously only a bare
page number `\d+` was accepted for these, so the citations were silently
dropped:

| input | before | after |
|---|---|---|
| `100 U.S. 1-5 (1990)` | 0 cites | 1 cite ✓ |
| `100 Cal.4th 1-5 (1990)` | 0 cites | 1 cite ✓ |
| `Smith v. Jones, 100 U.S. 1-5 (1990)` | 0 cites | 1 cite ✓ |

The new page-range alternative is gated on a following year parenthetical,
which preserves K.S.A. statute extraction: `K.S.A. 1988 Supp. 44-556` (no
year paren) still extracts as a statute, not as a phantom case.

The `page` field still reports the start of the range (`1` for `1-5`); the
full range is in `matchedText`. Surfacing the end page as a structured
field is a follow-up.

8 regression tests in `tests/extract/issuePageRangeHyphenWithYear.test.ts`.
