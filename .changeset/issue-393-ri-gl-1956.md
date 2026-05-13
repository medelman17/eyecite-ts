---
"eyecite-ts": patch
---

feat: Rhode Island General Laws 1956 `G.L. 1956 (1969 Reenactment) §N-N-N` (#393)

RI uses `G.L. 1956` (General Laws of 1956) as its modern
statutory code, with an optional `(YYYY Reenactment)`
parenthetical indicating which reenactment volume was in
effect. The `1956` literal year is the disambiguator from
Massachusetts `G.L. c. NNN` (chapter form).

### Fix

New `rigl-1956` tokenizer pattern + dedicated `extractRigl1956`
extractor. Captures both the canonical full form
(`G.L. 1956 (1969 Reenactment) §11-23-1`) and the simpler forms
(`G.L. 1956 §N-N-N`, `G. L. 1956, §N-N-N`). The reenactment
year goes into the `year` field and `editionLabel` is set to
`"Reenactment"` when present.

### Scope notes

The following pieces of #393 are intentionally deferred:

- **Bare-section follow-ons** (`§45-32-22`, `§11-8-3`) —
  short-form citation problem, not extraction.
- **Bare-section ranges** (`§§45-32-11 to 45-32-21`,
  `§§45-32-4 and 45-32-11`) — multi-section deferred across all
  states.
- **`(YYYY Reenactment)` as bare parenthetical** after a
  bare-section follow-on — would need standalone-paren
  handling.
- **`P.L. YYYY, ch. NNN` public laws** — pending unified
  `sessionLaw` citation type.
- **OCR variant** (`§6A-9-307(l)` — `l` is misread `1`) —
  edge case; OCR cleanup belongs upstream.

### Tests

5 new tests under `Rhode Island General Laws 1956 (#393)` in
`tests/extract/extractStatute.test.ts`:

- `G.L. 1956 (1969 Reenactment) §11-23-1` (full form)
- `G. L. 1956 (1969 Reenactment) §9-21-2` (spaced)
- `G. L. 1956, §10-7-1` (no reenactment paren)
- `G.L. 1956 §11-23-1` (no comma, no reenactment)
- Regression: Massachusetts `G.L. c. 93A` still routes to MA

Full 2684-test suite passes; no regressions.

### Related

The disambiguation pattern (year literal vs. chapter marker)
follows the precedent established by Colorado `C.R.S. 1963`
(#352), Alabama `Code 1940` (#343), Hawaii `RLH 1935` (#359),
Nebraska `R.R.S. 1943` (#373). Every state with a 19xx-year
compilation has its own pattern with the year embedded.
