---
"eyecite-ts": patch
---

fix: recognize combined `, e.g.` signals (Bluebook Rule 1.3) — `see, e.g.`, `but see, e.g.`, etc. (#239)

`VALID_SIGNALS` and the `SIGNAL_PATTERNS` lookup in `detectStringCites.ts`
recognized only the bare introductory signals (`see`, `but see`, `cf`, …),
not the combined `, e.g.,` forms. Captions like `See, e.g., Smith v. Jones`
silently fell back to the bare `see` signal because the trailing `, e.g.,`
between the signal stem and the case name confused the regex anchors.

Three coordinated changes:

1. **`CitationSignal` discriminated union** gains five values: `"e.g."`,
   `"see, e.g."`, `"see also, e.g."`, `"but see, e.g."`, `"cf., e.g."`,
   `"but cf., e.g."`. Mirrors `VALID_SIGNALS` in `extractCase.ts`.
2. **`SIGNAL_PATTERNS` in `detectStringCites.ts`** now lists the combined forms
   *before* their bare counterparts so the alternation prefers the longer match.
   Trailing `,?` accommodates the comma that normally separates the signal from
   the citation.
3. **`SIGNAL_STRIP_REGEX` in `extractCase.ts`** now allows an optional trailing
   comma (`,?\s+`) so `See also, e.g.,` strips correctly off the plaintiff in
   `extractPartyNames`. The signal-lookup checks the un-stripped form first
   (because combined signals end with a real period that belongs in the
   canonical signal value) before falling back to the period-stripping path
   that handles `Cf.` → `cf`.

Adds 5 regression tests covering each combined-signal form plus a non-regression
control for bare `see`. The `Compare ... with ...` grouping (a related issue
from #239) is structurally different — it requires multi-citation scope
linking, not a new signal entry — and is deferred.
