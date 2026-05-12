---
"eyecite-ts": patch
---

fix: Arkansas Code Annotated + `(Repl. YYYY)` / `(YYYY Supp.)` edition parentheticals (#349)

Arkansas's primary statute code is **Arkansas Code Annotated** (post-1987)
or **Arkansas Statutes Annotated** (pre-1987). Three failures combined
to drop almost every Arkansas statute citation in a 50-opinion sample
(20+ misses):

1. The spelled-out `Arkansas Code Annotated` form wasn't accepted
   (the regex required `Ann.` rather than `Annotated`).
2. `Ark. Stat. Ann.` (the pre-1987 code) had no entry at all.
3. `(Repl. YYYY)`, `(YYYY Supp.)`, `(Cum. Supp. YYYY)` edition
   parentheticals were dropped even when the citation tokenized —
   the existing year-paren regex (#285) only recognized
   `(Publisher? YYYY)`-shaped bodies.

### Fix

Four coordinated changes:

1. **`src/data/stateStatutes.ts`** — extended the Arkansas Code
   Annotated entry to accept the spelled-out `Annotated` form
   (`Ann(?:otated)?\.?`); added `"Arkansas Code Annotated"` to the
   abbreviations array.

2. **`src/data/stateStatutes.ts`** — added a second Arkansas entry
   for the pre-1987 **Arkansas Statutes Annotated** code family
   (`Ark. Stat. Ann.`, `Ark. Stat.`, `Arkansas Statutes Annotated`).

3. **`src/extract/extractCitations.ts`** — extended
   `STATUTE_YEAR_PAREN_REGEX` so the parenthetical body accepts a
   trailing dot on the publisher/label word (`Repl.`, `Supp.`,
   `Cum. Supp.`) and a year-first variant (`(1969 Supp.)`,
   `(1985 Cum. Supp.)`). `attachStatuteYearParen` routes the
   non-year token to the new `editionLabel` field when it matches
   `Repl. | Supp. | Cum. Supp.` (case-insensitive); otherwise the
   token continues to populate `publisher` as before.

4. **`src/types/citation.ts`** — added an optional
   `editionLabel?: string` field to `StatuteCitation`. Distinct from
   `publisher` (West/Lexis) — captures replacement/supplement
   volume markers. Non-breaking additive change.

### Side fix

`src/extract/statutes/extractAbbreviated.ts` — mirrored the
tokenizer's word-`section` tolerance from #348 in the internal
`ABBREVIATED_RE`, so the abbreviation capture no longer absorbs the
word `section` when it appears between the code name and the section
body. Without this, `Arkansas Code Annotated section 11-9-102` would
produce `abbrevText="Arkansas Code Annotated section"` and fall
through to canonical-form normalization.

### Tests

7 new tests under `Arkansas Code Annotated + edition parenthetical
(#349)` in `tests/extract/statutes/extractAbbreviated.test.ts`:

- `Ark. Code Ann. § 11-9-514(a)(1) (Repl. 1996)` → all fields
  populated, `editionLabel: "Repl."`
- `Arkansas Code Annotated § 16-89-111(e)(1) (1987)` — spelled-out
  form, bare year (no edition label)
- `Arkansas Code Annotated section 11-9-102(5)(A)(i) (Repl. 1996)` —
  spelled-out + word `section`, code preserved verbatim
- `Ark. Stat. Ann. § 41-1201 (Repl. 1964)` — pre-1987 code
- `(1969 Supp.)` year-first edition label
- Regression: `(West 2018)` continues to populate `publisher`
- Regression: bare `(1976)` continues to populate `year` only

Full 2542-test suite passes; no regressions.

### Scope

Bare-section context propagation (`§ 41-1201` resolving to
`Ark. Stat. Ann.` via earlier-in-document context) is tracked
separately under the general per-document statute context proposal.
