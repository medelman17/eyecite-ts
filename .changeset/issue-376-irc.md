---
"eyecite-ts": patch
---

fix: `I.R.C. § N` (Internal Revenue Code) no longer mis-classified as Ohio Revised Code (#376)

A 37-opinion New Jersey sweep showed 14 out of 14 (100%) `I.R.C.`
citations mis-routed to Ohio: the regex engine matched Ohio's
`R\.?C\.?` fragment starting at the second character of `I.R.C.`,
silently producing `code: "R.C.", jurisdiction: "OH"` and
truncating the federal IRC reference. Every federal-tax statutory
citation in the corpus was lost.

### Fix

New `irc` tokenizer pattern in `src/patterns/statutePatterns.ts`
+ dedicated `extractIrc` extractor at
`src/extract/statutes/extractIrc.ts`. Matches both the dotted
`I.R.C.` and dotless `IRC` forms. Listed BEFORE
`abbreviated-code` so the longer `I.R.C.` match wins span dedup
over Ohio's `R.C.` match at the same position. Output:
`code: "I.R.C."`, `jurisdiction: "US"`, `section`, `subsection`.
Dotless `IRC` is also normalized to canonical `"I.R.C."`.

### Behavior changes

- `I.R.C. § 1367` → `code="I.R.C."`, `jurisdiction="US"` (was:
  `code="R.C."`, `jurisdiction="OH"`)
- `I.R.C. § 1366(a)(1)` → with subsection
- `IRC § 1341` → `code="I.R.C."` (normalized)
- Ohio `Ohio Rev. Code Ann. § 2925.03` → unchanged
- Ohio `R.C. § 2925.03` → unchanged

### Scope notes

The following pieces of #376 are intentionally deferred:

- **Prose `§ N et seq. of the Internal Revenue Code`** —
  prose-form IRC references; needs a different pattern.
- **N.J.S.A. colon-shorthand** (`N.J.S.A. 54A:9-8(c) and :8-7`
  — `:8-7` is title-carry-forward shorthand) — same family as
  Montana `-206` form, deferred with multi-section work.

### Tests

5 new tests under `Internal Revenue Code I.R.C. — federal, not
Ohio (#376)` in `tests/extract/extractStatute.test.ts`:

- `I.R.C. § 1367`
- `I.R.C. § 1366(a)(1)` with subsection
- Bare `IRC § 1341` (normalized to I.R.C.)
- Regression: `Ohio Rev. Code Ann. § 2925.03`
- Regression: `R.C. § 2925.03`

Full 2636-test suite passes; no regressions.

### Related

Same family of jurisdiction-routing bugs as #370 (Michigan MSA
→ Minnesota) and #360 (Idaho I.C. → Indiana) — when a longer
abbreviation contains a shorter state-code abbreviation as a
suffix, the regex engine matches the shorter pattern at the
wrong position. The fix pattern (longer-match wins via container
shape + span dedup) is now established across these three
state-pair mis-classifications.
