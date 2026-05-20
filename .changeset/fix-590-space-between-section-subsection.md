---
"eyecite-ts": patch
---

fix(extract): allow whitespace between section number and subsection
paren (#590)

Documented examples:
- `8 U.S.C. § 1101 (a)(43)`
- `OCGA § 15-11-2 (8) (A)`
- `I.C. § 19-4907 (b)`
- `M.G.L. c. 106 § 1-205 (4)`

The previous federal / abbreviated / mass-chapter tokenizer body
regexes required the leading subsection paren to be adjacent to the
section digits (`§ 1101(a)`). A single space between section number
and subsection paren (typical court style for many state and federal
opinions) silently dropped the subsection.

Five coordinated changes:

- `src/patterns/statutePatterns.ts` (`usc`, `cfr`, `mass-chapter`) —
  subsection paren alternative now accepts `\s*\(...\)`.
- `src/data/stateStatutes.ts` (`buildAbbreviatedCodeRegex`) — same
  whitespace tolerance applied to the dynamically-built
  abbreviated-code regex.
- `src/extract/statutes/extractAbbreviated.ts` (`ABBREVIATED_RE`) —
  same shape mirrored in the extractor's anchored regex.
- `src/extract/statutes/parseBody.ts` — collapse `)\s+(` and `]\s+[`
  inside the body before splitting so `(8) (A)` → `(8)(A)` for the
  SUBSECTION_RE match.

All four tokenizer / extractor changes carry a negative lookahead
`(?![^)]*\d{4})` so a year-of-edition parenthetical (`(1976)`,
`(West 2018)`, `(Repl. 1996)`) is NOT absorbed as subsection — the
existing post-process `attachStatuteYearParen` continues to bind
those parens as `year`/`publisher`/`editionLabel`. Existing tests
asserting `year=1976`, `publisher="West"`, etc. all continue to
pass without modification.
