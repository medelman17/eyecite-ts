---
phase: 08-parallel-linking-quality-validation
plan: 02
subsystem: annotation
tags: [annotation, fullSpan, phase-6-integration]

# Dependency graph
requires:
  - phase: 06-full-span-complex-parentheticals
    provides: fullSpan field on FullCaseCitation with case name through parenthetical spans
provides:
  - useFullSpan option in AnnotationOptions for full citation span mode
  - Annotation support for highlighting from case name through parenthetical
  - Backward compatible default behavior (useFullSpan: false)
affects: [09-verification, annotation-consumers, ui-integration]

# Tech tracking
tech-stack:
  added: []
  patterns: [optional-feature-flag-pattern, graceful-fallback-pattern]

key-files:
  created: []
  modified:
    - src/annotate/types.ts
    - src/annotate/annotate.ts
    - tests/annotate/annotate.test.ts

key-decisions:
  - "useFullSpan as option field (not separate function) for API consistency"
  - "Default false for 100% backward compatibility"
  - "Individual annotations per citation (not group wrapper) - developers can deduplicate using groupId in callback if desired"
  - "Graceful fallback to core span when fullSpan missing or useFullSpan disabled"

patterns-established:
  - "Optional feature activation via boolean flag with default false"
  - "Dual-mode span selection: conditional check for fullSpan availability before use"
  - "Works with both template and callback modes transparently"

# Metrics
duration: 2min
completed: 2026-02-05
---

# Phase 8 Plan 2: Full-Span Annotation Mode Summary

**Annotation supports useFullSpan option to highlight from case name through parenthetical (Phase 6 fullSpan integration)**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-06T00:56:05Z
- **Completed:** 2026-02-06T00:58:07Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Added useFullSpan option to AnnotationOptions interface with comprehensive JSDoc
- Implemented conditional span selection logic in annotate() function
- Added 4 comprehensive tests covering enabled mode, fallback, disabled default, and callback mode
- 100% backward compatible - existing annotation consumers unaffected

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend AnnotationOptions with useFullSpan option** - `69a474b` (feat)
2. **Task 2: Implement full-span annotation logic** - `58fd3b2` (feat)
3. **Task 3: Add full-span annotation tests** - `08ba72b` (test)

## Files Created/Modified
- `src/annotate/types.ts` - Added useFullSpan?: boolean field to AnnotationOptions with JSDoc documentation
- `src/annotate/annotate.ts` - Conditional span selection: uses fullSpan when useFullSpan enabled and available, falls back to core span otherwise
- `tests/annotate/annotate.test.ts` - Added 4 tests: enabled with fullSpan, fallback when missing, disabled default, callback mode

## Decisions Made

**1. Activation API: Option parameter vs separate function**
- **Decision:** Added useFullSpan as optional boolean field in AnnotationOptions
- **Rationale:** Consistent with existing useCleanText/autoEscape pattern. Single function handles both modes rather than duplicating logic in separate functions.
- **Impact:** Developers toggle mode with single option flag, no API surface expansion

**2. Default behavior: Backward compatibility**
- **Decision:** useFullSpan defaults to false
- **Rationale:** Existing annotation consumers expect core citation span (volume-reporter-page). Changing default would break existing UI implementations.
- **Impact:** Zero breaking changes. Opt-in feature for Phase 6+ consumers.

**3. Parallel group annotation: Individual vs wrapper**
- **Decision:** Each citation in parallel group gets individual annotation
- **Rationale:** Simpler implementation, gives developers control. If they want single wrapper for group, they can deduplicate using groupId in callback mode.
- **Impact:** More flexible - developers choose granularity in callback logic

**4. Graceful fallback**
- **Decision:** When useFullSpan enabled but citation lacks fullSpan field, fall back to core span
- **Rationale:** Mixed citation sets (pre-Phase 6 and post-Phase 6) shouldn't break. Consumers can't always guarantee fullSpan presence.
- **Impact:** Robust handling of partial Phase 6 adoption

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - straightforward implementation with clear plan specification.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready:**
- Annotation system supports both core span and full span modes
- Template and callback modes both work with useFullSpan
- Test coverage ensures correct behavior across all paths
- Backward compatibility maintained - no breaking changes

**Notes:**
- Plan 08-01 (parallel detection) test failures are pre-existing and unrelated to this plan
- This plan only depends on Phase 6 fullSpan field (already complete)
- Plans 08-01 and 08-02 can execute in parallel safely (different files)

---
*Phase: 08-parallel-linking-quality-validation*
*Completed: 2026-02-05*

## Self-Check: PASSED

All files exist:
- src/annotate/types.ts ✓
- src/annotate/annotate.ts ✓
- tests/annotate/annotate.test.ts ✓

All commits exist:
- 69a474b ✓
- 58fd3b2 ✓
- 08ba72b ✓
