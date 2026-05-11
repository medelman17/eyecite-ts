---
"eyecite-ts": patch
---

fix: strip citation signals and sentence-initial connectors from supra partyName (#216)

`SUPRA_PATTERN`'s party-name group greedily captures any sequence of
capitalized words before `supra`, so `See Gall, supra`, `Cf. Gall, supra`,
`Then Gall, supra`, and `In Gall, supra` all leaked the leading word into
`partyName` — preventing `DocumentResolver` from matching the supra back to
its full-cite antecedent.

`extractSupra` now post-processes the captured party name through
`stripSupraPartyPrefix`, which removes leading:

- Citation signals: `See`, `See also`, `See, e.g.`, `But see`, `But cf.`,
  `Compare`, `Cf.` / `Cf`, `Accord`, `E.g.`
- Sentence-initial connectors: `Also`, `Then`, `In` (but never `In re` —
  the `(?!\s+re\b)` negative lookahead preserves the bankruptcy/dependency
  caption prefix)

The original captured name is preserved when stripping would leave an empty
string (defensive: prevents a wholesale signal token from blanking out the
party name).

### Tests

12 new tests under `supra party-name signal-leak (#216)`: 5 citation signals
+ 3 sentence-initial connectors + 4 regression controls (including `In re
Smith, supra` → preserves `Smith`, `Smith v. Jones, supra` → preserves both,
`See Smith v. Jones, supra` → strips `See` but keeps `Smith v. Jones`).
