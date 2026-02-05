# Phase 5: Type System & Blank Pages - Research

**Researched:** 2026-02-05
**Domain:** Type system extension and blank page placeholder recognition
**Confidence:** HIGH

## Summary

Phase 5 adds optional fields to the type system and supports blank page placeholders (underscores/dashes) in citations. This phase is **implementation-ready** with zero new dependencies required. All features build on existing TypeScript capabilities and the established extraction pipeline.

The phase focuses on two orthogonal concerns:
1. **Type System Extension**: Adding optional fields (`fullSpan`, `caseName`, `plaintiff`, `defendant`, `hasBlankPage`, structured date) to `FullCaseCitation` while maintaining backward compatibility
2. **Blank Page Recognition**: Detecting placeholder patterns (`___`, `----`) in page positions and handling them appropriately

Both are low-risk changes that follow established patterns from v1.0-alpha. The type system already demonstrates optional field usage (e.g., `pincite?`, `court?`, `year?`), and the extraction logic already handles edge cases (e.g., hyphenated volumes, missing years).

**Primary recommendation:** Implement as a single unified phase with clear test coverage for both concerns. All new fields are optional, ensuring zero breaking changes for existing consumers.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.9 | Type definitions with optional fields | Already used for all `?:` optional properties; ES2020 target supports all needed regex features |
| Native regex | ES2020 | Pattern matching for `___` and `----` | Existing patterns already use `\d+` for pages; simple alternation (`\d+\|___+\|---+`) sufficient |

### Supporting
None required. This phase uses only existing infrastructure.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Optional fields | Union types (`page: number \| undefined`) | More verbose; optional fields are TypeScript idiom for "may not be present" |
| Regex alternation | Separate token patterns | More complex; single pattern with alternation is clearer |
| Custom type guards | Runtime validation | Unnecessary overhead; TypeScript's `?:` provides compile-time safety |

**Installation:**
No new packages needed.

## Architecture Patterns

### Recommended Project Structure
No changes. All modifications fit existing structure:
```
src/
├── types/
│   └── citation.ts        # Add optional fields to interfaces
├── patterns/
│   └── casePatterns.ts    # Extend page pattern: \d+ → (\d+|___+|---+)
└── extract/
    └── extractCase.ts     # Handle blank page detection in parser
```

### Pattern 1: Optional Field Addition (Type System)
**What:** Adding new optional fields to existing interfaces while maintaining backward compatibility
**When to use:** When extending citation metadata without breaking existing consumers
**Example:**
```typescript
// Existing interface (v1.0-alpha)
export interface FullCaseCitation extends CitationBase {
  type: "case"
  volume: number | string
  reporter: string
  page: number
  pincite?: number          // ← Already optional
  court?: string            // ← Already optional
  year?: number             // ← Already optional
}

// v1.1 extension (backward compatible)
export interface FullCaseCitation extends CitationBase {
  type: "case"
  volume: number | string
  reporter: string
  page: number              // ← Still required for normal citations
  pincite?: number
  court?: string
  year?: number

  // NEW: Phase 5 optional fields
  fullSpan?: Span           // ← Reuses existing Span type
  caseName?: string         // ← Party names with "v." removed
  plaintiff?: string        // ← Extracted from caseName
  defendant?: string        // ← Extracted from caseName
  hasBlankPage?: boolean    // ← True when page field undefined
  date?: {                  // ← Already exists, extended
    iso: string
    parsed?: { year: number; month?: number; day?: number }
  }
}
```

**Key principle:** All new fields use `?:` optional marker. Existing code that doesn't access these fields continues to work unchanged.

### Pattern 2: Page Field Handling (Blank Pages)
**What:** Making `page` field optional (`page?: number`) for citations with blank placeholders
**When to use:** When citation has `___` or `----` instead of numeric page
**Example:**
```typescript
// BLANK-03 requirement: page field is undefined for blank-page citations
// Current regex: /(\d+)\s+(Reporter)\s+(\d+)/
// v1.1 regex:    /(\d+)\s+(Reporter)\s+(\d+|___+|---+)/

function extractCase(token: Token, transformationMap: TransformationMap): FullCaseCitation {
  const volumeReporterPageRegex = /^(\d+(?:-\d+)?)\s+([A-Za-z0-9.\s]+)\s+(\d+|___+|---+)/
  const match = volumeReporterPageRegex.exec(text)

  const volume = parseVolume(match[1])
  const reporter = match[2].trim()
  const pageStr = match[3]

  // Detect blank page patterns
  const hasBlankPage = /^(_+|-+)$/.test(pageStr)
  const page = hasBlankPage ? undefined : Number.parseInt(pageStr, 10)

  // BLANK-04: Lower confidence for blank pages
  let confidence = 0.5
  if (hasBlankPage) {
    confidence = 0.8  // Fixed value per requirement
  } else {
    // Normal confidence calculation
    if (commonReporters.some(r => reporter.includes(r))) confidence += 0.3
    if (year && year <= new Date().getFullYear()) confidence += 0.2
  }

  return {
    type: 'case',
    volume,
    reporter,
    page,              // undefined when hasBlankPage is true
    hasBlankPage,      // BLANK-02: Flag set
    confidence,
    // ... other fields
  }
}
```

**Important:** Change `page: number` to `page?: number` in `FullCaseCitation` interface to allow `undefined`.

### Pattern 3: Backward Compatibility Verification
**What:** Ensuring existing consumer code continues to work after type changes
**When to use:** After adding any optional fields or modifying existing field types
**Example:**
```typescript
// Test: Existing v1.0 code patterns still compile and run
describe('backward compatibility', () => {
  it('should allow accessing existing fields without new fields', () => {
    const citation: FullCaseCitation = {
      type: 'case',
      text: '500 F.2d 123',
      span: { /* ... */ },
      confidence: 0.8,
      matchedText: '500 F.2d 123',
      processTimeMs: 10,
      patternsChecked: 1,
      volume: 500,
      reporter: 'F.2d',
      page: 123,
      // NEW fields NOT required
    }

    expect(citation.volume).toBe(500)
    expect(citation.page).toBe(123)
  })

  it('should handle blank page citations with undefined page', () => {
    const citation: FullCaseCitation = {
      type: 'case',
      text: '564 U.S. ___',
      span: { /* ... */ },
      confidence: 0.8,
      matchedText: '564 U.S. ___',
      processTimeMs: 10,
      patternsChecked: 1,
      volume: 564,
      reporter: 'U.S.',
      page: undefined,      // ← Now valid
      hasBlankPage: true,
    }

    expect(citation.hasBlankPage).toBe(true)
    expect(citation.page).toBeUndefined()
  })
})
```

### Anti-Patterns to Avoid
- **Don't make `page` a union type (`number | string`)**: Keep it `number` for normal citations, `undefined` for blank pages. String pages would complicate all downstream code.
- **Don't add runtime validation for optional fields**: TypeScript's type system is sufficient. Runtime checks add unnecessary overhead.
- **Don't use regex lookahead for blank page detection**: Simple alternation (`\d+|___+|---+`) is clearer and faster than lookahead assertions.
- **Don't change confidence calculation for existing citations**: Only blank page citations get fixed 0.8 confidence. Normal citations use existing logic.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Position tracking for fullSpan | Custom span calculation | Existing `Span` type and `TransformationMap` | Already handles dual positions (clean/original); tested and validated |
| Date parsing for structured dates | Custom date parser | JavaScript `Date` constructor + month map | Standard library, zero bytes, sufficient for `YYYY-MM-DD` ISO format |
| Blank page pattern matching | Complex regex with multiple patterns | Simple alternation: `(\d+\|___+\|---+)` | Covers all cases (3-4 underscores, 3-4 dashes); easy to maintain |
| Optional field validation | Runtime type checking | TypeScript optional `?:` syntax | Compile-time safety, zero runtime overhead |

**Key insight:** TypeScript's type system provides free backward compatibility for optional fields. Don't add runtime checks unless absolutely necessary for data integrity.

## Common Pitfalls

### Pitfall 1: Breaking Existing Consumers with Required Fields
**What goes wrong:** Adding non-optional fields to `FullCaseCitation` breaks existing code that constructs citations
**Why it happens:** Forgetting that citations are constructed in tests, user code, and other parts of the library
**How to avoid:** ALL new fields MUST use `?:` optional marker. Verify with grep:
```bash
# Check all new fields are optional
grep -E "(fullSpan|caseName|plaintiff|defendant|hasBlankPage):" src/types/citation.ts
# Should show: "fullSpan?: Span" not "fullSpan: Span"
```
**Warning signs:** TypeScript errors in test files after adding fields; failing CI on type checks

### Pitfall 2: Forgetting to Make `page` Optional
**What goes wrong:** `page: number` doesn't allow `undefined`, causing type errors when handling blank pages
**Why it happens:** Current type is `page: number` (required). BLANK-03 requires `page: undefined` for blank citations.
**How to avoid:** Change interface to `page?: number` as part of Phase 5
**Warning signs:** TypeScript error when assigning `page: undefined`

### Pitfall 3: Overly Complex Blank Page Regex
**What goes wrong:** Using patterns like `(?:___|____|-----|----)` to match exact counts
**Why it happens:** Trying to be too specific about underscore/dash counts
**How to avoid:** Use `___+` or `---+` to match 3+ characters. Legal citations use 3-4 underscores/dashes interchangeably.
**Warning signs:** Pattern fails on `____` (4 underscores) when testing

### Pitfall 4: Not Testing Backward Compatibility
**What goes wrong:** New optional fields work, but existing code breaks in subtle ways
**Why it happens:** Not verifying that old code patterns still compile and run
**How to avoid:** Add explicit backward compatibility tests that construct citations without new fields
**Warning signs:** User reports in real usage that weren't caught in tests

### Pitfall 5: Inconsistent Confidence Scoring
**What goes wrong:** Applying normal confidence logic to blank page citations
**Why it happens:** Not checking `hasBlankPage` before calculating confidence
**How to avoid:** BLANK-04 specifies fixed 0.8 confidence for blank pages. Check this FIRST before other confidence logic.
**Warning signs:** Blank page citations get 0.5 or 1.0 confidence instead of 0.8

## Code Examples

Verified patterns from existing codebase and v1.1 requirements:

### Adding Optional Fields to Interface
```typescript
// Source: src/types/citation.ts (existing + Phase 5 additions)
export interface FullCaseCitation extends CitationBase {
  type: "case"
  volume: number | string
  reporter: string
  page?: number              // Changed from required to optional
  pincite?: number
  court?: string
  year?: number

  // Existing v1.0 optional fields
  normalizedReporter?: string
  parallelCitations?: Array<{
    volume: number | string
    reporter: string
    page: number
  }>
  signal?: 'see' | 'see also' | 'cf' | 'but see' | 'compare'
  parenthetical?: string
  subsequentHistory?: string
  date?: {
    iso: string
    parsed?: { year: number; month?: number; day?: number }
  }
  possibleInterpretations?: Array<{
    volume: number | string
    reporter: string
    page: number
    confidence: number
    reason: string
  }>

  // NEW: Phase 5 fields
  fullSpan?: Span           // Full citation including case name and parentheticals
  caseName?: string         // E.g., "Smith v. Jones"
  plaintiff?: string        // E.g., "Smith"
  defendant?: string        // E.g., "Jones"
  hasBlankPage?: boolean    // True when page is placeholder (___/----)
}
```

### Blank Page Pattern Matching
```typescript
// Source: src/patterns/casePatterns.ts (modified for Phase 5)
export const casePatterns: Pattern[] = [
  {
    id: 'federal-reporter',
    // OLD: /\b(\d+(?:-\d+)?)\s+(F\.|F\.2d|...)\s+(\d+)\b/g
    // NEW: Allow ___ or ---- in page position
    regex: /\b(\d+(?:-\d+)?)\s+(F\.|F\.2d|F\.3d|F\.4th|F\.\s?Supp\.|F\.\s?Supp\.\s?2d|F\.\s?Supp\.\s?3d|F\.\s?Supp\.\s?4th)\s+(\d+|___+|---+)\b/g,
    description: 'Federal Reporter with optional blank page support',
    type: 'case',
  },
  {
    id: 'supreme-court',
    regex: /\b(\d+(?:-\d+)?)\s+(U\.\s?S\.|S\.\s?Ct\.|L\.\s?Ed\.(?:\s?2d)?)\s+(\d+|___+|---+)\b/g,
    description: 'U.S. Supreme Court reporters with optional blank page support',
    type: 'case',
  },
  // ... other patterns similarly updated
]
```

### Blank Page Detection in Extraction
```typescript
// Source: src/extract/extractCase.ts (modified for Phase 5)
export function extractCase(
  token: Token,
  transformationMap: TransformationMap,
  cleanedText?: string,
): FullCaseCitation {
  const { text, span } = token

  // Updated regex to allow ___ or ---- in page position
  const volumeReporterPageRegex = /^(\d+(?:-\d+)?)\s+([A-Za-z0-9.\s]+)\s+(\d+|___+|---+)/
  const match = volumeReporterPageRegex.exec(text)

  if (!match) {
    throw new Error(`Failed to parse case citation: ${text}`)
  }

  const volume = parseVolume(match[1])
  const reporter = match[2].trim()
  const pageStr = match[3]

  // BLANK-01: Recognize ___ and ---- as valid page placeholders
  const hasBlankPage = /^(_+|-+)$/.test(pageStr)

  // BLANK-03: page field is undefined for blank-page citations
  const page = hasBlankPage ? undefined : Number.parseInt(pageStr, 10)

  // Extract optional metadata (pincite, year, court)
  // ... existing code unchanged ...

  // Calculate confidence score
  // BLANK-04: Confidence lowered to 0.8 for blank-page citations
  let confidence: number
  if (hasBlankPage) {
    confidence = 0.8  // Fixed value for blank pages
  } else {
    // Existing confidence calculation for normal citations
    confidence = 0.5
    if (commonReporters.some((r) => reporter.includes(r))) {
      confidence += 0.3
    }
    if (year !== undefined) {
      const currentYear = new Date().getFullYear()
      if (year <= currentYear) {
        confidence += 0.2
      }
    }
    confidence = Math.min(confidence, 1.0)
  }

  return {
    type: 'case',
    text,
    span: {
      cleanStart: span.cleanStart,
      cleanEnd: span.cleanEnd,
      originalStart,
      originalEnd,
    },
    confidence,
    matchedText: text,
    processTimeMs: 0,
    patternsChecked: 1,
    volume,
    reporter,
    page,              // undefined when hasBlankPage is true
    pincite,
    court,
    year,
    hasBlankPage,      // BLANK-02: Set flag
  }
}
```

### Backward Compatibility Test
```typescript
// Source: tests/extract/extractCase.test.ts (new test for Phase 5)
describe('backward compatibility', () => {
  it('should allow constructing citations without new optional fields', () => {
    // Simulates v1.0 consumer code that doesn't know about Phase 5 fields
    const citation: FullCaseCitation = {
      type: 'case',
      text: '500 F.2d 123',
      span: {
        cleanStart: 0,
        cleanEnd: 12,
        originalStart: 0,
        originalEnd: 12,
      },
      confidence: 0.8,
      matchedText: '500 F.2d 123',
      processTimeMs: 10,
      patternsChecked: 1,
      volume: 500,
      reporter: 'F.2d',
      page: 123,
      // No new fields provided - should compile and work fine
    }

    expect(citation.volume).toBe(500)
    expect(citation.page).toBe(123)
    expect(citation.hasBlankPage).toBeUndefined()  // Optional fields default to undefined
  })
})

describe('blank page citations', () => {
  it('should extract citation with underscore placeholder', () => {
    const token: Token = {
      text: '564 U.S. ___',
      span: { cleanStart: 0, cleanEnd: 12 },
      type: 'case',
      patternId: 'supreme-court',
    }
    const transformationMap = createIdentityMap()

    const citation = extractCase(token, transformationMap)

    expect(citation.volume).toBe(564)
    expect(citation.reporter).toBe('U.S.')
    expect(citation.page).toBeUndefined()       // BLANK-03
    expect(citation.hasBlankPage).toBe(true)    // BLANK-02
    expect(citation.confidence).toBe(0.8)       // BLANK-04
  })

  it('should extract citation with dash placeholder', () => {
    const token: Token = {
      text: '586 U.S. ----',
      span: { cleanStart: 0, cleanEnd: 13 },
      type: 'case',
      patternId: 'supreme-court',
    }
    const transformationMap = createIdentityMap()

    const citation = extractCase(token, transformationMap)

    expect(citation.page).toBeUndefined()
    expect(citation.hasBlankPage).toBe(true)
    expect(citation.confidence).toBe(0.8)
  })

  it('should extract citation with 4 underscores', () => {
    const token: Token = {
      text: '564 U.S. ____',
      span: { cleanStart: 0, cleanEnd: 13 },
      type: 'case',
      patternId: 'supreme-court',
    }
    const transformationMap = createIdentityMap()

    const citation = extractCase(token, transformationMap)

    expect(citation.hasBlankPage).toBe(true)
    // Pattern ___+ should match 3, 4, or more underscores
  })
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| All fields required or nullable | Optional fields with `?:` syntax | TypeScript 2.0+ (2016) | Clean API design, backward compatibility |
| Fixed page type (`number`) | Optional page type (`number?`) | Phase 5 (v1.1) | Supports slip opinions with unassigned pages |
| No blank page detection | Regex alternation for placeholders | Phase 5 (v1.1) | Handles real-world citation formats |

**Deprecated/outdated:**
- **Union types for optional data** (`number | undefined`): TypeScript `?:` syntax is clearer and more idiomatic
- **Separate token patterns for blank pages**: Single pattern with alternation is simpler to maintain

## Open Questions

Things that couldn't be fully resolved:

1. **Should `fullSpan` be calculated automatically or require explicit opt-in?**
   - What we know: `Span` type and `TransformationMap` infrastructure exist
   - What's unclear: Performance impact of calculating fullSpan for every citation
   - Recommendation: Start with explicit opt-in (optional field only populated if requested), optimize in future if needed

2. **How to handle citations with both numeric page and blank placeholder (e.g., "500 F.2d 123, ___")?**
   - What we know: Primary page is numeric (123), pincite is placeholder
   - What's unclear: Should `hasBlankPage` be true? Should pincite be undefined?
   - Recommendation: `hasBlankPage` only true when primary page is blank. Pincite handling deferred to future phase.

3. **Should structured date parsing be mandatory or optional?**
   - What we know: Existing `date?: {...}` field is optional, `parsed` subfield also optional
   - What's unclear: Performance cost of parsing month/day for every citation
   - Recommendation: Keep nested optional (`date?.parsed?`), only parse if date string is already extracted

## Sources

### Primary (HIGH confidence)
- **TypeScript 5.9 Handbook**: [Type Compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility.html) - Optional field semantics
- **TypeScript 5.9 Handbook**: [Do's and Don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html) - Best practices for API design
- **Existing codebase**: `src/types/citation.ts`, `src/extract/extractCase.ts` - Current patterns for optional fields and confidence scoring

### Secondary (MEDIUM confidence)
- **Bluebook Legal Citation**: [Pages, Paragraphs, and Pincites](https://tarlton.law.utexas.edu/bluebook-legal-citation/pages-paragraphs-pincites) - Documents that blank pages use 4 underscores in slip opinions
- **Best Practices for API Versioning**: [AverageDevs](https://www.averagedevs.com/blog/api-versioning-backward-compatibility) - Guidance on optional fields for backward compatibility
- **Speakeasy**: [TypeScript forward compatibility](https://www.speakeasy.com/blog/typescript-forward-compatibility) - Make new fields optional with defaults preserving previous semantics

### Tertiary (LOW confidence)
- **GitHub eyecite (Python)**: No explicit documentation of blank page handling found in repository README or issues

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - TypeScript 5.9 supports all needed features; no new dependencies required
- Architecture: HIGH - Follows existing patterns (optional fields, regex alternation, confidence scoring)
- Pitfalls: HIGH - Clear risks identified (required fields, missing `page?` change, regex complexity)

**Research date:** 2026-02-05
**Valid until:** 60 days (stable TypeScript/testing stack, slow-moving legal citation standards)

---

## Ready for Planning

Research complete. Key findings:

1. **Zero new dependencies** - All features use existing TypeScript and native JavaScript
2. **Backward compatible** - All new fields optional; existing code unaffected
3. **Simple regex changes** - Pattern alternation (`\d+|___+|---+`) is straightforward
4. **Clear test strategy** - Backward compat tests + blank page tests cover all requirements
5. **Fixed confidence scoring** - 0.8 for blank pages, existing logic for normal citations

Planner can now create PLAN.md files focusing on:
- Type definition updates (make `page` optional, add new fields)
- Pattern regex modifications (add alternation for blank pages)
- Extraction logic updates (detect blank pages, set flag, adjust confidence)
- Test coverage (backward compat + blank page variations)
