# String Citation Grouping Design

**Issue:** #77
**Date:** 2026-04-02

## Problem

String citations group multiple authorities supporting the same proposition, separated by semicolons:

```
See Smith v. Jones, 500 F.2d 123 (9th Cir. 2020); Doe v. Green, 600 F.3d 456 (2d Cir. 2021);
Black v. White, 700 F.4th 789 (D.C. Cir. 2022).
```

eyecite-ts extracts each citation individually but has no mechanism to group them semantically. Consumers cannot determine that these three citations all support the same legal proposition.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Relationship to parallel cites | Orthogonal | Parallel = same case in multiple reporters; string cite = different authorities for same proposition. A citation can be in both. |
| Proposition capture | Signal word now, `propositionText` reserved for future | Backward sentence-boundary detection is complex (legal abbreviations). Signal words are cheap and already partially parsed. |
| Mid-group signal changes | One group, per-citation signals | Matches Bluebook convention: a string cite is one continuous chain from opening signal to terminal period, even if internal signals shift (e.g., `see also`, `but see`). |
| Citation types | Mixed types allowed | Grouping is about document structure (semicolons), not citation type. Cases, statutes, journals can coexist in one group. |
| Pipeline placement | Post-extract pass (Phase 6.5) | Follows existing pattern (parallel detection, subsequent history). Keeps extractors untouched. |
| Opt-in vs always-on | Always on | Lightweight, non-destructive (only adds optional fields). Consistent with parallel detection. |

## Data Model

### New fields on `CitationBase`

All citation types inherit these fields via `CitationBase`:

```typescript
interface CitationBase {
  // ... existing fields ...

  /** Group ID for string citations sharing the same proposition */
  stringCitationGroupId?: string

  /** Position within the string citation group (0-indexed) */
  stringCitationIndex?: number

  /** Total number of citations in this string citation group */
  stringCitationGroupSize?: number

  /** Text the string citation group supports (future enhancement) */
  propositionText?: string
}
```

### Signal field moved to `CitationBase`

Currently `signal` is defined on `FullCaseCitation` but never populated. Changes:

- Move `signal` to `CitationBase` so any citation type can carry a signal.
- Type: `"see" | "see also" | "cf" | "but see" | "compare"`
- Populated for citations in string groups AND standalone citations with leading signals.

### Group ID format

`sc-{index}` where index is a sequential counter per `extractCitations()` call. Simple, no collision risk within a document.

## Detection Algorithm

### Post-extract pass: `detectStringCitations()`

**Input:** `Citation[]` sorted by `span.cleanStart` (already the case), plus the cleaned text string.

**Steps:**

1. Iterate citation pairs `(citations[i], citations[i+1])`.
2. Skip if `citations[i+1]` is a subsequent history entry (`subsequentHistoryOf` is set).
3. Extract gap text between them:
   - Start: `fullSpan.cleanEnd` if available, else `span.cleanEnd` of `citations[i]`.
   - End: case name start if available, else `span.cleanStart` of `citations[i+1]`.
4. Normalize and analyze the gap text.
5. **Group continues** if gap matches: semicolon (`;`) followed by optional whitespace and an optional recognized signal word.
6. **Group breaks** on: period followed by non-signal text, any non-signal prose, or absence of semicolon.
7. Assign `stringCitationGroupId`, `stringCitationIndex`, `stringCitationGroupSize` to all group members.
8. Extract and assign per-citation `signal` from mid-group signal words.

### Gap text rule

Between two citations in a group, only the following are allowed:
- Whitespace
- A single semicolon
- A recognized signal word (after the semicolon)

Parentheticals attached to a citation are part of that citation's `fullSpan` and do not appear in the gap.

### Signal word recognition

Recognized signals (case-insensitive): `see`, `see also`, `cf.`, `but see`, `but cf.`, `compare`, `accord`, `contra`, `see generally`.

Normalization: lowercase, strip trailing period from `cf.`, map to canonical form.

## Signal Word Capture

Two capture points:

### A) Leading signal (before first citation or standalone)

In `extractCase.ts`, `extractCaseName` already strips signal words with a regex. Modify to also populate the `signal` field on the citation instead of discarding.

For non-case citations leading a string group (e.g., statute as first member), detect the leading signal in `detectStringCitations` by looking backward from the first member's span start.

### B) Mid-group signal (between semicolon and next citation)

Detected during gap-text analysis in `detectStringCitations`. After confirming the gap contains a semicolon, parse out any signal word and assign to the subsequent citation's `signal` field.

## Pipeline Integration

Current phase order in `extractCitations.ts`:

1. Clean
2. Tokenize
3. Deduplicate
4. Extract (individual citations)
5. Parallel detection
6. Subsequent history linking
6.5. **String citation grouping** (NEW)
7. Resolve (optional)

Runs after subsequent history because we need `subsequentHistoryOf` to exclude history entries. Runs after parallel detection because the primary citation in a parallel group is the one that participates in string cite grouping.

### New file

`src/extract/detectStringCites.ts` — follows the pattern of `detectParallel.ts`.

```typescript
export function detectStringCitations(
  citations: Citation[],
  cleanedText: string,
): void // mutates citations in place
```

### Interaction with parallel citations

A citation can be in both a parallel group (`groupId`, `parallelCitations`) and a string cite group (`stringCitationGroupId`). The primary citation from a parallel group is the one checked for string cite membership. Its parallel siblings are not independently checked — they implicitly belong to the same proposition context.

## Testing Strategy

### Unit tests: `tests/extract/detectStringCites.test.ts`

- Basic two-citation string cite with semicolon
- Three+ citations in a chain
- Mid-group signal words (`see also`, `but see`, `cf.`)
- Mixed citation types (case + statute + case in one group)
- Parallel cites within a string group (orthogonal grouping)
- Subsequent history entries excluded from grouping
- Group breaks on period + prose
- Group breaks on missing semicolon
- Standalone citation with signal (no group, but signal populated)
- Adjacent citations with no gap text (should not group)
- Semicolon inside a parenthetical (should not trigger grouping)

### Signal population tests (in existing `tests/extract/extractCase.test.ts`)

- Leading signal captured on case citation
- Signal stripped from case name (existing behavior preserved)
- No signal: `signal` field remains `undefined`

### Integration tests: `tests/integration/`

- Full pipeline: real legal text with string cites through extract, verify group IDs + signals
- String cites with resolution enabled: grouping and resolution coexist
- Position tracking: `originalStart`/`originalEnd` correct after HTML cleaning + string cite detection
