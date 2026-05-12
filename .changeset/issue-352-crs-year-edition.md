---
"eyecite-ts": patch
---

fix: Colorado `C.R.S. 1963` / `C.R.S. 1973` year-edition and prose form (#352)

Colorado has two compilations: pre-1973 (`C.R.S. 1963`) and post-1973
(`C.R.S.` / `C.R.S. 1973`). The year suffix is part of the **code
name**, distinguishing the edition — not an edition parenthetical and
not a section number. Three failures combined to mis-parse every
pre-1973 Colorado statute reference in a 38-opinion sample:

1. **Year suffix consumed as section number**: `C.R.S. 1963 §
   148-21-34` extracted `section: "1963"` (the year), dropping the
   real section number `148-21-34` entirely.
2. **Code name truncated**: `code` was reported as `C.R.S.` rather
   than `C.R.S. 1963`, losing the edition information.
3. **Prose form not extracted**: `Section 148-21-34, Colorado Revised
   Statutes 1963` (the dominant pre-1973 form, with section BEFORE
   the code name) produced no citation.

### Fix

Two coordinated changes:

1. **`src/data/stateStatutes.ts`** — extended the Colorado regex
   fragment with an optional `\s+19\d{2}` tail that absorbs `1963` /
   `1973` into the abbreviation capture. Added the canonical
   year-suffixed forms (`C.R.S. 1963`, `C.R.S. 1973`, `Colorado
   Revised Statutes 1963`, `Colorado Revised Statutes 1973`) and the
   spelled-out base form (`Colorado Revised Statutes`,
   `Colorado Revised Statutes Annotated`) to the abbreviations array.
   With this `findAbbreviatedCode` resolves the year-suffixed forms
   via exact match and `code` is preserved verbatim.

2. **New `colorado-prose` tokenizer pattern + `extractColoradoProse`
   extractor** — handles the section-first prose form
   `Section 148-21-34, Colorado Revised Statutes 1963`. The pattern
   is listed BEFORE `abbreviated-code` in `statutePatterns.ts` so
   it wins span dedup over the abbreviated-code match (which would
   otherwise still consume the trailing `Colorado Revised Statutes
   1963` and emit a duplicate citation with `section: "1963"`).

### Scope notes

- **Chapter-article-section structured fields** (pre-1973 Colorado's
  `148-21-34` = chapter 148, article 21, section 34) are deferred —
  the full section body is preserved in `section`, and consumers can
  split it themselves. Surfacing `chapter` / `article` as typed fields
  would require new optional fields on `StatuteCitation`.
- **`Article 18 of Chapter 148, Colorado Revised Statutes 1963`**
  (article-of-chapter prose form) is deferred — separate pattern
  shape from the section-first form covered here.
- **Colorado session laws** (`Colo. Sess. Laws YYYY, ch. NNN, § N`)
  are a separate citation family entirely and tracked separately.

### Tests

8 new tests under `Colorado pre-1973 and year-edition variants (#352)`
in `tests/extract/extractStatute.test.ts`:

- Inline `C.R.S. 1963 § 148-21-34` — code preserved with year suffix
- Inline `C.R.S. 1973 § 13-25-126` — modern edition variant
- Prose `Section 148-21-34, Colorado Revised Statutes 1963`
- Prose + `(1965 Supp.)` trailing parenthetical → year + editionLabel
- Prose with subsection: `Section 82-4-8(8)(f), Colo. Rev. Stat. 1963`
- Regression: modern `C.R.S. § 13-25-126` (no year suffix) unchanged
- Regression: `C.R.S. § 13-25-126 (1973)` — trailing year parenthetical
  continues to populate `year`
- Regression: federal `42 U.S.C. § 1983 (1976)` unaffected

Full 2551-test suite passes; no regressions.

### Related

Surfaced by 38-opinion Colorado sweep. Companion to #348 (Arizona),
#349 (Arkansas), #330 (Illinois pre-1993), #343 (Alabama 1940) — each
state's pre-modern statute code has distinct conventions not in the
default abbreviated-code pattern.
