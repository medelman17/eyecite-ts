---
"eyecite-ts": patch
---

fix(extract): accept N.J.S.A. with inter-letter spacing (`N. J. S. A.`)
+ normalize whitespace/no-period variants to canonical `N.J.S.A.` (#593)

The previous NJ regex fragment required no whitespace between the
inter-letter periods, so `N. J. S. A. 2:100-26` (whitespace between
every letter — common in older NJ Super and NJ reporters) failed to
tokenize. Documented as 38 hits across a 600-opinion sample.

Two coordinated changes to `src/data/stateStatutes.ts`:

- Extend the NJ regex fragment from
  `N\.?J\.?\s*S(?:tat)?\.?\s*A?\.?` to
  `N\.?\s*J\.?\s*S(?:tat)?\.?\s*A?\.?` so whitespace is permitted
  between every letter pair. Same tolerance pattern already used for
  Pennsylvania (`Pa.C.S.` / `Pa. C.S.` / `Pa. C. S.`) and Ohio
  (`R.C.` / `R. C.`).
- Reorder the `abbreviations` array so `N.J.S.A.` is LAST (canonical
  Bluebook form). `findAbbreviatedCode`'s stripped-form fallback emits
  the LAST entry as the normalized `code` for spaced/no-period
  variants — previously the last entry was the bare shorthand `NJS`,
  so `N. J. S. A.` resolved with `code="NJS"` rather than the
  expected canonical `code="N.J.S.A."`. The reordering matches the
  Arizona pattern (`["Ariz. Rev. Stat. Ann.", "Ariz. Rev. Stat.",
  "A.R.S."]`) where the canonical Bluebook abbreviation is last.
