---
"eyecite-ts": patch
---

fix(extract): full-case `at *10-*11` star-pincite range now extracted (#513)

`LOOKAHEAD_PINCITE_REGEX` page body `\*?\d+(?:-\d+)?` only allowed the
star-pagination marker on the START of a range. The short-form extractor
already allows `\*?\d+[-–—]\*?\d+` (#201), so star ranges with stars on
both ends now extract from full-case citations as well. Test case:
`2012 PA Super 169 at *10-*11 (Pa.Super.Ct. 2012)`.
