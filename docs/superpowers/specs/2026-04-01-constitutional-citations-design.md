# Constitutional Citation Extraction

**Date**: 2026-04-01
**Issue**: #75
**Status**: Design approved

## Overview

Add a new `constitutional` citation type to eyecite-ts that extracts structured data from U.S. and state constitutional citations. This follows the existing pipeline: patterns → tokenize → extract, plugging into the discriminated union type system.

## Scope

**In scope:**
- U.S. Constitution citations (`U.S. Const. art. III, § 2`)
- State constitution citations (`Cal. Const. art. I, § 7`)
- Bare `Const.` citations without jurisdiction prefix
- Articles, amendments, sections, and clauses

**Out of scope:**
- Foreign constitutions (future follow-up)
- Preamble (`U.S. Const. pmbl.`) — rare, can be added later
- Named clauses (e.g., "Commerce Clause" as a standalone reference)

## Type Definition

Added to `src/types/citation.ts`:

```typescript
export interface ConstitutionalCitation extends CitationBase {
  type: "constitutional"
  jurisdiction?: string    // "US", "CA", "NY", etc. — undefined for bare "Const."
  article?: number         // Roman numerals parsed to int (art. III → 3)
  amendment?: number       // Roman numerals parsed to int (amend. XIV → 14)
  section?: string         // String to handle "3-a" style (Texas)
  clause?: number          // Always numeric (cl. 3 → 3)
}
```

Design decisions:
- `article` and `amendment` are mutually exclusive — a citation references one or the other
- `article`/`amendment`/`clause` are `number` — Roman numerals are parsed to integers. Original form is always available in `matchedText`.
- `section` is `string` to accommodate non-numeric sections like Texas `§ 3-a`
- `jurisdiction` is `string | undefined` — `undefined` signals ambiguity for bare `Const.` citations

The `"constitutional"` type is added to `CitationType`, `FullCitationType`, and the `Citation` discriminated union.

## Patterns

Three patterns in `src/patterns/constitutionalPatterns.ts`:

### `us-constitution`

Matches U.S. Constitution citations with abbreviation variants.

**Examples:**
- `U.S. Const. art. III, § 2`
- `U.S. Const. amend. XIV, § 1`
- `U.S. Const. amend. I`
- `United States Constitution amend. V`

**Regex strategy:** Match `U.S. Const.` (with variants: `U. S.`, `US`) followed by `art./amend.` + Roman numeral or Arabic number, then optionally `, § {section}` and `, cl. {clause}`.

### `state-constitution`

Matches state constitution citations.

**Examples:**
- `Cal. Const. art. I, § 7`
- `N.Y. Const. art. VI, § 20`
- `Tex. Const. art. V, § 3-a`
- `Fla. Const. art. I, § 2`

**Regex strategy:** Match a capitalized abbreviation followed by `Const.` then the same `art./amend.` tail as the US pattern.

### `bare-constitution`

Matches `Const.` without jurisdiction prefix.

**Examples:**
- `Const. art. I, § 8, cl. 3`

Same tail pattern, no jurisdiction prefix. Lower confidence in extraction (0.7).

### Pattern ordering

Constitutional patterns are placed before statute patterns in the `allPatterns` array in `extractCitations.ts`. `Const.` is more specific than generic statute matching and should win deduplication conflicts.

## Extraction

New file `src/extract/extractConstitutional.ts`.

### Dispatcher

`extractConstitutional(token, transformationMap)` switches on `patternId`:

| patternId | jurisdiction |
|---|---|
| `us-constitution` | `"US"` |
| `state-constitution` | Mapped from abbreviation (e.g., `Cal.` → `"CA"`) |
| `bare-constitution` | `undefined` |

### Shared parser

`parseConstitutionalBody(text)` extracts structured fields:

1. Determine `article` vs `amendment` from `art.`/`amend.`/`article`/`amendment` keyword
2. Parse Roman numeral (or Arabic number) to integer
3. Optionally extract `§ {section}`
4. Optionally extract `cl. {clause}`

### Roman numeral parsing

Small utility function bounded to I–XXVII (covers all 27 US amendments and articles I–VII). Implemented as a lookup table, not a general-purpose Roman numeral parser.

### State abbreviation mapping

Lookup table from common state abbreviations to 2-letter codes. Initial coverage includes major states (CA, NY, TX, FL, IL, PA, OH, etc.). Expandable over time.

### Confidence scoring

| Scenario | Confidence |
|---|---|
| US with article/amendment + section | 0.95 |
| US with article/amendment only | 0.9 |
| State with jurisdiction matched | 0.9 |
| Bare `Const.` (no jurisdiction) | 0.7 |

### Integration

New `case 'constitutional'` in the switch statement in `extractCitations.ts`, calling `extractConstitutional`.

## Files Changed

| File | Change |
|---|---|
| `src/types/citation.ts` | Add `ConstitutionalCitation`, update unions |
| `src/patterns/constitutionalPatterns.ts` | New file — 3 patterns |
| `src/patterns/index.ts` | Export constitutional patterns |
| `src/extract/extractConstitutional.ts` | New file — dispatcher + parser |
| `src/extract/index.ts` | Export extractor |
| `src/extract/extractCitations.ts` | Add dispatcher case + pattern registration |
| `src/index.ts` | Export type + extractor |
| `tests/extract/extractConstitutional.test.ts` | New file — unit tests |
| `tests/integration/fullPipeline.test.ts` | Add integration tests |

## Testing

### Unit tests (`tests/extract/extractConstitutional.test.ts`)

- US article: `U.S. Const. art. III, § 2` → article: 3, section: "2", jurisdiction: "US"
- US amendment: `U.S. Const. amend. XIV, § 1` → amendment: 14, section: "1"
- Amendment only: `U.S. Const. amend. I` → amendment: 1, no section
- Full depth: `U.S. Const. art. I, § 8, cl. 3` → article: 1, section: "8", clause: 3
- State: `Cal. Const. art. I, § 7` → jurisdiction: "CA", article: 1
- Non-numeric section: `Tex. Const. art. V, § 3-a` → section: "3-a"
- Bare Const.: `Const. art. I, § 8, cl. 3` → jurisdiction: undefined, confidence: 0.7
- Abbreviation variants: `U. S. Const.`, `US Const.`
- Spelling variants: `article` vs `art.`, `amendment` vs `amend.`
- Position translation: clean → original span mapping with offsets

### Integration tests

- Constitutional citations in legal text pass through full pipeline with correct spans
- Constitutional citations coexist with case/statute citations without interference

### Roman numeral parser tests

- I→1, V→5, IX→9, XIV→14, XXVII→27
- Arabic numbers accepted as fallback
