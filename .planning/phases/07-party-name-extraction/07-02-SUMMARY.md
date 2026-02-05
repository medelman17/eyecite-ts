---
phase: 07-party-name-extraction
plan: 02
subsystem: resolution
requires: ["07-01"]
provides: ["party-name-based-supra-resolution"]
affects: ["future-phases-using-resolution"]
tech-stack:
  added: []
  patterns: ["extracted-field-preference-with-fallback"]
key-files:
  created: []
  modified:
    - "src/resolve/DocumentResolver.ts"
    - "src/extract/extractCase.ts"
    - "tests/integration/resolution.test.ts"
decisions:
  - "Defendant name stored first in resolution history for Bluebook-style supra matching preference"
  - "Fallback to backward text search when extracted party names unavailable (pre-Phase 7 compatibility)"
  - "Citation boundary detection uses digit-period-space pattern (e.g., '10. Jones') to prevent cross-citation matching"
  - "Signal word stripping moved into extractPartyNames for consistent plaintiff extraction"
duration: 7
completed: 2026-02-05
---

# Phase 7 Plan 2: Party Name Supra Resolution Summary

JWT auth with refresh rotation using jose library

## Execution

**Duration:** 7 minutes
**Completed:** 2026-02-05

## What Was Built

### Supra Resolution Enhancement

- **DocumentResolver.trackFullCitation()** now uses extracted plaintiff/defendant names from Phase 7
- Stores both defendant (preferred) and plaintiff (fallback) in resolution history Map
- Falls back to backward text search when extracted names unavailable (pre-Phase 7 compatibility)

### Citation Boundary Bug Fixes

**Bug 1: Cross-citation case name matching**
- **Found during:** Task 1 implementation
- **Issue:** Backward search in extractCaseName() was matching across citation boundaries (e.g., "100 F.2d 10. Jones v. B" extracted as defendant "A, 100 F.2d 10. Jones v. B")
- **Fix:** Split precedingText at last digit-period-space boundary before running regex match
- **Files modified:** src/extract/extractCase.ts
- **Commit:** e2f386d

**Bug 2: Signal word not stripped from plaintiff**
- **Found during:** Task 2 testing
- **Issue:** "In Smith v. Jones" extracted plaintiff as "In Smith" instead of "Smith"
- **Root cause:** extractPartyNames() only stripped procedural prefixes, not signal words before "v." pattern
- **Fix:** Added signal word stripping regex to adversarial case parsing in extractPartyNames()
- **Files modified:** src/extract/extractCase.ts
- **Commit:** e78ac30

### Test Coverage

Added 9 new integration tests in `tests/integration/resolution.test.ts`:

- Defendant name exact match resolution
- Plaintiff name exact match resolution
- Government entity defendant matching (United States v. Jones)
- Government entity plaintiff matching (People v. Smith)
- Procedural case plaintiff matching (In re Smith)
- Exact match high confidence (>= 0.95)
- Fuzzy match lower confidence (>= 0.8, < 1.0)
- Multiple citations disambiguation
- Backward compatibility when party names unavailable

All existing 25 resolution tests continued to pass.

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Augment DocumentResolver with party name matching | e2f386d | src/resolve/DocumentResolver.ts, src/extract/extractCase.ts |
| 2 | Party name supra resolution tests | e78ac30 | tests/integration/resolution.test.ts, src/extract/extractCase.ts |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Cross-citation case name matching in extractCaseName()**

- **Found during:** Task 1 implementation
- **Issue:** Regex captured text across citation boundaries ("100 F.2d 10. Jones v. B" → defendant includes prior page number)
- **Fix:** Split precedingText at last digit-period-space boundary to limit regex scope to current sentence
- **Files modified:** src/extract/extractCase.ts
- **Commit:** e2f386d

**2. [Rule 1 - Bug] Signal word not stripped from extracted plaintiff**

- **Found during:** Task 2 testing
- **Issue:** "In Smith v. Jones" → plaintiff "In Smith" instead of "Smith", broke signal word stripping tests
- **Fix:** Added signal word stripping regex to extractPartyNames() adversarial case branch
- **Files modified:** src/extract/extractCase.ts
- **Commit:** e78ac30

Both bugs were critical for correct operation and required immediate fixing to pass existing tests and meet success criteria.

## Verification

All success criteria met:

- ✅ DocumentResolver uses extracted plaintiff/defendant names for supra matching
- ✅ Defendant name stored first (preferred for Bluebook-style supra matching)
- ✅ Both plaintiff and defendant stored in fullCitationHistory for flexible matching
- ✅ Fallback to backward text search when extracted names unavailable
- ✅ Exact party name match yields high confidence (>= 0.95)
- ✅ Procedural case supra matching works via plaintiffNormalized
- ✅ All existing resolution tests pass unchanged
- ✅ New tests verify party name matching for standard, government, and procedural cases

**Test Results:**
- Total tests: 470
- Resolution tests: 34 (25 existing + 9 new)
- All passing ✅
- `pnpm typecheck` ✅
- `pnpm lint` ✅ (5 pre-existing warnings)

## Technical Decisions

1. **Defendant-first storage priority**: Bluebook convention prefers defendant name in supra citations, so DocumentResolver.trackFullCitation() stores defendantNormalized before plaintiffNormalized in the resolution history Map.

2. **Fallback pattern for Phase 7 compatibility**: Only uses backward text search when BOTH plaintiffNormalized and defendantNormalized are undefined, ensuring graceful degradation for older citations or extraction failures.

3. **Citation boundary detection**: Uses digit-period-space pattern (`\d\.\s+`) to identify citation boundaries (e.g., page number "10. " before next case name) rather than generic period-space which would match "v." or "U.S."

4. **Signal word stripping location**: Moved from DocumentResolver.extractPartyName() (fallback only) into extractPartyNames() (primary extraction) to ensure consistency regardless of resolution path.

## Next Phase Readiness

**Blockers:** None

**Concerns:** None

**Dependencies for Future Phases:**

- Phase 8 (if any) can rely on high-quality party name matching in supra resolution
- Existing tests cover edge cases (government entities, procedural prefixes, signal words)

## Self-Check: PASSED

**Created files verified:**
- No new files created (plan correctly specified `files_modified` only)

**Commits verified:**
- e2f386d: feat(07-02): augment supra resolution with party name matching
- e78ac30: test(07-02): add party name supra resolution tests
