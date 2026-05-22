---
"eyecite-ts": patch
---

fix(extract): pincite parser accepts typography terminator (†, ‡, §, ¶, ©, °)

Extends PR #724 (page terminator) to the pincite parsers. When a
pincite digit was immediately followed by a typographic reference
mark (`Smith, 100 F.2d 1, 5†`), the LOOKAHEAD_PINCITE_REGEX and
ADDITIONAL_PINCITE_REGEX terminator classes did not include these
chars, so the pincite was silently dropped:

| input | before | after |
|---|---|---|
| `Smith, 100 F.2d 1, 5†` | pincite=undefined | pincite=5 ✓ |
| `Smith, 100 F.2d 1, 5‡` | undefined | 5 ✓ |
| `Smith, 100 F.2d 1, 5§` | undefined | 5 ✓ |
| `Smith, 100 F.2d 1, 5¶` | undefined | 5 ✓ |
| `Smith, 100 F.2d 1, 5©` | undefined | 5 ✓ |
| `Smith, 100 F.2d 1, 5°` | undefined | 5 ✓ |

Added the six typography markers to both pincite-regex terminator
character classes.

8 regression tests in `tests/extract/issuePinciteTypographyTerminator.test.ts`.
