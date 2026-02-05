---
phase: 03
plan: 03
subsystem: validation
tags: [validation, confidence-scoring, reporter-database, degraded-mode]
requires: [03-01, 02-05, 02-06]
provides: [citation-validation, confidence-adjustment, degraded-mode-support]
affects: [03-04]
tech-stack:
  added: []
  patterns: [confidence-scoring, degraded-mode-fallback]
key-files:
  created:
    - src/extract/validation.ts
    - tests/extract/validation.test.ts
  modified:
    - src/extract/index.ts
key-decisions:
  - VAL-01: "Confidence boost/penalty values (+0.2/-0.3/-0.1)"
  - VAL-02: "Degraded mode returns citations without errors"
  - VAL-03: "Validation only applies to case citations"
metrics:
  duration: 175s
  completed: 2026-02-05
---

# Phase 3 Plan 3: Citation Validation with Confidence Scoring

**One-liner:** Reporter database validation with confidence adjustments (+0.2 match boost, -0.3 miss penalty, -0.1 ambiguity penalty), supporting graceful degraded mode

## Performance

- **Execution time:** 175s (2m 55s)
- **Tasks completed:** 2/2 (100%)
- **Tests added:** 15 validation tests (all passing)
- **Type safety:** No type errors

## What Was Built

### Validation Layer (`src/extract/validation.ts`)

Created comprehensive citation validation system with confidence scoring:

1. **`validateAndScore()`** - Core validation function
   - Validates case citations against reporter database
   - Adjusts confidence scores based on match results:
     - Exact match (1 reporter): +0.2 boost
     - No match (0 reporters): -0.3 penalty + warning
     - Ambiguous (2+ reporters): -0.1 penalty per extra match + warning
   - Caps confidence at 1.0, floors at 0.0
   - Skips validation for non-case citations (statute, journal, etc.)
   - Returns citations unchanged in degraded mode (null database)

2. **`extractWithValidation()`** - High-level API
   - Combines extraction and validation in one call
   - `validate: true` enables reporter validation
   - `validate: false` returns standard extraction (default)
   - Graceful degraded mode: adds info warning when DB not loaded
   - Preserves original extraction warnings

3. **Type safety:** `ValidatedCitation` type (Citation + optional reporter metadata)

### Comprehensive Test Suite

Created 15 tests covering all validation scenarios:

**Core functionality (7 tests):**
- Confidence boost on exact match (+0.2)
- Confidence penalty on unknown reporter (-0.3)
- Fractional penalty on ambiguous matches
- Non-case citations skip validation
- Degraded mode (null database) returns unchanged
- Confidence caps at 1.0 and floors at 0.0

**Integration tests (8 tests):**
- Extract without validation (validate=false)
- Extract with validation (validate=true)
- Database not loaded graceful fallback
- Mixed citation types handled correctly
- Original warnings preserved
- Never throws errors in degraded mode
- Extracts successfully without database

## Accomplishments

✅ **Citations validated against reporter database with adjusted confidence scores**
- Reporter match boosts confidence by +0.2
- Unknown reporters penalized by -0.3
- Ambiguous abbreviations get fractional penalty (-0.1 per extra match)

✅ **Unmatched reporters flagged with warnings, not silently dropped**
- Warning level "warning" for unmatched reporters
- Warning level "warning" for ambiguous matches
- Warning level "info" for database not loaded

✅ **Library works in degraded mode without database**
- Returns citations without validation when DB is null
- Never throws errors
- Graceful fallback with info-level warnings

✅ **Ambiguous reporter abbreviations handled with fractional confidence**
- Penalty scales with number of matches
- Warnings include all possible interpretations

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Implement confidence scoring with reporter validation | 99e2c31 | src/extract/validation.ts, src/extract/index.ts |
| 2 | Test validation with degraded mode and confidence adjustments | 6801937 | tests/extract/validation.test.ts |

## Files Created

1. **`src/extract/validation.ts`** (229 lines)
   - `validateAndScore()` - Core validation with confidence scoring
   - `extractWithValidation()` - High-level extraction + validation API
   - `ConfidenceScoringOptions` interface
   - `ValidatedCitation` type

2. **`tests/extract/validation.test.ts`** (362 lines)
   - 15 comprehensive tests covering all validation scenarios
   - Tests for degraded mode behavior
   - Tests for confidence adjustments
   - Integration tests with mixed citation types

## Files Modified

1. **`src/extract/index.ts`**
   - Added export for `validation` module

## Decisions Made

| ID | Decision | Rationale | Impact |
|----|----------|-----------|--------|
| VAL-01 | Confidence boost/penalty values: +0.2/-0.3/-0.1 | Conservative adjustments that significantly impact scoring without saturating confidence values | Future tuning may require different values based on real-world usage |
| VAL-02 | Degraded mode returns citations without errors | Library must work when database not loaded (browser, edge cases) | Enables backward compatibility and graceful fallback |
| VAL-03 | Validation only applies to case citations | Other citation types (statute, journal, etc.) don't have reporters to validate | Avoids unnecessary validation overhead for non-case citations |
| VAL-04 | Type intersection for ValidatedCitation | Allows citations to carry optional reporter metadata without breaking existing types | Enables type-safe access to validation results |

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

### Test failures due to multiple citations extracted

**Issue:** Initial tests assumed single citation extraction but got 2 citations from text like "See Smith v. Doe, 500 F.2d 123"

**Resolution:** Changed tests from `expect(citations).toHaveLength(1)` to `citations.find(c => c.type === 'case')` pattern to handle multiple extractions robustly

**Impact:** More robust tests that don't depend on exact extraction count

## Next Phase Readiness

**Phase 3 Plan 4 can proceed:**
- ✅ Validation API ready for integration with annotation layer
- ✅ Confidence scoring can inform annotation styling (low confidence = different markup)
- ✅ Degraded mode ensures library works without database

**Handoff artifacts:**
1. `validateAndScore()` function validates citations against database
2. `extractWithValidation()` combines extraction and validation
3. `ValidatedCitation` type for type-safe validation results
4. Confidence scoring thresholds documented (+0.2/-0.3/-0.1)
5. 15 passing tests validate all scenarios

**Dependencies for future work:**
- Phase 3 Plan 4 (final plan) can use validation for enhanced annotation
- Phase 4 (resolution) may use reporter metadata for canonical citation forms

**No blockers.**
