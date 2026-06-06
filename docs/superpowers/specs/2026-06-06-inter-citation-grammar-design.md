# Inter-Citation Grammar — Design Lock

**Date:** 2026-06-06
**Status:** LOCKED (design approved; implementation sliced into issues — see §8)
**Issue:** #845 (design-lock). Implements the keystone divergence from `docs/research/2026-06-06-grammar-driven-architecture-analysis.md`.
**Decision owner:** maintainer (forks locked via brainstorming session 2026-06-06).
**Snapshot note:** Function/symbol names are stable anchors; avoid line numbers (they drift). Re-verify against source before implementing.

---

## 1. Problem

eyecite-ts contains an unnamed **inter-citation grammar**: the recursive, tree-shaped relationships *between* citations — parallel-citation groups, subsequent-history chains, citations nested inside `(quoting …)` parentheticals, string-citation groups, and short-form→antecedent references. Today these live only as ~18 imperative post-processing passes over a flat `Citation[]`, wired by **positional array indices** and **string join-keys**. The indices break under consumer `filter`/`sort`/`map`; the recursion is flattened (and, for nested-citation parentheticals, lost entirely).

This spec locks the target model: name these structures as real aggregates referenced by **stable identity**, built in defined pipeline stages, with the existing flat fields **kept and eagerly projected** for back-compat.

## 2. Locked decisions (the three forks)

1. **Identity** — add a branded surrogate `CitationId` on `CitationBase`; aggregates reference members by id, never by array position. Hybrid model: surrogate id for intra-result links, the existing `contentHash` durable locator for cross-run identity, `groupId` retained as the content-derived parallel-group *label*. (Rationale: a `Citation` is a Value Object — no intrinsic domain identity — so it needs an opaque local handle; positional index and content-hash-as-primary-key were both rejected. Matches Roslyn `SyntaxAnnotation` / CSL `id` / Python-eyecite content-linkage prior art.)
2. **Back-compat** — additive eager projection. The tree is the internal source of truth; every existing flat field stays, eagerly computed from the tree as plain serializable data. No breaking changes now; deprecate redundant flat fields in a later major.
3. **Scope** — everything: all five flattenings (parallel, history, recursive parenthetical for full-case **and** short-form, string-cite).

## 3. Identity foundation

```ts
// src/types/citation.ts (or src/types/brand.ts, re-exported)
export type Brand<T, B extends string> = T & { readonly __brand: B }   // first branded type in the repo
export type CitationId = Brand<string, "CitationId">

export interface CitationBase {
  /** Stable identity WITHIN one extractCitations() result set. Survives consumer
   *  filter/sort/map. Plain serializable string. NOT durable across runs — use
   *  toDurableLocator() for cross-run identity. Opaque: compare/key/store, never parse. */
  id: CitationId
  // …existing fields unchanged
}
```

- **Generation:** monotonic counter `c0`, `c1`, … in document order.
- **Assignment point:** a single pass `assignCitationIds(citations)` in `extractCitations`, run **after** `applyFalsePositiveFilters` and **before** `resolveCitations`. This is mandatory: the orchestrator re-sorts and *synthesizes new* citations after per-type `finalize` (`detectBareSectionLists`, `detectBarePartyBackReferences`, etc.) and filters last — so finalize-time assignment would be incomplete and any position-derived scheme would be stale.
- **Determinism:** document order is a pure function of input (no `Date.now`/`Math.random`). Same text → same `c0…cN`.
- **Equality:** `id` is excluded from "same citation" value-equality (like `processTimeMs`). Document this; optionally provide `sameCitation(a, b)`.
- **Helper:** export `byId(citations): Map<CitationId, Citation>` from the core entry point for dereferencing.

## 4. The four aggregate shapes

Canonical = new tree structure (source of truth). Every existing flat field is KEPT and eagerly projected (§6).

### 4a. ParallelGroup — one case, N reporters
```ts
export interface ParallelGroup { memberIds: CitationId[] }   // all members of the group, document order, including self

// FullCaseCitation:
parallelGroup?: ParallelGroup    // NEW canonical — full siblings reachable via byId (no lossy copies)
groupId?: string                 // KEPT — content-derived label, unchanged
parallelCitations?: Array<{ volume: number | string; reporter: string; page: number }>  // KEPT, projected
```

### 4b. HistoryChain — A —affirmed→ B —cert_denied→ C
```ts
export interface HistoryLink { citationId: CitationId; signal?: HistorySignal }  // signal led TO this case; undefined at root
export interface HistoryChain { links: HistoryLink[] }                            // ordered root → latest

// FullCaseCitation:
historyChain?: HistoryChain                                            // NEW canonical
subsequentHistoryOf?: { priorId: CitationId; index: number; signal: HistorySignal }  // priorId NEW; index KEPT (deprecated)
subsequentHistoryEntries?: SubsequentHistoryEntry[]                    // KEPT, unchanged
```

### 4c. recursive Parenthetical — `(quoting Doe v. City, 100 F.2d 1)`
```ts
export interface Parenthetical {
  text: string                  // KEPT — raw inner text
  type: ParentheticalType       // KEPT
  span?: Span                   // KEPT
  citations?: Citation[]        // NEW — nested child citations (recursive), each with its own id
}

// short-form (IdCitation / SupraCitation / ShortFormCaseCitation):
parenthetical?: string          // KEPT — flat text
parentheticalNode?: Parenthetical  // NEW — structured, may carry nested citations
```

**Top-level exclusion (approved):** nested child citations live as tree children with ids and are **excluded from the top-level resolvable `Citation[]`**. They are not extracted at all today, so this is additive to the top-level array (no count change). This exclusion structurally prevents the *class* of parenthetical-child confusion exemplified by #830 (`Id.` mis-binding to a quoting-child) and #831 (dropped Slip Op orphaning its quoting-child) — both already fixed tactically (#841, #842); the slice should confirm it subsumes those fixes without regressing them. The resolver no longer sees paren-children as candidates. Children remain reachable for `in-parenthetical-of` graph edges.

### 4d. StringCitationGroup — `See A; B; C`
```ts
export interface StringCitationGroup { memberIds: CitationId[]; signal?: CitationSignal }  // memberIds: all members, document order, including self

// CitationBase:
stringCitationGroup?: StringCitationGroup   // NEW canonical
stringCitationGroupId?: string              // KEPT, projected
stringCitationIndex?: number                // KEPT, projected
stringCitationGroupSize?: number            // KEPT, projected
```

## 5. Build location (pipeline placement)

- **Per-citation parenthetical tree** (incl. nested children, §4c): stop flattening the existing `CaseParentheticalChain` at `interpretCaseCitationPostfix`. Carry the structured `ExplanatoryParentheticalNode` / `MetadataParentheticalNode` / `HistorySignalNode` (which already exist and are currently discarded) through draft → finalize, and **recursively run extraction** on explanatory-paren inner text to populate `Parenthetical.citations`. Apply the same to the short-form `parenthetical` field.
- **Identity:** `assignCitationIds` — orchestrator, after `applyFalsePositiveFilters`, before `resolveCitations`.
- **Cross-citation structures** (parallel, history, string-cite): one consolidated **structuring pass** after id assignment, replacing the scattered mutation passes (`detectParallel` + `inheritParallelCaseName`, `linkSubsequentHistory` + `inheritSubsequentHistoryCaseName`, `detectStringCitations`). All reference by id. The fixed-point caption-inheritance loop (`inheritSubsequentHistoryCaseName`'s `while (mutated)`) is removed — chain traversal by id is order-independent.
- **Short-form → antecedent:** stays in `DocumentResolver`; `resolvedTo` / `antecedentIndex` / `pinciteInheritedFrom` migrate from positional `number` to `CitationId` (dual-emit during migration — keep the numeric field, add the id field).

## 6. Back-compat: additive eager projection

| Flat field (KEPT, plain serializable data) | Projected from |
|---|---|
| `groupId`, `parallelCitations` | `parallelGroup.memberIds` |
| `subsequentHistoryEntries`, `subsequentHistoryOf.index` | `historyChain` (`priorId` added alongside `index`) |
| `Parenthetical.text` / `type`, short-form `parenthetical` | the `Parenthetical` node (`citations` added) |
| `stringCitationGroupId` / `stringCitationIndex` / `stringCitationGroupSize` | `stringCitationGroup` |

Tree is the internal source of truth; flat fields are eagerly computed (not getters — getters would not survive `JSON.stringify` / spread / `structuredClone`, which consumers rely on). Zero breaking changes. A later major may deprecate the redundant flat fields and migrate positional refs (`subsequentHistoryOf.index`, `resolvedTo`, `antecedentIndex`, `pinciteInheritedFrom`, graph `Edge.from/to`, `QuoteAttribution.citationIndex`, `AnalyzedFootnoteZone.citationIndices`) fully to `CitationId`.

## 7. Why this is "the grammar"

Names the inter-citation grammar from the analysis:
```
CitationGroup ← StringCitation / ParallelGroup / HistoryChain
Parenthetical ← '(' SignalWord Citation ')'      // now genuinely recursive
```
The ~18 mutation passes collapse into one structuring pass + per-citation tree construction; all cross-references become id-based (Vernon Aggregate Rule 3: reference other aggregates by identity).

## 8. Migration → implementation slices

Additive throughout; each slice keeps the full test suite green and adds dedicated tests including **"links survive `filter`/`reorder`."**

1. **Foundation (NEW slice) — `CitationId`.** `Brand` + `CitationId` + `assignCitationIds` (orchestrator, after filter, before resolve) + `byId` helper + additive migration of positional refs (add id-based fields alongside the numeric ones; dual-emit). **Blocks all others.**
2. **#849 HistoryChain** — §4b. Replace `linkSubsequentHistory` + fixed-point caption loop; `historyChain` canonical; `subsequentHistoryOf.priorId` added; flat fields projected. Blocked by foundation.
3. **#850 ParallelGroup** — §4a. Replace `groupId`/`parallelCitations` build with `parallelGroup` canonical; flat fields projected; `inheritParallelCaseName` reduced to group construction. Blocked by foundation.
4. **#851 recursive Parenthetical** — §4c, covering **both** full-case `parentheticals[]` **and** short-form `parentheticalNode`. Parse nested child citations; exclude from top-level array. (#830/#831 are already fixed tactically via #841/#842 — add their repro inputs as regression tests and confirm this structural model subsumes them.) Blocked by foundation.
5. **StringCitationGroup (NEW slice)** — §4d. `stringCitationGroup` canonical; flat triplet projected. Blocked by foundation.

(#845 is satisfied by this spec; close it once the spec lands and the foundation slice is filed.)

## 9. Open / deferred (not in scope here)

- Full removal of the positional fields and the `Edge`/`QuoteAttribution`/`AnalyzedFootnoteZone` migration to `CitationId` — deferred to a future major (this spec only adds id-based fields alongside).
- `sameCitation(a, b)` value-equality helper — optional, file if consumers ask.
- Whether `historyChain` / `parallelGroup` / `stringCitationGroup` should also be surfaced as sidecar collections on the result (vs attached per-member) — current decision is attached per-member (eager projection); revisit only if duplication cost becomes a measured problem.
