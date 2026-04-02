# Textbook Algorithm Improvements for eyecite-ts

## Context

eyecite-ts is a TypeScript legal citation extraction library with a 4-stage pipeline (clean → tokenize → extract → resolve). The codebase is well-engineered but uses basic algorithms in several places where classic textbook data structures (from CLRS *Introduction to Algorithms* and Sedgewick's *Algorithms 4th Edition*) would improve **robustness and correctness** — eliminating fragile mutation patterns, edge-case-prone linear scans, and memory-inefficient data structures.

### Goal

Produce **5 standalone algorithm improvement specs** (each a self-contained PRD/implementation plan that a coding agent can pick up cold) plus **1 domain-aware process skill** that guides implementing agents through a disciplined benchmark-implement-verify cycle specific to legal citation extraction.

---

## Deliverables

### File Structure

```
docs/algorithms/
  00-TEMPLATE.md                            # Reusable spec template
  01-union-find-history-chains.md           # Spec 1
  02-bk-tree-supra-resolution.md            # Spec 2
  03-space-optimized-levenshtein.md         # Spec 3
  04-segment-position-mapping.md            # Spec 4
  05-binary-search-paragraph-boundaries.md  # Spec 5

.claude/skills/algorithmic-refactoring/SKILL.md  # Process skill
```

### Production Order

Write specs in implementation-priority order (simplest/lowest-risk first) so earlier specs validate the template:

1. `00-TEMPLATE.md` — the reusable template
2. `03-space-optimized-levenshtein.md` — pure function, validates template
3. `05-binary-search-paragraph-boundaries.md` — second simplest
4. `02-bk-tree-supra-resolution.md` — medium complexity, depends on 03
5. `01-union-find-history-chains.md` — medium-high, touches central orchestrator
6. `04-segment-position-mapping.md` — highest complexity/blast radius
7. `SKILL.md` — references all 5 spec paths and eyecite-ts specifics

---

## Spec Template (`00-TEMPLATE.md`)

Every spec follows this structure:

```markdown
# ALG-{NN}: {Title}

**Status:** Draft | Ready | In Progress | Complete
**Priority:** {1-5} (implementation order)
**Textbook References:** CLRS {chapter/section}, Sedgewick {chapter/section}
**Target Files:** {file paths with line ranges}
**Risk Level:** Low | Medium | High

## Problem Statement
What's fragile/incorrect in the current code. Include file:line references.

## Current Code Analysis
Control flow trace, data structures used, coupling points, known edge cases.

## Target Algorithm
### Description
### Pseudocode
### Complexity Analysis (time + space, before vs after)
### Why This Algorithm (not just "it's faster" — why it's more correct/robust)

## Correctness Invariants
Numbered list. Each invariant is testable. These are the contract.

## Implementation Plan
### New/Modified Files (table: file, action, description)
### Step-by-Step (numbered, detailed enough for cold-start agent)
### Zero-Dependency Constraint (all algorithms implemented from scratch)

## Test Strategy
### Golden Parity Test (same citations from same input)
### Unit Tests (algorithm-specific)
### Property Tests (algorithm invariants)
### Edge Cases (legal-citation-specific scenarios)

## Verification
Exact commands to run. What output to compare. What "correct" looks like.

## Rollback Plan
How to revert if something goes wrong.
```

---

## The 5 Algorithm Specs

### Spec 03: Space-Optimized Levenshtein DP with Early Termination

**Target:** `src/resolve/levenshtein.ts` (89 lines — the entire file)
**Risk:** Low — pure function, only called by `DocumentResolver.resolveSupra()`
**Textbook:** CLRS Ch.14 (dynamic programming), Sedgewick Ch.5 (string processing)

**Problem:** `levenshteinDistance()` allocates a full (m+1)x(n+1) 2D array per comparison (line 27). For supra resolution on a document with 100 citations and 5 supra references, this means ~500 matrix allocations. The current code also has no early termination — it computes the full distance even when the strings are obviously dissimilar.

**Current code (lines 27, 38-57):**
- `Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0))` — full 2D matrix
- Nested loop fills entire matrix regardless of threshold

**Target algorithm:**
- Rolling single-row DP: maintain only `prev[]` and `curr[]` arrays, each of length `min(m,n)+1`
- Process shorter string along columns to minimize row length
- Add optional `maxDistance` parameter: track minimum value in current row; if minimum exceeds maxDistance, terminate early (return `Infinity`)
- `normalizedLevenshteinDistance()` passes `maxDistance = Math.ceil((1 - threshold) * maxLength)` when called with a threshold context

**Correctness invariants:**
1. `levenshteinDistance(a, b) === levenshteinDistance(b, a)` (symmetry)
2. `levenshteinDistance(a, a) === 0` (identity)
3. `levenshteinDistance(a, "") === a.length` (base case)
4. For all (a, b) pairs in existing test corpus: new function returns identical value to old
5. With `maxDistance` param: returns same value when distance <= maxDistance, returns Infinity (or value > maxDistance) otherwise

**New/modified files:**

| File | Action | Description |
|------|--------|-------------|
| `src/resolve/levenshtein.ts` | Modify | Replace 2D DP with rolling-row + early termination |

**Verification:** `pnpm exec vitest run tests/integration/resolution.test.ts` — all supra resolution tests must produce identical results.

---

### Spec 05: Binary Search for Paragraph Boundaries

**Target:** `src/resolve/scopeBoundary.ts` lines 43-49
**Risk:** Low — self-contained in one function, boundaries already sorted
**Textbook:** CLRS Ch.2 (binary search), Sedgewick Ch.1 (binary search)

**Problem:** `detectParagraphBoundaries()` uses a linear scan to assign each citation to a paragraph. The inner loop (lines 44-49) iterates all boundaries for each citation — O(N*B). More importantly, the linear scan with the `break` on line 49 is correct but fragile — if someone removes the `break`, it silently assigns the *last* matching paragraph instead of the first.

**Current code (lines 43-49):**
```typescript
for (let j = 0; j < boundaries.length - 1; j++) {
  if (citationStart >= boundaries[j] && citationStart < boundaries[j + 1]) {
    paragraphNum = j
    break
  }
}
```

**Target algorithm:**
- `bisectRight(boundaries, citationStart) - 1` — standard binary search returning the insertion point
- Boundaries are already sorted (regex exec produces matches in order)
- Replace the inner for-loop with a single binary search call
- Implement `bisectRight()` as a private function in `scopeBoundary.ts`

**Correctness invariants:**
1. For every citation in every test, the paragraph number from binary search === paragraph number from old linear scan
2. `bisectRight([0, 100, 200, 300], 150)` returns 2 (paragraph 1)
3. `bisectRight([0, 100, 200], 0)` returns 1 (paragraph 0)
4. `bisectRight([0, 100, 200], 99)` returns 1 (still paragraph 0)
5. `bisectRight([0, 100, 200], 100)` returns 2 (paragraph 1)

**New/modified files:**

| File | Action | Description |
|------|--------|-------------|
| `src/resolve/scopeBoundary.ts` | Modify | Add `bisectRight()`, replace inner loop |

**Verification:** `pnpm exec vitest run tests/integration/resolution.test.ts` — paragraph-scoped resolution must produce identical results.

---

### Spec 02: BK-Tree for Supra Resolution

**Target:** `src/resolve/DocumentResolver.ts` lines 161-204 + new `src/resolve/bkTree.ts`
**Risk:** Medium — adds a new data structure, changes resolution internals
**Textbook:** Sedgewick Ch.5 (string search data structures), CLRS Ch.32 (string matching)
**Depends on:** Spec 03 (optimized Levenshtein used as the distance metric)

**Problem:** `resolveSupra()` performs a linear scan through `fullCitationHistory`, computing `normalizedLevenshteinDistance()` for every entry — O(N) distance computations per supra citation. The linear scan *always* checks every entry even after finding a perfect match (similarity 1.0) — it can't short-circuit because it uses strict `>` on line 178 to find the best match.

**Current code (lines 168-181):**
```typescript
for (const [partyName, citationIndex] of this.context.fullCitationHistory) {
  if (!this.isWithinScope(citationIndex, currentIndex)) continue
  const similarity = normalizedLevenshteinDistance(targetPartyName, partyName)
  if (!bestMatch || similarity > bestMatch.similarity) {
    bestMatch = { index: citationIndex, similarity }
  }
}
```

**Target algorithm:**
- BK-Tree (Burkhard-Keller tree): a metric tree that indexes strings by edit distance
- Insert normalized party names as full citations are encountered in `trackFullCitation()`
- Query with threshold derived from `partyMatchThreshold`
- BK-Tree prunes branches where `|d(node, query) - d(node, child)| > threshold`, reducing comparisons to O(log N)

**Correctness invariants:**
1. For any query Q and threshold T, the BK-Tree returns the **same best match** as the current linear scan (note: current code uses strict `>` for improvement, so on ties the *first* match wins — BK-Tree must preserve this tie-breaking by tracking insertion order)
2. If the linear scan finds no match above threshold, the BK-Tree also finds no match
3. BK-Tree insertion order doesn't affect query results (metric space property)
4. All existing supra resolution tests produce identical `resolvedTo` indices and confidence scores

**New/modified files:**

| File | Action | Description |
|------|--------|-------------|
| `src/resolve/bkTree.ts` | Create | BK-Tree implementation (private, not exported from package) |
| `src/resolve/DocumentResolver.ts` | Modify | Use BK-Tree in `resolveSupra()` and `trackFullCitation()` |

**Implementation notes:**
- `BKTree<T>` class: `insert(key: string, value: T)` and `query(key: string, maxDistance: number): Array<{key, value, distance}>`
- Tree nodes: `{ key: string, value: T, children: Map<number, BKTreeNode<T>> }` — children keyed by distance
- Query: recursive descent, prune when `|d - childDist| > maxDistance`
- Distance metric: `levenshteinDistance()` from spec 03 (with `maxDistance` early termination)

**Verification:** `pnpm exec vitest run tests/integration/resolution.test.ts` — all supra resolution results must be identical.

---

### Spec 01: Union-Find for Subsequent History Chains

**Target:** `src/extract/extractCitations.ts` lines 338-380
**Risk:** Medium-High — touches the central pipeline orchestrator
**Textbook:** CLRS Ch.19 (disjoint-set forests, path compression, union by rank), Sedgewick Ch.1.5 (weighted quick-union with path compression)

**Problem:** The history chain linking code at lines 343-380 uses a subtle pattern: it iterates `entries` (an alias for `parent.subsequentHistoryEntries`) while *pushing new entries onto the same array* during iteration. The comment on lines 364-366 explicitly acknowledges this: "Intentionally mutates `entries`... enabling transitive chaining (A->B->C all aggregated onto A)." This is:

1. **Fragile** — any refactor that caches `entries.length` or uses `for-of` would break it silently
2. **Hard to reason about** — the loop body modifies the loop bound
3. **O(n^2) in pathological cases** — a chain of N history citations causes N pushes during the inner loop

**Current code (lines 343-380):**
```typescript
for (let i = 0; i < citations.length; i++) {
  const parent = citations[i]
  if (parent.type !== "case" || !parent.subsequentHistoryEntries) continue
  const entries = parent.subsequentHistoryEntries
  let entryIdx = 0
  for (let j = i + 1; j < citations.length && entryIdx < entries.length; j++) {
    // ... match child to signal, then:
    if (child.subsequentHistoryEntries) {
      for (const childEntry of child.subsequentHistoryEntries) {
        entries.push({ ...childEntry, order: entries.length })  // mutates loop bound
      }
      child.subsequentHistoryEntries = undefined
    }
    entryIdx++
  }
}
```

**Target algorithm:**
- Disjoint-set forest with path compression and union-by-rank
- Phase 1: Each citation starts as its own set. Process signals to build union operations.
- Phase 2: For each subsequent history signal, `union(parent, child)`
- Phase 3: One final pass — for each root, collect all entries from its set members
- The root is always the earliest citation (lowest index) via rank/index ordering

**Correctness invariants:**
1. After processing, for any citation C where `C.subsequentHistoryOf.index === P`, `find(C) === find(P)`
2. The root of each set is the earliest citation in the chain (lowest index)
3. All `subsequentHistoryEntries` from non-root citations are aggregated onto the root
4. Non-root citations have `subsequentHistoryEntries = undefined`
5. `subsequentHistoryOf.signal` values are unchanged
6. All existing subsequent history tests produce identical output

**New/modified files:**

| File | Action | Description |
|------|--------|-------------|
| `src/extract/unionFind.ts` | Create | Union-Find implementation (private, not exported) |
| `src/extract/extractCitations.ts` | Modify | Replace lines 338-380 with Union-Find based approach |

**Implementation notes:**
- `UnionFind` class: `makeSet(i)`, `find(i)`, `union(i, j)`, `components()` (returns `Map<root, members[]>`)
- Path compression via path halving: `parent[i] = parent[parent[i]]`
- Union by rank: attach smaller tree under root of larger tree
- The key insight: signal-to-child matching (the `entryIdx` tracking) is preserved separately from aggregation. Union-Find only handles "which citations are in the same chain."

**Verification:** `pnpm exec vitest run tests/extract/extractCase.test.ts tests/integration/` — all subsequent history tests must produce identical results.

---

### Spec 04: Segment-Based Position Mapping

**Target:** `src/clean/cleanText.ts` (especially `rebuildPositionMaps()` lines 108-208) + `src/types/span.ts`
**Risk:** High — changes a type used across the entire pipeline
**Textbook:** Sedgewick (interval/segment tree concepts), CLRS Ch.14 (augmented data structures)

**Problem:** `cleanToOriginal` and `originalToClean` are `Map<number, number>` with **one entry per character position**. For a 10KB document, that's ~10,000 Map entries per direction, rebuilt from scratch after each of 6 default cleaners via `rebuildPositionMaps()`. The function itself (lines 108-208) is a complex 100-line character-by-character scan with a lookahead heuristic (maxLookAhead=20) that can produce incorrect mappings when transformations span more than 20 characters. The per-character Map also has no structural invariant — nothing prevents gaps or overlapping entries.

**Current code:**
- Lines 55-62: Identity map: `for (let i = 0; i <= original.length; i++) { cleanToOriginal.set(i, i) }`
- Lines 108-208: `rebuildPositionMaps()` — character-by-character lookahead scan, complex branching
- `TransformationMap` type in `src/types/span.ts`: `{ cleanToOriginal: Map<number, number>, originalToClean: Map<number, number> }`

**Target algorithm:**
- New type: `Segment = { cleanPos: number, origPos: number, len: number }`
- `SegmentMap`: sorted array of segments where each represents a contiguous run with constant offset
- Lookup via binary search: find segment containing target position, compute `origPos + (target - cleanPos)`
- Cleaner composition: merge two segment maps algebraically instead of character-level rebuilding
- For a 10KB document with 50 transformations: ~100 segments vs 10,000 Map entries

**Correctness invariants:**
1. For every position p in [0, cleanedText.length], `segmentLookup(p)` equals `oldMap.cleanToOriginal.get(p)`
2. Segments sorted by `cleanPos`, non-overlapping
3. Adjacent segments with same offset delta are merged
4. `resolveOriginalSpan()` in `src/types/span.ts` produces identical original positions
5. All integration tests produce identical `originalStart/originalEnd` values on all citations

**New/modified files:**

| File | Action | Description |
|------|--------|-------------|
| `src/clean/segmentMap.ts` | Create | SegmentMap with binary search lookup and composition |
| `src/clean/cleanText.ts` | Modify | Replace Map-based position tracking with SegmentMap |
| `src/types/span.ts` | Modify | Update TransformationMap type, add lookup methods |

**Blast radius minimization strategy:**
- `SegmentMap` implements `lookupCleanToOriginal(pos)` and `lookupOriginalToClean(pos)`
- `TransformationMap` wraps `SegmentMap` internally, keeps same field names
- Add `.get(pos)` proxy methods so existing `map.cleanToOriginal.get(pos)` call sites still work during migration
- Migrate call sites one at a time, then remove the proxy

**Verification:** `pnpm exec vitest run` — **all** tests must pass, since position mapping affects every citation type's span values.

---

## Agent Skill: `algorithmic-refactoring`

### Location

`.claude/skills/algorithmic-refactoring/SKILL.md`

### Design

The skill is domain-specific to eyecite-ts's legal citation extraction pipeline. It enforces a 6-phase cycle:

**Phase 0 — Load Spec**
- Read `docs/algorithms/{NN}-*.md` by spec number
- Display summary: algorithm name, target files, risk level, textbook references
- Confirm which spec is being worked on

**Phase 1 — Baseline**
- Run `pnpm exec vitest run` — must be green
- Capture golden corpus output: run integration tests, save the full citation extraction results (citation types, spans, resolution links) as baseline
- Run micro-benchmark if the spec defines one
- Record all baseline metrics

**Phase 2 — Implement**
- Follow the spec's "Implementation Plan" step by step
- After each file change, run `pnpm typecheck`
- Reminders: zero runtime dependencies, no public API changes

**Phase 3 — Test**
- Write unit tests per the spec's "Test Strategy"
- Write property/invariant tests per the spec's "Correctness Invariants"
- Run new tests: `pnpm exec vitest run {new-test-files}`

**Phase 4 — Verify Parity**
- Run full suite: `pnpm exec vitest run`
- Compare golden corpus output to Phase 1 baseline
- "Identical" means: same citations extracted, same spans (originalStart/originalEnd), same resolution links (resolvedTo indices), same confidence scores
- If any mismatch: STOP, diagnose, fix before proceeding

**Phase 5 — Post-Benchmark**
- Run same benchmark as Phase 1
- Report before/after numbers
- Regression is investigated but not blocking (correctness > performance)

**Phase 6 — Finalize**
- Run `pnpm lint` and `pnpm format`
- Update spec's Status field to "Complete"
- Create changeset: `pnpm changeset` → patch → "internal: optimize {algorithm name}"
- Print summary report

### Enforcement Rules

1. No skipping benchmarks — Phases 1 and 5 are mandatory
2. No skipping parity check — Phase 4 golden comparison is mandatory
3. No new runtime dependencies — dev dependencies only
4. No public API changes — if any exported type signature changes, STOP and escalate
5. One spec at a time — do not batch multiple specs in one invocation
6. Feature branch required — never commit directly to main

### eyecite-ts Domain Knowledge (embedded in skill)

- **Pipeline:** clean → tokenize → extract → resolve
- **Position tracking:** `originalStart/originalEnd` must always map correctly to input text
- **Resolution correctness:** supra, id, and short-form citations must resolve to same antecedent indices
- **Test commands:** `pnpm exec vitest run` (not `pnpm test` which enters watch mode)
- **Golden corpus:** `tests/integration/goldenCorpus.test.ts`, `tests/integration/expandedCorpus.test.ts`, `tests/integration/resolution.test.ts`
- **Type safety:** discriminated union on `citation.type` — switch statements must remain exhaustive
- **Zero dependencies:** all algorithms implemented from scratch, no npm packages

---

## Verification Plan

After all deliverables are written:

1. **Template validation:** Specs 03 and 05 (simplest) confirm the template works for cold-start agents
2. **Cross-reference check:** Each spec's "Depends on" field is consistent with the implementation order
3. **Skill dry run:** Read the skill from the perspective of an agent that has never seen the codebase — is there enough context to execute Phase 0 through Phase 6?
4. **File path verification:** All referenced source files and line numbers exist
5. **Test command verification:** Run `pnpm exec vitest run` to confirm the baseline is green
