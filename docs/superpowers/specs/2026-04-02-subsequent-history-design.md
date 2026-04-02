# Subsequent History Signal Extraction

**Issue**: #73
**Date**: 2026-04-02

## Problem

Case citations often include subsequent procedural history:

```
Smith v. Jones, 500 F.2d 123 (2d Cir. 1990), aff'd, 501 U.S. 1 (1991), cert. denied, 502 U.S. 2 (1992)
```

eyecite-ts currently detects history signals in `collectParentheticals()` but discards them — they trigger continued scanning but the signal text itself is lost. The `subsequentHistory` field on `FullCaseCitation` exists but is never populated. Subsequent citations are extracted as separate top-level `FullCaseCitation` objects with no link back to their parent.

## Design Decisions

- **Bidirectional linking (approach C)**: Both citations remain in the flat results array. Parent gets `subsequentHistoryEntries`, child gets `subsequentHistoryOf` back-pointer. Non-breaking for consumers expecting flat arrays.
- **Comprehensive signal coverage**: ~35 variant patterns covering 15 normalized signals, including common signals not in the original issue (superseded, disapproved, questioned, distinguished, withdrawn, reinstated).
- **Flat with ordering**: All history entries linked to the original citation (not chained), with an `order` field preserving sequence.
- **Two-phase architecture**: Signal capture in `extractCase.ts`, citation linking in `extractCitations.ts`. Each phase has a single responsibility.

## Type System Changes

### New types in `src/types/citation.ts`

```typescript
type HistorySignal =
  | "affirmed" | "reversed" | "cert_denied" | "cert_granted"
  | "overruled" | "vacated" | "remanded" | "modified" | "abrogated"
  | "superseded" | "disapproved" | "questioned" | "distinguished"
  | "withdrawn" | "reinstated"

interface SubsequentHistoryEntry {
  /** Normalized signal classification */
  signal: HistorySignal
  /** Raw signal text as it appeared (e.g., "aff'd", "cert. denied") */
  rawSignal: string
  /** Position of the signal text in the document */
  signalSpan: Span
  /** Order in the chain (0-based) for multi-step history */
  order: number
}
```

### Changes to `FullCaseCitation`

- **Remove**: `subsequentHistory?: string` (never populated)
- **Add**: `subsequentHistoryEntries?: SubsequentHistoryEntry[]` — on the parent citation
- **Add**: `subsequentHistoryOf?: { index: number; signal: HistorySignal }` — on child citations, pointing back to parent's index in the results array

All new types exported from `src/types/index.ts` and `src/index.ts`.

## Architecture: Extended `collectParentheticals()`

### New return type

```typescript
interface RawSignal {
  text: string       // raw signal text, e.g. "aff'd"
  start: number      // position of signal start in cleaned text
  end: number        // position after signal end (exclusive)
}

interface CollectedParentheticals {
  parens: RawParenthetical[]
  signals: Array<{ signal: RawSignal; nextParenIndex: number }>
}
```

When `collectParentheticals()` encounters `", aff'd, 501 U.S. 1 (1991)"`:
1. It captures `{ text: "aff'd", start, end }` as a `RawSignal`
2. Continues scanning and finds `(1991)` as the next paren
3. Associates the signal with that paren's index via `nextParenIndex`

All callers updated to use `result.parens` instead of the previous flat array.

## Signal Normalization

A `SIGNAL_TABLE` maps regex patterns to normalized `HistorySignal` values. Longer patterns sorted first so "aff'd on other grounds" matches before "aff'd".

```typescript
const SIGNAL_TABLE: Array<[RegExp, HistorySignal]> = [
  // affirmed (longer variants first)
  [/^aff'?d\s+on\s+other\s+grounds\b/i, "affirmed"],
  [/^aff'?d\b/i, "affirmed"],
  [/^affirmed\b/i, "affirmed"],
  // reversed
  [/^rev'?d\s+and\s+remanded\b/i, "reversed"],
  [/^rev'?d\s+on\s+other\s+grounds\b/i, "reversed"],
  [/^rev'?d\b/i, "reversed"],
  [/^reversed\b/i, "reversed"],
  // cert denied
  [/^certiorari\s+denied\b/i, "cert_denied"],
  [/^cert\.\s*den(ied|\.)\b/i, "cert_denied"],
  // cert granted
  [/^certiorari\s+granted\b/i, "cert_granted"],
  [/^cert\.\s*granted\b/i, "cert_granted"],
  // overruled
  [/^overruled\b/i, "overruled"],
  [/^overruling\b/i, "overruled"],
  // vacated
  [/^vacated\b/i, "vacated"],
  // remanded
  [/^remanded\b/i, "remanded"],
  // modified
  [/^modified\b/i, "modified"],
  // abrogated
  [/^abrogated\b/i, "abrogated"],
  // additional signals (beyond original issue)
  [/^superseded\b/i, "superseded"],
  [/^disapproved\b/i, "disapproved"],
  [/^questioned\b/i, "questioned"],
  [/^distinguished\b/i, "distinguished"],
  [/^withdrawn\b/i, "withdrawn"],
  [/^reinstated\b/i, "reinstated"],
]
```

The `HISTORY_SIGNAL_REGEX` used by `collectParentheticals()` for detection is updated to match the full set of signal words.

## Two-Phase Extraction

### Phase A: Signal capture (in `extractCase.ts`)

The classify loop processes the new `CollectedParentheticals` return. For each signal found:
- Normalize via `SIGNAL_TABLE` lookup
- Store as intermediate `rawSubsequentHistory` on the citation

`extractCase()` returns a new intermediate field: `rawSubsequentHistory?: Array<{ signal: HistorySignal; rawSignal: string; signalSpan: Span; order: number }>`. This is unlinked — the citation knows it has subsequent history but not which citation it points to.

### Phase B: Linking (in `extractCitations.ts`)

After all citations are extracted, a linking pass:
1. For each citation with `rawSubsequentHistory`, examine subsequent citations in the results array
2. If a subsequent citation's `span.cleanStart` falls after the parent's `span.cleanEnd` and within the parent's `fullSpan.cleanEnd`, it's a child
3. Set `subsequentHistoryEntries` on the parent (finalized from raw capture)
4. Set `subsequentHistoryOf` on the child with parent's index and signal type
5. The intermediate `rawSubsequentHistory` is an internal-only field on a widened extraction type (not part of the public `FullCaseCitation`). The linking pass reads it, builds the public fields, and returns clean `FullCaseCitation` objects without it.

Linking is positional — relies on span containment, no fuzzy matching.

## Testing Strategy

### Signal capture tests (`tests/extract/extractCase.test.ts`)

New describe block: "subsequent history signals (#73)"
- Single signal: `"500 F.2d 123 (2d Cir. 1990), aff'd, 501 U.S. 1 (1991)"` → one entry, `signal: "affirmed"`, `order: 0`
- Chained signals: two entries with orders 0 and 1
- All 15 normalized signals with at least one variant each
- Variant matching: `"aff'd"`, `"affirmed"`, `"aff'd on other grounds"` all → `"affirmed"`
- No subsequent history → field is `undefined`
- Signal at end of text with no following citation — entry still captured

### Linking tests (`tests/integration/`)

- Bidirectional: parent has `subsequentHistoryEntries`, child has `subsequentHistoryOf`
- Chained: three citations, all entries on original parent with correct order
- Existing behavior: citations without history unaffected
- fullSpan regression: existing tests still pass

### Edge cases

- Signal at end of text with no following citation
- Signal variants with different spacing (`cert. denied` vs `cert.denied`)
- Multiple signals without intervening citations
- Empty or very short text between signal and next citation
