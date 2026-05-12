---
"eyecite-ts": patch
---

fix: plaintiff field no longer absorbs leading transition words or preceding sentences (#323)

`Invoking Younger v. Harris, 401 U.S. 37 (1971)` populated
`plaintiff: "Invoking Younger"` instead of `"Younger"`. Same pattern
for `Citing`, `Under`, `Unlike`, `Following`, and similar sentence-
initial transition words. A more catastrophic shape — parenthesized
citations after a sentence-ending period like `... discretion.
(Burquet v. Brumbaugh, 223 Cal.App.4th 1140.)` — captured the entire
preceding sentence into `plaintiff` because the case-name backward
walk crossed both the period and the open-paren.

### Fix

Two targeted changes in `src/extract/extractCase.ts`:

1. **Transition-word rejection in `isLikelyPartyName`.** Added
   citation-introducing transition words to `SENTENCE_INITIAL_WORDS`
   (`under`, `invoking`, `citing`, `following`, `unlike`, `whereas`,
   `pursuant`, `applying`) and updated `isLikelyPartyName` to reject
   a candidate whose first word is in that set. These words pass the
   all-capitalized-words check (every word starts with a capital
   letter) but are sentence-prose, not party names. With the new
   guard, the downstream trim loop strips the transition word and
   the actual party name (the next capitalized word) is preserved.

2. **`. (` sentence boundary detection.** Extended
   `SENTENCE_BOUNDARY_REGEX` from `/[.)]\s+(?=[A-Z])/g` to
   `/[.)]\s+(?=[A-Z(])/g` so the case-name walk stops at the open
   paren when a citation envelope opens immediately after a sentence-
   ending period. Without it, the walk crosses the boundary and
   absorbs the entire preceding sentence.

### Tests

7 new tests under `plaintiff field over-capture — transition words +
sentence-paren boundary (#323)` in `tests/extract/extractCase.test.ts`:

- `Invoking Younger v. Harris` → `plaintiff: "Younger"`
- `Citing Pederson v. Smith` → `plaintiff: "Pederson"`
- `Unlike State v. Q.D.` → `plaintiff: "State"`
- `Under People v. Smith` → `plaintiff: "People"`
- Catastrophic: `... discretion. (Burquet v. Brumbaugh, ...)` →
  `plaintiff: "Burquet"`
- Regression: `See, e.g., Ivanhoe Irrigation District v. McCracken` →
  `plaintiff: "Ivanhoe Irrigation District"`, `signal: "see, e.g."`
- Regression: `In re Smith` → `caseName: "In re Smith"` (prefix
  preserved)

Full 2463-test suite passes; no regressions.
