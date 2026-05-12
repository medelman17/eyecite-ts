---
"eyecite-ts": patch
---

fix: don't set `signal` on citations introduced by lowercase prose (#304)

`Contra plaintiff's argument, Bolling v. Sharpe, 347 U.S. 497 (1954)`
and similar forms (`Accord between parties, ...`,
`Compare the rule from ...`) populated `signal: "contra"` / `"accord"` /
`"compare"` on the extracted citation even though those words were
used as ordinary English prepositions, not Bluebook signal phrases.

### Root cause

Two independent paths set `signal`:

1. **`extractPartyNames`** in `extractCase.ts` runs `SIGNAL_STRIP_REGEX`
   on the captured plaintiff. When `extractCaseName` over-captured
   sentence prose (e.g., `Contra plaintiff's argument, Bolling`), the
   leading word looked like a signal and got stripped — but the
   remainder of the plaintiff (`plaintiff's argument, Bolling`) was
   plain English, not a case-name.

2. **`detectLeadingSignals`** in `detectStringCites.ts` scans the gap
   text before a citation for any signal occurrence. For text like
   `Contra plaintiff's argument, [cite]`, it finds `Contra` as the
   only match in the gap and accepts it without verifying that the
   intervening text is case-name-shaped.

### Fix

Both paths now require the post-signal text to begin with a capital
letter — a heuristic that distinguishes a real signal-introduced
citation context (capital-letter case-name following the signal) from
sentence prose (lowercase word following the signal):

- `extractPartyNames`: wrap the existing signal-strip block in a
  guard that only applies the strip when the remainder of the
  plaintiff begins with a capital letter. False-positive prose
  remainders keep the signal unset.
- `detectLeadingSignals`: after selecting the best signal match,
  inspect `gapText.substring(best.end)` and skip the assignment when
  the first non-whitespace, non-comma character is lowercase.

Multi-word signals (`see also`, `but see`, `see, e.g.`) are already
captured as complete units by `SIGNAL_PATTERNS`, so the guard does
not interfere with valid signal forms — only sentence-internal
English words that happen to coincide with signal spellings.

### Tests

5 new tests under `false-positive signal rejection (#304)` in
`tests/extract/extractCase.test.ts`:

- `Contra plaintiff's argument, Smith v. Jones, ...` → `signal: undefined`
- `Accord between parties, Smith v. Jones, ...` → `signal: undefined`
- `Compare the rule from Smith v. Jones, ...` → `signal: undefined`
- Regression: `Contra Smith v. Jones, ...` → `signal: "contra"` (real
  signal with capital-letter case-name follow-on)
- Regression: `See Smith v. Jones, ...` → `signal: "see"`

Full 2432-test suite passes; no regressions.
