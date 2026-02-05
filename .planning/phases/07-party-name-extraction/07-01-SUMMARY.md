---
phase: 07-party-name-extraction
plan: 01
subsystem: extraction
tags: [case-citations, party-names, normalization, supra-resolution]

# Dependency graph
requires:
  - phase: 06-full-span-complex-parentheticals
    provides: caseName field on FullCaseCitation for party extraction
provides:
  - plaintiff/defendant raw and normalized fields on FullCaseCitation
  - proceduralPrefix field for non-adversarial cases
  - normalizePartyName() function with 7-step pipeline
  - extractPartyNames() function with procedural/adversarial logic
  - Backward search regex supporting d/b/a and vs. variants
affects: [08-supra-resolution-improvement]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Dual raw/normalized field pattern for party names (preserves original + provides matching-optimized version)
    - Iterative suffix stripping for corporate entities (Corp., Inc. → Corp. → base name)
    - Procedural prefix detection with adversarial fallback (Estate of X v. Y treated as adversarial)

key-files:
  created: []
  modified:
    - src/types/citation.ts
    - src/extract/extractCase.ts
    - tests/extract/extractCase.test.ts

key-decisions:
  - "Do not lower citation confidence for missing party names (backward compatibility)"
  - "Government entities (United States, People, State, Commonwealth) are plaintiffs, not procedural prefixes"
  - "Strip d/b/a and aka plus everything after (alternative business names irrelevant for matching)"
  - "Support '/' character in party name backward search regex (for d/b/a patterns)"
  - "Iteratively strip multiple corporate suffixes (Corp., Inc. → Corp. → base)"

patterns-established:
  - "Raw fields preserve exact case name text for display/export"
  - "Normalized fields lowercase and strip noise for matching/resolution"
  - "Procedural prefix field indicates non-adversarial case structure"

# Metrics
duration: 6min
completed: 2026-02-05
---

# Phase 7 Plan 01: Party Name Extraction Summary

**Plaintiff/defendant extraction with raw/normalized fields, procedural prefix handling, government entity recognition, and comprehensive normalization pipeline**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-05T22:56:01Z
- **Completed:** 2026-02-05T23:02:12Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added plaintiff, plaintiffNormalized, defendant, defendantNormalized, proceduralPrefix fields to FullCaseCitation (all optional, 100% backward compatible)
- Implemented normalizePartyName() with 7-step pipeline: strip et al., d/b/a (everything after), aka (everything after), corporate suffixes (iterative), leading articles, normalize whitespace, lowercase
- Implemented extractPartyNames() with procedural prefix detection (In re, Ex parte, Matter of, Estate of, etc.) and adversarial splitting on v./vs.
- Fixed extractCaseName backward search to support '/' character (for d/b/a) and 'vs.' variant
- 26 new party name extraction tests covering all requirements (PARTY-01 through PARTY-05)
- All 461 tests pass (110 extractCase tests, 351 other tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add type fields and implement extractPartyNames** - `5bdc247` (feat)
   - Type extensions: plaintiffNormalized, defendantNormalized, proceduralPrefix
   - normalizePartyName() function with 7-step pipeline
   - extractPartyNames() function with procedural/adversarial logic
   - Wired into extractCase() to populate new fields

2. **Task 2: Comprehensive party name extraction tests** - `fc077dd` (test)
   - 26 tests for standard adversarial, procedural prefixes, government entities, normalization, edge cases
   - Fixed extractCaseName regex to support '/' character in party names
   - Fixed extractCaseName to handle 'vs.' variant and Estate of prefix
   - Fixed normalizePartyName to strip multiple corporate suffixes iteratively

## Files Created/Modified

- `src/types/citation.ts` - Added plaintiffNormalized, defendantNormalized, proceduralPrefix fields to FullCaseCitation
- `src/extract/extractCase.ts` - Implemented normalizePartyName(), extractPartyNames(), updated extractCaseName regex, wired party extraction into extractCase()
- `tests/extract/extractCase.test.ts` - Added 26 party name extraction tests (110 total tests in file)

## Decisions Made

**Decision 1: No confidence penalty for missing party names**
- **Rationale:** Backward compatibility. Existing citations without case names should maintain original confidence scores. Party name quality will be reflected in supra resolution confidence (Plan 02), not in citation confidence.
- **Impact:** Citation confidence scoring unchanged from Phase 6

**Decision 2: Government entities are plaintiffs, not procedural prefixes**
- **Rationale:** "United States v. Jones" is adversarial, not procedural. These are sovereign parties in litigation, not case types like "In re" or "Ex parte".
- **Impact:** extractPartyNames splits on "v." for these cases, no proceduralPrefix field set

**Decision 3: Strip d/b/a and aka plus everything after**
- **Rationale:** Alternative business names and aliases are noise for party name matching. "Smith d/b/a Smith Industries" and "Smith" should match. Same for "Jones aka Johnson".
- **Impact:** Normalization uses `.replace(/\s+d\/b\/a\b.*/gi, '')` and `.replace(/\s+aka\b.*/gi, '')`

**Decision 4: Support '/' character in backward search regex**
- **Rationale:** Party names contain "d/b/a" which includes '/'. Original regex `[A-Za-z0-9\s.,'&()-]` didn't match slash, causing backward search to truncate at slash.
- **Impact:** Updated extractCaseName regex to `[A-Za-z0-9\s.,'&()/-]` to capture full party names with d/b/a

**Decision 5: Iteratively strip multiple corporate suffixes**
- **Rationale:** Party names like "Smith Corp., Inc." have multiple suffixes. Single-pass regex leaves "Corp." after stripping "Inc.".
- **Impact:** normalizePartyName uses while loop to repeatedly strip suffixes until no more matches

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed extractCaseName regex to support '/' character**
- **Found during:** Task 2 (writing d/b/a test)
- **Issue:** Backward search regex didn't include '/' character, causing "Smith d/b/a Smith Industries" to be truncated at the slash
- **Fix:** Updated extractCaseName regex from `[A-Za-z0-9\s.,'&()-]` to `[A-Za-z0-9\s.,'&()/-]` to include slash
- **Files modified:** src/extract/extractCase.ts
- **Verification:** Test "strips d/b/a from party name" passes, full party name extracted
- **Committed in:** fc077dd (Task 2 commit)

**2. [Rule 1 - Bug] Fixed extractCaseName to handle 'vs.' variant**
- **Found during:** Task 2 (writing vs. variant test)
- **Issue:** Backward search only matched "v." not "vs."
- **Fix:** Updated extractCaseName regex from `\s+v\.?\s+` to `\s+v(?:s)?\.?\s+` to match both variants
- **Files modified:** src/extract/extractCase.ts
- **Verification:** Test "handles vs. variant" passes
- **Committed in:** fc077dd (Task 2 commit)

**3. [Rule 1 - Bug] Added Estate of to procedural prefix list in extractCaseName**
- **Found during:** Task 2 (writing Estate of test)
- **Issue:** Backward search didn't include "Estate of" in procedural prefix regex, couldn't extract "Estate of Smith" case names
- **Fix:** Added "Estate of" to procedural prefix regex in extractCaseName
- **Files modified:** src/extract/extractCase.ts
- **Verification:** Test "handles Estate of without v. as procedural" passes
- **Committed in:** fc077dd (Task 2 commit)

**4. [Rule 1 - Bug] Fixed normalizePartyName to strip multiple suffixes iteratively**
- **Found during:** Task 2 (writing normalization test)
- **Issue:** "The Smith Corp., Inc." normalized to "smith corp." because single-pass regex only stripped "Inc."
- **Fix:** Added while loop to iteratively strip suffixes until no more matches
- **Files modified:** src/extract/extractCase.ts
- **Verification:** Test "normalizes plaintiff and defendant" passes, "smith corp., inc." → "smith"
- **Committed in:** fc077dd (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (4 bugs)
**Impact on plan:** All auto-fixes were bug fixes discovered during test writing. No scope creep. Plan requirement PARTY-01 through PARTY-05 all met.

## Issues Encountered

None - all tasks completed as planned with bug fixes applied during test development

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Phase 7 Plan 02 (Supra Resolution Improvement):
- Party name fields populated on all case citations with case names
- Normalized party names ready for fuzzy matching in supra resolution
- Procedural prefix field distinguishes non-adversarial cases
- All 461 tests passing, zero regressions

**Data availability:**
- plaintiff/plaintiffNormalized fields available for supra matching
- defendant/defendantNormalized fields available for future citation graph analysis
- proceduralPrefix field available for case type categorization

---
*Phase: 07-party-name-extraction*
*Completed: 2026-02-05*

## Self-Check: PASSED

All commits verified in git history:
- 5bdc247: Task 1 (feat)
- fc077dd: Task 2 (test)

All modified files verified:
- src/types/citation.ts
- src/extract/extractCase.ts
- tests/extract/extractCase.test.ts
