---
"eyecite-ts": patch
---

fix(extract): recognize U.S.C.S. (LEXIS-annotated US Code) variant (#584)

Documented examples:
- `26 U.S.C.S. § 7433`
- `42 U.S.C.S. § 1983 (LEXIS 2020)`
- `28 U.S.C.S. § 1331(a)`

The USC tokenizer regex accepted West's annotated `U.S.C.A.` (trailing
`A?`) but never LEXIS's annotated `U.S.C.S.`, so every USCS citation
silently disappeared. Extend the trailing-letter alternative from `A?`
to `[AS]?` (and the no-period `USCA?` to `USC[AS]?`) in both
`src/patterns/statutePatterns.ts` (the tokenizer) and
`src/extract/statutes/extractFederal.ts` (the parser used for
extraction). Both annotated editions normalize to canonical `U.S.C.`
through the existing `stripped.includes("CFR")` else-branch — no
extractor logic change is required beyond accepting the wider regex.

The Sprint F `(?![^)]*\d{4})` year-paren lookahead is preserved
intact, so a trailing `(LEXIS 2020)` still routes to the post-process
year/publisher binder; `(LEXIS through 2020)` (lowercase intermediate
token) does not match the canonical publisher-year shape and is
correctly left unbound while the citation core still extracts.
