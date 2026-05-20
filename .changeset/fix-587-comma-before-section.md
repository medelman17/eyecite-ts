---
"eyecite-ts": patch
---

fix(extract): accept comma between code abbreviation and `§` (#587)

Documented examples:
- `45 U.S.C., § 151`
- `11 U.S.C., § 362`
- `28 U.S.C., § 636`
- `12 C.F.R., § 226`
- `42 U.S.C., § 1983 (1976)` (year-paren still binds)
- `Title 18, U.S.C., § 3742` (composes with #586)

The USC and CFR tokenizer regexes had `\s*` between the code
abbreviation and the (optional) section connector. A comma in that
position (`42 U.S.C., § 1983`) rejected the match — the comma is
neither whitespace nor a valid connector — so every citation in
this older / regulatory style silently disappeared.

Allow optional comma between code and connector by changing the
separator from `\s*` to `\s*,?\s*` in:
- `src/patterns/statutePatterns.ts` (the `usc` and `cfr` tokenizers)
- `src/extract/statutes/extractFederal.ts` (`FEDERAL_SECTION_RE`
  and `FEDERAL_PART_RE`)

Sprint F's negative lookahead `(?![^)]*\d{4})` lives INSIDE the
subsection body (after the section digits) and is preserved intact
by this fix — the comma tolerance is added BEFORE the section.
`attachStatuteYearParen` continues to bind trailing year/publisher
parentheticals on comma-prefixed citations (verified by the
regression tests in `issue587CommaBeforeSection.test.ts`).
