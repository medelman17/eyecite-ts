---
"eyecite-ts": patch
---

fix(extract): Federal Register year extracts from trailing parens beyond the matched token

The Federal Register extractor's year regex only scanned the matched
token text. Since the token only covers `<vol> Fed. Reg. <page>` (not
the trailing date parenthetical), the year was never extracted:

| input | before | after |
|---|---|---|
| `85 Fed. Reg. 12,345 (2020)` | year=undefined | year=2020 ✓ |
| `85 Fed. Reg. 12,345 (Mar. 1, 2020)` | year=undefined | year=2020 ✓ |
| `85 Fed. Reg. 12345 (2020)` | year=undefined | year=2020 ✓ |

Mirrored the `cleanedText`-based year scan from `extractStatutesAtLarge`:
extend the scan window 64 characters beyond `span.cleanEnd` to catch
the trailing date paren. Plausibility filter (`isPlausibleYear`) still
rejects page-like numbers.

5 regression tests in `tests/extract/issueFedRegYear.test.ts`.
