---
"eyecite-ts": patch
---

feat: Washington RCW chapter-postfix form `chapter 49.60 RCW` (#408)

Canonical Washington court style places the chapter number BEFORE
RCW (postfix form), unlike the prefix `RCW chapter NN` form used
in other states. The `NN.NN` chapter format is distinctively
Washington.

### Fix

New `rcw-chapter-postfix` tokenizer pattern + dedicated
`extractRcwChapterPostfix` extractor. Accepts both lowercase
`chapter` and capitalized `Chapter`. Emits `code: "RCW"`,
`jurisdiction: "WA"`, with the chapter ID in `section` (matching
the convention from `rsa-chapter` #378, `oh-chapter` #388,
`ors-chapter` #387).

### Scope notes

The following pieces of #408 are intentionally deferred:

- **`Laws of YYYY, ch. NNN, § N`** session laws — pending
  unified `sessionLaw` citation type.
- **`[former] N.NN.NN [(YYYY)]`** bracketed annotation — marks
  superseded sections; needs separate handling.
- **Section continuation** (`RCW 60.04 -.181(3)`) — multi-section
  family.

### Tests

3 new tests under `Washington RCW chapter-postfix form (#408)` in
`tests/extract/extractStatute.test.ts`:

- `chapter 49.60 RCW` (lowercase)
- `Chapter 41.26 RCW` (capitalized)
- Regression: `RCW 10.88.330` (prefix form)

Full 2717-test suite passes; no regressions.

### Related

Sixth chapter-only state pattern (after NH `rsa-chapter` #378,
OH `oh-chapter` #388, OR `ors-chapter` #387, plus the WV-1931
historical pattern). Washington's distinctive postfix variant
(chapter BEFORE the code abbreviation) is unique in the family.
