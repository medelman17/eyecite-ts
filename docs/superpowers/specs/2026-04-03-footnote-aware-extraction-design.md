# Footnote-Aware Citation Extraction

**Date:** 2026-04-03
**Issue:** #79
**Status:** Design approved

## Summary

Add footnote zone detection to eyecite-ts so citations can be annotated with whether they appear in a footnote and which footnote number. Includes a standalone `detectFootnotes()` function, per-citation metadata, and functional `"footnote"` scope strategy for resolution.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Input formats | HTML + plain text | `extractCitations` accepts both today; we support what users submit |
| Opt-in vs default | Opt-in (`detectFootnotes: true`) | Plain-text heuristics carry false-positive risk; zero impact on existing consumers |
| Citation metadata | `inFootnote?: boolean` + `footnoteNumber?: number` on `CitationBase` | Cheap to extract, useful for grouping |
| FootnoteMap export | Standalone `detectFootnotes()` + returned via structured type | Consumers may want zone layout independent of citation extraction |
| API surface | Export from main `eyecite-ts` entry point, no new entry point | Follows existing library conventions |
| Detection architecture | Pre-clean HTML scan + post-clean text heuristics (Approach A) | Best accuracy for HTML; clean fallback for plain text; no changes to cleaner internals |
| Scope strategy | Make `"footnote"` functional in this work | Natural complement to detection; type already exists |

## Data Types

### FootnoteZone

```typescript
/** A detected footnote zone in the text */
interface FootnoteZone {
  /** Start position in input-text coordinates */
  start: number
  /** End position in input-text coordinates */
  end: number
  /** Footnote number (1, 2, 3...) */
  footnoteNumber: number
}
```

### FootnoteMap

```typescript
/** Result of footnote detection — sorted by start position */
type FootnoteMap = FootnoteZone[]
```

### CitationBase additions

```typescript
interface CitationBase {
  // ... existing fields ...

  /** Whether this citation appears in a footnote (only when detectFootnotes enabled) */
  inFootnote?: boolean

  /** Footnote number, if applicable (only when detectFootnotes enabled) */
  footnoteNumber?: number
}
```

Fields are `undefined` when `detectFootnotes` is not enabled. No breaking change.

## Public API

### Standalone function

```typescript
/** Detect footnote zones in raw text (HTML or plain text) */
function detectFootnotes(text: string): FootnoteMap
```

Exported from `eyecite-ts` (`src/index.ts`). Takes raw input, returns zones in the input's coordinate space. Internally selects HTML or plain-text strategy.

### ExtractOptions addition

```typescript
interface ExtractOptions {
  // ... existing fields ...

  /** Detect footnote zones and annotate citations (default: false) */
  detectFootnotes?: boolean
}
```

## Detection Strategies

### Strategy selection

Check if raw input contains any HTML tag (`/<[^>]+>/`). If yes, try HTML detection first. Fall back to plain-text if HTML detection yields zero zones.

### HTML detection (pre-clean)

Runs on raw input before `stripHtmlTags`. Uses a simple state-machine HTML parser (no DOM — zero runtime dependencies).

Scans for footnote-bearing elements:
- `<footnote>` / `<fn>` elements (CourtListener format)
- `<sup>` elements only when inside a footnote container element or at the start of a block-level element followed by substantial text (avoids false positives from ordinals/math superscripts)
- Elements with `class="footnote"` or `id="fn*"` / `id="footnote*"`
- `<aside>` or `<div>` with footnote-related class/role attributes

Walks through tags, tracks enter/exit of footnote elements, records character ranges of content inside.

### Plain-text detection (pre-clean)

Runs on raw text when no HTML footnotes were detected. Must run before cleaning because `normalizeWhitespace` collapses newlines, destroying the line-start markers these heuristics depend on. Two-pass:

1. **Find the footnote section** — look for a separator pattern (`/^\s*[-_]{5,}\s*$/m`) or a transition where numbered markers begin appearing at line starts.
2. **Parse individual footnotes** — within the footnote section, match line-start markers:
   - `/^\s*(\d+)\.\s/m` — `1. Text...`
   - `/^\s*FN\s*(\d+)[.\s]/mi` — `FN1. Text...`
   - `/^\s*\[(\d+)\]\s/m` — `[1] Text...`
   - `/^\s*n\.\s*(\d+)\s/mi` — `n.1 Text...`

Each footnote zone extends from its marker to the start of the next marker (or end of text).

## Pipeline Integration

When `detectFootnotes: true`, `extractCitations` orchestrates:

```
1. detectFootnotes(rawText)            → FootnoteMap in raw-text coords
2. cleanText(rawText, cleaners)        → { cleaned, transformationMap }
3. map FootnoteMap through originalToClean → FootnoteMap in clean-text coords
4. tokenize(cleaned, patterns)         → Token[]
5. extract(tokens, transformationMap)   → Citation[]
6. tag each citation via span lookup in clean-text FootnoteMap
7. resolve(citations, text, options)   → ResolvedCitation[]
```

**Step 3:** Each `FootnoteZone`'s `start`/`end` are translated from raw-text to clean-text coordinates using `TransformationMap.originalToClean`.

**Step 6:** Binary search the sorted `FootnoteMap` for each citation's `cleanStart`. If it falls within a zone, set `inFootnote: true` and `footnoteNumber`.

When `detectFootnotes: false` (default), steps 1, 3, and 6 are skipped entirely.

## Footnote-Aware Resolution

### Zone assignment

When `scopeStrategy: "footnote"` and a `FootnoteMap` is available, each citation gets a zone ID:
- **Body citations** — zone `0`
- **Footnote N citations** — zone `N`

This populates the existing `paragraphMap` (which functions as a general "scope map") with zone IDs.

### Resolution rules

| Short-form type | Can resolve to body? | Can resolve within same footnote? | Can resolve across footnotes? |
|----------------|---------------------|----------------------------------|------------------------------|
| Id. | Only if in body | Yes | No |
| supra | Yes (from any zone) | Yes | No |
| shortFormCase | Yes (from any zone) | Yes | No |

`supra` and `shortFormCase` can reach body antecedents from footnotes because footnotes commonly reference full citations from the body text. `Id.` is strictly scoped — it resolves only within its own zone.

### Passing FootnoteMap to resolver

`ResolutionOptions` gets:

```typescript
interface ResolutionOptions {
  // ... existing fields ...

  /** Footnote zone map for footnote-aware scoping */
  footnoteMap?: FootnoteMap
}
```

`extractCitations` passes it through when available. If `scopeStrategy: "footnote"` is set but no `footnoteMap` is provided, falls back to paragraph behavior (graceful degradation).

## Testing Strategy

### Unit tests (`tests/footnotes/`)

- **`detectFootnotes`** — HTML inputs with various tag formats, plain-text inputs with each marker style, mixed content, empty/no-footnote inputs returning `[]`
- **Coordinate mapping** — verify `FootnoteMap` zones translate correctly through `TransformationMap` after cleaning
- **Citation tagging** — citations inside/outside/straddling footnote zones get correct `inFootnote`/`footnoteNumber`
- **Scope resolution** — `Id.` constrained within footnote, supra crossing from footnote to body, `scopeStrategy: "footnote"` without a `FootnoteMap` falls back gracefully

### Integration tests (`tests/integration/`)

- Full pipeline with real legal HTML (CourtListener-style markup with `<footnote>` tags)
- Full pipeline with plain text containing a footnote section after a separator line
- Opt-in behavior — `detectFootnotes: false` produces no footnote fields, existing test suite unaffected

### Edge cases

- Nested footnotes (flatten)
- Consecutive footnotes with no body text between them
- Footnote markers in body text that aren't actual footnotes (e.g., `[1]` as a parenthetical reference)
- HTML with footnote-like classes but no actual footnote content

## Files affected

| File | Change |
|------|--------|
| `src/types/citation.ts` | Add `inFootnote?`, `footnoteNumber?` to `CitationBase` |
| `src/footnotes/detectFootnotes.ts` | New — standalone detection function |
| `src/footnotes/htmlDetector.ts` | New — HTML strategy |
| `src/footnotes/textDetector.ts` | New — plain-text heuristic strategy |
| `src/footnotes/types.ts` | New — `FootnoteZone`, `FootnoteMap` |
| `src/footnotes/index.ts` | New — barrel export |
| `src/extract/extractCitations.ts` | Wire in detection, coordinate mapping, citation tagging |
| `src/resolve/types.ts` | Add `footnoteMap?` to `ResolutionOptions` |
| `src/resolve/scopeBoundary.ts` | Implement footnote zone assignment |
| `src/resolve/DocumentResolver.ts` | Use footnote zones for `"footnote"` strategy, cross-zone rules for supra/shortFormCase |
| `src/index.ts` | Export `detectFootnotes`, `FootnoteZone`, `FootnoteMap` |
| `tests/footnotes/` | New — unit tests for detection, tagging, resolution |
| `tests/integration/` | New — full pipeline footnote tests |
