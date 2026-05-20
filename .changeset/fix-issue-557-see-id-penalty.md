---
"eyecite-ts": patch
---

fix(score): broaden mid-sentence `Id.` penalty to recognize preceding Bluebook signal phrases (#557)

`extractShortForms.ts` was clamping `Id.` confidence to 0.4 when the citation followed a sentence-level signal like `See`, `See also`, `Compare`, `Accord`, `Contra`, `See generally`, `But see`, `See, e.g.`, `E.g.`, or `But see, e.g.` — the existing punctuation check only accepted `.;)\]—:` so signals ending on alphabetic characters or a comma were misread as mid-sentence prose. About 66% of `id` citations in a 300-opinion CAP-corpus audit landed at exactly 0.4 because of this. The context check now also matches a trailing signal phrase (mirroring `SIGNAL_PATTERNS` in `detectStringCites.ts`) and uses a 60-char lookback window so signals after a real preceding citation (`... (1974). See id.`) no longer trip the penalty either. `Id.` after lowercase prose ("The Id. card", "His Id.") still gets the 0.4 cap.
