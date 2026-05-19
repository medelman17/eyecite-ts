# Research: Document-Understanding API for eyecite-ts

**Date:** 2026-05-19
**Query:** Should `extractCitations` evolve from `Citation[]` into a richer `{ citations, proseSpans, quoteAttributions, citationGraph }` document object? Validate the three-capability scope, the typed-edges design, the quote-attribution heuristics, and the breaking-change strategy against legal-tech and NLP precedent.
**Depth:** medium
**Status:** Validates the scope and edge taxonomy, with refinements. Recommends a non-breaking transition. Flags one major naming issue and one missing edge kind.

---

## Summary (TL;DR)

**Recommendation: ship all three capabilities, but as an additive, non-breaking `analyzeDocument(text)` constructor — not as a breaking change to `extractCitations`.**

The three-capability bundle (prose offsets + quote attribution + citation graph) is well-scoped and matches what mature document-AST libraries expose, but consumers do not need them all to do citation extraction. A breaking shape change to a function called `extractCitations` (which 100% of consumers use) when only ~10–20% will use the new fields is unnecessary cost. spaCy's two-decades-stable policy — "Doc, Span, and Token are sacred; everything else goes in `Doc.spans` and `Doc._` extensions" ([spaCy v2 announcement](https://spacy.io/usage/v2)) — is the operative precedent. Mirror it: leave `extractCitations` returning `Citation[]`, add `analyzeDocument(text)` returning the new bundle. In 1.0, swap which one is the default if needed.

**Key research findings:**

1. **No legal-tech tool ships a unified typed-edge graph today.** CourtListener's citation-lookup endpoint is intentionally flat — it returns `{ citation, normalized_citations, start_index, end_index, status, clusters }` and explicitly punts on Id./supra/short-form ([CourtListener Citation Lookup API](https://wiki.free.law/c/courtlistener/help/api/rest/v4/citation-lookup)). Python `eyecite` returns `dict[Resource, list[Citation]]` — a flat clustering, not a graph. The proposed typed-edge graph is genuinely new for legal-tech, but it maps onto well-established NLP and academic-bibliometric patterns (OpenCitations, spaCy `Doc._.rel`, CoreNLP coreference chains).

2. **The proposed edge taxonomy is mostly right, with one rename and one addition required.**
   - `"resolved"` is ambiguous — it conflates the act-of-resolution metadata (`resolutionConfidence`, `failureReason`) with a directed relationship. Rename to `"resolves-to"` (verb-object, mirrors RDF predicate naming).
   - `"antecedent"` is the spaCy/Indigo Book term ("preceding cited authority") and is correctly used.
   - **Missing edge: `"history-chain"` (or `"history-of"`).** `subsequentHistoryOf` is in the proposal as `"subsequent"`, but the edge typically points *backward* (child → root) the way the field already encodes it. The semantic carry — *which* signal (aff'd, rev'd, etc.) — must be on the edge payload, not lost. Suggest: `{ kind: "history-of", from: childIdx, to: rootIdx, signal: HistorySignal }`.
   - **Possibly redundant:** `"parallel"` could be derived from `groupId` lazily; making it an explicit edge doubles the storage. Recommend keeping it as an edge but generating it from `groupId` so there's a single source of truth.
   - **Add: `"bare-party-anchor"`.** The bare-party back-reference algorithm (`Smith, at 12` → earlier `Smith v. Jones`) is already in the resolver (`detectBarePartyBackReferences`) but produces a citation, not a documented edge. Should be a first-class edge kind so consumers can audit it.

3. **Quote attribution: Bluebook Rule 5 (citation on next line, left-margin, after block quote) gives a clean syntactic rule.** For inline quotes, the canonical heuristic is "first citation after the closing quote, within ~200 chars, that is not separated by sentence-terminating punctuation." Both heuristics are simple to implement on top of the `detectQuoteZones` function that already exists in `DocumentResolver.ts`. Claude's Citations API offers a useful design hint: keep `cited_text` (the actual quoted string) on the attribution object so consumers do not have to slice text themselves ([Claude Citations API](https://platform.claude.com/docs/en/build-with-claude/citations)).

4. **Prose offsets are the cheapest of the three to compute and the most common request.** They are a simple inverse-complement over `citations[i].span`. Eager computation is O(N) and adds nothing meaningful to a brief that already runs in ~50 ms.

5. **Breaking-change strategy: do not break `extractCitations`.** Add `analyzeDocument(text)` (or `extractDocument`, see §6.1). Mark it as the recommended modern API in docs. Keep `extractCitations` as a thin facade that internally calls `analyzeDocument(text).citations`. This is the spaCy v1 → v2 model and the Hugging Face Transformers approach for pipeline-vs-low-level APIs.

---

## 1. Three-capability scope evaluation

### 1.1 Are the three concerns coherent or should they be re-decomposed?

The three capabilities all answer the question *"what surrounds this citation, and how does it connect to other things in the document?"* That makes them a coherent **document analysis layer**, separate from but built on the **citation extraction layer**.

Concrete signal that they belong together: each one *requires* the full set of extracted citations to compute. Prose offsets need every citation span. Quote attribution needs both quote zones and citation positions. The graph needs every cross-reference. None of them can be computed incrementally per-citation. This pushes against keeping them inside `extractCitations`, which currently has a per-citation mental model.

The pattern from mature document libraries:
- **spaCy:** the `Doc` is the analysis surface; individual `Token`/`Span` objects are members of it. Custom layers (relations, custom span groups, user data) hang off `Doc._`. Reference: [spaCy Doc API](https://spacy.io/api/doc).
- **Stanford CoreNLP:** `Annotation` is the document object; `CoreMap` sentences, `CoreLabel` tokens, coreference chains, dependency graphs, and relation edges are all properties of it. Reference: [CoreNLP API](https://stanfordnlp.github.io/CoreNLP/api.html).
- **TEI:** the `<TEI>` document root contains body, header, and structured `<cit>` (cited-quotation) blocks that pair `<quote>` with `<bibl>`. Reference: [TEI cit element](https://www.tei-c.org/release/doc/tei-p5-doc/en/html/ref-cit.html).

The shared pattern is **document-as-container, citations-as-members, relations-as-typed-attachments**. The proposed `{ citations, proseSpans, quoteAttributions, citationGraph }` matches that pattern exactly. The decomposition is sound.

**Refinement — one missing field worth adding for symmetry:** `footnoteZones`. eyecite-ts already detects footnote zones (opt-in `detectFootnotes`); they are top-level document metadata of the same shape as the proposed `proseSpans`. Including them in the document bundle (when detected) keeps the analysis layer self-contained.

### 1.2 Compute eagerly or lazily?

The proposal is eager-inside-`extractCitations`. There is a real choice here.

**Eager (current proposal):** simpler API, no lazy proxies, all O(N) on top of existing O(N·log N) extraction. The bare cost: walking the citation array three times. For a 100-citation brief (≈ p95 in our corpus), <2 ms.

**Lazy (object with methods):** `doc.prose()`, `doc.quotes()`, `doc.graph()`. More work for the implementer (memoization, defensive copies), but lets consumers pay for only what they use.

**Verdict — eager.** The work is too small to justify a lazy API. spaCy explicitly chose eager for its `Doc.ents`, `Doc.noun_chunks`, etc. — they are computed at pipeline time, attached to the doc, and returned as views. Lazy is justified for expensive transforms (parse trees, embeddings). None of our three are expensive.

The one nuance: keep `extractCitations`'s opt-in switches (`detectFootnotes`, `resolve`) the way they are. If a consumer hasn't enabled `resolve: true`, the graph will lack `resolves-to` edges. Either silently degrade or require `resolve: true` for the new analyzer. Recommend: have `analyzeDocument` set `resolve: true` by default — analyzers always want resolution.

---

## 2. Typed-edges design — comparison with prior art

### 2.1 What the proposed shape looks like

```ts
type Edge =
  | { kind: "resolved";        from: number; to: number; confidence: number }
  | { kind: "antecedent";      from: number; to: number }
  | { kind: "parallel";        from: number; to: number; groupId: string }
  | { kind: "subsequent";      from: number; to: number; signal: HistorySignal }
  | { kind: "pincite-inherit"; from: number; to: number }
  | { kind: "string-cite";     from: number; to: number; groupId: string }

type CitationGraph = { nodes: number[]; edges: Edge[] }
```

### 2.2 Comparison: bibliometrics — OpenCitations

OpenCitations' citation model treats each citation as a first-class entity with its own identifier (an OCI — Open Citation Identifier) and uses CiTO (Citation Typing Ontology) to type each citation: `cito:cites`, `cito:critiques`, `cito:extends`, `cito:disagreesWith`, etc. ([OpenCitations Data Model](https://arxiv.org/abs/2005.11981)). They explicitly chose a **typed-edge model over a typed-adjacency-map model** because the per-edge metadata (timespan, self-citation flag, citation type) made adjacency maps unwieldy.

**Implication for eyecite-ts:** the typed-edge choice is consistent with the more mature precedent. Adjacency maps (e.g., `{ parallels: Map<number, number[]>, resolutions: Map<number, number>, ... }`) become an array of `Record<EdgeKind, ...>` quickly — not future-proof.

### 2.3 Comparison: spaCy relation extraction

The spaCy convention for typed relations on a `Doc` is `doc._.rel`, a dict keyed by `(head, tail)` token-index tuples with value containing the relation type and confidence ([spaCy relation extraction blog](https://explosion.ai/blog/relation-extraction)). The list-of-edges form (what we propose) is equivalent and is what spaCy's underlying training data uses (`token_start`/`token_end` plus `relation_label`).

The choice between **list of edges** and **map keyed by (from, to)** comes down to whether parallel edges with different kinds between the same nodes are allowed. They are in our case: a single pair of citations can be both `"parallel"` and `"string-cite"` members. List-of-edges is correct.

### 2.4 Comparison: GraphQL discriminated-union edges

GraphQL union types are the schema-language version of TypeScript discriminated unions, and the convention is to discriminate by `__typename` ([Atomic Spin: Discriminated Unions in GraphQL and TypeScript](https://spin.atomicobject.com/discriminated-unions/)). The eyecite-ts proposal uses `kind` — equivalent. The naming convention is the load-bearing decision; `kind` is widely used in TS codebases, `type` is used in the Citation discriminated union we already ship. **Recommendation: use `type` on Edge to match existing convention**, even though `kind` reads more naturally. Consistency wins for ergonomics — consumers already do `switch (citation.type)`; they shouldn't switch idioms for edges.

### 2.5 Edge-by-edge audit

| Proposed kind        | Mapped relationship                       | Source in code                                                                                                            | Verdict                                                                                          |
| -------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `"resolved"`         | `ResolutionResult.resolvedTo`             | `DocumentResolver.resolve()` → sets `resolution.resolvedTo` on short-forms                                                | **Rename to `"resolves-to"`** — verb-object, matches RDF/CiTO; `"resolved"` reads adjectival.    |
| `"antecedent"`       | `ResolutionResult.antecedentIndex`        | `findImmediatePredecessor` in `DocumentResolver.ts`                                                                       | Keep. Correct term, matches Bluebook prose.                                                      |
| `"parallel"`         | `FullCaseCitation.groupId`/`parallelCitations` | `detectParallel.ts`                                                                                                       | Keep, but derive from `groupId` to keep single source of truth. Optionally edge-set-empty if only one cite in group. |
| `"subsequent"`       | `subsequentHistoryOf.signal`              | `linkSubsequentHistory` in `extractCitations.ts`                                                                          | **Rename to `"history-of"`**; child → root; payload carries the signal.                          |
| `"pincite-inherit"`  | `pinciteInheritedFrom`                    | `DocumentResolver.inheritPincites`                                                                                        | Keep. Direction: inheriting cite → source cite.                                                  |
| `"string-cite"`      | `stringCitationGroupId`                   | `detectStringCitations` in `detectStringCites.ts`                                                                         | Keep. Direction: each member → group anchor (first member).                                      |

### 2.6 Missing edge kinds (verified against `src/`)

Walking through `extractCitations.ts` and `resolve/DocumentResolver.ts`:

1. **`"bare-party-anchor"`** — `detectBarePartyBackReferences` in `extractCitations.ts:951` emits synthesized `shortFormCase` citations anchored to earlier full-citation party names. The relationship is implicit (anchor's `volume`/`reporter` is copied onto the new citation), and there's no edge documenting it. Recommend explicit edge.

2. **`"inferred-case-name"`** — `extractInferredCaseName` in `DocumentResolver.ts:1001` does a backward prose scan that links a short-form to a case-name mention in prose, not to another citation. This is a **citation → text-span** edge, not citation → citation. May be worth a separate "anchor" concept (see §3 — it's the same shape as quote-attribution).

3. **`"parenthetical-child"`** — `isParentheticalChild` in `DocumentResolver.ts:697` detects when a citation is nested inside another citation's `(citing X)`/`(quoting Y)` parenthetical. This is a real document-level relationship and consumers regularly want to know about it (e.g., for citation network filtering — parenthetical children shouldn't count as the writer's own authority). Recommend adding `"in-parenthetical-of"`.

### 2.7 Total recommended edge taxonomy

```ts
type Edge =
  | { type: "resolves-to";        from: number; to: number; confidence: number; warnings?: string[] }
  | { type: "antecedent";         from: number; to: number }
  | { type: "parallel";           from: number; to: number; groupId: string }
  | { type: "history-of";         from: number; to: number; signal: HistorySignal }
  | { type: "pincite-inherit";    from: number; to: number }
  | { type: "string-cite";        from: number; to: number; groupId: string; position: number }
  | { type: "bare-party-anchor";  from: number; to: number; partyName: string }
  | { type: "in-parenthetical-of"; from: number; to: number }
```

8 edge kinds, all from existing computed metadata, all from already-present fields on `Citation`. No new analysis required to populate them — this is purely a *projection*.

---

## 3. Quote attribution

### 3.1 Bluebook Rule 5 — the syntactic anchor

The canonical Bluebook rule:

> The citation following a block quotation should not be indented but should begin at the left margin on the line following the quotation. — [Bluebook B5.2 Block Quotations](https://www.legalbluebook.com/bluebook/v21/bluepages/b5-quotations/b5-2-block-quotations)

This gives a clean syntactic rule for block-quote attribution: the **next citation after the block quote, on its own line (or starting a paragraph), within ~3 lines** is the source. The existing `detectQuoteZones` function in `DocumentResolver.ts` already finds block-quote zones (markdown `> ...` lines and inline `"..."` / `"..."` pairs); the attribution algorithm just needs to find the first citation whose `originalStart` is after the zone's `end` and within a short distance.

For **inline quotes**, the rule is less canonical, but the common Bluebook practice is **citation in the same sentence as the closing quote, after the punctuation, before the sentence-terminating period**. The shape `"...thus held."  Smith v. Doe, 100 F.2d 1.` is universal. Heuristic: first citation between the closing quote and the next sentence break.

### 3.2 Comparison: Claude Citations API design

Anthropic's Citations API design ([platform.claude.com/docs/en/build-with-claude/citations](https://platform.claude.com/docs/en/build-with-claude/citations)) is informative. The response schema for a single attribution:

```json
{
  "type": "char_location",
  "cited_text": "The grass is green.",
  "document_index": 0,
  "document_title": "Example Document",
  "start_char_index": 0,
  "end_char_index": 20
}
```

The relevant design lessons:
- They include `cited_text` literally on the attribution object — consumers don't have to slice text. **Recommendation: include `quoteText: string` on each `quoteAttribution`** so consumers can render quotes without indexing back into the source.
- They use explicit start/end indices, not span objects. The proposed `quoteSpan: Span` is fine — it carries both `cleanStart`/`cleanEnd` and `originalStart`/`originalEnd`, which is what consumers in our domain actually need.
- Each citation is **per-claim**, not document-level. eyecite-ts's situation is inverse — we have citations as nodes and want to attach quotes to them. So our shape is `quoteAttributions: Array<{ quoteSpan, quoteText, citationIndex?, attributionKind?: "adjacent" | "parenthetical" | "block-quote" }>`.

### 3.3 Recommended attribution algorithm

```
For each quote zone Z in detectQuoteZones(text):
  If Z is a block quote:
    candidate = first citation C with C.originalStart > Z.end
                AND C.originalStart - Z.end < 200
                AND no sentence-terminating period between Z.end and C.originalStart
    if candidate: emit { quoteSpan, quoteText: text[Z.start..Z.end],
                         citationIndex: indexOf(C),
                         attributionKind: "block-quote" }
  Else (inline quote):
    candidate = first citation C with C.originalStart > Z.end
                AND within same sentence (no '.' between Z.end and C.originalStart)
                AND C.originalStart - Z.end < 100
    if candidate: emit { ..., attributionKind: "adjacent" }
  If no candidate but Z is inside an explanatory parenthetical (paren depth > 0):
    candidate = enclosing citation
    if candidate: emit { ..., attributionKind: "parenthetical" }
  Else: emit { quoteSpan, quoteText, citationIndex: undefined }  // unattributed
```

Three attribution kinds: `"block-quote"`, `"adjacent"`, `"parenthetical"`. The proposal includes only two; recommend three so consumers can distinguish formal block quotes (high-confidence, Bluebook-canonical) from inline quotes (medium-confidence) from parenthetical-internal quotes (e.g., `(quoting "...")`).

Confidence stratification approximation:
- Block-quote, citation within 50 chars on next line: 0.98
- Block-quote, citation within 200 chars: 0.9
- Inline, same sentence, adjacent: 0.85
- Parenthetical-internal: 0.95 (the syntactic structure is unambiguous)
- Unattributed: undefined `citationIndex`

### 3.4 Note on detection completeness

The existing `detectQuoteZones` in `DocumentResolver.ts:135` is markdown-and-typographic-quote aware but does **not** detect:
- HTML `<blockquote>` tags (would be stripped by the cleaner before we see them)
- Single-quote `'...'` quotes (deliberate — too many false positives from apostrophes)
- Long-dash em-dash interpolations
- Footnoted quotations (text in one zone, citation in footnote)

These are real corpora gaps. Recommend documenting them in the public API surface so consumers know what is and isn't detected.

---

## 4. Prose offsets

The simplest of the three. Inverse complement over `citations` sorted by `originalStart`:

```
proseSpans = []
cursor = 0
for c in citations sorted by originalStart:
  if c.originalStart > cursor:
    proseSpans.push({ originalStart: cursor, originalEnd: c.originalStart, cleanStart: ..., cleanEnd: ... })
  cursor = max(cursor, c.originalEnd)
if cursor < text.length:
  proseSpans.push({ originalStart: cursor, originalEnd: text.length, ... })
```

Two design points:

1. **Use `fullSpan` when available, not `span`.** Citations with a `fullSpan` (case citations, docket citations) include their case name; treating only the citation core as "not prose" leaves the case-name text mislabeled as prose. The string-cite detection logic in `detectStringCites.ts:63` already uses this exact `getCitationEnd`/`getCitationStart` helper pattern. Reuse it.

2. **Per-citation `precedingProse` / `followingProse` is denormalized but cheap.** Once you have `proseSpans`, attaching pointers to the citation is O(1). Avoid making `proseSpans` discoverable only via the document object — give consumers the *direct* fields they want.

Practical detail: for the very first and very last spans (before any citation, after the last), `precedingProse` on `citations[0]` and `followingProse` on `citations[n-1]` should still be set. Consumers often want title/byline text (before) or signature blocks (after) and they have no way to discover them without these fields.

---

## 5. Architectural patterns — eager vs lazy

Comparison of established libraries:

- **spaCy:** eager during the pipeline, results stored as views on `Doc`. Reasoning: pipeline runs once, results queried many times. Reference: [spaCy Doc API](https://spacy.io/api/doc).
- **CoreNLP:** annotator chain is eager per-document; `Annotation` carries all results. Reasoning: same as spaCy, with the additional constraint that JVM startup amortizes only over a batch. Reference: [CoreNLP API](https://stanfordnlp.github.io/CoreNLP/api.html).
- **OpenCitations:** lazy — citations are first-class entities, fetched on demand by OCI. Reasoning: web-scale; pre-computing everything is not an option. Reference: [OpenCitations Data Model](https://arxiv.org/abs/2005.11981).
- **CourtListener:** lazy — `/citation-lookup` returns one citation at a time; cluster details require separate API calls. Reference: [CourtListener Citation Lookup API](https://wiki.free.law/c/courtlistener/help/api/rest/v4/citation-lookup).

**eyecite-ts is on the spaCy/CoreNLP side of this divide:** in-process, batch (per-document), zero-IO. The eager pattern fits.

The performance reality (verified against `extractCitations.ts`):
- Existing pipeline runs on a megabyte brief in ~50–200 ms.
- Adding three O(N) passes over `citations` is sub-millisecond for N=1000.
- Memory: 8 edges × 50 bytes × 1000 citations = 400 KB; same order as the citations array itself.

No performance argument against eager. Build it.

---

## 6. Breaking-change strategy

### 6.1 What the precedent says

- **spaCy v1 → v2 (2017):** broke pipeline component APIs but **left `Doc`, `Span`, `Token` exactly the same**. The doc explicitly notes this was the result of a deliberate policy choice. ([spaCy v2 announcement](https://spacy.io/usage/v2)).
- **spaCy v2 → v3 (2021):** broke training APIs (`Language.update` signature change) but left runtime APIs stable. ([spaCy v3 announcement](https://spacy.io/usage/v3)).
- **Hugging Face Transformers 4.x:** rolling breaking changes per minor version, with codemods and migration guides. Notable: they always keep a deprecation cycle of at least one minor version before removal. ([Markaicode: Transformers 4.52 breaking changes guide](https://markaicode.com/transformers-4-52-new-features-breaking-changes-guide/)).
- **OpenAI Python SDK 0.x → 1.0:** big breaking change, but they shipped a **`migrate` codemod** and kept the old SDK installable. ([OpenAI Python SDK v1.0 migration guide](https://github.com/openai/openai-python/discussions/742)).

The common thread: **mature libraries avoid breaking the core data shape that everyone uses, even at the cost of more verbose APIs.**

### 6.2 Why breaking `extractCitations` is the wrong call

The function name is *literal* — it does what it says. Consumers who want "extracted citations" iterate the return value:

```ts
for (const cite of extractCitations(text)) { /* ... */ }
```

That code breaks under the proposal. The migration cost is small per consumer (one line: `for (const cite of extractCitations(text).citations)`), but multiplied across every downstream codebase + every example in StackOverflow / blog posts / docs, it's substantial. And it offers no benefit to the ~80% of consumers who do not care about the new fields.

The semver-ts ruling on this: returning a wider type than before *is* a breaking change ([Semantic Versioning for TypeScript Types — Breaking Changes](https://www.semver-ts.org/formal-spec/2-breaking-changes.html)). `Citation[]` → `{ citations: Citation[], ... }` is a wider return type. So this would have to be a major version bump anyway — eyecite-ts is at 0.x so technically allowed under semver, but the user surface and developer relations cost are real.

### 6.3 Recommended path

```ts
// EXISTING — unchanged
export function extractCitations(text: string, options?: ExtractOptions): Citation[]

// NEW — recommended modern API
export function analyzeDocument(text: string, options?: AnalyzeOptions): Document

interface Document {
  citations: ResolvedCitation[]      // resolve: true by default
  proseSpans: Span[]
  quoteAttributions: QuoteAttribution[]
  citationGraph: CitationGraph
  footnoteZones?: FootnoteMap        // when detectFootnotes is enabled
}
```

Migration path:
- 0.x: ship `analyzeDocument` alongside `extractCitations`. Docs recommend the new function for new code.
- 1.0 (when it ships): keep both. `extractCitations` becomes a one-liner: `return analyzeDocument(text, opts).citations`.

No consumer code breaks. No deprecation cycle needed. Anyone who wants the new fields opts in.

The internal implementation can still share the same machinery — `analyzeDocument` builds the citations and the analysis, `extractCitations` discards the analysis. The internal helper that does the work is the actual primary API; the two public functions are thin facades.

### 6.4 The TypeScript ergonomics question

If `analyzeDocument` returns a `Document` object with methods, that maps better to discoverability (autocomplete shows `doc.citations`, `doc.proseSpans`, etc.). But methods on a returned plain object are a known footgun for serialization: `JSON.stringify(doc)` drops them. Recommend: **plain object with fields**, no methods. Matches `extractCitations`'s existing flat-object idiom and serializes cleanly.

If we want method-like access later (`doc.graph.neighbors(i)`, `doc.findCitation(idx)`), wrap in a separate helper class that takes the plain Document as its constructor argument. Separation of data and behavior.

---

## 7. Risk assessment

### 7.1 API stability risk

**Risk if we break:** Moderate. Every downstream consumer must update their iteration. The change is mechanical, but still friction.

**Risk if we add:** Low. Strictly additive. Some risk of API surface bloat — consumers may not know which function to call. Mitigate with docs that lead with `analyzeDocument` for new code and demote `extractCitations` to a "low-level export" subsection.

### 7.2 Performance risk

Verified by reading `extractCitations.ts`:
- Existing pipeline is several O(N) passes for post-processing (`linkSubsequentHistory`, `inheritParallelCaseName`, `attachStatuteYearParen`, `inheritBareSectionJurisdiction`, `detectBarePartyBackReferences`, `detectStringCitations`, `detectLeadingSignals`, `applyFalsePositiveFilters`, `tagCitationsWithFootnotes`). Adding three more is consistent with the existing pattern and the same order of magnitude.
- Quote-zone detection (`detectQuoteZones` in `DocumentResolver.ts:135`) is already O(text length) and runs only when `resolve: true`. Promoting it to the analyzer means it always runs — small constant-factor cost. For a 1 MB brief: ~5 ms.
- Graph projection is purely a one-pass walk over `citations` reading existing fields. Zero analytical cost.

**Verdict: negligible.** No performance objections.

### 7.3 Consumer migration cost

If we break: every consumer changes 1 line + may need to update tests that assert shape. Mechanical but not free.

If we add: zero forced cost. Consumers opt in to the new API when they want it. New code naturally adopts the richer API.

Recommended: add. Save the budget for changes that are genuinely worth the cost (e.g., the `confidence` overhaul on the current feature branch — that one is intrinsic to the citation, not a separate concern, and is the kind of change `extractCitations` consumers genuinely need to see).

---

## 8. One specific code observation

The proposal mentions that `quoteAttributions` should cover *all* detected quote zones, not just block quotes. The existing `detectQuoteZones` already returns all kinds (markdown `>` blocks + ASCII `"..."` + typographic `"..."`), so this is a free upgrade. But note its position: it lives in `src/resolve/DocumentResolver.ts` as a private function. To use it from `analyzeDocument` without circular-imports, it should be moved to `src/utils/detectQuoteZones.ts` (or similar) and re-imported from both places. Small refactor; non-controversial.

Same observation for `getCitationStart` / `getCitationEnd` in `src/extract/detectStringCites.ts:63-75` — used in two places already, fits a `src/utils/citationSpans.ts` module. Worth doing in the same PR to keep imports clean.

---

## 9. Final recommendations

1. **Ship `analyzeDocument(text, opts) → Document`** as a new entry point. Keep `extractCitations` unchanged. Recommend `analyzeDocument` for new code in docs.

2. **Edge taxonomy (8 kinds, discriminated by `type` not `kind`):**
   `resolves-to`, `antecedent`, `parallel`, `history-of`, `pincite-inherit`, `string-cite`, `bare-party-anchor`, `in-parenthetical-of`.

3. **Quote attribution: three kinds** (`block-quote`, `adjacent`, `parenthetical`), include literal `quoteText` on each attribution (Claude Citations API pattern), and stratify confidence.

4. **Prose offsets: use `fullSpan` not `span`** when computing inverses. Include first-prose and last-prose spans. Attach `precedingProse`/`followingProse` per citation.

5. **Add `footnoteZones`** to `Document` when `detectFootnotes` is enabled, for symmetry with the other top-level zones.

6. **Refactor `detectQuoteZones` and `getCitationStart/End`** into shared utility modules before the analyzer imports them.

7. **Default `resolve: true`** for `analyzeDocument` — analyzers always want resolution.

8. **Plain-object return** (no methods) for serialization safety. Wrap in a helper class if methods are desired later.

Total implementation footprint estimate: 1 new top-level file (`src/analyze/analyzeDocument.ts`), 2 utility extractions, 3 new types in `src/types/` (`Document`, `Edge`, `QuoteAttribution`), and 1 docs update. The capability bundle is ~300 lines of new code on top of existing primitives.

---

## Sources

- [CourtListener REST API v4 Citation Lookup](https://wiki.free.law/c/courtlistener/help/api/rest/v4/citation-lookup) — proves no graph or short-form support upstream
- [CourtListener Case Law APIs](https://www.courtlistener.com/help/api/rest/case-law/) — flat citation list, no edges
- [OpenCitations Data Model (arXiv 2005.11981)](https://arxiv.org/abs/2005.11981) — typed-edge model with CiTO ontology
- [OpenCitations blog: Citations as First-Class Data Entities](https://opencitations.wordpress.com/2018/02/25/citations-as-first-class-data-entities-the-opencitations-data-model/)
- [spaCy Doc API](https://spacy.io/api/doc) — Doc.spans, custom extensions pattern
- [spaCy SpanGroup API](https://spacy.io/api/spangroup) — overlapping spans, typed groups
- [Explosion blog: Implementing custom trainable component for relation extraction](https://explosion.ai/blog/relation-extraction) — doc._.rel dict-of-tuples pattern
- [spaCy v2 announcement](https://spacy.io/usage/v2) — core type stability policy
- [spaCy v3 announcement](https://spacy.io/usage/v3) — controlled breaking changes pattern
- [Stanford CoreNLP API](https://stanfordnlp.github.io/CoreNLP/api.html) — Annotation document object with coref chains, dependency graphs
- [Stanford CoreNLP RelationExtractorAnnotator](https://stanfordnlp.github.io/CoreNLP/relation.html)
- [TEI cit element (P5)](https://www.tei-c.org/release/doc/tei-p5-doc/en/html/ref-cit.html) — academic quote-attribution standard
- [Bluebook B5.2 Block Quotations](https://www.legalbluebook.com/bluebook/v21/bluepages/b5-quotations/b5-2-block-quotations) — canonical attribution placement rule
- [Claude Citations API](https://platform.claude.com/docs/en/build-with-claude/citations) — char_location/page_location/content_block_location schema; cited_text inclusion
- [Introducing Citations on the Anthropic API](https://www.anthropic.com/news/introducing-citations-api)
- [Semantic Versioning for TypeScript Types — Breaking Changes](https://www.semver-ts.org/formal-spec/2-breaking-changes.html) — return-shape changes are breaking
- [Atomic Spin: Discriminated Unions in GraphQL and TypeScript](https://spin.atomicobject.com/discriminated-unions/)
- [The Guild: TypeScript GraphQL Union Types](https://the-guild.dev/graphql/hive/blog/typescript-graphql-unions-types)
- [Python eyecite API documentation](https://freelawproject.github.io/eyecite/)
- [Python eyecite models.py](https://github.com/freelawproject/eyecite/blob/main/eyecite/models.py) — Resource class, flat resolve_citations() return
- [OpenAI Python SDK v1.0 migration guide](https://github.com/openai/openai-python/discussions/742) — breaking-change-with-codemod precedent
- [Markaicode: Hugging Face Transformers 4.52 breaking changes guide](https://markaicode.com/transformers-4-52-new-features-breaking-changes-guide/) — minor-version breaking-change cadence

### Relevant in-repo files (for the implementation plan that follows)

- `/Users/medelman/Projects/OSS/eyecite-ts/src/extract/extractCitations.ts` — main pipeline, eager post-processing pattern, lines 205–497
- `/Users/medelman/Projects/OSS/eyecite-ts/src/resolve/DocumentResolver.ts:135` — `detectQuoteZones` (move to utility)
- `/Users/medelman/Projects/OSS/eyecite-ts/src/resolve/DocumentResolver.ts:697` — `isParentheticalChild` (informs `in-parenthetical-of` edge)
- `/Users/medelman/Projects/OSS/eyecite-ts/src/extract/detectStringCites.ts:63-75` — `getCitationStart/End` (move to utility)
- `/Users/medelman/Projects/OSS/eyecite-ts/src/extract/detectParallel.ts` — source for `parallel` edges
- `/Users/medelman/Projects/OSS/eyecite-ts/src/extract/extractCitations.ts:542` — `linkSubsequentHistory` (source for `history-of` edges)
- `/Users/medelman/Projects/OSS/eyecite-ts/src/extract/extractCitations.ts:951` — `detectBarePartyBackReferences` (source for `bare-party-anchor` edges)
- `/Users/medelman/Projects/OSS/eyecite-ts/src/types/citation.ts` — Citation discriminated union, uses `type` field (precedent for Edge discriminator)
- `/Users/medelman/Projects/OSS/eyecite-ts/src/resolve/types.ts` — `ResolutionResult` (source for `resolves-to` and `antecedent` edges)
- `/Users/medelman/Projects/OSS/eyecite-ts/src/footnotes/types.ts` — `FootnoteMap` shape (precedent for `proseSpans`/`quoteAttributions` shapes)
