# Design: Document Understanding API (`analyzeDocument`)

**Date:** 2026-05-19
**Status:** Approved by user, ready for implementation plan
**Related research:** [`docs/research/2026-05-19-document-understanding-api.md`](../../research/2026-05-19-document-understanding-api.md)

## Background

Today, `extractCitations(text)` returns a flat `Citation[]`. Each citation carries its own metadata (`resolvedTo`, `antecedentIndex`, `groupId`, `pinciteInheritedFrom`, `stringCitationGroupId`, `subsequentHistoryOf`, etc.) — but the **relationships between citations** are scattered across these fields, and the **prose around citations** and **quotes attributed to citations** are entirely absent from the output. Consumers building document-understanding tools — quote-attribution pipelines, citation-graph UIs, summarization systems — currently have to recompute these from the raw text plus the citation array.

This design adds a single new function, `analyzeDocument(text, citations)`, that projects the existing extraction output into a `Document` view exposing three new capabilities:

1. **Prose offsets** — `Span[]` for the prose between citations + per-citation `precedingProse` / `followingProse`.
2. **Quote attribution** — every detected quoted-text zone gets attribution attempted; consumers see which citation vouches for each quote and how confidently.
3. **Citation graph** — every relationship eyecite-ts already computes is promoted into a unified typed-edge graph, so consumers can traverse without per-field knowledge.

Research (`docs/research/2026-05-19-document-understanding-api.md`) validated the scope and recommended:

- Ship as a **separate function**, not as a breaking change to `extractCitations` (matches spaCy v2, OpenAI SDK v1, semver-ts precedent).
- Typed edges with `type` discriminator — matches OpenCitations / CiTO / RDF convention and aligns with the existing `Citation` union discriminator.
- Three quote attribution kinds (block / adjacent / parenthetical), with literal `quoteText` on each entry (Anthropic Citations API pattern).
- Use `fullSpan` not `span` when computing the inverse prose complement (otherwise case names get mislabeled as prose).

## Architecture

New module `src/document/` exposes one function from the core entry point. Pure projection — reads existing fields, re-shapes; no new tokenization or extraction.

```ts
// New export from `eyecite-ts`
export function analyzeDocument(
  text: string,
  citations: Citation[],
  opts?: { transformationMap?: TransformationMap },
): Document
```

### `Document` shape

```ts
export interface Document {
  /** The citations that were analyzed. Same array passed in. */
  citations: Citation[]

  /** Prose between citations + before-first + after-last. Sorted by originalStart. */
  proseSpans: Span[]

  /** Per-citation convenience views over proseSpans. */
  precedingProse: Map<number, Span>   // citationIndex → Span ending at this cite
  followingProse: Map<number, Span>   // citationIndex → Span starting after this cite

  /** Every detected quoted-text zone with attempted attribution.
   *  Includes unattributed zones (citationIndex undefined). */
  quoteAttributions: QuoteAttribution[]

  /** All relationships between citations, as typed edges. */
  citationGraph: CitationGraph

  /** Footnote zones with their citation members. Optional — only present
   *  when input citations include footnote tagging (i.e. extractCitations
   *  was called with detectFootnotes: true). */
  footnoteZones?: FootnoteZone[]
}
```

### Module layout

```
src/document/
  index.ts              — public exports (analyzeDocument, Document, Edge union, types)
  analyzer.ts           — analyzeDocument orchestrator (composes the three modules)
  proseOffsets.ts       — computeProseSpans + precedingProse/followingProse
  quoteAttribution.ts   — attribute(quoteZones, citations) → QuoteAttribution[]
  citationGraph.ts      — buildGraph(citations) → CitationGraph
  types.ts              — Document, Edge, QuoteAttribution, FootnoteZone, AttributionKind
```

### Refactor included: extract `detectQuoteZones`

Currently a private function in `src/resolve/DocumentResolver.ts` (~line 135). The new `quoteAttribution` module needs it, so move to `src/utils/detectQuoteZones.ts` and update `DocumentResolver` to import. Same behavior; no semantic change.

### Pipeline composition

`analyzeDocument` is a **pure projection**: reads `text + citations[]`, returns a `Document`. No callback into tokenizer/extractor/resolver. This keeps it:
- Cheap — sub-millisecond per call (research §7.2, three O(N) passes for N citations).
- Decoupled — `src/extract/` and `src/document/` have no circular dependencies.
- Composable — consumers can run `extractCitations` and `analyzeDocument` independently, in sequence, or call `analyzeDocument` on a manually-curated `citations[]`.

## Citation Graph

### Edge taxonomy (typed union)

```ts
export type Edge =
  | { type: "resolves-to";         from: number; to: number; confidence: number; warnings?: string[] }
  | { type: "antecedent";          from: number; to: number }
  | { type: "parallel";            from: number; to: number; groupId: string }
  | { type: "history-of";          from: number; to: number; signal: HistorySignal }
  | { type: "pincite-inherit";     from: number; to: number }
  | { type: "string-cite";         from: number; to: number; groupId: string; position: number }
  | { type: "in-parenthetical-of"; from: number; to: number }
```

`from` and `to` are indices into `citations[]`. `type` discriminates the union — matches the existing `Citation` discriminator convention.

**Dropped from the research's proposed taxonomy:**

- `bare-party-anchor` — the research suggested this for bare-party back-references (`Smith` referring to an earlier `Smith v. Jones`). On inspection, `detectBarePartyBackReferences` (`src/extract/extractCitations.ts:951`) *creates new short-form citations* that flow through the normal resolver, so the relationship is already exposed as `resolves-to`. Adding a separate edge would duplicate information.

### Source map (no new computation)

| Edge type | Source field/algorithm | Direction |
|---|---|---|
| `resolves-to` | `citation.resolution?.resolvedTo` | short-form → terminal full cite |
| `antecedent` | `citation.resolution?.antecedentIndex` (shipped 0.20.0) | short-form → immediate predecessor (Bluebook 4.1) |
| `parallel` | `citation.groupId` siblings | each pair of group members |
| `history-of` | `citation.subsequentHistoryOf` | history-citation → primary |
| `pincite-inherit` | `citation.pinciteInheritedFrom` (shipped 0.19.0) | inheriting cite → predecessor |
| `string-cite` | `citation.stringCitationGroupId` + `stringCitationIndex` | sequence within group |
| `in-parenthetical-of` | derived from `DocumentResolver.parenDepths[]` — walk back to find the enclosing citation when current depth > 0 | nested cite → enclosing cite |

**Note on `in-parenthetical-of` computation cost.** The existing `parenDepths[]` is a private field on `DocumentResolver`. The analyzer can't access it directly. Two options:

1. **Refactor `computeParenDepths` out** to `src/utils/parenDepths.ts` (alongside `detectQuoteZones` and `citationBounds`). Single source of truth; clean separation. Adds a third pure-refactor to this PR's list.
2. **Recompute inline in the analyzer** by walking the text counting `(` and `)`. Cheap (O(text-length)), no refactor needed, but duplicates the algorithm.

Going with option 1 — three refactors of mature private helpers to shared utilities is acceptable scope, and keeps the algorithm in one place. Files Modified list updated accordingly.

Once the utility is available, the analyzer walks back from each citation with depth > 0 to find the most recent citation at a lower depth — O(N) total to emit `in-parenthetical-of` edges. This is light additional computation (not a pure projection like the other six edges), but it surfaces a relationship that's otherwise inaccessible to consumers.

### `CitationGraph` shape

```ts
export interface CitationGraph {
  /** Node = citation index. nodes.length === citations.length even for
   *  isolated nodes, so consumers iterating nodes don't miss anything. */
  nodes: number[]

  /** Authoritative source of edges. Sorted by from-index, then by type
   *  (alphabetical), then by to-index. Deterministic for test assertions. */
  edges: Edge[]
}
```

### Invariants

- **No self-edges.** A citation never edges to itself.
- **No duplicate edges of the same `type+from+to`.** Two computation paths that would emit the same edge dedupe.
- **Undirected relationships emit a single edge per pair.** Parallel group `{0, 1, 2}` emits `(0,1) (0,2) (1,2)` — three edges, not six.
- **Stable ordering** for deterministic tests and predictable consumer iteration.

### No adjacency map in v1 (YAGNI)

Consumers wanting O(1) lookup can build it at the call site with `groupBy(graph.edges, e => e.from)`. Shipping two representations of the same data invites drift. If a real use case appears, add a `src/utils/adjacency.ts` helper later.

## Quote Attribution

### `QuoteAttribution` shape

```ts
export type AttributionKind = "block-quote" | "adjacent" | "parenthetical"

export interface QuoteAttribution {
  /** The quoted-text span in original-text coordinates. */
  quoteSpan: Span

  /** Verbatim quoted text (chars between the marks, exclusive). Saves
   *  consumers from slicing — Anthropic Citations API pattern. */
  quoteText: string

  /** Citation that vouches for the quote. Undefined when no attribution
   *  could be inferred. */
  citationIndex?: number

  /** How the attribution was inferred. Undefined iff citationIndex is. */
  attributionKind?: AttributionKind

  /** Confidence (0-1). See algorithm below for the stratification. */
  confidence?: number
}
```

### Algorithm

For each quote zone `Z` from `detectQuoteZones(text)`:

```
1. classify zone:
   - block-quote: markdown blockquote (lines start with `>`)
                  OR ≥ 50 words inside the quote marks
                  OR set off as an indented block
   - else: inline

2. block-quote path:
     candidate = first citation C with
       - C.originalStart > Z.end
       - C.originalStart - Z.end < 200
       - no sentence-terminating period between Z.end and C.originalStart
     if found:
       emit { quoteSpan, quoteText, citationIndex: indexOf(C),
              attributionKind: "block-quote",
              confidence: (C.originalStart - Z.end < 50) ? 0.98 : 0.90 }

3. inline path (else branch of step 2):
     candidate = first citation C with
       - C.originalStart > Z.end
       - same sentence (no '.' between Z.end and C.originalStart)
       - C.originalStart - Z.end < 100
     if found:
       emit { ..., attributionKind: "adjacent", confidence: 0.85 }

4. parenthetical-internal override (runs independently after 2/3):
     if Z is inside an explanatory parenthetical (parenDepth > 0):
       candidate = enclosing citation
       if found:
         emit { ..., attributionKind: "parenthetical", confidence: 0.95 }
         (this entry overrides any block/adjacent attribution from steps 2/3)

5. unattributed:
     if no candidate found in any path:
       emit { quoteSpan, quoteText,
              citationIndex: undefined,
              attributionKind: undefined,
              confidence: undefined }
```

### Confidence stratification rationale

| Kind | Confidence | Why |
|---|---|---|
| block-quote, citation within 50 chars on next line | 0.98 | Bluebook Rule 5 canonical form; nearly unambiguous |
| block-quote, citation within 200 chars | 0.90 | Block quote with looser citation placement |
| adjacent inline, same sentence | 0.85 | Common pattern; lower confidence reflects looser semantics |
| parenthetical-internal | 0.95 | Syntactic structure unambiguous (enclosing cite IS the source) |
| unattributed | undefined | Consumer should not infer anything from absence |

### Why three kinds, not two

A verification pipeline needs to distinguish "Bluebook block quote that should be exact-string-matchable in the source opinion" from "casual phrase in scare quotes." The current `detectQuoteZones` lumps everything together; the attribution layer adds the categorization consumers need.

### Reuses, doesn't duplicate

The existing `detectQuoteZones` does the geometric work (find paired `"..."` / `"..."` / markdown `>`). The new `quoteAttribution` module consumes its output + the citation array. No re-detection.

### Known detection gaps (document in public API surface)

- HTML `<blockquote>` tags (stripped by the cleaner before extraction)
- Single-quote `'...'` quotes (deliberate — apostrophes generate too many false positives)
- Long-dash em-dash interpolations
- Footnoted quotations (text in one zone, citation in the footnote)

Documented limitations; not bugs.

## Prose Offsets

### Top-level `proseSpans` algorithm

Inverse complement of citations within the original text, using `fullSpan` when available:

```
proseSpans = []
cursor = 0
for c in citations sorted by citationStart(c):
  start = citationStart(c)  // fullSpan.originalStart ?? span.originalStart
  end   = citationEnd(c)    // fullSpan.originalEnd ?? span.originalEnd
  if start > cursor:
    proseSpans.push(makeSpan(cursor, start))
  cursor = max(cursor, end)
if cursor < text.length:
  proseSpans.push(makeSpan(cursor, text.length))
```

### Why `fullSpan` not `span`

`citation.span` covers only the citation core (`100 F.2d 50`). `citation.fullSpan` (on `case` + `docket` citations) covers the case name through the final parenthetical. Using `span` misclassifies case-name text as "prose," fragmenting downstream consumers.

The existing helpers in `src/extract/detectStringCites.ts:63-75` (`getCitationStart` / `getCitationEnd`) already encode this pattern. **Refactor included:** move them to `src/utils/citationBounds.ts` so both modules import.

### Per-citation views

```ts
precedingProse: Map<number, Span>   // citationIndex → Span ending at this cite
followingProse: Map<number, Span>   // citationIndex → Span starting after this cite
```

Built in O(N) after `proseSpans`. For `citations[i]`:
- `precedingProse[i]` = prose span ending at `citationStart(citations[i])`.
- `followingProse[i]` = prose span starting at `citationEnd(citations[i])`.

### Edge cases

- `precedingProse[0]` is populated when doc has prose before the first citation (title, byline). Don't drop it.
- `followingProse[n-1]` is populated when doc has prose after the last citation (signature, closing). Don't drop it.
- Adjacent citations with zero prose between them: `followingProse[i]` and `precedingProse[i+1]` are both length-0 spans. Documented; consumers can filter with `span.cleanEnd > span.cleanStart`.

### Span coordinate system

`Span` carries `cleanStart/End` + `originalStart/End` per `CLAUDE.md` §"Position Tracking". `analyzeDocument`:

- **Always populates `originalStart/End`** from citation `fullSpan`.
- **Populates `cleanStart/End` accurately when `opts.transformationMap` is provided.** Otherwise sets `cleanStart === originalStart` (best effort; correct for un-cleaned input).

Documented limitation: consumers needing accurate clean-coord prose spans must thread `transformationMap` through.

## Footnote Zones

Symmetric with prose offsets and quote attribution. When `extractCitations` was invoked with `{ detectFootnotes: true }`, citations carry `inFootnote: true` + `footnoteNumber: N`. The `FootnoteMap` already produced by `src/footnotes/` gets attached to the `Document`:

```ts
export interface FootnoteZone {
  start: number          // original-text coord
  end: number
  footnoteNumber: number
  /** Citation indices whose span falls inside this footnote. */
  citationIndices: number[]
}

// On Document:
footnoteZones?: FootnoteZone[]   // undefined when no footnote tagging present
```

Optional because `detectFootnotes` is opt-in. When the option was off, the zones aren't available and we don't fabricate them.

## Files Modified

| File | Action |
|---|---|
| `src/document/index.ts` | NEW — public exports (`analyzeDocument`, `Document`, `Edge`, `QuoteAttribution`, `FootnoteZone`, `AttributionKind`) |
| `src/document/analyzer.ts` | NEW — orchestrator |
| `src/document/proseOffsets.ts` | NEW — prose spans + per-cite views |
| `src/document/quoteAttribution.ts` | NEW — attribution algorithm |
| `src/document/citationGraph.ts` | NEW — graph builder |
| `src/document/types.ts` | NEW — type definitions |
| `src/utils/detectQuoteZones.ts` | NEW — refactored out from `DocumentResolver.ts` |
| `src/utils/citationBounds.ts` | NEW — refactored from `detectStringCites.ts` (`getCitationStart`/`getCitationEnd`) |
| `src/utils/parenDepths.ts` | NEW — refactored from `DocumentResolver.computeParenDepths` |
| `src/resolve/DocumentResolver.ts` | Modify — import `detectQuoteZones` and `computeParenDepths` from `utils/` instead of inline |
| `src/extract/detectStringCites.ts` | Modify — import `getCitationStart`/`getCitationEnd` from `utils/` instead of inline |
| `src/index.ts` | Modify — re-export `analyzeDocument` and the new types from the core entry point |
| `tests/document/analyzer.test.ts` | NEW — end-to-end Document-shape assertions |
| `tests/document/proseOffsets.test.ts` | NEW — empty/all-prose/all-cites/adjacent-cites/parallel-pair cases |
| `tests/document/quoteAttribution.test.ts` | NEW — each of 3 kinds + unattributed + parenthetical override |
| `tests/document/citationGraph.test.ts` | NEW — each of 8 edge types + invariants |
| `tests/document/randolphFixture.test.ts` | NEW — end-to-end on the Randolph passage exercising all capabilities |
| `tests/utils/detectQuoteZones.test.ts` | NEW (moved from a co-located test that lived in `tests/resolve/`) |
| `.changeset/document-understanding-api.md` | NEW — minor bump (additive feature) |

## Testing

### Coverage map

| Capability | Unit tests | Integration | End-to-end fixture |
|---|---|---|---|
| `proseSpans` + per-cite views | empty doc, prose-only, cites-only, adjacent cites, parallel pairs, with/without `transformationMap` | ✓ via `analyzer.test` | ✓ Randolph |
| `quoteAttributions` | each of 3 kinds, unattributed, parenthetical override, distance thresholds, sentence-boundary stop | ✓ | ✓ |
| `citationGraph` | each of 8 edge types, edge ordering, no self-edges, no dups, isolated nodes, undirected dedup | ✓ | ✓ |
| `footnoteZones` | with/without `detectFootnotes`, multi-cite per footnote, no-cite footnote (empty `citationIndices`) | ✓ | — (footnote-shaped fixture in separate test) |

### End-to-end Randolph fixture

The full Randolph passage from the 0.20.1 PR exercises every capability:

- **proseSpans**: walk between Leach, "In Yellen v. Kassin..." prose, the two Randolph cites, the affirmance, the Yellen short-form chain.
- **quoteAttributions**: the `"not recognized by the law as hostile..."` and `"does not establish that..."` quotes attribute to Yellen via `adjacent`.
- **citationGraph**:
  - `parallel` edges: `374 N.J. Super.` ↔ `864 A.2d`, `186 N.J. 78` ↔ `891 A.2d 1202`, `416 N.J. Super.` ↔ `3 A.3d`
  - `history-of` edge: Randolph affirmance (`186 N.J. 78`) → Randolph App. Div. (`374 N.J. Super.`)
  - `string-cite` edges: across the `;` separator

### Regression scope

`analyzeDocument` is purely additive: new function, new fields on a new `Document` type. No existing test should change.

The two refactors (moving `detectQuoteZones` and `getCitationStart/End` to `utils/`) are pure code moves with same behavior. If anything regresses on `DocumentResolver` or `detectStringCites` tests, that's evidence of an accidental semantic change, not a new bug.

## Non-Goals

- **Mutating `Citation` objects.** All new data lives on the `Document` wrapper. `Citation` field surface is unchanged.
- **Sentence segmentation, semantic classification, "what proposition does this cite support."** Stays downstream — eyecite-ts ships geometric and relational primitives only.
- **Cross-document graphs.** Single-document scope.
- **Mutation API.** Graph is read-only. Consumers wanting mutation copy edges into their own structure.
- **Async / streaming.** `analyzeDocument` is sync; fits the existing pipeline shape.
- **Adjacency-map shipment.** YAGNI. Consumers needing O(1) lookup compute it at the call site.
- **HTML `<blockquote>` quote detection, single-quote zones.** Documented limitations; future work if real consumer demand appears.
- **Backward-compatibility shim** for `extractCitations` returning `Citation[]` — we're NOT changing that. The existing API is preserved.

## Open Questions

None outstanding. Research validated the API shape, edge taxonomy, attribution algorithm, and architectural pattern against:
- spaCy v2 / OpenAI SDK v1 (additive-major-feature precedent)
- OpenCitations / CiTO (typed-edges-with-payload precedent)
- Anthropic Citations API (verbatim quote text on attribution)
- Bluebook Rule 5 (block-quote attribution canonical form)

## Migration Notes (for the eventual changeset)

- **Minor bump.** Additive feature: new function, new types, new module. No breaking changes.
- **No `extractCitations` change.** Consumers using `extractCitations(text)` continue to receive `Citation[]` unchanged.
- **Three pure refactors land in this PR**:
  - `detectQuoteZones` moves from `DocumentResolver.ts` to `src/utils/detectQuoteZones.ts`. Same export name; consumers importing it (none exist outside the resolver today) update the import path.
  - `getCitationStart` / `getCitationEnd` move from `detectStringCites.ts` to `src/utils/citationBounds.ts`. Same names; same behavior.
  - `computeParenDepths` moves from `DocumentResolver.computeParenDepths` (private method) to `src/utils/parenDepths.ts`. Same algorithm; now reusable by the analyzer.
- **New consumer surface:**
  ```ts
  import { analyzeDocument } from "eyecite-ts"
  const cites = extractCitations(text, { resolve: true })
  const doc = analyzeDocument(text, cites)
  // doc.proseSpans, doc.quoteAttributions, doc.citationGraph,
  // doc.precedingProse, doc.followingProse, doc.footnoteZones?
  ```
- **Optional `transformationMap` argument** when callers need accurate clean-coord prose spans. Without it, `cleanStart === originalStart` (best effort).
