# ALG-01: Union-Find for Subsequent History Chains

**Status:** Complete
**Priority:** 4 (implement after ALG-02)
**Textbook References:** CLRS Ch.19 (disjoint-set forests, path compression, union by rank), Sedgewick Ch.1.5 (weighted quick-union with path compression)
**Target Files:** `src/extract/extractCitations.ts` lines 338-380, new `src/extract/unionFind.ts`
**Risk Level:** Medium-High

## Problem Statement

The subsequent history linking code in `src/extract/extractCitations.ts:338-380` aggregates chained history citations (A→B→C) onto the root parent using a **mutation-during-iteration** pattern:

```typescript
// lines 347-379
const entries = parent.subsequentHistoryEntries  // alias to parent's array
let entryIdx = 0
for (let j = i + 1; j < citations.length && entryIdx < entries.length; j++) {
  const child = citations[j]
  // ...
  if (child.subsequentHistoryEntries) {
    for (const childEntry of child.subsequentHistoryEntries) {
      entries.push({ ...childEntry, order: entries.length })  // MUTATES loop bound
    }
    child.subsequentHistoryEntries = undefined
  }
  entryIdx++
}
```

The code explicitly acknowledges this pattern in comments (lines 364-366): "Intentionally mutates `entries`... enabling transitive chaining."

This is fragile because:
1. **Loop-bound mutation** — `entries.length` changes during iteration. The inner `for` loop's condition `entryIdx < entries.length` is re-evaluated each iteration, which is how chaining works. But any refactor that caches `entries.length`, uses `for-of`, or uses `.forEach()` would silently break transitive chaining.
2. **Implicit data flow** — `entries` is an alias for `parent.subsequentHistoryEntries`. The push modifies the parent's array through the alias. This indirection makes the code hard to reason about.
3. **O(n^2) pathological case** — A chain of N subsequent history citations (A→B→C→D→...→Z) causes N-1 pushes during the inner loop, each extending the loop's iteration count.

Union-Find (disjoint-set forest) is the canonical data structure for "group elements into sets, then query which set an element belongs to" — exactly the transitive chaining problem.

## Current Code Analysis

**Full control flow of lines 338-380:**

```
Step 4.5: Link subsequent history citations

For each citation i (line 343):
  Skip if not a case citation or has no subsequentHistoryEntries (line 345)

  entries = parent.subsequentHistoryEntries (alias, line 347)
  entryIdx = 0 (line 348)

  For each subsequent citation j > i (line 350):
    Skip if not a case citation (line 352)

    Check if child starts after the current signal's end (line 357):
      signalEnd = entries[entryIdx].signalSpan.cleanEnd
      if child.span.cleanStart >= signalEnd:

        Set child.subsequentHistoryOf = { index: i, signal: entries[entryIdx].signal }
        (lines 358-361)

        If child has its own subsequentHistoryEntries (line 367):
          Push each child entry onto parent's entries array (lines 368-373)
          Set child.subsequentHistoryEntries = undefined (line 374)
          ^ This is the transitive chaining: child's entries become parent's

        Advance entryIdx (line 377)
```

**Key observations:**
- The outer loop iterates `citations[]` (all extracted citations, in text order)
- The inner loop finds the next case citation after each signal span
- `entryIdx` tracks which signal we're trying to match next
- The push on line 369 extends `entries`, so the outer loop processes more signals
- `child.subsequentHistoryEntries = undefined` on line 374 prevents double-processing

**Data structures:**
- `SubsequentHistoryEntry`: `{ signal: string, signalSpan: Span, order: number }`
- `CaseCitation.subsequentHistoryEntries?: SubsequentHistoryEntry[]`
- `CaseCitation.subsequentHistoryOf?: { index: number, signal: string }`

**Coupling:**
- This code runs after extraction (step 4.5) but before string citation detection (step 4.75) and resolution (step 5)
- Only `CaseCitation` type is involved
- The output is mutations on citation objects: setting `subsequentHistoryOf` and moving/clearing `subsequentHistoryEntries`
- `detectStringCitations()` and `applyFalsePositiveFilters()` run after and read these fields

## Target Algorithm

### Description

Replace the mutation-during-iteration pattern with a three-phase approach using Union-Find:

**Phase 1 — Signal Matching**: Iterate citations, match each subsequent history signal to its child citation (the next case citation after the signal span). Record these as `(parent, child)` pairs. Do NOT modify any citation objects yet.

**Phase 2 — Union**: For each `(parent, child)` pair, call `union(parent, child)`. The Union-Find tracks which citations are in the same history chain. Use the lowest index as the root (canonical representative).

**Phase 3 — Aggregation**: For each chain (connected component), collect all `subsequentHistoryEntries` from non-root members onto the root. Set `subsequentHistoryOf` on non-root members. Clear `subsequentHistoryEntries` on non-root members.

This is more robust because:
- **No mutation during iteration** — phases are cleanly separated
- **Transitive chaining is structural** — `find(x) === find(y)` if and only if x and y are in the same chain. No array aliasing tricks needed.
- **O(N * α(N))** — nearly linear time via path compression and union by rank (α is the inverse Ackermann function, effectively constant)

### Pseudocode

```
class UnionFind:
  parent: number[]   // parent[i] = parent of element i
  rank: number[]     // rank[i] = upper bound on height of subtree rooted at i

  makeSet(n):
    parent = [0, 1, 2, ..., n-1]
    rank = [0, 0, ..., 0]

  find(x):
    while parent[x] !== x:
      parent[x] = parent[parent[x]]  // path halving (simpler than full compression)
      x = parent[x]
    return x

  union(x, y):
    rootX = find(x)
    rootY = find(y)
    if rootX === rootY: return  // already in same set

    // Always make the lower-index root the canonical representative
    if rootX > rootY: swap rootX, rootY
    parent[rootY] = rootX
    if rank[rootX] === rank[rootY]: rank[rootX]++

  components() -> Map<root, members[]>:
    result = new Map()
    for i = 0 to n-1:
      root = find(i)
      if not result.has(root): result.set(root, [])
      result.get(root).push(i)
    return result
```

**Usage in extractCitations.ts:**

```
// Phase 1: Signal matching (no mutations)
pairs: Array<{ parentIdx, childIdx, signal, signalSpan, childEntries? }> = []
for each citation i with subsequentHistoryEntries:
  entryIdx = 0
  for each citation j > i:
    if j is case citation and j.span.cleanStart >= entries[entryIdx].signalSpan.cleanEnd:
      pairs.push({ parentIdx: i, childIdx: j, signal: entries[entryIdx].signal, ... })
      entryIdx++
      if entryIdx >= entries.length: break

// Phase 2: Union
uf = new UnionFind(citations.length)
for each pair in pairs:
  uf.union(pair.parentIdx, pair.childIdx)

// Phase 3: Aggregation
components = uf.components()
for each (root, members) in components:
  if members.length === 1: continue  // no chain
  rootCitation = citations[root]
  allEntries = rootCitation.subsequentHistoryEntries ?? []
  for each member in members (except root):
    memberCitation = citations[member]
    // Set back-pointer
    memberCitation.subsequentHistoryOf = { index: root, signal: pairs.find(p => p.childIdx === member).signal }
    // Aggregate entries
    if memberCitation.subsequentHistoryEntries:
      allEntries.push(...memberCitation.subsequentHistoryEntries.map((e, i) => ({ ...e, order: allEntries.length + i })))
      memberCitation.subsequentHistoryEntries = undefined
  rootCitation.subsequentHistoryEntries = allEntries
```

### Complexity Analysis

| Metric | Before | After |
|--------|--------|-------|
| Time | O(N^2) worst case (chain of N) | O(N * α(N)) ≈ O(N) |
| Space | O(1) extra (in-place mutation) | O(N) for Union-Find arrays |

### Why This Algorithm

1. **Eliminates mutation-during-iteration**: The three-phase approach never modifies data structures while iterating them. Each phase reads from the previous phase's output.
2. **Transitive chaining is guaranteed**: Union-Find's `find()` with path compression guarantees that `find(A) === find(C)` after `union(A, B)` and `union(B, C)`. No array-aliasing tricks needed.
3. **Canonical data structure for this problem**: Disjoint-set forests are THE textbook solution for dynamic connectivity / transitive closure (CLRS Ch.19, Sedgewick Ch.1.5).
4. **Easier to test**: Each phase can be tested independently — signal matching, union correctness, aggregation correctness.

## Correctness Invariants

1. **Back-pointer correctness**: For any citation C where `C.subsequentHistoryOf` is set, `C.subsequentHistoryOf.index` is the root of C's history chain (the earliest citation)
2. **Signal preservation**: `C.subsequentHistoryOf.signal` matches the signal text that links C to its chain
3. **Entry aggregation**: The root citation's `subsequentHistoryEntries` contains all entries from all chain members, in order
4. **Non-root cleanup**: Non-root citations have `subsequentHistoryEntries = undefined`
5. **Chain root is earliest**: For any chain, `find(x)` returns the citation with the lowest index
6. **No orphans**: Every citation that had a subsequent history signal pointing at it has `subsequentHistoryOf` set
7. **Parity**: All existing subsequent history tests produce identical output

## Implementation Plan

### New/Modified Files

| File | Action | Description |
|------|--------|-------------|
| `src/extract/unionFind.ts` | Create | `UnionFind` class (private, not exported from package) |
| `src/extract/extractCitations.ts` | Modify | Replace lines 338-380 with three-phase Union-Find approach |
| `tests/extract/unionFind.test.ts` | Create | Unit tests for Union-Find operations |

### Step-by-Step

1. Read `src/extract/extractCitations.ts` lines 300-400 in full. Understand the context before and after the history linking block.
2. Read `src/types/citation.ts` to understand `SubsequentHistoryEntry`, `CaseCitation.subsequentHistoryEntries`, and `CaseCitation.subsequentHistoryOf`.
3. Create `src/extract/unionFind.ts`:
   - `UnionFind` class with `makeSet(n)`, `find(i)`, `union(i, j)`, `connected(i, j)`, `components()`
   - Path halving in `find()`: `parent[x] = parent[parent[x]]`
   - Union by rank with lower-index-wins tie-breaking
   - NOT exported from package entry point
4. Create `tests/extract/unionFind.test.ts`:
   - Test `find`, `union`, `connected`, `components` independently
   - Test transitive closure: `union(0,1)`, `union(1,2)` → `find(0) === find(2)`
   - Test that root is always the lowest index
5. Run `pnpm exec vitest run tests/extract/unionFind.test.ts`.
6. Modify `src/extract/extractCitations.ts` lines 338-380:
   - **Phase 1**: Extract signal-to-child matching into a separate loop that collects `(parentIdx, childIdx, signal, signalSpan)` pairs without mutating citations. Keep the same matching logic (check `child.span.cleanStart >= signalEnd`).
   - **Phase 2**: Create `UnionFind(citations.length)`, union all pairs.
   - **Phase 3**: For each component, aggregate entries onto root, set back-pointers on non-root members, clear non-root entries.
   - Important: In Phase 1, also collect child's `subsequentHistoryEntries` into the pairs (for transitive chaining). This replaces the "push during iteration" trick.
7. Run `pnpm typecheck`.
8. Run `pnpm exec vitest run tests/extract/extractCase.test.ts` — subsequent history tests.
9. Run `pnpm exec vitest run tests/integration/` — full integration.
10. Run `pnpm exec vitest run` — full suite.

### Zero-Dependency Constraint

Union-Find is ~40 lines of code. No external dependencies.

## Test Strategy

### Golden Parity Test

Run `pnpm exec vitest run tests/extract/extractCase.test.ts tests/integration/` before and after. All subsequent history extraction results must be identical.

### Unit Tests

In `tests/extract/unionFind.test.ts`:

```typescript
// Basic operations
const uf = new UnionFind(5)
expect(uf.find(0)).toBe(0)
expect(uf.find(4)).toBe(4)
expect(uf.connected(0, 1)).toBe(false)

// Union and find
uf.union(0, 1)
expect(uf.connected(0, 1)).toBe(true)
expect(uf.find(0)).toBe(0)  // lower index is root
expect(uf.find(1)).toBe(0)

// Transitive closure
uf.union(1, 2)
expect(uf.connected(0, 2)).toBe(true)  // 0-1-2 all connected
expect(uf.find(2)).toBe(0)

// Components
uf.union(3, 4)
const components = uf.components()
expect(components.get(0)).toEqual([0, 1, 2])
expect(components.get(3)).toEqual([3, 4])
```

### Property Tests

For N random union operations on a set of M elements:
- `connected(x, y)` is an equivalence relation (reflexive, symmetric, transitive)
- `find(x) <= x` for all x (lower index is always root, since we union by lower index)
- `components()` partitions all elements (every element appears exactly once)
- Number of components = M - (number of successful unions)

### Edge Cases

- Single citation with subsequent history (no chaining needed)
- Long chain: A→B→C→D→E (5-deep transitive chaining)
- Two independent chains in the same document
- Citation with `subsequentHistoryEntries` but no matching child citation (signal with no following case citation)
- Chain where intermediate citation has no entries of its own

## Verification

```bash
# Step 1: Run Union-Find unit tests
pnpm exec vitest run tests/extract/unionFind.test.ts

# Step 2: Run subsequent history extraction tests
pnpm exec vitest run tests/extract/extractCase.test.ts

# Step 3: Run integration tests
pnpm exec vitest run tests/integration/

# Step 4: Run full suite
pnpm exec vitest run

# Step 5: Typecheck
pnpm typecheck
```

All commands must exit 0.

## Rollback Plan

Two files changed, one created. Revert with:
```bash
git checkout src/extract/extractCitations.ts
rm src/extract/unionFind.ts
```
