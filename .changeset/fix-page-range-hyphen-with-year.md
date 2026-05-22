---
"eyecite-ts": patch
---

fix(extract): page range with hyphen + year paren extracts as citation (#705 partial)

Resolves #705 for the common case where the page range is followed by
a year parenthetical. The case-citation patterns accepted only a bare
page number `\d+`. Citations written as `<vol> <reporter> <pageStart>-<pageEnd>`
were silently dropped:

| input | before | after |
|---|---|---|
| `100 F.2d 1-5 (1990)` | 0 cites | 1 cite ✓ |
| `Smith v. Jones, 100 F.2d 1-5 (1990)` | 0 cites | 1 cite ✓ |
| `100 U.S. 1-5 (1990)` | 0 cites | 1 cite ✓ |
| `100 Cal.4th 1-5 (1990)` | 0 cites | 1 cite ✓ |

Added a `\d+-\d+(?=\s+\(\d{4}\))` page alternative across all three
case patterns AND in the inner extractor regexes. The lookahead for a
year parenthetical preserves K.S.A. statute extraction: `K.S.A. 1988
Supp. 44-556` (no year paren) still extracts as a statute, not as a
phantom case.

The current `page` field still reports the start of the range (`1` for
`1-5`); the full range is in `matchedText`. Surfacing the end page as a
structured field is a follow-up.

8 regression tests in `tests/extract/issuePageRangeHyphenWithYear.test.ts`.
