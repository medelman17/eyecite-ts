---
"eyecite-ts": patch
---

fix(extract): recover caseName when citation core sits inside `(...)` (#509)

Two issues blocked caseName extraction for sentence-internal parenthetical
citations like `(Smith v. Jones, 100 F.2d 1)`:

1. The case-pattern tokenizers (`federal-reporter`, `supreme-court`,
   `state-reporter`) omitted `)` from their trailing terminator alternation,
   so `100 F.2d 1)` failed to tokenize as a case at all. Adds `\)` alongside
   the existing `\s|$|\(|,|;|\.|\[|\]` terminators.
2. When the caption sits OUTSIDE the parenthetical (`Name, (vol Reporter
   page)`), `extractCaseName`'s precedingText ends with `, (`, which
   `V_CASE_NAME_REGEX` can't match because the regex anchors on a trailing
   comma or year-paren. Strip a trailing `(\s*$` so the comma is reachable.

The fix is the complement of #512 (which requires the opposite — STOP at
the open paren when the caption is INSIDE the wrapper).
