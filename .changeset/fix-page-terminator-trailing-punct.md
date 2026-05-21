---
"eyecite-ts": patch
---

fix(extract): page terminators accept `!`, `?`, em/en dash, possessive `'s`

The page-terminator character classes in all three case-citation
patterns (federal, supreme, state) accepted only `\s`, `$`, parens,
comma, semicolon, period, and brackets. Citations followed by
common trailing punctuation were silently dropped:

| input | before | after |
|---|---|---|
| `Smith, 100 F.2d 1!` | 0 citations | 1 citation ✓ |
| `Smith, 100 F.2d 1?` | 0 citations | 1 citation ✓ |
| `Smith, 100 F.2d 1's holding` | 0 citations | 1 citation ✓ |
| `Smith, 100 F.2d 1—a notable case` | 0 citations | 1 citation ✓ |
| `Smith, 100 F.2d 1–a notable case` | 0 citations | 1 citation ✓ |

Added `!`, `?`, em dash (`—`), en dash (`–`), and apostrophe (`'`)
to the terminator class. Also added `-` followed by `\D` (non-digit),
because `normalizeDashes` rewrites in-word em/en dashes to ASCII `-`
before tokenization, so `1—a` arrives as `1-a`. The `\D` lookahead
preserves page-range syntax: `K.S.A. 2009 Supp. 44-501(d)(2)` is still
parsed as the K.S.A. statute (not as a phantom case with page 44).

8 regression tests in `tests/extract/issueTrailingPunctTerminator.test.ts`.
