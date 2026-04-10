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
| Implementation approach | **Shared `spanFromGroupIndex` helper using `match.indices`** | Uses ES2022 `RegExp.prototype.indices` (the `d` flag) to get exact group positions. Eliminates manual offset arithmetic. 3 parameters instead of 5. Node 18+ supported. |
| Signal spans | **On all types** | `CitationBase` already has `signal?: CitationSignal` for any type. Currently only case extraction populates it — extending to other types is a follow-up issue. |
| Short-form types | **No `spans`** | `id`, `supra`, `shortFormCase` have minimal structure. Base `span` is sufficient. |
| Parenthetical tracking | **`span` on `Parenthetical` + `metadataParenthetical` on `CaseComponentSpans`** | Position data stays close to the data it describes. |

## `spanFromGroupIndex` Helper

New utility in `src/types/span.ts` alongside existing `resolveOriginalSpan`.

### Why `match.indices` (the `d` flag)

The original design required callers to manually compute `groupOffset` — the character offset of a regex group within the full match text. This is error-prone arithmetic that leaks implementation knowledge to every call site (APoSD: information leakage).

ES2022 introduced `RegExp.prototype.indices` via the `d` flag. When a regex has the `d` flag, `match.indices[n]` returns `[start, end]` for each capture group — exact positions with no manual computation. Node 18+ supports this (eyecite-ts's minimum target).

**Trade-off:** The `d` flag has a minor performance cost (the engine tracks group positions during matching). For eyecite-ts's bounded-length tokens (typically <200 chars), this is negligible. Only regex patterns that need span computation require the `d` flag.

### Signature

```typescript
/**
 * Build a Span for a regex capture group using match.indices.
 *
 * Requires the regex to have the `d` flag (ES2022 hasIndices).
 * The indices are relative to the token text — tokenCleanStart
 * translates them to document-level positions.
 *
 * @param tokenCleanStart - The token's cleanStart position in the document
 * @param indices - match.indices[n] for the capture group: [start, end]
 * @param map - TransformationMap for clean->original resolution
 * @returns Span with both clean and original coordinates
 */
export function spanFromGroupIndex(
  tokenCleanStart: number,
  indices: [number, number],
  map: TransformationMap,
): Span {
  const cleanStart = tokenCleanStart + indices[0]
  const cleanEnd = tokenCleanStart + indices[1]
  const { originalStart, originalEnd } = resolveOriginalSpan(
    { cleanStart, cleanEnd },
    map,
  )
  return { cleanStart, cleanEnd, originalStart, originalEnd }
}
```

### Usage Pattern

```typescript
// Add `d` flag to regex patterns that need component spans
const VOLUME_REPORTER_PAGE_REGEX =
  /^(\d+(?:-\d+)?)\s+([A-Za-z0-9.\s']+)\s+(\d+|_{3,}|-{3,})/d

const match = VOLUME_REPORTER_PAGE_REGEX.exec(text)
if (match?.indices) {
  spans.volume = spanFromGroupIndex(span.cleanStart, match.indices[1], map)
  spans.reporter = spanFromGroupIndex(span.cleanStart, match.indices[2], map)
  spans.page = spanFromGroupIndex(span.cleanStart, match.indices[3], map)
}
```

### Fallback for Non-Regex Positions

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
  court?: Span                  // "9th Cir." — sub-range within metadataParenthetical
  year?: Span                   // "2020" — sub-range within metadataParenthetical
  signal?: Span                 // "See" / "See also"
  metadataParenthetical?: Span  // "(9th Cir. 2020)" including delimiters
}
```

**Containment relationship:** When both `metadataParenthetical` and `court`/`year` are present, `court` and `year` are sub-ranges within `metadataParenthetical`. Consumers rendering highlights should use either the parent span (full paren) or the child spans (individual components), not both — overlapping highlights would result otherwise.

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
| volume, reporter, page | `VOLUME_REPORTER_PAGE_REGEX` groups | `spanFromGroupIndex` via `match.indices` (`d` flag) |
| pincite | `PINCITE_REGEX` or `LOOKAHEAD_PINCITE_REGEX` | Match offset within token or lookahead text |
| caseName, plaintiff, defendant | `extractCaseName` backward search | `nameStart` + string offsets within case name |
| court, year | `parseParenthetical` on lookahead paren | Offsets relative to parenthetical start position |
| signal | `extractPartyNames` / `SIGNAL_STRIP_REGEX` | Offset from `fullSpan.cleanStart` |
| metadataParenthetical | `collectParentheticals` | `RawParenthetical.start`/`.end` |
| explanatory parentheticals | `collectParentheticals` | `RawParenthetical.start`/`.end` |

**Note:** `parseParenthetical` currently returns `{ court?, year?, date?, disposition? }` without positions. It must be extended to also return the character offsets of court and year within the parenthetical content string (e.g., `courtStart`/`courtEnd`, `yearStart`/`yearEnd`). These offsets are relative to the parenthetical content start, which is `RawParenthetical.start + 1` (past the opening paren). The extractor adds this base offset to get absolute clean-text positions, then resolves to original via `resolveOriginalSpan`.

### Statute Citations (1 source per family)

All statute families use a single regex match on the token text. Components map to capture groups. `spanFromGroupIndex` computes spans from `match.indices`.

### Constitutional, Journal, Neutral, PublicLaw, FederalRegister, StatutesAtLarge

Same pattern as statutes — single regex match with `d` flag, groups → `spanFromGroupIndex`.

## Subsumes #171

Issue #171 requested `signalSpan` on `CitationBase`. This design subsumes it: `signal` is a field in each type's component spans record. Close #171 when #172 ships.

**Follow-up issue:** Signal extraction is currently implemented only for case citations (in `extractPartyNames`). Other citation type extractors should be extended to detect and extract signal words. The `signal?: Span` field on their span interfaces is ready for this.

## Implementation Order

1. Add `spanFromGroupIndex` helper to `src/types/span.ts`
2. Create `src/types/componentSpans.ts` with all span interfaces, export from `src/types/index.ts`
3. Add `span?: Span` to `Parenthetical` interface in `src/types/citation.ts`
4. Add `spans?` field to each of the 8 full citation type interfaces
5. Wire up `extractCase` (most complex — regex groups + backward search + lookahead scan)
6. Wire up statute family (5 extractors: federal, prose, abbreviated, namedCode, chapterAct)
7. Wire up constitutional, journal, neutral, publicLaw, federalRegister, statutesAtLarge
8. Close #171

## Testing Strategy

Three layers, exhaustive coverage.

### Layer 1: `spanFromGroupIndex` Unit Tests

File: `tests/types/span.test.ts`

- Clean offset computation from token start + `match.indices` pair
- Original position resolution through `TransformationMap`
- Edge cases: group at start/end of match, optional (undefined) groups
- HTML-cleaned text with shifted positions (clean != original)
- Verify `d` flag produces correct indices for multi-group patterns

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

### Layer 3: Integration Tests (CourtListener Fixtures)

File: `tests/integration/componentSpans.test.ts`

Real-world paragraphs sourced from CourtListener, plus synthetic texts. Full pipeline: clean -> tokenize -> extract, verify spans survive position transformations.

#### Fixture 1: Parenthetical Chain

Tests: metadataParenthetical span, explanatory Parenthetical.span, pincite span, subsequent history signal span.

```
The court reaffirmed this standard. Smith v. Jones, 500 F.2d 123, 130 (9th Cir. 2020) (holding that due process requires notice), aff'd, 550 U.S. 1 (2021).
```

Expected citations: 2 case citations. s1 has caseName="Smith v. Jones", pincite=130, court="9th Cir.", year=2020, subsequentHistory with "aff'd". s2 is 550 U.S. 1, year=2021.

#### Fixture 2: Nominative Reporter

Tests: volume/reporter/page spans with optional nominative groups, signal span ("See also").

```
The principle was settled early in the Republic. Gelpcke v. City of Dubuque, 68 U.S. (1 Wall.) 175 (1864), held that municipal bonds could not be repudiated. See also Roosevelt v. Meyer, 68 U.S. (1 Wall.) 512 (1863).
```

Expected: 2 case citations. s1 vol=68, reporter="U.S.", page=175. s2 has signal="see also".

#### Fixture 3: Long Court Names

Tests: court span extraction for multi-word courts ("N.D. Cal.", "Mass. App. Ct.", "Bankr. S.D.N.Y."), date-bearing parentheticals.

```
The district court agreed. Anderson v. Tech Corp., 456 F. Supp. 3d 789, 795 (N.D. Cal. Jan. 15, 2020). The state appellate court reached the opposite conclusion in Rivera v. Dept. of Revenue, 98 N.E.3d 542 (Mass. App. Ct. 2019). The bankruptcy court also addressed the matter. In re Debtor LLC, 612 B.R. 45 (Bankr. S.D.N.Y. 2020).
```

Expected: 3 case citations with distinct court spans. s1 court="N.D. Cal.", s2 court="Mass. App. Ct.", s3 court="Bankr. S.D.N.Y.".

#### Fixture 4: Signal String Mixed

Tests: signal spans across constitutional, statute, and case types. Key fixture for validating signal extraction on non-case types (follow-up issue).

```
The constitutional basis is clear. See U.S. Const. amend. XIV, § 1; see also 42 U.S.C. § 1983; But see Town of Castle Rock v. Gonzales, 545 U.S. 748 (2005) (limiting the scope); Cf. Cal. Civ. Code § 1714(a).
```

Expected: 4 citations (constitutional, statute, case, statute) with signals See, see also, But see, Cf.

#### Fixture 5: Statute Edge Cases

Tests: subsection span for deep chain "(a)(1)(A)", et seq., named state code span, public law congress/lawNumber spans.

```
The statute provides the cause of action. 42 U.S.C. § 1983(a)(1)(A) et seq. governs this claim. Congress enacted the relevant provisions in Pub. L. No. 111-148, § 1501. The state analog is Cal. Civ. Proc. Code § 425.16(b)(1).
```

Expected: 2 statutes + 1 publicLaw. s1 has subsection="(a)(1)(A)", hasEtSeq=true. s2 congress=111, lawNumber=148. s3 code="Cal. Civ. Proc. Code", subsection="(b)(1)".

#### Fixture 6: Dense Mixed Paragraph

Tests: end-to-end with 6 citations of 5 types including short-form and Id. Verifies spans across mixed extraction paths.

```
The Seventh Circuit held that plaintiffs must demonstrate standing under Lujan v. Defenders of Wildlife, 504 U.S. 555, 560-61 (1992). See also U.S. Const. art. III, § 2; 28 U.S.C. § 1331. This court previously addressed the issue in Thompson, 300 F.3d at 752, relying on id. at 561. Cf. 42 U.S.C. § 2000e-2(a).
```

Expected: 6 citations (case, constitutional, statute, shortFormCase, id, statute). Verify all component spans bracket the correct text in the original input.

### Additional Integration Tests

- HTML input with `&amp;`, `&sect;`, `<em>` tags — spans must resolve to correct original positions after cleaning
- Whitespace normalization (multiple spaces, tabs) — verify span mapping through TransformationMap
- `Parenthetical.span` end-to-end on explanatory parentheticals

## Backward Compatibility

All changes are additive:
- `spans?` is optional on every citation type
- `Parenthetical.span?` is optional
- No existing fields are modified or removed
- No new required options in `ExtractOptions`
- Existing consumers see no behavioral change

## Engineering Review (APoSD + API Design + TypeScript DDD)

### Finding 1 (Significant — Applied): `spanFromGroup` → `spanFromGroupIndex`

The original `spanFromGroup` design required callers to compute `groupOffset` manually — error-prone arithmetic that leaked implementation knowledge to every call site (APoSD: information leakage, shallow module). Redesigned to use ES2022 `match.indices` (the `d` flag): callers pass `match.indices[n]` directly. Interface reduced from 5 to 3 parameters. Node 18+ supports `d` flag.

### Finding 2 (Minor — Applied): Containment Relationship Documentation

`metadataParenthetical` spans the full paren block `(9th Cir. 2020)`, while `court` and `year` are sub-ranges within it. Without documenting this, consumers rendering highlights would produce overlapping markup. Added interface comment noting the containment and advising consumers to use parent or child spans, not both.

### Finding 3 (Observation): `parseParenthetical` Responsibility Growth

`parseParenthetical` currently returns parsed values without positions. It must now return sub-offsets for court and year. This changes it from a pure-parsing function to a parsing+positioning function — acceptable trade-off since the position data is a natural byproduct of its parsing logic.
