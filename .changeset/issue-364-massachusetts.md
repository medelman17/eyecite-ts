---
"eyecite-ts": patch
---

fix: Massachusetts `G.L. c.` spacing variants, `sec.` connector, chapter-only, and spelled-out `General Laws` (#364)

A 50-opinion Massachusetts sample showed 15+ misses dominated by
the bare `G.L. c.` form — the canonical Massachusetts court style
since 1932. The `mass-chapter` pattern only matched the strict
`G.L. c. NNN, § NN` form, missing the common variants:

- `G.L.c. NNN` (no space between `G.L.` and `c.`)
- `G. L. c. NNN` (spaced abbreviation)
- `G.L. c. NNN, sec. NN` (`sec.` instead of `§`)
- `G.L. c. NNN` (chapter-only, no section)
- `General Laws c. NNN, § NN` (spelled-out without `Mass.`)

Beyond losing the statutory citation, the unrecognized text spilled
forward and corrupted case-name extraction for the **next**
citation (`G.L.c. 93A. Begelfer v. Najarian` →
`caseName="G.L.c. 93A. Begelfer v. Najarian"`).

### Fixes

Two regexes updated in tandem — the `mass-chapter` tokenizer
pattern in `src/patterns/statutePatterns.ts` and the mirroring
`MASS_CHAPTER_RE` in `src/extract/statutes/extractNamedCode.ts`:

1. Spacing between corpus prefix and `c.` made optional
   (`\s+(?:ch\.?|c\.?)` → `\s*(?:ch\.?|c\.?)`) so `G.L.c.`
   matches.
2. Section connector accepts `§` / `§§` / `sec.` / `Sec.` /
   `section` / `Section` alongside the canonical `§`.
3. Section portion now optional (chapter-only citations like
   `G.L. c. 93A` are valid by themselves and need to extract
   so the unrecognized text doesn't pollute the next citation's
   case-name).
4. Corpus alternation extended with `General Laws` (spelled-out
   without the `Mass.` prefix — common in Massachusetts
   opinions which omit the home-state qualifier).

The extractor in `extractNamedCode.ts` defaults the section body
to empty string when missing — `code` (chapter), `jurisdiction:
"MA"`, and `section: ""` for chapter-only citations.

### Scope notes

The following pieces of #364 are intentionally deferred:

- **`St. YYYY, c. NNN, § N`** session laws (Acts/Statutes of
  Massachusetts) — pending unified `sessionLaw` citation type.
- **`NNN CMR § N.NN`** (Code of Massachusetts Regulations) —
  administrative regulations broadly deferred per #320.
- **`§ N.NN`** short-form regulation follow-on — short-form
  citation problem, not extraction.

### Tests

7 new tests under `Massachusetts G.L. c. spacing/sec./chapter-only
variants (#364)` in `tests/extract/extractStatute.test.ts`:

- `G.L. c. 268A, sec. 25` (sec. connector)
- `G.L.c. 93A` (no space)
- `G. L. c. 93A` (spaced abbreviation, chapter-only)
- `G.L.c. 90, §34M`
- `G.L.c. 272, §99E(3)` (with subsection)
- `General Laws c. 94C, § 32A(a)` (spelled-out)
- Regression: `Mass. Gen. Laws c. 93A, § 2`

Full 2620-test suite passes; no regressions.
