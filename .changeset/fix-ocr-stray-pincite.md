---
"eyecite-ts": patch
---

Tolerate OCR stray pincite numbers before the year paren (#525)

Year/court extraction no longer breaks when an OCR'd citation has a stray bare
number between the page and the `(court year)` parenthetical:

- a pincite with a missing comma (`128 F.2d 645 648 (4th Cir. 1942)`), and
- a space-separated pincite range (`300 U.S. 342, 347 351 (1937)`, OCR'd from
  `347-351`).

The parenthetical lookahead now skips one stray ` N` before the paren. The
required trailing `(` is the false-positive guard — a stray number followed by
a reporter (a new citation) still won't match, so string and parallel cites are
unaffected.
