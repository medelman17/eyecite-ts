# Durable Locators for Citations

## Overview

Add a post-extraction utility that turns each extracted citation into a
**durable locator** — a portable, host-agnostic description of *where the
citation is* that survives edits to the document. Instead of a raw offset
(which breaks the moment text shifts), a locator stores the citation as a
**quote + surrounding context** in the style of the W3C Web Annotation
selectors (`TextQuoteSelector` + `TextPositionSelector`), plus a document-order
ordinal for disambiguating repeats.

eyecite already computes everything a locator needs: the exact match text, both
clean and original offsets, and (via `getSurroundingContext`) legal-aware
sentence boundaries. This feature packages that into a small, standards-shaped
data structure that any downstream resolver can consume.

**eyecite produces the locator; it does not resolve it.** Re-finding a locator
in a drifted document is a separate concern owned by the consumer. This keeps
the feature pure, zero-dependency, and free of any host or platform coupling.

### Boundary Principle

The locator is **plain, standards-based data**. Its core shape
(`{ v, space, quote, occurrence }`) is a superset of a W3C-style text-anchoring
envelope, so it drops into any compatible resolver unchanged. The additional
`position` and `contentHash` fields are additive provenance — a resolver that
only reads `quote` + `occurrence` ignores them. There is no dependency on, or
reference to, any specific external resolver.

## API: `eyecite-ts/utils`

Two functions and a type, added alongside the existing `getSurroundingContext` /
`groupByCase` / `toReporterKey` / `toBluebook` utilities.

```ts
export interface DurableLocator {
  /** Schema version. */
  v: 1
  /** Which text the offsets + quote were taken from. */
  space: "original" | "clean"
  /** W3C TextQuoteSelector — the anchor of record. */
  quote: {
    exact: string
    prefix?: string
    suffix?: string
  }
  /** W3C TextPositionSelector — offsets in `space`. Hint/audit; may drift. */
  position: { start: number; end: number }
  /** Document-order ordinal among token-bounded hits of `exact`. Omitted when
   *  the span is not a token-bounded hit (e.g. glued inside a longer word).
   *  Last-resort disambiguator for repeated short-forms (Id./supra). */
  occurrence?: number
  /** Stable FNV-1a-64 hex of exact+prefix+suffix — locator identity for
   *  dedup/equality. */
  contentHash: string
}

export interface DurableLocatorOptions {
  /** Coordinate space. Default "original": `source` MUST be the text passed to
   *  extractCitations. "clean": `source` MUST be eyecite's cleaned text
   *  (e.g. cleanText(input).text). */
  space?: "original" | "clean"
  /** Anchor the whole reference (fullSpan: case name through final
   *  parenthetical) when present, else the citation core span. Default false. */
  fullSpan?: boolean
  /** Max characters per context side after sentence-bounding. Default 32. */
  contextLength?: number
}

export function toDurableLocator(
  citation: Citation,
  source: string,
  options?: DurableLocatorOptions,
): DurableLocator

export function toDurableLocators(
  citations: Citation[],
  source: string,
  options?: DurableLocatorOptions,
): DurableLocator[]
```

`Citation` is the exported discriminated-union type (`src/types/citation.ts`).
`toDurableLocators` is a thin map over `toDurableLocator` with shared options.

## Algorithm (per citation)

1. **Select the span** from `space` + `fullSpan`:
   - `space: "original"` → `(span.originalStart, span.originalEnd)`
   - `space: "clean"` → `(span.cleanStart, span.cleanEnd)`
   - if `fullSpan: true` and the citation has a `fullSpan`, use it; otherwise the
     core `span`. (`fullSpan` only exists on case/docket citations; absence is a
     silent fall-back to the core span, never an error.)
2. **`exact = source.slice(start, end)`.**
3. **Context (sentence-bounded, then clamped):** obtain the enclosing legal
   sentence `[sentStart, sentEnd]` via eyecite's existing sentence-boundary
   detection (reusing `getSurroundingContext` / its boundary finders), then:
   - `prefix = source.slice(max(sentStart, start − contextLength), start)`
   - `suffix = source.slice(end, min(sentEnd, end + contextLength))`
   - omit a side when its slice is empty.

   Sentence-bounding makes the windows legal-aware (they never split inside
   `F.3d`, `U.S.`, `No.`, etc., because the detector knows those periods are not
   sentence boundaries); clamping to `contextLength` keeps the payload bounded.
4. **`occurrence`** = index of `start` within `tokenBoundedIndexes(source, exact)`.
   Omit when not found (the span is glued inside a longer token and is therefore
   not a standalone token-bounded hit).
5. **`contentHash`** = FNV-1a-64 hex of `nfc(exact + "\0" + prefix + "\0" + suffix)`.
   Fields are NUL-joined so `{exact:"a b"}` and `{exact:"a", prefix:"b"}` cannot
   collide. Iterates UTF-16 code units so the value is reproducible by any
   consumer with the same loop.
6. **`position`** = `{ start, end }`.

### New internal helpers

Two small, zero-dependency helpers live in `/utils` (not exported initially;
exported only if a consumer needs them):

- **`tokenBoundedIndexes(haystack, needle): number[]`** — every start index of
  `needle` in `haystack` that is not glued to a surrounding word character
  (`\w` boundaries on the word-character edges of the needle). Mirrors the
  standard W3C-resolver token-boundary semantics so ordinals line up with a
  downstream resolver.
- **`contentHash(parts): string`** — FNV-1a-64 over NFC-normalized, NUL-joined
  input; 16-char lowercase hex via `BigInt` 64-bit arithmetic.

Both are pure and dependency-free, consistent with the `/utils` boundary rules
(`context.ts` already keeps such logic local rather than importing from
`src/data` to preserve tree-shaking).

## Architecture

### Package Exports

No new entry point. The functions and the `DurableLocator` /
`DurableLocatorOptions` types are exported from the existing `eyecite-ts/utils`
entry (`src/utils/index.ts`). This matches the `/utils` charter
("post-extraction utilities for downstream consumption of extraction output")
and adds zero new build, `package.json` exports, or size-limit wiring.

### File Layout

```
src/utils/
  durableLocator.ts      # toDurableLocator, toDurableLocators
  tokenBounded.ts        # tokenBoundedIndexes
  contentHash.ts         # contentHash (FNV-1a-64)
  types.ts               # + DurableLocator, DurableLocatorOptions
  index.ts               # + re-exports
```

`durableLocator.ts` reuses the sentence-boundary logic in `context.ts`. If the
boundary finders (`findSentenceStart` / `findSentenceEnd`) need to be shared,
factor them out of `context.ts` into a small local module; do not duplicate
them.

### Dependency Rules

- No runtime dependencies (consistent with the library's zero-dependency core).
- No imports from `src/data` (preserves `/utils` tree-shaking).
- No coupling to any external resolver, host, or platform. The locator is data;
  resolution is the consumer's concern.

## Error Handling & Edge Cases

- **Empty / zero-length `exact`, or out-of-range offsets** → throw (nothing to
  anchor / offsets do not fit `source`). This range/non-empty check is universal,
  applied on every path.
- **Wrong `source` for the chosen `space`** — on the **original-space core-span**
  path only, the sliced `exact` is additionally verified against
  `citation.matchedText` (which is, by definition, the original-text substring);
  a mismatch throws with a clear message naming the likely cause (wrong `source`
  text or wrong `space`). The clean-space path and the `fullSpan` path have no
  stored equivalent to cross-check against, so they rely on the universal
  range/non-empty check above (the clean slice legitimately differs from
  `matchedText` after normalization).
- **`fullSpan: true` but no `fullSpan` present** → silent fall-back to the core
  span (documented).
- **Span not token-bounded** (glued) → omit `occurrence`; still emit the locator.
- **Citation at sentence start/end** → empty `prefix`/`suffix` omitted.
- The producer is **fail-closed in spirit**: it emits exactly what the offsets
  describe and never guesses a location.

## Testing

Belt-and-suspenders — one dedicated test per property/edge case; no reliance on
indirect coverage.

- **`tokenBoundedIndexes`**: word boundaries, surrounding punctuation,
  glued-rejection (`Id.` inside `gridId.`), overlapping needles, empty needle.
- **`contentHash`**: determinism across calls, NUL-join collision avoidance
  (`{exact:"a b"}` vs `{exact:"a", prefix:"b"}`), NFC stability
  (precomposed vs decomposed input), known-vector check.
- **Builder behavior**:
  - unique full citation (single hit → `occurrence` 0),
  - repeated `Id.` within one paragraph (`occurrence` 0 / 1 / 2),
  - sentence-clamp: window length respects `contextLength` AND does not break
    across a reporter/court abbreviation,
  - `space: "original"` vs `space: "clean"` (offsets and exact differ),
  - `fullSpan: true` uses the full reference when present and falls back to core
    span when absent,
  - empty `prefix`/`suffix` omitted at sentence boundaries,
  - `position` matches the selected span exactly.
- **Round-trip property test (key correctness invariant)**: for every emitted
  locator that has an `occurrence`,
  `tokenBoundedIndexes(source, exact)[occurrence] === position.start` — proving
  the locator re-locates its own citation. (A locator without `occurrence` is a
  glued/non-token-bounded span; the invariant does not apply.)
- **End-to-end**: `extractCitations(text)` → `toDurableLocators(citations, text)`
  → assert each locator re-locates to its citation's span.
- **Error paths**: empty span throws; mismatched `source` throws with the
  documented message.

## Backwards Compatibility

Purely additive. New exports from `eyecite-ts/utils`; no changes to existing
types, the extraction pipeline, or any current public function. Citations are
unchanged — the locator is derived on demand, not attached to results. A
changeset (minor: new public API) accompanies the work.

## Scope Exclusions

- **Resolution.** Re-finding a locator in a drifted document (the exact →
  context → occurrence ladder, fuzzy matching, ambiguity refusal) is explicitly
  out of scope. eyecite produces locators; it does not consume them.
- **`space: "clean"` re-cleaning.** The function does not run the cleaner; for
  `space: "clean"` the caller passes already-cleaned text. (Re-cleaning would
  require importing the cleaner and break `/utils` tree-shaking.)
- **HTML/DOM coordinate spaces.** Only `original` and `clean` plain-text spaces
  are supported. Rendered-HTML/DOM anchoring is a consumer concern.
- **Attaching locators during extraction.** No `ExtractOptions` flag; locators
  are an explicit post-extraction step.
- **`sourceDigest` / `nodeId`.** The W3C envelope's optional document-hash and
  node-id provenance fields are not emitted; `contentHash` (quote identity)
  covers the dedup/equality need.
