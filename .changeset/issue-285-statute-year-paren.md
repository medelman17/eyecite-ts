---
"eyecite-ts": patch
---

feat: extract year (and optional publisher) from trailing parenthetical on statute citations (#285)

A statute citation followed by `(YYYY)` or `(Publisher YYYY)` —
`HRS § 91-14(a) (1985)`, `42 U.S.C. § 1983 (1976)`,
`28 U.S.C. § 1331 (West 2018)` — now carries the year-of-edition (and
publisher when present) on the `StatuteCitation` object.

### Why

Code editions matter for statutory interpretation: a 2010 edition of NMSA
§ 38-3-3 may codify a different version than the 2020 edition. Without
`year`, downstream consumers can't distinguish citations to different
editions of the same section or render the citation in canonical
Bluebook form. Surfaced as the second-largest finding bucket
(79 instances) in the 200-opinion spectrum sweep behind #281.

### Fix

Added a new post-pass `attachStatuteYearParen` in
`src/extract/extractCitations.ts` (Step 4.65, immediately after the
`#282` parallel-caseName inheritance pass). For each statute citation,
it scans the cleaned text starting at `span.cleanEnd` for an optional
year-of-edition parenthetical:

```
^\s*(?:,\s*(?:at\s+)?\d+(?:-\d+)?\s*)?\(\s*([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)?\s*(\d{4})\s*\)
```

The body is anchored on `\d{4}` so a trailing subsection paren like
`(a)` or `(1)` is never confused for a year. An optional capitalized
publisher word (`West`, `Lexis`, `Lexis Nexis`) is captured before the
year.

The new fields `year?: number` and `publisher?: string` were added to
the `StatuteCitation` interface in `src/types/citation.ts`. Behavior is
purely additive — citations without a trailing year paren still have
`year === undefined` (no regressions).

### Scope notes

- **`NMSA 1978, § 38-3-3 (2010)`** — the leading `1978` of `NMSA 1978`
  is currently misparsed by the named-code tokenizer (it claims `1978`
  as the section). That's a separate tokenizer bug; this PR does not
  fix it. The year-paren post-pass would still apply once the
  tokenizer correctly identifies the citation core.
- **`8 CCAR 28 (07-22-05)`** — tribal court reporter not yet in any
  tokenizer pattern; out of scope.
- The matchedText and span are intentionally **not** extended to
  include the trailing paren — only the metadata fields are populated.
  Consumers that need full extent can pair with `fullSpan` once that
  field is generalized to statutes.

### Tests

7 new tests under `year-of-edition parenthetical (#285)` in
`tests/extract/extractStatute.test.ts`:

- `42 U.S.C. § 1983 (1976)` → `year: 1976`
- `28 U.S.C. § 1331 (West 2018)` → `year: 2018`, `publisher: "West"`
- `HRS § 91-14(a) (1985)` → `subsection: "(a)"`, `year: 1985`
- `HRS § 91-14 (1985)` (no subsection) → `year: 1985`
- `42 U.S.C. § 1983(a)(2)` (subsection only) → no year (defensive)
- `42 U.S.C. § 1983` (no paren) → no year (regression baseline)
- String-cite `§ 1983; § 1331 (West 2018)` — year attaches only to
  the second cite (the one the paren directly follows)

Full 2379-test suite passes; no regressions.
