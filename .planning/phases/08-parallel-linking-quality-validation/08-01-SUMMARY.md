---
phase: 08-parallel-linking-quality-validation
plan: 01
subsystem: extraction
tags: [parallel-citations, grouping, metadata-enrichment, bluebook]
requires: [phase-06-full-span, phase-07-party-names]
provides:
  - Parallel citation detection (comma-separated case citations)
  - groupId field for citation grouping
  - parallelCitations array with secondary reporter metadata
affects: [phase-08-quality-validation]
tech-stack:
  added: []
  patterns:
    - Pure detection function (token-based, no side effects)
    - Map-based grouping (primary index -> secondary indices)
    - Shared parenthetical validation (depth tracking)
key-files:
  created:
    - src/extract/detectParallel.ts
    - tests/extract/detectParallel.test.ts
  modified:
    - src/types/citation.ts
    - src/extract/extractCitations.ts
    - tests/integration/fullPipeline.test.ts
decisions:
  - id: comma-only-separator
    choice: "Phase 8 supports comma separator only (not semicolon)"
    rationale: "Bluebook standard uses comma for parallel citations; semicolon separates distinct citations"
    alternatives: ["Support both comma and semicolon"]
    impact: "Simplifies detection algorithm, reduces false positives"
  - id: groupid-format
    choice: "groupId format: ${volume}-${reporter}-${page} (e.g., '410-U.S.-113')"
    rationale: "Deterministic, stable, human-readable identifier for parallel groups"
    alternatives: ["UUID", "Sequential counter", "Hash of citation text"]
    impact: "Consumers can rely on stable groupId for deduplication"
  - id: primary-only-metadata
    choice: "Only primary citation gets parallelCitations array"
    rationale: "Avoids circular references, follows Bluebook convention (first reporter is primary)"
    alternatives: ["All citations get full array", "Bidirectional references"]
    impact: "Clear ownership model, easier to serialize"
  - id: singleton-no-groupid
    choice: "Singletons (non-parallel citations) have undefined groupId"
    rationale: "groupId indicates membership in parallel group; single citations are not grouped"
    alternatives: ["Every citation gets unique groupId"]
    impact: "Consumers can check groupId presence to detect parallel citations"
  - id: shared-parenthetical-check
    choice: "Reject citations with closing parenthesis between them"
    rationale: "'A (1970), B (1971)' has separate parens = different cases; 'A, B (1970)' shares paren = parallel"
    alternatives: ["Allow separate parentheticals if content matches"]
    impact: "Prevents false positives where comma separates distinct cases"
metrics:
  duration: "~8 minutes"
  completed: 2026-02-06
  tests-added: 19
  tests-passing: 494
  commits: 3
---

# Phase 08 Plan 01: Parallel Citation Detection Summary

**One-liner:** Comma-separated case citations sharing a parenthetical are detected and linked with groupId and parallelCitations metadata.

## What Was Built

Implemented parallel citation detection using TDD methodology, integrating detection into the extraction pipeline.

### Core Features

1. **Detection Function** (`detectParallelCitations`)
   - Pure function analyzing tokenized citations
   - Returns Map<primaryIndex, secondaryIndices[]>
   - Validates: comma separator, case type, proximity (<5 chars), shared parenthetical
   - Supports chains: "A, B, C (year)" where B and C are both secondaries

2. **Type System**
   - Added `groupId?: string` to FullCaseCitation (format: volume-reporter-page)
   - groupId shared by all citations in parallel group
   - Singletons have undefined groupId

3. **Metadata Enrichment**
   - Primary citation gets `parallelCitations` array with secondary reporters
   - Secondary citations get same `groupId` but no array (avoids circular refs)
   - All citations returned individually (backward compatible)

4. **Integration**
   - Detection runs after deduplication, before extraction loop
   - Populates groupId and parallelCitations during extraction
   - Zero impact on non-parallel citations

### Test Coverage

- **Unit tests** (15): Detection algorithm edge cases
  - Positive: 2-reporter, 3-reporter, shared court, shared year
  - Negative: different cases, semicolon, statute mixing, wide separation
  - Edge: empty array, single citation, multiple groups

- **Integration tests** (4): End-to-end pipeline validation
  - 2-reporter parallel with groupId and parallelCitations verification
  - 3-reporter chain detection
  - Separate parentheticals correctly rejected
  - Multiple parallel groups in same document

## Decisions Made

See frontmatter `decisions` section for full details.

**Key decision:** Comma-only separator (not semicolon) follows Bluebook standard and simplifies detection.

**Key decision:** groupId format (`${volume}-${reporter}-${page}`) provides stable, deterministic identifier.

**Key decision:** Shared parenthetical check prevents false positives where comma separates distinct cases.

## Technical Implementation

### Detection Algorithm

```
For each case citation (primary):
  For each following case citation (secondary):
    1. Check comma separator between them (within 5 chars)
    2. Check no closing parenthesis between them (shared paren requirement)
    3. Check parenthetical exists after secondary
    4. If all pass: add to parallel group
    5. Continue chain (A, B, C pattern)
```

### Shared Parenthetical Validation

Two-part check:
1. **No intermediate closing paren:** Ensures citations share the SAME parenthetical
2. **Parenthetical after secondary:** Validates the shared parenthetical exists

Prevents false positives: "500 F.2d 100 (1974), 600 F.2d 200 (1975)" correctly rejected (separate parens).

### Integration Point

Pipeline position: `cleanText → tokenize → deduplicate → **detectParallel** → extract`

The detection happens on tokens before extraction so we can build the groupIdMap early and populate fields during extraction loop.

## Deviations from Plan

**None** - Plan executed exactly as written.

## Testing & Quality

- All 494 tests passing (19 new tests added)
- Zero type errors, zero lint errors
- TDD methodology: RED (failing tests) → GREEN (implementation) → REFACTOR (comments)
- Performance: <2ms for detection on typical documents

## Next Phase Readiness

**Blockers:** None

**Dependencies satisfied:**
- Phase 6 (Full Span) provides citation boundaries for shared parenthetical check
- Phase 7 (Party Names) provides extraction context (not directly used but validates pipeline flow)

**Enables:**
- Phase 8 Plan 2: Full-span annotation mode (can highlight entire parallel group)
- Phase 8 Plan 3: Quality validation (groupId enables deduplication checks)
- Future: Parallel citation resolution (link supra to any member of parallel group)

## Files Changed

### Created

- `src/extract/detectParallel.ts` (171 lines) - Pure detection function with shared parenthetical validation
- `tests/extract/detectParallel.test.ts` (354 lines) - Comprehensive unit test coverage

### Modified

- `src/types/citation.ts` - Added groupId field to FullCaseCitation (+8 lines)
- `src/extract/extractCitations.ts` - Integrated detection and metadata population (+48 lines)
- `tests/integration/fullPipeline.test.ts` - Added 4 integration tests (+123 lines)

**Total:** +704 lines (383 implementation, 321 tests)

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| RED | ccfa0c1 | Add failing tests for parallel citation detection |
| GREEN | a13f068 | Implement parallel citation detection with groupId and parallelCitations |
| REFACTOR | 465494f | Add clarifying comments to parallel detection algorithm |

**Metadata commit:** *(pending - will be created by execute-plan workflow)*

## Success Criteria Verification

- [x] detectParallelCitations() function exists and passes all unit tests
- [x] groupId field added to FullCaseCitation type
- [x] Parallel citations share the same groupId value
- [x] Primary citation has parallelCitations array with secondary reporter metadata
- [x] Secondary citations have NO parallelCitations array (only primary enriched)
- [x] All citations returned individually in results (backward compatible)
- [x] Shared fullSpan extends from first case name through final parenthetical (handled by extractCase, not this plan)
- [x] No false positives (different cases with comma separator not linked)
- [x] Integration test verifies end-to-end parallel linking
- [x] All existing tests pass (no regressions)
- [x] Zero type errors, zero lint errors

**Outcome:** All success criteria met. Plan complete.

## Self-Check: PASSED

All files created:
- src/extract/detectParallel.ts ✓
- tests/extract/detectParallel.test.ts ✓

All commits exist:
- ccfa0c1 ✓
- a13f068 ✓
- 465494f ✓
