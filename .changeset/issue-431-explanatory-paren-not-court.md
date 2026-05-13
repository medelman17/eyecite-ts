---
"eyecite-ts": patch
---

fix: explanatory parentheticals `(holding that...)` no longer routed to `court` field (#431)

When a citation had a trailing **explanatory parenthetical** —
`(holding that...)`, `(emphasis added)`, `(citations omitted)`,
`(internal citations omitted)`, etc. — eyecite-ts mis-routed the
content to the `court` field, leaving the case citation looking
like it came from a non-existent court. 171 occurrences across
15 states.

### Fixes

Two coordinated changes in `src/extract/extractCase.ts`:

1. **`stripDateFromCourt` rejects explanatory text**: after the
   date-stripping pass, the function now checks if the residual
   text is actually a court abbreviation. Court abbreviations
   (Bluebook T7) virtually always contain a period (`D.C. Cir.`,
   `9th Cir.`, `S.D.N.Y.`). Text with no period and starting
   with a known explanatory-signal word (`holding`, `finding`,
   `quoting`, `emphasis`, `internal`, `citations`, `omitted`,
   etc.), or text containing 3+ lowercase prose words, is now
   rejected as a court candidate.

2. **Explanatory first-paren falls through to classification**:
   the parenthetical-chaining logic in `extractCase` used to
   always skip the first paren on the assumption that it
   carried metadata (year/court). With the fix above, an
   explanatory first paren produces no metadata, so it now
   falls through to be classified as a `Parenthetical` and
   added to the `parentheticals` array.

### Behavior changes

- `336 Mont. 225 (holding that we review de novo)` →
  `court=undefined`, `parentheticals=[{text: "holding that...",
  type: "holding"}]` (was: `court="holding that we review..."`)
- `368 Mont. 189 (emphasis in original)` → `court=undefined`
- `243 P.3d 415 (internal citations omitted)` →
  `court=undefined`
- `100 U.S. 200 (D.C. Cir. 1980)` → unchanged
- `100 U.S. 200 (1980)` → unchanged

### Tests

5 new tests under `explanatory parentheticals not routed to
court field (#431)` in `tests/extract/extractCase.test.ts`.
Full 2758-test suite passes; no regressions.
