---
"eyecite-ts": patch
---

feat: New Mexico bare-section form `Section 32A-2-7(A)` / `§ 41-2-2` (#382)

NM opinions cite NMSA 1978 sections in a distinctive bare form
without the code abbreviation — the three-hyphen section format
(`\d[A-Z]?-\d[A-Z]?-\d[A-Z]?`) is unique among state codes and
serves as the disambiguator. A 50-opinion NM sweep produced
dozens of misses on these forms.

### Fix

New `nm-bare-section` tokenizer pattern in
`src/patterns/statutePatterns.ts` + dedicated
`extractNmBareSection` extractor at
`src/extract/statutes/extractNmBareSection.ts`. Matches both
`§ 41-2-2` (symbol form) and `Section 32A-2-7(A)` (spelled-out
form). Listed AFTER `abbreviated-code` so that a full
`NMSA 1978, § 41-2-2` citation isn't double-counted (the
abbreviated-code container would otherwise tie with this
contained pattern, leaving a duplicate cite at the inner span).

Uses `(?<![A-Za-z])` lookbehind anchor instead of `\b` because
the pattern can start at `§` (non-word char where `\b` doesn't
apply).

Emits `code: "NMSA 1978"`, `jurisdiction: "NM"`, `section` with
the three-hyphen body, and `subsection` for any trailing
parenthetical (`(A)`, `(B)`, `(1)`).

### Scope notes

The following pieces of #382 are intentionally deferred:

- **NMRA rule citations** (`Rule 16-110(C) NMRA`) — rule
  citations broadly deferred per #295.
- **Public Law form** (`Public Law 567`) — used in NM opinions
  for federal statutes; separate `publicLaw` family.

### Tests

5 new tests under `New Mexico bare-section form (#382)` in
`tests/extract/extractStatute.test.ts`:

- `Section 32A-2-7(A)` (letter-prefix first part)
- `Section 22-10A-27(B)` (letter-prefix middle part)
- `§ 41-2-2` (symbol form, no subsection)
- Regression: `NMSA 1978, § 41-2-2` produces exactly one
  citation (no duplicate from the contained inner span)
- Regression: Maryland `CP § 10-105(e)` (two-hyphen) doesn't
  collide — the three-hyphen requirement keeps the patterns
  disjoint

Full 2649-test suite passes; no regressions.
