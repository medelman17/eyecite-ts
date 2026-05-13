---
"eyecite-ts": patch
---

fix: hyphenated year-range edition parentheticals `(Supp.1975-76)` (#420)

The no-space and spaced single-year forms (`(Supp. 1998)`,
`(Supp.1998)`, `(Repl.1996)`) already worked via the year-paren
absorber. Only the hyphenated year-range form
(`(Supp.1975-76)`, `(Supp.1973-1975)`) was rejected because the
regex's closing `\)` expected to immediately follow the captured
`(\d{4})` year.

### Fix

`STATUTE_YEAR_PAREN_REGEX` in `src/extract/extractCitations.ts`
now consumes an optional `(?:-\d{2,4})?` suffix after the year.
The first year is captured as the `year` field; the suffix is
consumed but not separately reported.

### Behavior changes

- `(Supp.1975-76)` → `year=1975`, `editionLabel="Supp."` (was:
  not extracted)
- `(Supp.1973-1975)` → `year=1973`, `editionLabel="Supp."`
- `(Supp.1998)`, `(Supp. 1998)`, `(Repl.1996)`, `(Reissue 2003)`
  — all unchanged

### Scope notes

The following pieces of #420 are intentionally deferred:

- **Section ranges** (`§§ 15-78-10 to -200`, `§§ 13-108 and
  13-621`) — multi-section family.
- **Bare-section + edition paren follow-on** (`42-17-40
  (Supp.2003)`) — short-form citation problem.

### Tests

4 new tests under `Year-range edition parentheticals (#420)` in
`tests/extract/extractStatute.test.ts`:

- Hyphenated year `(Supp.1975-76)`
- Full year suffix `(Supp.1973-1975)`
- Regression: no-space `(Supp.1998)`
- Regression: spaced `(Supp. 1998)`

Full 2735-test suite passes; no regressions.
