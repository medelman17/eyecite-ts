---
"eyecite-ts": patch
---

fix(extract): pincite range accepts asymmetric spacing around hyphen (#722)

Resolves #722. The pincite range regex required either no spaces or
symmetric spaces around the hyphen. The asymmetric form (`5- 7`,
`5 -7`) silently dropped the pincite:

| input | before | after |
|---|---|---|
| `Smith, 100 F.2d 1, 5 - 7` | pincite=5 | pincite=5 ✓ |
| `Smith, 100 F.2d 1, 5- 7` | pincite=undefined | pincite=5 ✓ |
| `Smith, 100 F.2d 1, 5 -7` | pincite=5 | pincite=5 ✓ |
| `Smith, 100 F.2d 1, 5-7` | pincite=5 | pincite=5 ✓ |

Changed `[-–—~]` to `\s*[-–—~]\s*` in three regexes:
- `PINCITE_REGEX` (extractCase.ts inner)
- `LOOKAHEAD_PINCITE_REGEX` (extractCase.ts trailing pincite scan)
- `PINCITE_PARSE_REGEX` (pincite.ts numeric parser)

All asymmetric and symmetric spacing forms now parse correctly.

5 regression tests in `tests/extract/issuePinciteAsymmetricSpacing.test.ts`.
