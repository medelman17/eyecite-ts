---
"eyecite-ts": patch
---

fix(constitutional): invalid Roman numerals downgraded to low confidence

The constitutional body regex matches `[IVX]+` permissively (to support
real Roman numerals up to `XXVII`), but `parseNumeral` rejects
non-canonical Roman forms like `IIII`, `IIIIIII`, and out-of-range
numerals like `XXVIII`. The extractor previously surfaced these as
constitutional citations with confidence 0.9 but with `amendment=undefined`
AND `article=undefined` — a structurally useless citation passed through
at the same confidence as a valid one.

| input | before | after |
|---|---|---|
| `U.S. Const. amend. IIII` | type=constitutional, amend=undefined, conf=0.9 | conf=0.1 ✓ |
| `U.S. Const. amend. IIIIIII` | type=constitutional, amend=undefined, conf=0.9 | conf=0.1 ✓ |
| `U.S. Const. art. XXVIII` | type=constitutional, art=undefined, conf=0.9 | conf=0.1 ✓ |

When both `amendment` and `article` fail to parse, confidence is now
downgraded to 0.1 so downstream consumers can filter it out.

5 regression tests in `tests/extract/issueConstInvalidNumeral.test.ts`.
