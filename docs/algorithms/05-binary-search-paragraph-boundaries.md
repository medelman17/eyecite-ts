# ALG-05: Binary Search for Paragraph Boundaries

**Status:** Complete
**Priority:** 2 (implement second)
**Textbook References:** CLRS Ch.2.3 (binary search), Sedgewick Ch.1.1 (binary search)
**Target Files:** `src/resolve/scopeBoundary.ts` lines 38-52
**Risk Level:** Low

## Problem Statement

`detectParagraphBoundaries()` in `src/resolve/scopeBoundary.ts:19-55` assigns each citation to a paragraph using a linear scan through boundary positions:

```typescript
// lines 44-49
for (let j = 0; j < boundaries.length - 1; j++) {
  if (citationStart >= boundaries[j] && citationStart < boundaries[j + 1]) {
    paragraphNum = j
    break
  }
}
```

This is fragile because:
1. **The `break` is load-bearing** — removing it (e.g., during a refactor) silently causes the function to assign the *last* matching paragraph instead of the first. The code gives no indication that the `break` is critical.
2. **Linear scan is unnecessary** — the `boundaries` array is already sorted (regex exec returns matches in text order, line 30-33). Binary search is the canonical solution for "find which interval contains a point" on sorted data.
3. **O(N*B) complexity** — For N=150 citations and B=200 paragraphs, that's up to 30,000 comparisons. Binary search reduces this to 150 * log2(200) ≈ 1,140.

## Current Code Analysis

**Control flow:**
1. Collect paragraph boundaries via regex (`/\n\n+/g`) at lines 27-33. Prepend 0, append `text.length`.
2. `boundaries` is already sorted ascending (regex exec produces matches in order).
3. For each citation (lines 38-52): get `citationStart`, then linear scan through `boundaries` to find the interval `[boundaries[j], boundaries[j+1])` containing it.
4. Assign `paragraphNum = j`, break.
5. Store in `paragraphMap` (Map<citationIndex, paragraphNumber>).

**Data structures:**
- `boundaries: number[]` — sorted array of paragraph start positions
- `paragraphMap: Map<number, number>` — citation index → paragraph number

**Coupling:**
- Called by `DocumentResolver` during resolution setup
- `isWithinBoundary()` (lines 66-89) reads from `paragraphMap` — unaffected by this change
- No type changes needed — function signature and return type stay the same

**Edge cases:**
- Citation at position 0 → paragraph 0 (first boundary is always 0)
- Citation at exact boundary position → should be in the paragraph that starts there (not the previous one)
- Citation after all boundaries → `paragraphNum` stays 0 (default), which is incorrect but masked because citations after the last boundary are rare in practice

## Target Algorithm

### Description

Replace the inner linear scan with `bisectRight()` — a standard binary search that returns the insertion point for a value in a sorted array. The paragraph number is `bisectRight(boundaries, citationStart) - 1`.

This is more robust because:
- **No break dependency** — the algorithm is a single function call, not a loop with a critical `break`
- **Handles the "after all boundaries" edge case correctly** — `bisectRight` returns `boundaries.length`, so `paragraphNum = boundaries.length - 1` (last paragraph)
- **Canonical solution** — binary search on sorted intervals is the textbook approach (CLRS Ch.2.3)

### Pseudocode

```
function bisectRight(arr, value):
  lo = 0
  hi = arr.length
  while lo < hi:
    mid = (lo + hi) >>> 1  // unsigned right shift avoids overflow
    if arr[mid] <= value:
      lo = mid + 1
    else:
      hi = mid
  return lo

// Usage in detectParagraphBoundaries:
paragraphNum = bisectRight(boundaries, citationStart) - 1
```

**Why `bisectRight` (not `bisectLeft`)?**
- `bisectRight([0, 100, 200], 100)` returns 2, so `paragraphNum = 1` (citation at position 100 belongs to paragraph 1, which starts at boundary[1]=100)
- `bisectLeft([0, 100, 200], 100)` would return 1, so `paragraphNum = 0` (wrong — position 100 is the start of paragraph 1, not the end of paragraph 0)
- The original linear scan uses `>=` for the lower bound, matching `bisectRight` semantics

### Complexity Analysis

| Metric | Before | After |
|--------|--------|-------|
| Time | O(N * B) per document | O(N * log B) per document |
| Space | O(1) extra | O(1) extra |

Where N = citation count, B = boundary count.

### Why This Algorithm

1. **Eliminates the break dependency**: The current code's correctness depends on a `break` statement inside a for-loop. Binary search is a single call with no hidden control flow.
2. **Fixes the "after all boundaries" edge case**: The current code leaves `paragraphNum = 0` if no interval matches (line 43 initializes to 0, and if the loop finds no match, it stays 0). Binary search correctly assigns the last paragraph.
3. **Standard, well-understood algorithm**: Any developer reading `bisectRight(boundaries, citationStart) - 1` immediately understands "find which sorted interval contains this point."

## Correctness Invariants

1. **Parity with linear scan**: For every citation in every test, binary search assigns the same paragraph number as the current linear scan — test by running both and comparing
2. **Boundary-start assignment**: A citation at the exact position of a boundary start is assigned to the paragraph that starts there (not the previous one)
3. **First citation**: A citation at position 0 is assigned to paragraph 0
4. **Last paragraph**: A citation after the last boundary is assigned to the last paragraph (current code gets this wrong — binary search fixes it)
5. **bisectRight contract**: For sorted array `arr` and value `v`, `bisectRight(arr, v)` returns the smallest index `i` such that `arr[i] > v` (or `arr.length` if no such index exists)

## Implementation Plan

### New/Modified Files

| File | Action | Description |
|------|--------|-------------|
| `src/resolve/scopeBoundary.ts` | Modify | Add private `bisectRight()` function, replace inner loop at lines 44-49 |
| `tests/resolve/scopeBoundary.test.ts` | Create | Unit tests for `bisectRight` and paragraph assignment |

### Step-by-Step

1. Read `src/resolve/scopeBoundary.ts` in full.
2. Create `tests/resolve/scopeBoundary.test.ts` with tests for:
   - `bisectRight` with various sorted arrays and values (invariant 5)
   - Full `detectParagraphBoundaries` with known text and expected paragraph assignments
3. Run tests against the **current** implementation to establish baseline.
4. Add a private `bisectRight(arr: number[], value: number): number` function at the top of `scopeBoundary.ts`.
5. Replace lines 43-49 (the inner for-loop) with:
   ```typescript
   const paragraphNum = bisectRight(boundaries, citationStart) - 1
   ```
6. Remove the `let paragraphNum = 0` declaration at line 43 (now computed directly).
7. Run `pnpm typecheck`.
8. Run `pnpm exec vitest run tests/resolve/scopeBoundary.test.ts`.
9. Run `pnpm exec vitest run tests/integration/resolution.test.ts`.
10. Run `pnpm exec vitest run` (full suite).

### Zero-Dependency Constraint

Binary search is 10 lines of code. No dependencies needed.

## Test Strategy

### Golden Parity Test

Run `pnpm exec vitest run tests/integration/resolution.test.ts` before and after. All paragraph-scoped resolution results must be identical.

### Unit Tests

In `tests/resolve/scopeBoundary.test.ts`:

```typescript
// bisectRight basic behavior
expect(bisectRight([0, 100, 200, 300], 150)).toBe(2)
expect(bisectRight([0, 100, 200], 0)).toBe(1)
expect(bisectRight([0, 100, 200], 99)).toBe(1)
expect(bisectRight([0, 100, 200], 100)).toBe(2)
expect(bisectRight([0, 100, 200], 250)).toBe(3)  // beyond all boundaries

// Paragraph assignment
// Text: "Para one.\n\nPara two.\n\nPara three."
// Boundaries: [0, 11, 23, 35]
// Citation at position 5 → paragraph 0
// Citation at position 11 → paragraph 1 (starts at boundary)
// Citation at position 15 → paragraph 1
// Citation at position 23 → paragraph 2
```

### Property Tests

For any sorted array `arr` of length B and any value `v`:
- `bisectRight(arr, v)` is in range [0, B]
- If `result > 0`, then `arr[result - 1] <= v`
- If `result < B`, then `arr[result] > v`

### Edge Cases

- Document with no paragraph breaks → `boundaries = [0, text.length]` → all citations in paragraph 0
- Very long document with thousands of paragraphs (stress test the binary search)
- Citation at position 0 (start of document)
- Citation at the very end of the document
- Two citations in the same paragraph

## Verification

```bash
# Step 1: Run new unit tests
pnpm exec vitest run tests/resolve/scopeBoundary.test.ts

# Step 2: Run resolution integration tests
pnpm exec vitest run tests/integration/resolution.test.ts

# Step 3: Run full suite
pnpm exec vitest run

# Step 4: Typecheck
pnpm typecheck
```

All commands must exit 0 with no failures.

## Rollback Plan

Single file change. Revert with:
```bash
git checkout src/resolve/scopeBoundary.ts
```
