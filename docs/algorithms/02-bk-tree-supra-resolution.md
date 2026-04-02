# ALG-02: BK-Tree for Supra Resolution

**Status:** Ready
**Priority:** 3 (implement after ALG-03)
**Textbook References:** CLRS Ch.32 (string matching), Sedgewick Ch.5.2 (tries and string search)
**Target Files:** `src/resolve/DocumentResolver.ts` lines 161-204, new `src/resolve/bkTree.ts`
**Risk Level:** Medium
**Depends on:** ALG-03 (Space-Optimized Levenshtein) — the BK-Tree uses Levenshtein as its distance metric

## Problem Statement

`resolveSupra()` in `src/resolve/DocumentResolver.ts:161-204` resolves supra citations (e.g., "Smith, supra, at 45") by matching party names against all previously-seen full citations. The current approach is a linear scan:

```typescript
// lines 168-181
for (const [partyName, citationIndex] of this.context.fullCitationHistory) {
  if (!this.isWithinScope(citationIndex, currentIndex)) continue
  const similarity = normalizedLevenshteinDistance(targetPartyName, partyName)
  if (!bestMatch || similarity > bestMatch.similarity) {
    bestMatch = { index: citationIndex, similarity }
  }
}
```

This is problematic because:
1. **Every supra computes distance against every full citation** — O(N) distance computations per supra, where N is the number of full citations seen so far. For a 50-page appellate opinion with 80 full citations and 10 supra references, that's 800 Levenshtein computations.
2. **No short-circuit on perfect match** — even after finding an exact match (similarity 1.0), the loop continues checking all remaining entries because it uses strict `>` on line 178.
3. **No pruning of obviously-dissimilar candidates** — "Smith" is compared against "International Association of Machinists" with the same effort as against "Smyth".

A BK-Tree (Burkhard-Keller tree) indexes strings by edit distance, enabling threshold queries that prune dissimilar candidates without computing their full distance.

## Current Code Analysis

**Control flow of `resolveSupra()` (lines 161-204):**
1. Get `targetPartyName` from the supra citation, normalize it (line 163)
2. Linear scan through `fullCitationHistory` Map (line 168)
3. For each entry: scope check (line 170-172), then compute similarity (line 175)
4. Track best match via strict `>` — on ties, the *first* match wins (line 178)
5. After loop: check if best match exceeds `partyMatchThreshold` (line 188)
6. Return resolution result with confidence = similarity (line 201)

**Party name tracking in `trackFullCitation()` (lines 248-269):**
- Extracts party name from case citation's `caseName` field
- Normalizes and stores in `fullCitationHistory: Map<string, number>` (party name → citation index)
- Called during resolution for each full case citation encountered

**Coupling:**
- `fullCitationHistory` is a private Map on `DocumentResolver`
- `normalizedLevenshteinDistance` is the only distance function used
- `isWithinScope()` is a separate filtering step (scope boundaries) — the BK-Tree handles distance only; scope filtering stays external

**Tie-breaking behavior:** The current code uses strict `>` (line 178: `similarity > bestMatch.similarity`). This means on ties, the **first** (earliest-inserted) match wins. The BK-Tree must preserve this: when multiple candidates have the same distance, return the one with the lowest insertion order.

## Target Algorithm

### Description

A **BK-Tree** (Burkhard-Keller tree) is a metric tree that organizes strings by their pairwise edit distances. Each node has children indexed by their distance from the parent. For a threshold query "find all strings within distance d of query Q":

- Compute `d_node = distance(Q, node)`
- If `d_node <= threshold`, include node in results
- Recurse into children with keys in range `[d_node - threshold, d_node + threshold]` (triangle inequality pruning)

This prunes the search space significantly — for a threshold of 3, most branches are skipped entirely.

### Pseudocode

```
class BKTree:
  root: BKTreeNode | null = null

  insert(key, value, insertionOrder):
    node = { key, value, insertionOrder, children: Map<distance, node> }
    if root is null:
      root = node
      return
    current = root
    while true:
      d = distance(key, current.key)
      if d === 0: return  // duplicate key, keep first (preserves tie-breaking)
      if current.children.has(d):
        current = current.children.get(d)
      else:
        current.children.set(d, node)
        return

  query(queryKey, maxDistance) -> results[]:
    if root is null: return []
    results = []
    stack = [root]
    while stack not empty:
      node = stack.pop()
      d = distance(queryKey, node.key, maxDistance)  // early-termination Levenshtein
      if d <= maxDistance:
        results.push({ key: node.key, value: node.value, distance: d, order: node.insertionOrder })
      // Triangle inequality: only explore children with keys in [d - maxDistance, d + maxDistance]
      for each (childDist, childNode) in node.children:
        if childDist >= d - maxDistance AND childDist <= d + maxDistance:
          stack.push(childNode)
    // Sort results by distance ASC, then insertion order ASC (preserves tie-breaking)
    return results.sort((a, b) => a.distance - b.distance || a.order - b.order)
```

### Complexity Analysis

| Metric | Before | After |
|--------|--------|-------|
| Insert | O(1) Map.set | O(h) tree traversal (h = tree height, typically O(log N)) |
| Query | O(N * m^2) — N distances, each O(m^2) | O(k * m^2) — k << N candidates after pruning |
| Space | O(N) Map entries | O(N) tree nodes |

Where N = full citations, m = avg party name length, k = candidates after BK-Tree pruning.

For threshold queries with `maxDistance <= 3` on a tree of 80 nodes, typical k is 5-15 (vs N=80 for linear scan).

### Why This Algorithm

1. **Prunes impossible candidates structurally**: The triangle inequality guarantee means the BK-Tree never computes distance for strings that can't possibly be within threshold. The linear scan computes distance for every string regardless.
2. **Composes with early-termination Levenshtein**: The BK-Tree passes `maxDistance` to each `levenshteinDistance()` call (from ALG-03), getting double pruning — tree-level and distance-level.
3. **Preserves tie-breaking**: By tracking insertion order and sorting results, the BK-Tree returns the same "first match wins" behavior as the linear scan.
4. **Well-studied correctness properties**: The BK-Tree's correctness relies on the triangle inequality of the Levenshtein metric (proven in CLRS Ch.32). Any metric distance function works.

## Correctness Invariants

1. **Parity with linear scan**: For every supra citation in every test, the BK-Tree produces the same `resolvedTo` index and `confidence` score as the current linear scan
2. **Tie-breaking preservation**: When multiple party names have the same distance to the query, the earliest-inserted one wins
3. **Completeness**: If any string within `maxDistance` exists in the tree, the query finds it (no false negatives)
4. **Soundness**: Every string returned by the query is within `maxDistance` (no false positives)
5. **Triangle inequality**: For any three strings a, b, c in the tree: `d(a, c) <= d(a, b) + d(b, c)`
6. **Insertion idempotence**: Inserting the same key twice doesn't create duplicates
7. **Empty tree**: Querying an empty tree returns empty results

## Implementation Plan

### New/Modified Files

| File | Action | Description |
|------|--------|-------------|
| `src/resolve/bkTree.ts` | Create | `BKTree<T>` class with `insert()` and `query()` methods |
| `src/resolve/DocumentResolver.ts` | Modify | Add BK-Tree instance, use in `resolveSupra()` and `trackFullCitation()` |
| `tests/resolve/bkTree.test.ts` | Create | Unit tests for BK-Tree correctness invariants |

### Step-by-Step

1. Read `src/resolve/DocumentResolver.ts` in full. Understand `resolveSupra()`, `trackFullCitation()`, and `fullCitationHistory`.
2. Read `src/resolve/levenshtein.ts` to understand the distance function interface (ensure ALG-03 is already implemented).
3. Create `src/resolve/bkTree.ts`:
   - Define `BKTreeNode<T>` type: `{ key: string, value: T, insertionOrder: number, children: Map<number, BKTreeNode<T>> }`
   - Implement `BKTree<T>` class:
     - `private root: BKTreeNode<T> | null = null`
     - `private nextOrder = 0`
     - `private distanceFn: (a: string, b: string, maxDistance?: number) => number`
     - Constructor takes the distance function
     - `insert(key: string, value: T): void`
     - `query(key: string, maxDistance: number): Array<{ key: string, value: T, distance: number, insertionOrder: number }>`
   - Do NOT export from the package entry point — this is internal to the resolve module
4. Create `tests/resolve/bkTree.test.ts` with tests for invariants 2-7.
5. Run `pnpm exec vitest run tests/resolve/bkTree.test.ts` — all must pass.
6. Modify `DocumentResolver`:
   - Add private field: `private partyNameTree: BKTree<number>` (value = citation index)
   - Initialize in constructor with `levenshteinDistance` as the distance function
   - In `trackFullCitation()`: after adding to `fullCitationHistory` Map, also call `partyNameTree.insert(normalizedPartyName, citationIndex)`
   - In `resolveSupra()`: replace the linear scan with:
     ```typescript
     const maxDistance = Math.ceil((1 - this.options.partyMatchThreshold) * maxLength)
     const candidates = this.partyNameTree.query(targetPartyName, maxDistance)
     ```
   - Filter candidates by scope (`isWithinScope`)
   - Select best match: highest similarity (lowest distance), with insertion-order tie-breaking already handled by the BK-Tree's sorted results
   - Keep `fullCitationHistory` Map for backward compatibility (other code may read it)
7. Run `pnpm typecheck`.
8. Run `pnpm exec vitest run tests/resolve/bkTree.test.ts tests/integration/resolution.test.ts`.
9. Run `pnpm exec vitest run` (full suite).

### Zero-Dependency Constraint

The BK-Tree is ~60 lines of code. Uses `levenshteinDistance` from the same module. No external dependencies.

## Test Strategy

### Golden Parity Test

Run `pnpm exec vitest run tests/integration/resolution.test.ts` before and after. All supra resolution results must be identical.

### Unit Tests

In `tests/resolve/bkTree.test.ts`:

```typescript
// Basic insertion and exact query
const tree = new BKTree(levenshteinDistance)
tree.insert("Smith", 0)
tree.insert("Jones", 1)
expect(tree.query("Smith", 0)).toHaveLength(1)
expect(tree.query("Smith", 0)[0].value).toBe(0)

// Fuzzy query
tree.insert("Smyth", 2)
const results = tree.query("Smith", 1)
expect(results).toHaveLength(2)  // "Smith" (d=0) and "Smyth" (d=1)

// Tie-breaking: first inserted wins
tree.insert("AAA", 0)
tree.insert("AAB", 1)
tree.insert("AAC", 2)
const tied = tree.query("AAA", 1)
// "AAA" (d=0) first, then "AAB" (d=1, order=1) before "AAC" (d=1, order=2)

// Empty tree
const empty = new BKTree(levenshteinDistance)
expect(empty.query("anything", 5)).toHaveLength(0)
```

### Property Tests

For N random strings inserted into a BK-Tree:
- Every string returned by `query(q, d)` has `levenshteinDistance(q, result) <= d`
- Every string in the tree with `levenshteinDistance(q, string) <= d` is in the query results
- Query results are sorted by distance, then insertion order

### Edge Cases

- Single-character party names ("A" vs "B")
- Identical party names from different citations (same key, different values — first insertion wins)
- Very long party names (100+ chars) — institutional litigants
- `maxDistance = 0` — exact match only
- `maxDistance` larger than any string length — returns everything
- Party name is a substring of another ("Smith" vs "Smith & Associates")

## Verification

```bash
# Step 1: Run BK-Tree unit tests
pnpm exec vitest run tests/resolve/bkTree.test.ts

# Step 2: Run resolution integration tests
pnpm exec vitest run tests/integration/resolution.test.ts

# Step 3: Run full suite
pnpm exec vitest run

# Step 4: Typecheck
pnpm typecheck
```

All commands must exit 0.

## Rollback Plan

Two files changed. Revert with:
```bash
git checkout src/resolve/DocumentResolver.ts
rm src/resolve/bkTree.ts
```
