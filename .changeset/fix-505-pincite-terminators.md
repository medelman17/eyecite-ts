---
"eyecite-ts": patch
---

fix(extract): pincite terminator class now accepts `:`, `[`, `»`, and curly/straight quotes (#505)

`LOOKAHEAD_PINCITE_REGEX` and `ADDITIONAL_PINCITE_REGEX` previously required
the page-number capture to end at sentence punctuation, closing bracket, or
whitespace+non-capital. Real-world citations also delimit the pincite with
`:` (block-quote intro), `[` (bracketed parallel cite), `»` (OCR artifact),
and the four common curly/straight quote characters. Adding these
characters to the terminator class recovers pincites that were silently
dropped at ~6–10 per 1,000 citations.

Now extracts pincite from:

- `376 N.E.2d 578, 579: "Judgments..."` → 579
- `135 Md.App. 563, 570[, 763 A.2d 252] (2000)` → 570
- `9 Humph. 187, 193: Love v. Smith` → 193
- `38 F. C. C. 683, 713» Id., 713-730` → 713
- `376 N.E.2d 578, 579"…"` and curly-quote variants → 579
