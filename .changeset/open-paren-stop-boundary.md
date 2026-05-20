---
"eyecite-ts": patch
---

fix(extract): stop case-name scan at wrapping `(` (#512)

When a citation appears as a sentence-internal parenthetical
`(Name v. Name, vol Reporter page)`, the backward case-name scan
absorbed any preceding capitalized prose into the captured caseName
(yielding caseNames 100–366 chars long). The V_CASE_NAME_REGEX
character class allows `(` inside party names, so adjacent all-cap
prose was treated as plaintiff context.

Add a right-to-left scan for the wrapping paren that has a `v.`-style
caption (or procedural prefix) immediately inside. Truncate
precedingText to start just after that `(` so the regex sees only the
caption. The complement of #509 (paren-before-core, which strips a
TRAILING `(\s*$`).

Guarded against #241 admin-parens (`Spence v. Hintze (In re Hintze)`):
when a complete `Name v. Name` caption exists BEFORE the candidate
`(`, the `(` is an inline explanatory clause, not a wrapping boundary.
