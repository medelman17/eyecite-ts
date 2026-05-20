---
"eyecite-ts": patch
---

fix(clean): repair catastrophic `TransformationMap` collapse (#546, #550)

The text-cleaning pipeline was producing zero-width / orphan citation
spans for two distinct inputs:

1. **Plain text with a stray `<` and `>` pair** (OCR artifacts in CAP
   opinions like `consenting te< waive any objection ... da>`).
   `stripHtmlTags` greedily matched everything between the two
   characters, deleting thousands of chars of legitimate prose.
   The regex now requires a tag's first character to be a letter, `/`,
   or `!`, and rejects matches that contain raw line breaks.
2. **HTML with adjacent same-tag deletions** (every word wrapped in
   `<span class="word">…</span>`). `rebuildPositionMaps` rejected the
   correct lookahead because the character right after a tag deletion
   is `<` (the start of the next tag), failing its strict 3-char
   confirmation check. It then accepted a coincidental 3-gram match
   far downstream, collapsing 41,000+ clean positions onto a single
   original position.

`rebuildPositionMaps` now tracks both a strong match (full 3-char
confirmation) and a weak match (head + at least 1 confirm char where
the next before-character is `<`, the structural signal of another
adjacent deletion). When both exist, the shorter displacement wins.

Effect on the CAP-corpus span-fidelity audit (100 opinions, seed 42):
* Total violations: **393 → 29**
* HTML-bucket zero-width spans: **76/105 cites → 0/105 cites**
* Resolves #550 (pen-w/3/0072-01 zero-width spans) as a downstream
  consequence.
