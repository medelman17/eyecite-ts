---
"eyecite-ts": patch
---

fix: Texas writ/petition history inside court parenthetical now captured (#229)

Texas Greenbook (Tex. R. App. P. 47.7) places writ-of-error and petition history *inside* the court-and-year parenthetical after a second comma — e.g., `(Tex. App.—Houston [1st Dist.] 2002, writ ref'd n.r.e.)`. This is structurally different from federal-style subsequent history (which appears between parentheticals). The library previously dropped the writ/pet phrase as junk and left the court field polluted with the year and trailing clause.

Three coordinated changes:

1. **`HistorySignal` discriminated union** extended with 10 Texas-specific
   categories: `writ_refused`, `writ_dismissed`, `writ_denied`, `writ_granted`,
   `no_writ` (pre-Sept. 1997 writ-of-error practice); `pet_refused`,
   `pet_denied`, `pet_dismissed`, `pet_granted`, `no_pet` (post-Sept. 1997).
2. **`SIGNAL_TABLE`** gains 14 new regex entries covering all common Texas
   writ/pet phrase variants (`writ ref'd n.r.e.`, `writ ref'd w.m.j.`,
   `writ dism'd w.o.j.`, `no pet. h.`, etc.). Longer disposition modifiers
   precede the bare forms so alternation prefers the more specific match.
3. **`parseParenthetical`** now detects a trailing `,\s*<signal>` clause after
   the year, strips it from the working content before `stripDateFromCourt`
   runs (so the court field is correctly bounded), and returns the parsed
   signal in a new `internalHistory` field. `extractCase` then emits this as
   the first entry (order 0) in `subsequentHistoryEntries`, with proper
   `signalSpan` offsets translated through the transformation map.

The em-dash `—` is converted to `---` by the existing `normalizeDashes`
cleaner (it doubles as the blank-page placeholder pattern). Court strings
therefore appear as `Tex. App.---Houston [1st Dist.]` rather than with the
literal em-dash — that's pre-existing cleaning behavior, not a regression.

Adds 21 corpus-sourced regression tests: 4 court-extraction tests (em-dash
+ city, em-dash + nested-bracket district), 7 writ-history variant tests,
6 petition-history variant tests, 1 end-to-end issue-body input, and 3
regression controls (`9th Cir.`, `S.D.N.Y.`, and a between-parens `aff'd`
chain) confirming no impact on federal-style parsing.
