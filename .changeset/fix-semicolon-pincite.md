---
"eyecite-ts": patch
---

fix(extract): semicolon between page and pincite still extracts year+court (#525)

Resolves the semicolon-pincite sub-issue of #525. OCR'd older
opinions sometimes use a semicolon between page and pincite
(`256 F.Supp. 572; 573-574 (S.D.N.Y. 1966)`). The comma-only
separator in both `LOOKAHEAD_PINCITE_REGEX` and `LOOKAHEAD_PAREN_REGEX`
dropped both the pincite AND the trailing year/court paren.

| input | before | after |
|---|---|---|
| `256 F.Supp. 572; 573-574 (S.D.N.Y. 1966)` | pincite/year/court=undefined | pincite=573, year=1966, court=`S.D.N.Y.` ✓ |
| `Smith, 100 F.2d 1; 5-7 (9th Cir. 1990)` | pincite/year=undefined | pincite=5, year=1990 ✓ |
| `256 F.Supp. 572, 573 (S.D.N.Y. 1966)` (canonical comma) | unchanged | unchanged ✓ |
| `256 F.Supp. 572 at 573 (S.D.N.Y. 1966)` (at form) | unchanged | unchanged ✓ |

Both lookahead regexes now accept `[,;]` as the page-to-pincite
separator.

4 regression tests in `tests/extract/issueSemicolonPincite.test.ts`.
