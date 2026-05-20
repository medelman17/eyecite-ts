---
"eyecite-ts": patch
---

fix(extract): reject `<year> Fed.R.X.X. N` case-shape false positives (#582)

Pre-fix behavior: the broad state-reporter regex matched
`1983 Fed.R.Civ.P. 17` as `{ volume: 1983, reporter: "Fed.R.Civ.P.",
page: 17 }` — a phantom case citation where `1983` was an incidental
year sitting next to a federal-rule citation. The existing volume cap
in `isSuspiciousSmallVolume` only triggered for volumes 1–20, so the
1900s-2099 window slipped through.

The primary cure is the new federal-rule extractor from #576, which
wins overlap dedup against the state-reporter match and emits a clean
`federalRule` citation. This change adds the defense-in-depth filter
the issue called for:

- New `isFederalRulePhantom` check in `filterFalsePositives.ts` flags
  any `case` citation whose volume is in `[1900, 2099]` AND whose
  reporter matches `/^Fed\.\s?R\./i` (i.e., the `Fed. R.` / `Fed.R.`
  federal-rule family — `Civ.P.`, `Crim.P.`, `Evid.`, `App.P.`,
  `Bankr.P.`).
- Real Federal Reporter series (`Fed. Cl.`, `F. App'x`, `F. Supp.`)
  are unaffected — the `Fed. R.` prefix is unique to the federal rules.
- Wired into both `isFalsePositive` (hard reject) and
  `collectFalsePositiveReasons` (soft flag + warning) for parity with
  the existing FP filters.

Behavior: in `filterFalsePositives: true` mode the phantom is removed;
in default mode it gets confidence `0.1` and a warning explaining the
mis-tokenization.
