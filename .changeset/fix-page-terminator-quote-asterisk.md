---
"eyecite-ts": patch
---

fix(extract): page terminators accept trailing quote, asterisk, angle brackets

Extends PR #684's terminator fix. Citations followed by trailing quote
or markdown asterisk were silently dropped:

| input | before | after |
|---|---|---|
| `Smith, 100 F.2d 1"` | 0 cites | 1 cite ✓ |
| `Smith, 100 F.2d 1”` (curly) | 0 cites | 1 cite ✓ |
| `Smith, 100 F.2d 1*` (markdown) | 0 cites | 1 cite ✓ |
| `Smith, 100 F.2d 1>` | 0 cites | 1 cite ✓ |
| `Smith, 100 F.2d 1<` | 0 cites | 1 cite ✓ |

Added `"`, `“`, `”`, `*`, `<`, `>` to the page-terminator character class
across all three case-citation patterns. Real reporters never end with
these characters, so this is safe and recovers common quoted/markdown
trailing forms.

8 regression tests in `tests/extract/issuePageTerminatorQuoteAsterisk.test.ts`.
