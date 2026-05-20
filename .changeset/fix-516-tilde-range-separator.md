---
"eyecite-ts": patch
---

fix(extract): tilde (`~`) accepted as pincite range separator (#516)

`LOOKAHEAD_PINCITE_REGEX`, `ADDITIONAL_PINCITE_REGEX`, `PINCITE_SKIP_REGEX`,
and the `parsePincite` regexes (page body, footnote suffix, paragraph
range) now accept `~` alongside hyphen / en-dash / em-dash as a range
separator. Tilde shows up as an OCR artifact in scanned reporters and in
some PDF dehyphenators, and dropping it silently lost the range end page.

Example: `2012 PA Super 169 at *10~*11` now extracts a star-page range
with `pincite=10`, `endPage=11`.
