---
"eyecite-ts": patch
---

feat: Nebraska R.R.S. 1943 historical form + `Reissue YYYY` edition label (#373)

A 23-opinion Nebraska sweep produced 15+ Nebraska statute misses.
The modern `Neb. Rev. Stat. § N-NNNN` form worked, but two pieces
were broken:

1. The historical `R.R.S. 1943` form (Reissue Revised Statutes of
   Nebraska, 1943) was completely unrecognized — Nebraska compiled
   its statutes in 1943 and re-issues volumes on a rolling basis, so
   pre-1990 Nebraska opinions cite this form heavily and modern
   opinions still cite it when referencing statutory history.
2. The Nebraska-specific `(Reissue YYYY)` parenthetical was being
   captured as a `year` but not labeled — it should populate
   `editionLabel: "Reissue"` alongside the year (parallel to the
   `Repl.` / `Supp.` / `Cum. Supp.` labels added in #349).

### Fixes

- **R.R.S. 1943 pattern**: new `rrs-1943` tokenizer pattern in
  `src/patterns/statutePatterns.ts` + dedicated `extractRrs1943`
  extractor. Handles `section 38-901, R. R. S. 1943` (no Reissue)
  and `§ 30-2806, R. R. S. 1943, Reissue 1975` (with Reissue).
  Accepts inter-letter spacing in `R.R.S.` (common OCR variant).
  Emits `code: "R.R.S. 1943"`, `jurisdiction: "NE"`, `section`,
  and — when present — `year` (the Reissue year) plus
  `editionLabel: "Reissue"`.

- **Reissue edition label**: `EDITION_LABEL_REGEX` in
  `extractCitations.ts` extended to recognize `Reissue` as an
  edition label (joining `Repl.`, `Supp.`, `Cum. Supp.`). The
  generic year-paren absorber now correctly routes
  `Neb. Rev. Stat. § 71-5016 (Reissue 2003)` to
  `editionLabel: "Reissue"`, `year: 2003`.

### Scope notes

The following pieces of #373 are intentionally deferred:

- **Section ranges** (`§§ 71-5016 to 71-5041 (Reissue 2003)`) —
  multi-section deferred across all states.
- **Bare-section follow-on with Cum. Supp.** (`43-253 (Cum. Supp.
  2002)`) — this is a short-form citation problem (resolves to the
  parent full-form citation), not an extraction problem.

### Tests

4 new tests under `Nebraska R.R.S. 1943 + Reissue edition label
(#373)` in `tests/extract/extractStatute.test.ts`:

- `section 38-901, R. R. S. 1943` (no Reissue)
- `§ 30-2806, R. R. S. 1943, Reissue 1975` (with Reissue year)
- `Neb. Rev. Stat. § 71-5016 (Reissue 2003)` (Reissue paren)
- Regression: bare modern `Neb. Rev. Stat. § 71-5016`

Full 2603-test suite passes; no regressions.

### Related

Companion to #330 (pre-1993 Illinois Revised Statutes), #343 (Code
of Alabama 1940), and #359 (Revised Laws of Hawaii pre-1955) —
historical state-statute compilations that remain in active
citation. The Reissue edition label joins the family established
by #349 (Arkansas `Repl.` / `Supp.` / `Cum. Supp.`).
