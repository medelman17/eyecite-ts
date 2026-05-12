---
"eyecite-ts": patch
---

fix: Florida postfix and spelled-out-prefix statute forms (#356)

Florida courts use a distinctive postfix citation syntax where the
code name appears AFTER the section number — opposite the typical
Bluebook prefix order. eyecite-ts handled the canonical Bluebook
`Fla. Stat. § N` form but missed every Florida-specific variant. A
50-opinion Florida sample produced 15+ statute misses dominated by
these forms:

- `section 812.035(7), Florida Statutes`
- `§83.15, Florida Statutes`
- `§120.68, Fla. Stat.`
- `Florida Statute 679.504(3)` (singular code name, no `section`/`§`)
- `Florida Statutes §73.071(3)(b)`

### Fix

Two new tokenizer patterns + one new extractor:

- **`florida-postfix`** — section first, then code name
  (`section <body>, Florida Statutes|Fla. Stat.` /
  `§<body>, Florida Statutes|Fla. Stat.`). Uses a lookbehind
  `(?<![A-Za-z])` boundary so the pattern can start at `§` (a `\b`
  anchor doesn't match before a non-word char).
- **`florida-prefix-spelled`** — spelled-out code name first
  (`Florida Statute(s) [§] <body>`). Distinct from the canonical
  Bluebook `Fla. Stat. §` prefix already handled by `abbreviated-code`.

Both patternIds dispatch to a new
`src/extract/statutes/extractFloridaStatute.ts`, which emits
`code: "Fla. Stat."` (normalized) and `jurisdiction: "FL"`.

The patterns are listed BEFORE `abbreviated-code` in `statutePatterns.ts`
so the container shapes win span dedup over the trailing `Florida
Statutes` token (which would otherwise tokenize on its own with a
phantom section).

### Scope notes

Two pieces of #356 are intentionally deferred:

- **Chapter-only references** (`Chapter 78, Florida Statutes`,
  `Chapters 74-310 and 75-191, Florida Statutes`) — needs a data
  model change (separate `chapter` field, or a chapter-only marker)
  that's larger than a tight regex fix.
- **Florida session laws** (`Chapters 74-310 and 75-191, Laws of
  Florida`) — needs a new `sessionLaw` citation type. Tracked
  separately alongside California `Stats.`, Colorado `Sess. Laws`,
  and Arkansas equivalents.

### Tests

7 new tests under `Florida postfix + spelled-out-prefix statute forms
(#356)` in `tests/extract/extractStatute.test.ts`:

- Postfix word-section: `section 812.035(7), Florida Statutes`
- Postfix §-section (no space): `§83.15, Florida Statutes`
- Postfix §-section with `Fla. Stat.`: `§120.68, Fla. Stat.`
- Spelled-out singular prefix: `Florida Statute 679.504(3)`
- Spelled-out plural prefix + §: `Florida Statutes §73.071(3)(b)`
- Regression: canonical `Fla. Stat. § 812.035(7)`
- Regression: abbreviated `F.S. § 812.035`

Full 2569-test suite passes; no regressions.

### Related

Same family as #348 (Arizona), #349 (Arkansas), #352 (Colorado), #330
(Illinois pre-1993), #343 (Alabama 1940). Each state's statute code
has its own ordering, abbreviation, and connector conventions that
need explicit pattern coverage.
