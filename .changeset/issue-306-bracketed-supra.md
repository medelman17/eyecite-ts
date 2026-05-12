---
"eyecite-ts": patch
---

feat: recognize bracketed `[supra]` forms — Connecticut style (#306)

Connecticut Supreme/Appellate opinions enclose `supra` in square
brackets when the supra reference is nested inside a string-cite or
quotation: `State v. Jarzbek, [supra, 705]`, `State v. Jarzbek,
[supra]`, `[supra at 78-82]`. None of these tokenized — all returned
`[]`. Surfaced by the 200-opinion modern-era sweep as a systematic
recall gap for Connecticut citation extraction.

### Fix

Added a new tokenizer pattern `BRACKETED_SUPRA_PATTERN` to
`src/patterns/shortForm.ts`:

```regex
(?:\b([A-Z]...)\s*,?\s+)?\[supra(?:(?:,\s+|\s+at\s+(?:pp?\.\s*)?)(\d+(?:[-–—]\d+)?))?\]
```

Captures:
- Group 1: party name (optional — undefined for the bare standalone
  `[supra at N]` form)
- Group 2: pincite (optional, accepts both Connecticut's `, N` form
  and the canonical `at N` form, plus range `N-M`)

The bracket-comma pincite shape `[supra, 705]` deliberately accepts
no `at` before the page — that's the Connecticut convention.

`extractSupra` adds a fast-path branch that recognizes bracketed
token text (via `text.includes("[supra")`) and parses it through the
new regex. Falls through to the canonical `partySupraRegex` for
non-bracketed forms — zero impact on existing supra extraction.

### Tests

4 new tests under `bracketed [supra] forms (#306)` in
`tests/extract/extractShortForms.test.ts`:

- `State v. Jarzbek, [supra, 705]` → partyName + pincite
- `State v. Jarzbek, [supra]` → partyName, no pincite
- `[supra at 78-82]` → no partyName, pincite 78 (range start)
- Regression: `Smith, supra, at 100` continues to work

Updated the pattern-count test in `tests/patterns/shortForm.test.ts`
from "all five patterns" → "all six patterns".

Full 2448-test suite passes; no regressions.
