# ALG-03: Space-Optimized Levenshtein DP with Early Termination

**Status:** Ready
**Priority:** 1 (implement first)
**Textbook References:** CLRS Ch.14 (dynamic programming optimization), Sedgewick Ch.5.2 (string processing)
**Target Files:** `src/resolve/levenshtein.ts` (entire file, 89 lines)
**Risk Level:** Low

## Problem Statement

`levenshteinDistance()` in `src/resolve/levenshtein.ts:20-60` allocates a full (m+1)x(n+1) 2D array for every comparison:

```typescript
const dp: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0))
```

This is wasteful because:
1. **Only the previous row is needed** to compute the current row — the full matrix is never read after filling
2. **No early termination** — the function computes the complete distance even when strings are obviously dissimilar (e.g., "Smith" vs "International Association of Machinists"). In supra resolution, most comparisons are rejections.
3. **Memory pressure** — For party names averaging 20 characters, each call allocates a 21x21 = 441-element matrix. With 100 full citations and 5 supra references, that's ~500 allocations per document.

The function is only called from `normalizedLevenshteinDistance()` (line 81), which is only called from `DocumentResolver.resolveSupra()`. This makes it a safe, isolated target.

## Current Code Analysis

**Control flow:**
1. `levenshteinDistance(a, b)` at line 20 — handles empty string base cases (lines 22-23)
2. Allocates full 2D array (line 27)
3. Initializes base cases: first row and first column (lines 30-35)
4. Fills DP table with nested loop (lines 38-57): match → copy diagonal, mismatch → 1 + min(delete, insert, substitute)
5. Returns `dp[a.length][b.length]` (line 59)

**`normalizedLevenshteinDistance(a, b)` at line 75:**
1. Lowercases both strings (lines 77-78)
2. Calls `levenshteinDistance()` (line 81)
3. Normalizes: `1 - distance / maxLength` (line 88)

**Coupling:** Only `DocumentResolver.resolveSupra()` calls `normalizedLevenshteinDistance()`. No other callers in the codebase. Both functions are exported but the package entry point (`src/index.ts`) does not re-export them — they're internal to the resolve module.

**Edge cases in current code:**
- Empty strings handled correctly (lines 22-23)
- Both empty → `normalizedLevenshteinDistance` returns 1.0 (line 85)
- Equal strings → distance 0, similarity 1.0

## Target Algorithm

### Description

Replace the 2D DP table with a **rolling two-row approach** (only `prev` and `curr` arrays), and add an optional `maxDistance` parameter for **early termination** when the minimum possible distance in the current row exceeds the threshold.

This is more robust because:
- The rolling-row approach has a **structural invariant**: at any point during computation, only the data needed for the next row exists. The 2D approach has dead data (previous rows) that could be accidentally read.
- Early termination makes the function **fail-fast** on obviously dissimilar strings, which is the common case in supra resolution (most party names don't match).

### Pseudocode

```
function levenshteinDistance(a, b, maxDistance = Infinity):
  if a is empty: return min(b.length, maxDistance + 1)
  if b is empty: return min(a.length, maxDistance + 1)

  // Ensure a is the shorter string (minimize row length)
  if a.length > b.length: swap a, b

  let prev = [0, 1, 2, ..., a.length]  // base case row
  let curr = new Array(a.length + 1)

  for i = 1 to b.length:
    curr[0] = i
    rowMin = Infinity

    for j = 1 to a.length:
      if b[i-1] === a[j-1]:
        curr[j] = prev[j-1]          // match: copy diagonal
      else:
        curr[j] = 1 + min(
          prev[j],      // deletion
          curr[j-1],    // insertion
          prev[j-1]     // substitution
        )

      rowMin = min(rowMin, curr[j])

    // Early termination: if the minimum value in this row
    // exceeds maxDistance, no subsequent row can produce a
    // smaller result (values only increase or stay same)
    if rowMin > maxDistance:
      return maxDistance + 1  // signal "exceeds threshold"

    swap prev, curr

  return prev[a.length]
```

### Complexity Analysis

| Metric | Before | After |
|--------|--------|-------|
| Time (worst case) | O(m * n) | O(m * n) — same |
| Time (early termination) | O(m * n) | O(k * min(m,n)) where k = rows before threshold exceeded |
| Space | O(m * n) — full 2D matrix | O(min(m, n)) — two rows |

### Why This Algorithm

1. **Eliminates dead state**: The 2D matrix contains rows that are never read again after the current row advances. The rolling approach makes this impossible — only live data exists.
2. **Fail-fast for rejections**: In supra resolution, the `partyMatchThreshold` is typically 0.6-0.8. Most party name pairs have similarity < 0.3. Early termination skips 70%+ of the computation for these pairs.
3. **Correct by construction**: The rolling approach produces identical results to the 2D approach (proven by induction on row index — each row depends only on the previous row).

## Correctness Invariants

1. **Symmetry**: `levenshteinDistance(a, b) === levenshteinDistance(b, a)` — test with all pairs in corpus
2. **Identity**: `levenshteinDistance(a, a) === 0` — test with all unique party names
3. **Base case**: `levenshteinDistance(a, "") === a.length` — test with empty string
4. **Triangle inequality**: `d(a, c) <= d(a, b) + d(b, c)` — test with random triples
5. **Parity with old implementation**: For every (a, b) pair used in existing test corpus, new function returns identical value
6. **Early termination correctness**: When `maxDistance` is provided, returns the exact distance if `distance <= maxDistance`, otherwise returns a value `> maxDistance`
7. **Normalized parity**: `normalizedLevenshteinDistance(a, b)` returns identical values to old implementation for all test inputs

## Implementation Plan

### New/Modified Files

| File | Action | Description |
|------|--------|-------------|
| `src/resolve/levenshtein.ts` | Modify | Replace `levenshteinDistance` body with rolling-row + early termination. Add optional `maxDistance` parameter. `normalizedLevenshteinDistance` unchanged except it may pass `maxDistance` in a future optimization. |
| `tests/resolve/levenshtein.test.ts` | Create | Unit tests for the algorithm invariants |

### Step-by-Step

1. Read `src/resolve/levenshtein.ts` in full. Note the current function signatures.
2. Create `tests/resolve/levenshtein.test.ts` with tests for all 7 correctness invariants listed above. Run tests against the **current** implementation to establish baseline — all must pass.
3. Modify `levenshteinDistance()`:
   - Add optional third parameter: `maxDistance: number = Infinity`
   - Replace the 2D array with two 1D arrays (`prev` and `curr`)
   - Swap `a` and `b` if `a.length > b.length` (so the shorter string is along columns)
   - Add `rowMin` tracking and early termination check after each row
   - Return `maxDistance + 1` on early termination (caller can check `result > maxDistance`)
4. Do NOT change `normalizedLevenshteinDistance()` signature or behavior. It should continue to call `levenshteinDistance(lowerA, lowerB)` without passing `maxDistance` (backward-compatible default of `Infinity`).
5. Run `pnpm typecheck` to verify no type errors.
6. Run `pnpm exec vitest run tests/resolve/levenshtein.test.ts` to verify all invariant tests pass.
7. Run `pnpm exec vitest run tests/integration/resolution.test.ts` to verify supra resolution parity.
8. Run `pnpm exec vitest run` to verify full suite passes.

### Zero-Dependency Constraint

This is pure arithmetic — no external dependencies needed. The implementation uses only `Math.min()` and array operations.

## Test Strategy

### Golden Parity Test

Run `pnpm exec vitest run tests/integration/resolution.test.ts` before and after. All supra resolution results (resolvedTo indices, confidence scores) must be identical.

### Unit Tests

In `tests/resolve/levenshtein.test.ts`:

```typescript
// Invariant 1: Symmetry
expect(levenshteinDistance("kitten", "sitting")).toBe(levenshteinDistance("sitting", "kitten"))

// Invariant 2: Identity
expect(levenshteinDistance("Smith", "Smith")).toBe(0)

// Invariant 3: Base case
expect(levenshteinDistance("hello", "")).toBe(5)
expect(levenshteinDistance("", "world")).toBe(5)

// Invariant 5: Known values
expect(levenshteinDistance("kitten", "sitting")).toBe(3)
expect(levenshteinDistance("Saturday", "Sunday")).toBe(3)

// Invariant 6: Early termination
expect(levenshteinDistance("abc", "xyz", 1)).toBeGreaterThan(1)
expect(levenshteinDistance("abc", "abd", 1)).toBe(1)
expect(levenshteinDistance("abc", "abc", 0)).toBe(0)

// Invariant 7: Normalized similarity
expect(normalizedLevenshteinDistance("Smith", "Smith")).toBe(1.0)
expect(normalizedLevenshteinDistance("Smith", "Smyth")).toBeCloseTo(0.8)
```

### Property Tests

Test with generated string pairs (random alphanumeric, 1-50 chars):
- Symmetry: `d(a, b) === d(b, a)`
- Non-negativity: `d(a, b) >= 0`
- Identity: `d(a, a) === 0`
- Triangle inequality: `d(a, c) <= d(a, b) + d(b, c)`
- Upper bound: `d(a, b) <= max(a.length, b.length)`

### Edge Cases

- Both empty strings → distance 0, similarity 1.0
- One empty string → distance = length of other
- Single character strings → 0 or 1
- Very long party names (100+ chars) — common in institutional litigants like "National Association of Regulatory Utility Commissioners"
- Unicode party names — accented characters in names
- `maxDistance = 0` — only matches identical strings

## Verification

```bash
# Step 1: Run new unit tests
pnpm exec vitest run tests/resolve/levenshtein.test.ts

# Step 2: Run resolution integration tests (supra resolution parity)
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
git checkout src/resolve/levenshtein.ts
```
