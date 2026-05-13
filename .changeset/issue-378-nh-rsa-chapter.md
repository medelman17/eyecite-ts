---
"eyecite-ts": patch
---

feat: New Hampshire `RSA chapter NNN-X` and `RSA ch. NNN-X` chapter-only form (#378)

NH uniquely cites the chapter number alone as a complete citation:
`RSA chapter 169-D`, `RSA ch. 458-C`, `RSA [chapter] 173-B`. The
colon-section form `RSA 511:2` was already handled by the
`abbreviated-code` family, but the chapter-only variants were
completely unrecognized.

### Fix

New `rsa-chapter` tokenizer pattern in
`src/patterns/statutePatterns.ts` + dedicated `extractRsaChapter`
extractor at `src/extract/statutes/extractRsaChapter.ts`. Handles:

- `RSA chapter 169-D` (spelled `chapter`)
- `RSA ch. 458-C` (abbreviated `ch.`)
- `RSA [chapter] 173-B` (bracketed-chapter typographical
  convention used by some NH opinions)

Emits `code: "RSA"`, `jurisdiction: "NH"`, with the chapter
identifier in `section` (NH treats the chapter as the citation's
identifier when no individual subsection is pin-cited).

### Scope notes

The following pieces of #378 are intentionally deferred:

- **Roman-numeral subsections** (`RSA 511:2, XIX`) — the trailing
  `, XIX` is dropped; preserving it requires a different
  subsection-grammar handling.
- **Edition parentheticals** (`RSA chapter 458 (Supp. 2000)`,
  `RSA chapter 165 (1977 and Supp. 1983)`) — single `Supp.` is
  attached by the existing year-paren absorber; multi-edition
  parentheticals (`(1977 and Supp. 1983)`) require additional
  parsing.
- **Session laws** (`Laws 1979, 377:1`, `Laws 2011, 268:4`) —
  pending unified `sessionLaw` citation type.

### Tests

6 new tests under `New Hampshire RSA chapter form (#378)` in
`tests/extract/extractStatute.test.ts`:

- `RSA chapter 169-D`
- `RSA chapter 597`
- `RSA ch. 458-C` (abbreviated)
- `RSA [chapter] 173-B` (bracketed)
- Regression: colon-section `RSA 511:2`
- Regression: full Bluebook `N.H. Rev. Stat. Ann. § 511:2`

Full 2642-test suite passes; no regressions.

### Related

NH is the only state whose primary citation form is
chapter-only (the chapter number functions as a complete
identifier — there's no implicit "section 1" assumption). This
makes the pattern simple and unambiguous: the `RSA` prefix is
distinctively NH.
