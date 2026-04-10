# Granular Component Spans Design

**Issue:** #172 (also closes #171)
**Date:** 2026-04-10
**Status:** Approved

## Summary

Add per-component position data (`Span`) to every citation type. Currently citations only provide `span` (citation core) and `fullSpan` (case name through closing paren). This design adds a `spans` record to each citation type containing `Span` entries for every parsed component — enabling fine-grained syntax highlighting, semantic annotation, and structured overlays at the component level.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Opt-in vs always-on | **Always-on** | Simpler implementation (no conditional branches). `Span` objects are small (4 numbers). Consumers can ignore `spans` if unneeded. |
| Type design | **Per-type span interfaces** | Matches existing discriminated union pattern. TypeScript narrows `spans` type when switching on `citation.type`. Consumers get autocomplete. |
| Implementation approach | **Shared `spanFromGroup` helper** | Eliminates repeated offset arithmetic across extractors. Matches existing `resolveOriginalSpan` utility pattern. ~10 lines. |
| Signal spans | **On all types** | `CitationBase` already has `signal?: CitationSignal` for any type. Currently only case extraction populates it — extending to other types is a follow-up issue. |
| Short-form types | **No `spans`** | `id`, `supra`, `shortFormCase` have minimal structure. Base `span` is sufficient. |
| Parenthetical tracking | **`span` on `Parenthetical` + `metadataParenthetical` on `CaseComponentSpans`** | Position data stays close to the data it describes. |

## `spanFromGroup` Helper

New utility in `src/types/span.ts` alongside existing `resolveOriginalSpan`:

```typescript
/**
 * Build a Span for a regex capture group within a token.
 *
 * @param tokenCleanStart - The token's cleanStart position in the document
 * @param matchIndex - The match.index (start of full match within token text)
 * @param groupValue - The captured group string (e.g., match[1])
 * @param groupOffset - Character offset of the group start within the full match text
 * @param map - TransformationMap for clean->original resolution
 * @returns Span with both clean and original coordinates
 */
export function spanFromGroup(
  tokenCleanStart: number,
  matchIndex: number,
  groupValue: string,
  groupOffset: number,
  map: TransformationMap,
): Span {
  const cleanStart = tokenCleanStart + matchIndex + groupOffset
  const cleanEnd = cleanStart + groupValue.length
  const { originalStart, originalEnd } = resolveOriginalSpan(
    { cleanStart, cleanEnd },
    map,
  )
  return { cleanStart, cleanEnd, originalStart, originalEnd }
}
```

For components found outside the token text (case name from backward search, court/year from lookahead parentheticals), extractors already have absolute clean-text positions. Those bypass the helper and build `Span` directly via `resolveOriginalSpan`.

## Per-Type Span Interfaces

New file: `src/types/componentSpans.ts`, re-exported from `src/types/index.ts`.

### CaseComponentSpans

```typescript
export interface CaseComponentSpans {
  caseName?: Span               // "Smith v. Jones"
  plaintiff?: Span              // "Smith"
  defendant?: Span              // "Jones"
  volume?: Span                 // "500"
  reporter?: Span               // "F.2d"
  page?: Span                   // "123"
  pincite?: Span                // "125" (after comma)
  court?: Span                  // "9th Cir."
  year?: Span                   // "2020"
  signal?: Span                 // "See" / "See also"
  metadataParenthetical?: Span  // "(9th Cir. 2020)" including delimiters
}
```

### StatuteComponentSpans

```typescript
export interface StatuteComponentSpans {
  title?: Span       // "42"
  code?: Span        // "U.S.C."
  section?: Span     // "1983"
  subsection?: Span  // "(a)(1)"
  signal?: Span
}
```

### ConstitutionalComponentSpans

```typescript
export interface ConstitutionalComponentSpans {
  jurisdiction?: Span  // "U.S." / "Cal."
  article?: Span       // "art. III"
  amendment?: Span     // "amend. XIV"
  section?: Span       // "section 2"
  clause?: Span        // "cl. 1"
  signal?: Span
}
```

### JournalComponentSpans

```typescript
export interface JournalComponentSpans {
  volume?: Span   // "100"
  journal?: Span  // "Harv. L. Rev."
  page?: Span     // "1234"
  pincite?: Span  // "1240"
  year?: Span     // "2020"
  signal?: Span
}
```

### NeutralComponentSpans

```typescript
export interface NeutralComponentSpans {
  year?: Span           // "2020"
  court?: Span          // "WL" / "U.S. LEXIS"
  documentNumber?: Span // "123456"
  signal?: Span
}
```

### PublicLawComponentSpans

```typescript
export interface PublicLawComponentSpans {
  congress?: Span   // "116"
  lawNumber?: Span  // "283"
  signal?: Span
}
```

### FederalRegisterComponentSpans

```typescript
export interface FederalRegisterComponentSpans {
  volume?: Span  // "85"
  page?: Span    // "12345"
  year?: Span    // "2021"
  signal?: Span
}
```

### StatutesAtLargeComponentSpans

```typescript
export interface StatutesAtLargeComponentSpans {
  volume?: Span
  page?: Span
  year?: Span
  signal?: Span
}
```

## Citation Interface Changes

Each citation type gains a `spans?` field typed to its component spans interface:

```typescript
interface FullCaseCitation extends CitationBase {
  // ... existing fields unchanged ...
  spans?: CaseComponentSpans
}

interface StatuteCitation extends CitationBase {
  // ... existing fields unchanged ...
  spans?: StatuteComponentSpans
}

// Same pattern for all 8 full citation types
```

Short-form types (`IdCitation`, `SupraCitation`, `ShortFormCaseCitation`) do **not** get `spans`.

## Parenthetical Span Tracking

The existing `Parenthetical` interface gains a `span` field:

```typescript
export interface Parenthetical {
  text: string
  type: ParentheticalType
  span?: Span  // NEW — position of full paren block including delimiters
}
```

`collectParentheticals` already tracks `start`/`end` for each `RawParenthetical`. The implementation threads these positions through to the output `Parenthetical` objects via `resolveOriginalSpan`.

The metadata parenthetical (containing court/year) is tracked via `CaseComponentSpans.metadataParenthetical`. The `court` and `year` spans within `CaseComponentSpans` give sub-positions inside it.

## Position Sources by Citation Type

### Case Citations (3 sources)

| Component | Source | Position Mechanism |
|-----------|--------|-------------------|
| volume, reporter, page | `VOLUME_REPORTER_PAGE_REGEX` groups | `spanFromGroup` on regex match |
| pincite | `PINCITE_REGEX` or `LOOKAHEAD_PINCITE_REGEX` | Match offset within token or lookahead text |
| caseName, plaintiff, defendant | `extractCaseName` backward search | `nameStart` + string offsets within case name |
| court, year | `parseParenthetical` on lookahead paren | Offsets relative to parenthetical start position |
| signal | `extractPartyNames` / `SIGNAL_STRIP_REGEX` | Offset from `fullSpan.cleanStart` |
| metadataParenthetical | `collectParentheticals` | `RawParenthetical.start`/`.end` |
| explanatory parentheticals | `collectParentheticals` | `RawParenthetical.start`/`.end` |

**Note:** `parseParenthetical` currently returns `{ court?, year?, date?, disposition? }` without positions. It must be extended to also return the character offsets of court and year within the parenthetical content string (e.g., `courtStart`/`courtEnd`, `yearStart`/`yearEnd`). These offsets are relative to the parenthetical content start, which is `RawParenthetical.start + 1` (past the opening paren). The extractor adds this base offset to get absolute clean-text positions, then resolves to original via `resolveOriginalSpan`.

### Statute Citations (1 source per family)

All statute families use a single regex match on the token text. Components map to capture groups. `spanFromGroup` computes offsets from group indices.

### Constitutional, Journal, Neutral, PublicLaw, FederalRegister, StatutesAtLarge

Same pattern as statutes — single regex match, groups → `spanFromGroup`.

## Subsumes #171

Issue #171 requested `signalSpan` on `CitationBase`. This design subsumes it: `signal` is a field in each type's component spans record. Close #171 when #172 ships.

**Follow-up issue:** Signal extraction is currently implemented only for case citations (in `extractPartyNames`). Other citation type extractors should be extended to detect and extract signal words. The `signal?: Span` field on their span interfaces is ready for this.

## Implementation Order

1. Add `spanFromGroup` helper to `src/types/span.ts`
2. Create `src/types/componentSpans.ts` with all span interfaces, export from `src/types/index.ts`
3. Add `span?: Span` to `Parenthetical` interface in `src/types/citation.ts`
4. Add `spans?` field to each of the 8 full citation type interfaces
5. Wire up `extractCase` (most complex — regex groups + backward search + lookahead scan)
6. Wire up statute family (5 extractors: federal, prose, abbreviated, namedCode, chapterAct)
7. Wire up constitutional, journal, neutral, publicLaw, federalRegister, statutesAtLarge
8. Close #171

## Testing Strategy

Three layers, exhaustive coverage.

### Layer 1: `spanFromGroup` Unit Tests

File: `tests/types/span.test.ts`

- Clean offset computation from token start + match index + group offset
- Original position resolution through `TransformationMap`
- Edge cases: group at start/end of match, empty groups
- HTML-cleaned text with shifted positions (clean != original)

### Layer 2: Per-Extractor Component Span Tests

One test block per extractor. Each test asserts the core invariant:

```typescript
expect(originalText.substring(span.originalStart, span.originalEnd)).toBe(expectedComponentText)
expect(cleanedText.substring(span.cleanStart, span.cleanEnd)).toBe(expectedCleanText)
```

Coverage targets:

- **Case** (~15 tests): volume, reporter, page, pincite, court, year, caseName, plaintiff, defendant, signal, metadataParenthetical. Edge cases: nominative reporter, blank page, subsequent history, multiple parentheticals, procedural prefix, signal words.
- **Statute** (~8 tests per family): title, code, section, subsection across federal/prose/abbreviated/namedCode/chapterAct. Plus et seq.
- **Constitutional** (~6 tests): jurisdiction, article, amendment, section, clause — US and state variants.
- **Journal** (~4 tests): volume, journal, page, pincite, year.
- **Neutral** (~3 tests): year, court, documentNumber.
- **PublicLaw, FederalRegister, StatutesAtLarge** (~2-3 each): volume, page, year.

### Layer 3: Integration Tests

File: `tests/integration/componentSpans.test.ts`

- Real-world paragraphs (CourtListener fixtures + synthetic) with mixed citation types
- Full pipeline: clean -> tokenize -> extract, verify spans survive position transformations
- HTML input with entity shifts — spans must point to correct original positions
- `Parenthetical.span` on explanatory parentheticals
- Signal spans when present

## Backward Compatibility

All changes are additive:
- `spans?` is optional on every citation type
- `Parenthetical.span?` is optional
- No existing fields are modified or removed
- No new required options in `ExtractOptions`
- Existing consumers see no behavioral change
