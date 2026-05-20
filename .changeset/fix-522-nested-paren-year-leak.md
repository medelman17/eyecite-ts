---
"eyecite-ts": patch
---

fix(extract): stop nested-paren content from leaking page numbers as `year`
and prose body as `court` (#522)

The metadata-paren regexes (`PAREN_REGEX`, `LOOKAHEAD_PAREN_REGEX`) match
non-greedy `[^)]+`, so a paren that contains a nested paren —
`(quoting United States v. Janis, 428 U.S. 433, 458, 96 S.Ct. 3021, 49
L.Ed.2d 1046 (1976))` — was truncated at the first `)`. `parseParenthetical`
then picked up the first 4-digit token as the year (the page number `3021`)
and the entire truncated prose body as the court. SCOTUS opinions hit this
constantly because explanatory `(quoting/citing/see ... (YYYY))` patterns
are everywhere.

The fix adds `isNonMetadataParenContent(content)`, used everywhere a
parenthetical is about to be fed to `parseParenthetical`. The helper
recognises three explanatory-paren shapes that must never produce metadata:
unbalanced parens (regex truncated past an inner `(`), a leading signal
word, or a nested `(YYYY)` paren in the body. Hit any of these → skip
metadata extraction. Year/court fields stay unset on the outer cite, and
the SCOTUS / circuit / state reporter inference downstream applies as if
the paren were absent. The full balanced paren is then captured by
`collectParentheticals` (depth-tracking) and surfaced through
`parentheticals` with the correct signal type (`quoting`, `citing`, etc.).
