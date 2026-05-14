---
"eyecite-ts": patch
---

feat: case name backward search now runs on neutral citations (`YYYY ST NNN`) (#441)

Neutral (vendor-neutral / public-domain) citations of the form
`YYYY ST NNN` (`2015 MT 255`, `2004 MT 108`) and database forms
(`1994 WL 49932`) were extracting successfully but **never
captured a case name** — 80 occurrences in the corpus where
canonical `<caseName>, YYYY ST NNN` form should have produced
the name.

### Fix

`extractNeutral` now runs the same `extractCaseName` backward
search as full-case extraction:

- Runs when `cleanedText` is provided (matching the case
  extractor's signature)
- Applies the same trailing-token cleanup as #436 (strip
  trailing year paren, parallel-cite start, neutral-cite
  shape)
- Strips leading prose/signal prefixes (`In`, `See`, `See
  also`, `Cf.`, `But see`, `Accord`, `Contra`, `Compare`,
  `E.g.`)

`NeutralCitation` type extended with optional `caseName?:
string` field.

### Behavior changes

- `In Christian v. Atl. Richfield Co., 2015 MT 255` →
  `caseName="Christian v. Atl. Richfield Co."` (was `null`)
- `See Farmers Union Mut. Ins. Co. v. Staples, 2004 MT 108` →
  `caseName="Farmers Union Mut. Ins. Co. v. Staples"`
- `Blair v. Mid-Continent Cas. Co., 2007 MT 208` →
  `caseName="Blair v. Mid-Continent Cas. Co."`

### Tests

3 new tests under `neutral-citation caseName backward search
(#441)` in `tests/extract/extractCase.test.ts`. Full 2766-test
suite passes; no regressions.
