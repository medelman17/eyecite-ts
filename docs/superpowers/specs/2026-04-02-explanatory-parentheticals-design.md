# Explanatory Parenthetical Extraction

**Issue**: #76
**Date**: 2026-04-02

## Problem

Legal citations often include explanatory parentheticals that describe the holding or relevance:

```
Smith v. Jones, 500 F.2d 123 (9th Cir. 2020) (holding that substantial performance requires at least 90% completion)
```

eyecite-ts currently extracts the court/year parenthetical but drops the explanatory parenthetical.

## Design Decisions

- **Raw text + signal-word classification**: Extract parenthetical text AND classify by signal-word prefix. Classification is best-effort, falling back to `"other"`.
- **Array of all parentheticals**: Capture every chained explanatory parenthetical, not just the first. Field shape: `parentheticals?: Parenthetical[]`.
- **Replace existing field**: The unpopulated `parenthetical?: string` field becomes `parentheticals?: Parenthetical[]`. No backward compat concern since the field was never populated.

## Type System Changes

In `src/types/citation.ts`:

```typescript
type ParentheticalType =
  | "holding" | "finding" | "stating" | "noting"
  | "explaining" | "quoting" | "citing" | "discussing"
  | "describing" | "recognizing" | "applying" | "rejecting"
  | "adopting" | "requiring" | "other"

interface Parenthetical {
  text: string              // full text between parens
  type: ParentheticalType   // signal-word classification
}
```

On `FullCaseCitation`:
- Remove: `parenthetical?: string`
- Add: `parentheticals?: Parenthetical[]` (only present when explanatory parens found)

Both `Parenthetical` and `ParentheticalType` exported from the main entry point.

## Architecture: `collectParentheticals()` Primitive

Refactor `findParentheticalEnd()` into `collectParentheticals()`:

```typescript
interface RawParenthetical {
  text: string       // content between parens (excluding parens themselves)
  start: number      // position of opening '(' in cleaned text
  end: number        // position after closing ')' in cleaned text
}

function collectParentheticals(text: string, startPos: number): RawParenthetical[]
```

Same depth-tracking state machine as `findParentheticalEnd()`, but returns all top-level parenthetical blocks instead of just the final position. Handles:
- Nested parens (depth tracking)
- Whitespace between chained parens
- Subsequent history signals triggering continuation

`findParentheticalEnd()` becomes a thin wrapper: call `collectParentheticals()`, return the `end` of the last element (or `startPos` if empty).

## Parenthetical Classification

Each `RawParenthetical` is classified into one of three categories:

1. **Metadata** — contains court, year, date, or disposition. Handled by existing `parseParenthetical()`.
2. **Explanatory** — classified by signal-word prefix into a `ParentheticalType`.
3. **Skipped** — subsequent history parens belonging to a different citation.

New `classifyParenthetical()` function:
- Try `parseParenthetical()` first — if it yields court/year/disposition, it's metadata
- Otherwise, check for signal-word prefix (gerund match) — explanatory with typed classification
- Signal words: `holding`, `finding`, `stating`, `noting`, `explaining`, `quoting`, `citing`, `discussing`, `describing`, `recognizing`, `applying`, `rejecting`, `adopting`, `requiring`
- Unrecognized prefix → type `"other"`

## Integration into Extraction Flow

Current flow:
1. Look ahead for primary paren → `parseParenthetical()` → court, year, date
2. Check for chained disposition paren (`CHAINED_DISPOSITION_REGEX`)
3. Backward search for case name
4. `findParentheticalEnd()` for fullSpan

New flow:
1. Look ahead for primary paren → `parseParenthetical()` → court, year, date (unchanged)
2. **Replace** chained disposition check + `findParentheticalEnd()` with single `collectParentheticals()` call
3. Iterate over collected parens:
   - First paren: already parsed in step 1 (skip)
   - Remaining parens: run through `classifyParenthetical()`
     - Metadata → extract disposition
     - Explanatory → push to `parentheticals` array
4. Backward search for case name (unchanged)
5. fullSpan: use last paren's `end` position from `collectParentheticals()` (replaces old wrapper)

Consolidates three separate scans into one pass.

## Testing Strategy

New test group in `tests/extract/extractCase.test.ts`: "explanatory parentheticals"

**Core tests:**
- Single explanatory paren with each signal word
- Multiple chained explanatory parens
- Unrecognized signal → type `"other"`
- No explanatory paren → `parentheticals` is `undefined`

**Regression tests:**
- Court/year extraction unchanged
- Disposition via chained paren `(en banc)` unchanged
- fullSpan boundaries unchanged for all existing test cases
- Subsequent history handling unchanged

**Edge cases:**
- Nested parens: `(holding that (a) X and (b) Y)`
- Quoted text with parens: `(quoting "the (original) rule")`
- Empty or very short parens
- Mixed: `(9th Cir. 2020) (en banc) (holding X)` — disposition AND explanatory both extracted
