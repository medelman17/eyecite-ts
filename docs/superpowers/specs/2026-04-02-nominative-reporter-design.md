# Nominative Reporter Support

**Issues:** #49 (extraction blocked), #16 (capture nominative metadata)
**Date:** 2026-04-02

## Problem

Citations like `5 U.S. (1 Cranch) 137 (1803)` — where a historical (nominative) reporter appears in parentheses between the modern reporter and page number — produce 0 extractions. The parenthetical breaks the tokenizer's `volume reporter page` pattern.

When extraction does work (via fix), the nominative reporter data (`1 Cranch`) should be captured as structured metadata, not silently discarded.

## Affected Citation Format

Early SCOTUS cases use dual-reporter citations:

```
67 U.S. (2 Black) 635 (1862)
5 U.S. (1 Cranch) 137 (1803)
60 U.S. (19 How.) 393 (1856)
74 U.S. (7 Wall.) 506 (1868)
```

Structure: `volume U.S. (nominativeVolume nominativeReporter) page (year)`

Known nominative reporters: Dallas (Dall.), Cranch, Wheaton (Wheat.), Peters (Pet.), Howard (How.), Black, Wallace (Wall.). All present in `data/reporters.json` with `cite_type: "scotus_early"`.

## Design

Three changes, all backward-compatible:

### 1. Tokenizer Pattern (`src/patterns/casePatterns.ts`)

Add optional non-capturing group to the supreme-court regex between reporter and page:

```
(?:\(\d+\s+[A-Z][A-Za-z.]+\)\s+)?
```

This lets the tokenizer span the full citation including the parenthetical so the page number is captured in the token text. Non-capturing because the tokenizer only needs the token text — parsing happens in extraction.

### 2. Extraction Regex + Logic (`src/extract/extractCase.ts`)

Update `VOLUME_REPORTER_PAGE_REGEX` to capture nominative content:

```
/^(\d+(?:-\d+)?)\s+([A-Za-z0-9.\s]+?)\s+(?:\((\d+)\s+([A-Z][A-Za-z.]+)\)\s+)?(\d+|_{3,}|-{3,})/
```

- Group 1: volume
- Group 2: reporter (now non-greedy `+?` to stop before parenthetical)
- Group 3: nominative volume (new, optional)
- Group 4: nominative reporter (new, optional)
- Group 5: page (shifted from group 3)

When groups 3 and 4 are present, populate `nominativeVolume` (parsed as number) and `nominativeReporter` on the citation.

### 3. Type Definition (`src/types/citation.ts`)

Add two optional fields to `FullCaseCitation`:

```typescript
nominativeVolume?: number
nominativeReporter?: string
```

### Validation Approach

Pattern-only — trust the positional constraint (must appear between reporter and page in `(number word)` shape). No validation against the reporter database. The position is unambiguous: year parentheticals contain only digits, nominative parentheticals contain digits + a word.

### What Doesn't Change

- No new citation type
- No new pipeline stage
- No changes to resolve, annotate, or clean layers
- Existing citations without nominative parentheticals are unaffected (optional group)
- `S.Ct.` and `L.Ed.` patterns are included in the tokenizer change for consistency, though nominative parentheticals only appear with `U.S.`

## Test Cases

```
"67 U.S. (2 Black) 635 (1862)"           → volume: 67, reporter: "U.S.", page: 635, nominativeVolume: 2, nominativeReporter: "Black"
"5 U.S. (1 Cranch) 137 (1803)"           → with case name "Marbury v. Madison"
"60 U.S. (19 How.) 393 (1856)"           → multi-digit nominative volume
"74 U.S. (7 Wall.) 506 (1868)"           → Wallace reporter with period
"500 U.S. 123 (1991)"                    → no nominative fields (backward compat)
"Marbury v. Madison, 5 U.S. (1 Cranch) 137, 180 (1803)" → with pincite
```
