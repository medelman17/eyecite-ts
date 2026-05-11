---
"eyecite-ts": patch
---

fix: parallel-cite volume mistakenly consumed as pincite + lost year/caseName on parallel chains

When a primary cite was followed by a comma-separated parallel cite —
e.g., `Nixon v. Nixon, 329 Pa. 256, 198 A. 154 (1938)` or Roe's three-reporter
`410 U.S. 113, 93 S. Ct. 705, 35 L. Ed. 2d 147 (1973)` — the volume of the
parallel cite (`198`, `93`, `35`) was greedily matched by
`LOOKAHEAD_PINCITE_REGEX` as a pincite for the first cite. Downstream effects:

- The first cite's trailing year parenthetical was unreachable (hidden behind
  the parallel cite), leaving `year` undefined.
- The case-name backward walk for a parallel cite started at its own position
  and walked unbounded, scooping the prior reporter cite into its `caseName`
  (e.g., `Nixon v. Nixon, 329 Pa. 256`).

### Fix (two layers)

**(A) Pincite regex disambiguation.** `LOOKAHEAD_PINCITE_REGEX` and
`ADDITIONAL_PINCITE_REGEX` now require the captured pincite to terminate at
end-of-string, sentence punctuation, paren/bracket close, or whitespace NOT
followed by a capital letter. `, 198 A.` no longer matches (capital `A`
starts a parallel reporter); `, 117 (1973)` still does; bracketed pincites
`[266 Cal.Rptr. 569, 575]` still terminate cleanly on `]`.

**(B) Span-aware extraction.** `extractCase` now receives the spans of
sibling case-citation tokens and uses them to:

- Skip past a contiguous parallel-cite chain (separated only by commas,
  whitespace, and digit/dash runs for intervening pincites) when searching
  for the shared trailing year parenthetical — both in the look-ahead paren
  scan and in `collectParentheticals` so `fullSpan` extends through the
  shared paren.
- Bound the case-name backward walk by the prior sibling's end so a parallel
  cite cannot absorb the preceding reporter cite's text into its caseName.
- Populate `fullSpan` on secondary parallel cites (which have no captured
  caseName) when a close preceding sibling indicates a parallel chain, so
  string-citation grouping and downstream span consumers see the full
  citation extent through the shared trailing paren.

### Tests

9 new tests under `parallel-cite pincite disambiguation (regression)` in
`tests/extract/extractCase.test.ts`:

- **Two-reporter parallel** (`329 Pa. 256, 198 A. 154 (1938)`): no false
  pincite on the first cite; both cites get `year=1938`; the second cite's
  `caseName` does not leak the first reporter cite.
- **Three-reporter parallel** (Roe v. Wade): no false pincites on any of
  the three cites; all three get `year=1973`.
- **Pincite WITH following parallel** (`410 U.S. 113, 117, 93 S. Ct. 705
  (1973)`): the real pincite `117` is captured; no additional false pincite
  from the parallel volume; the first cite still gets `year=1973`.
- **Multi-discrete pincite regression** (`410 U.S. 113, 115, 153 (1973)`):
  the #247 feature continues to work — `pincite=115`,
  `additionalPincites=[{page: 153}]`, `year=1973`.

Full 2346-test suite passes including the existing California bracketed
parallel pincite test (`[266 Cal.Rptr. 569, 575]`) and the string-citation
grouping integration test that depends on `fullSpan` extending through the
shared trailing paren.
