---
"eyecite-ts": patch
---

fix: state constitution prefix preserved on no-space `Pa.Const.` form (#329)

When a state constitutional citation used the abbreviated form with no
space between the state prefix and `Const.` — `Pa.Const. art. VIII, § 4`,
`Cal.Const. art. I, § 6`, `N.Y.Const. art. III` — the `state-constitution`
tokenizer pattern required a whitespace separator and didn't match. The
input fell through to `bare-constitution`, producing `matchedText: "Const.
art. VIII, § 4"` with `jurisdiction: undefined`. The jurisdictional
attribution was silently dropped, even though it was present in the source.

### Fix

Two surface-level updates:

1. **Pattern** (`src/patterns/constitutionalPatterns.ts`): the separator
   between the state abbreviation and `Const.` is now `(?:\.\s*|\s+)` —
   either `.` followed by 0+ whitespace, OR 1+ whitespace. Both forms
   require a separator, so `PaConst.` (no `.` and no space) still does
   not match, preventing word-glue false positives from any word
   starting with a state-abbreviation stem.

2. **Extractor** (`src/extract/extractConstitutional.ts`):
   `STATE_PREFIX_RE` now uses `\.?\s*Const` instead of `\.?\s+Const`,
   so the prefix is captured from `Pa.Const.` and `N.Y.Const.` the same
   way as from `Pa. Const.` / `N.Y. Const.`. `resolveStateJurisdiction`
   already strips spaces and dots before lookup, so jurisdiction
   resolution is unchanged downstream.

### Tests

7 new tests:

`tests/patterns/constitutionalPatterns.test.ts` (4):
- `Pa.Const. art. VIII, § 4` matches state-constitution
- `Cal.Const. art. I, § 6` matches state-constitution
- `N.Y.Const. art. III` (multi-part) matches state-constitution
- `PaConst.` (no separator at all) does NOT match — false-positive guard

`tests/extract/extractConstitutional.test.ts` (3):
- `Pa.Const.` → `jurisdiction: "PA"`, `article: 8`, `section: "4"`
- `Cal.Const.` → `jurisdiction: "CA"`
- `N.Y.Const.` → `jurisdiction: "NY"`, `article: 3`

Full 2510-test suite passes; existing spaced and `U.S. Const.` forms
unchanged.

### Related

Surfaced by a 200-opinion modern sweep. Other constitutional-citation
coverage gaps (bare `Eighth Amendment` prose form, populated `document`
field on the output) are tracked as separate issues.
