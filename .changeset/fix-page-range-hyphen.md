---
"eyecite-ts": patch
---

fix(extract): page-range with hyphen and no comma now extracts (#705)

Resolves #705. `100 F.2d 1-5` (page range without comma) produced
zero citations. The federal-reporter tokenizer's page-capture
trailing lookahead (`-\D`) required hyphen + non-digit, which
rejected the digit-hyphen-digit shape.

| input | before | after |
|---|---|---|
| `100 F.2d 1-5` | 0 cites | page=1 ✓ |
| `See 100 F.2d 1-5.` | 0 cites | page=1 ✓ |
| `100 F.2d 1-5 (1990)` | 0 cites | page=1, year=1990 ✓ |
| `100 F.2d 1` | unchanged | unchanged ✓ |
| `100 F.2d 1, 5` | unchanged | unchanged ✓ |

Fix: extend the page capture in both the federal-reporter tokenizer
pattern and the `VOLUME_REPORTER_PAGE_REGEX` extractor to accept
`\d+-\d+` (range form) alongside `\d+` (single page).

The `page` field reports the start of the range (1). End-of-range
capture as a structured field is not part of this fix.

5 regression tests in `tests/extract/issuePageRangeHyphen.test.ts`.
