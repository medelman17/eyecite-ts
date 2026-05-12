---
"eyecite-ts": patch
---

feat: extract pre-1975 Alabama Code (`Code of Alabama 1940`) citations (#343)

Alabama used a distinct Title/Section statutory format before adopting
the modern `Ala. Code § N-NN-N` form. Pre-1975 statutes — and continuing
back-references to them in modern opinions — use forms like
`Code 1940, T. 15, § 389` or `Title 26, Section 214, Code of Alabama
1940, as Recompiled 1958`. None of these tokenized — surfaced as the
dominant statute miss pattern in a 50-opinion Alabama sample (15+
misses).

### Fix

Three tokenizer patterns in `src/patterns/statutePatterns.ts`, one
dedicated extractor at `src/extract/statutes/extractAlaCode1940.ts`:

- **`ala-code-prefix`** — `Code 1940, T. NN, § NNN` / `Code of Alabama
  1940, T. NN, § NNN` (Code-first form; year hardcoded to 1940)
- **`ala-title-trailer`** — `Title NN, Section NNN, Code of Alabama
  1940[, as Recompiled YYYY]` (Title-first, requires Code trailer)
- **`ala-tit-bare`** — `Tit. NN, § NNN[, Code 1940...]` (abbreviated
  `Tit.` form, optional Code trailer)

Each pattern routes to `extractAlaCode1940`, which emits a
`StatuteCitation` with `code: "Code of Alabama 1940"`, `jurisdiction:
"AL"`, the parsed `title`, `section`, `subsection`, and optionally
`year` (edition year, e.g. 1940) and `recompiledYear` (1958 when the
recompilation clause is present).

`recompiledYear?: number` is a new optional field on `StatuteCitation`
— additive change, no breaking API impact. Distinct from `year` (the
original edition year).

### Scope notes

- **Bare `Title 7, § 508` form (no Code clause, spelled-out `Title`)**
  is intentionally NOT matched. The spelled-out form without an
  Alabama-specific signal would false-positive on bare USC-style
  `Title 18, § 1001` prose. The `Tit.` abbreviation is recognized
  bare because the abbreviation is itself an Alabama-distinctive
  signal (USC opinions spell out `Title`). A future enhancement
  could pick up bare spelled-out `Title N, § N` when a contextual
  jurisdiction marker is present.

- **Multi-section lists** (`Title 52, Sections 486 and 487, ...`)
  match the first section only; the `, 487` is left for downstream.
  Same shape as the existing multi-paragraph match on Illinois ILRS.

### Tests

8 new tests under `Code of Alabama 1940 — pre-1975 statutes (#343)` in
`tests/extract/extractStatute.test.ts`:

- Code-prefix: `Code 1940, T. 15, § 389`
- Title-first w/ recompiledYear: `Title 26, Section 214, Code of
  Alabama 1940, as Recompiled 1958`
- Title-first w/ comma-before-year: `Title 7, Section 273, Code of
  Alabama, 1940`
- Title-first w/ abbreviated trailer: `Title 7, § 21, Code 1940`
- Title-first w/ §-then-trailer: `Title 43, § 30, Code 1940`
- Abbreviated bare: `Tit. 52, § 361`
- Negative: bare `Title 7, § 508` does not match (USC false-positive
  guard)
- Regression: modern `Ala. Code § 6-2-39` still extracts

Full 2521-test suite passes; no regressions.

### Related

Surfaced by 50-opinion Alabama sample. Companion to #330 (pre-1993
Illinois Revised Statutes) — both are pre-modern state code formats
that remain in active citation.
