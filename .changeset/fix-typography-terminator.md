---
"eyecite-ts": patch
---

fix(extract): page terminator accepts typography / footnote markers (†, ‡, §, ¶, ©, °)

When a citation was immediately followed by a typographic reference
mark (`100 F.2d 1†`, `100 F.2d 1‡`, `100 F.2d 1§`), the terminator
character class did not include these characters and the whole citation
was silently dropped:

| input | before | after |
|---|---|---|
| `Smith, 100 F.2d 1†` | 0 cites | 1 cite ✓ |
| `Smith, 100 F.2d 1‡` | 0 cites | 1 cite ✓ |
| `Smith, 100 F.2d 1§` | 0 cites | 1 cite ✓ |
| `Smith, 100 F.2d 1¶` | 0 cites | 1 cite ✓ |
| `Smith, 100 F.2d 1©` | 0 cites | 1 cite ✓ |
| `Smith, 100 F.2d 1°` | 0 cites | 1 cite ✓ |

Added `†`, `‡`, `§`, `¶`, `©`, `°` to the page-terminator character
class across all three case patterns. Real reporters never end with
these characters.

7 regression tests in `tests/extract/issueTypographyTerminator.test.ts`.
