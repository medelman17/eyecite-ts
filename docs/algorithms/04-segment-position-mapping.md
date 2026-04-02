# ALG-04: Segment-Based Position Mapping

**Status:** Ready
**Priority:** 5 (implement last)
**Textbook References:** CLRS Ch.14 (augmented data structures), Sedgewick Ch.3.2 (ordered symbol tables / interval search)
**Target Files:** `src/clean/cleanText.ts` (208 lines), `src/types/span.ts`, new `src/clean/segmentMap.ts`
**Risk Level:** High

## Problem Statement

The position mapping system in `src/clean/cleanText.ts` tracks how character positions shift as text cleaners (HTML removal, whitespace normalization, smart quote fixing) transform the input. It uses two `Map<number, number>` objects — `cleanToOriginal` and `originalToClean` — with **one entry per character position**:

```typescript
// lines 55-62
const cleanToOriginal = new Map<number, number>()
const originalToClean = new Map<number, number>()
for (let i = 0; i <= original.length; i++) {
  cleanToOriginal.set(i, i)
  originalToClean.set(i, i)
}
```

This is problematic because:

1. **O(n) memory per direction** — For a 10KB document, that's ~10,000 Map entries per direction (20,000 total), rebuilt from scratch after each of the 6 default cleaners. Total allocations across the pipeline: ~120,000 Map.set() calls.

2. **The `rebuildPositionMaps()` function (lines 108-208) is fragile** — It uses a character-by-character lookahead scan with `maxLookAhead = 20` (line 160). When a cleaner removes more than 20 characters at once (e.g., a large HTML tag like `<div class="footnote" style="...">`), the lookahead fails to find a match and falls through to the "treat as replacement" case (lines 198-203), which can produce **incorrect position mappings**. This is a known correctness issue.

3. **No structural invariant** — The Map can have gaps (positions with no mapping) or inconsistent forward/reverse mappings. There's no programmatic way to verify that `cleanToOriginal` and `originalToClean` are inverses.

4. **Each cleaner rebuilds from scratch** — `rebuildPositionMaps()` is called after each cleaner transformation, scanning the full before/after text pair. Cleaner composition (applying the position shift from cleaner 2 on top of cleaner 1's mapping) would be more efficient and correct.

## Current Code Analysis

**Position mapping lifecycle:**
1. `cleanText()` (line 20) initializes identity maps (lines 55-62)
2. For each cleaner function (lines 68-96): apply cleaner to text, call `rebuildPositionMaps()` with before/after text and current maps
3. `rebuildPositionMaps()` (lines 108-208) returns new maps by scanning both strings character-by-character:
   - Match characters → carry forward mapping (lines 150-155)
   - Mismatch → look ahead up to 20 chars in before-text for deletion (lines 163-176)
   - If not deletion → look ahead in after-text for insertion (lines 181-194)
   - If neither → treat as replacement (lines 198-203)
4. Final maps returned in `TransformationMap` object

**`rebuildPositionMaps()` control flow (lines 108-208):**
- `beforeIdx` and `afterIdx` track position in each string
- Character-by-character comparison with three outcomes: match, deletion, insertion
- The `maxLookAhead = 20` constant (line 160) bounds the search window
- When lookahead fails, the "replacement" fallback creates a 1:1 mapping that may be wrong

**`TransformationMap` type in `src/types/span.ts`:**
```typescript
export interface TransformationMap {
  cleanToOriginal: Map<number, number>
  originalToClean: Map<number, number>
}
```

**`resolveOriginalSpan()` in `src/types/span.ts`:**
- Takes a clean-space span and the TransformationMap
- Returns original-space positions via `map.cleanToOriginal.get(cleanStart)` and `map.cleanToOriginal.get(cleanEnd)`
- Called by every extractor to convert clean positions to original positions

**Coupling — this is the highest-risk spec:**
- `TransformationMap` is used by:
  - `cleanText.ts` (creates it)
  - `span.ts` → `resolveOriginalSpan()` (reads it)
  - `extractCitations.ts` (passes it to extractors)
  - Every extractor in `src/extract/` (via `resolveOriginalSpan`)
- The type is exported from the package (used in `ExtractionResult`)

## Target Algorithm

### Description

Replace the per-character Maps with a **segment-based representation**. A segment represents a contiguous run of positions where the offset between clean and original coordinates is constant:

```
Segment = { cleanPos: number, origPos: number, len: number }
```

For example, if positions 0-99 map 1:1 (identity), then a cleaner removes 5 characters at original position 100-104, the segments would be:
```
[
  { cleanPos: 0,  origPos: 0,   len: 100 },  // first 100 chars: offset = 0
  { cleanPos: 100, origPos: 105, len: ... },  // after removal: offset = +5
]
```

Lookup is via binary search on the sorted segment array: find the segment containing the target position, then compute `origPos + (target - cleanPos)`.

This is more robust because:
1. **Structural invariant**: Segments are sorted, non-overlapping, and cover the entire range. This is enforced at construction time.
2. **No lookahead heuristic**: Instead of scanning character-by-character with a bounded lookahead, segments are computed directly from the cleaner's transformation (knowing exactly what was inserted/deleted/replaced).
3. **Cleaner composition**: Two segment maps can be composed algebraically — apply the offset adjustments from map B on top of map A — instead of rebuilding from character-level comparison.
4. **Verifiable inverse**: The clean-to-original and original-to-clean segment maps can be verified as inverses by checking that composing them produces the identity.

### Pseudocode

```
class SegmentMap:
  segments: Segment[]  // sorted by cleanPos, non-overlapping, contiguous

  static identity(length):
    return new SegmentMap([{ cleanPos: 0, origPos: 0, len: length + 1 }])

  lookup(cleanPos) -> origPos:
    // Binary search: find segment where cleanPos >= seg.cleanPos and cleanPos < seg.cleanPos + seg.len
    lo = 0, hi = segments.length - 1
    while lo <= hi:
      mid = (lo + hi) >>> 1
      seg = segments[mid]
      if cleanPos < seg.cleanPos:
        hi = mid - 1
      else if cleanPos >= seg.cleanPos + seg.len:
        lo = mid + 1
      else:
        return seg.origPos + (cleanPos - seg.cleanPos)
    // Position beyond all segments: extrapolate from last segment
    last = segments[segments.length - 1]
    return last.origPos + (cleanPos - last.cleanPos)

  static fromTransformation(beforeLen, operations: TransformOp[]):
    // Build segment map from a list of insert/delete/replace operations
    // Each operation specifies: position, type, length
    // This produces the exact segment boundaries without character scanning

  static compose(outer: SegmentMap, inner: SegmentMap) -> SegmentMap:
    // Compose two maps: for position p, result.lookup(p) = inner.lookup(outer.lookup(p))
    // Walk through outer segments, splitting at inner segment boundaries
    // This replaces rebuildPositionMaps entirely
```

**TransformOp types:**
```
type TransformOp =
  | { type: 'keep', cleanPos: number, origPos: number, len: number }
  | { type: 'delete', origPos: number, len: number }       // chars removed
  | { type: 'insert', cleanPos: number, len: number }       // chars added
  | { type: 'replace', cleanPos: number, origPos: number, cleanLen: number, origLen: number }
```

### Complexity Analysis

| Metric | Before | After |
|--------|--------|-------|
| Memory | O(n) per direction — n Map entries | O(k) — k segments (typically k << n) |
| Lookup | O(1) Map.get | O(log k) binary search |
| Build per cleaner | O(n) character scan with O(20) lookahead | O(k) direct from operations |
| Total build (6 cleaners) | 6 * O(n) rebuilds | O(k) composition (or 6 * O(k) direct builds) |

For a typical 10KB document: n ≈ 10,000, k ≈ 50-200 (number of transformation points).

### Why This Algorithm

1. **Eliminates the lookahead heuristic**: The current `maxLookAhead = 20` is a known correctness risk. Segment-based mapping computes exact boundaries from the transformation operations, with no heuristic.
2. **Structural correctness**: Segments enforce sorted, non-overlapping, contiguous coverage. The old Map has no such invariant — it's possible (and has happened) for positions to have no mapping or inconsistent forward/reverse mappings.
3. **Composable**: Two segment maps can be composed without re-scanning the text. This enables clean separation of concerns: each cleaner produces a segment map, and they're composed at the end.
4. **Verifiable**: You can programmatically verify that the clean-to-original and original-to-clean maps are consistent inverses, which is impossible with arbitrary Maps.

## Correctness Invariants

1. **Position parity**: For every position p in [0, cleanedText.length], `segmentMap.lookup(p)` returns the same value as `oldMap.cleanToOriginal.get(p)` — verified against the current implementation on the full test corpus
2. **Sorted segments**: `segments[i].cleanPos < segments[i+1].cleanPos` for all i
3. **Non-overlapping**: `segments[i].cleanPos + segments[i].len <= segments[i+1].cleanPos` for all i
4. **Contiguous coverage**: `segments[i].cleanPos + segments[i].len === segments[i+1].cleanPos` for all i (no gaps)
5. **Inverse consistency**: For any clean position p, `originalToClean.lookup(cleanToOriginal.lookup(p))` is within 1 of p (exact inverse where the mapping is injective)
6. **Span parity**: `resolveOriginalSpan()` returns identical `originalStart/originalEnd` values for every citation in every test

## Implementation Plan

### New/Modified Files

| File | Action | Description |
|------|--------|-------------|
| `src/clean/segmentMap.ts` | Create | `SegmentMap` class with binary search lookup, `fromTransformation()`, and `compose()` |
| `src/clean/cleanText.ts` | Modify | Replace Map-based position tracking with SegmentMap. Update `rebuildPositionMaps()` or replace entirely. |
| `src/types/span.ts` | Modify | Update `TransformationMap` to use SegmentMap internally. Update `resolveOriginalSpan()` to use `lookup()`. |
| `tests/clean/segmentMap.test.ts` | Create | Unit tests for SegmentMap operations |

### Step-by-Step

1. Read `src/clean/cleanText.ts` in full. Trace how `cleanToOriginal` and `originalToClean` are built and used.
2. Read `src/types/span.ts`. Understand `TransformationMap` and `resolveOriginalSpan()`.
3. Grep for all usages of `TransformationMap`, `cleanToOriginal`, and `originalToClean` across the codebase to map the full blast radius.
4. Create `src/clean/segmentMap.ts`:
   - `Segment` type: `{ cleanPos: number, origPos: number, len: number }`
   - `SegmentMap` class:
     - Constructor takes `segments: Segment[]`, validates invariants (sorted, non-overlapping, contiguous) in dev mode
     - `lookup(pos: number): number` — binary search
     - `static identity(length: number): SegmentMap`
     - `static fromDiff(before: string, after: string, prevMap: SegmentMap): SegmentMap` — builds segment map by comparing before/after strings (replaces `rebuildPositionMaps`)
   - NOT exported from package entry point
5. Create `tests/clean/segmentMap.test.ts`:
   - Test `identity()`, `lookup()`, sorted invariant, contiguous invariant
   - Test `fromDiff()` with known transformations (delete chars, insert chars, replace chars)
6. Run `pnpm exec vitest run tests/clean/segmentMap.test.ts`.
7. **Migration strategy — minimize blast radius:**
   a. First, update `TransformationMap` in `span.ts` to include optional `segmentMap` field alongside the existing Maps
   b. Update `cleanText.ts` to build both the old Maps AND the new SegmentMap in parallel
   c. Add a debug assertion that `segmentMap.lookup(p) === cleanToOriginal.get(p)` for all positions (validate parity)
   d. Run full test suite with assertions enabled — must all pass
   e. Update `resolveOriginalSpan()` to use `segmentMap.lookup()` when available
   f. Run full test suite again
   g. Remove the old Map-based code and the parallel computation
   h. Run full test suite one final time
8. Run `pnpm typecheck` after each step.
9. Run `pnpm exec vitest run` after each step.

### Zero-Dependency Constraint

SegmentMap is ~80-100 lines of code. Binary search is standard. No dependencies.

## Test Strategy

### Golden Parity Test

Run `pnpm exec vitest run` before and after. **ALL** tests must produce identical results, since position mapping affects every citation's span values.

### Unit Tests

In `tests/clean/segmentMap.test.ts`:

```typescript
// Identity map
const identity = SegmentMap.identity(100)
expect(identity.lookup(0)).toBe(0)
expect(identity.lookup(50)).toBe(50)
expect(identity.lookup(100)).toBe(100)

// Simple deletion: "hello world" → "helloworld" (space at position 5 removed)
// Clean pos 0-4 → orig 0-4 (identity)
// Clean pos 5-9 → orig 6-10 (shifted by 1)
const deletion = new SegmentMap([
  { cleanPos: 0, origPos: 0, len: 5 },
  { cleanPos: 5, origPos: 6, len: 5 },
])
expect(deletion.lookup(4)).toBe(4)   // before deletion
expect(deletion.lookup(5)).toBe(6)   // after deletion: shifted

// Sorted invariant
expect(() => new SegmentMap([
  { cleanPos: 10, origPos: 10, len: 5 },
  { cleanPos: 5, origPos: 5, len: 5 },  // out of order
])).toThrow()
```

### Property Tests

For any SegmentMap built from a random sequence of insert/delete/replace operations:
- Segments are sorted by `cleanPos`
- Segments are contiguous (no gaps)
- Segments are non-overlapping
- `lookup()` is monotonically non-decreasing (positions increase in both spaces)

### Edge Cases

- Empty document (length 0) → single segment `{ cleanPos: 0, origPos: 0, len: 1 }`
- Document with no transformations → identity map (single segment)
- Large HTML removal (> 20 chars) — the case that breaks the current `maxLookAhead`
- Multiple adjacent deletions (should merge into one segment)
- Insertion (expanding transformation) — e.g., smart quote `'` → `'` in reverse
- Unicode normalization changes — some characters change byte length

## Verification

```bash
# Step 1: Run SegmentMap unit tests
pnpm exec vitest run tests/clean/segmentMap.test.ts

# Step 2: Run ALL tests (position mapping affects everything)
pnpm exec vitest run

# Step 3: Typecheck
pnpm typecheck

# Step 4: Lint
pnpm lint
```

All commands must exit 0. Pay special attention to any test that checks `originalStart`/`originalEnd` values — these are directly affected by position mapping changes.

## Rollback Plan

Three files changed, one created. Revert with:
```bash
git checkout src/clean/cleanText.ts src/types/span.ts
rm src/clean/segmentMap.ts
```

**Important**: Because this spec has the highest blast radius, the step-by-step plan includes a parallel-running phase (step 7b-d) where both old and new implementations run simultaneously with assertions. If any assertion fails during this phase, the old implementation is still in place and can be reverted to without data loss.
