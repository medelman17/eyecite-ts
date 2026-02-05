# Architecture Documentation

## Overview

eyecite-ts is a TypeScript port of Python eyecite designed for zero-dependency, browser-compatible legal citation extraction. This document outlines the architectural decisions and patterns that guide implementation across all phases.

## Core Constraints

1. **Zero runtime dependencies** - All parsing, resolution, and annotation logic is self-contained
2. **Browser compatibility** - No Node.js-specific APIs (fs, path, etc.)
3. **Tree-shakeable** - Consumers only bundle what they use (<50KB gzipped target)
4. **Type-safe** - Discriminated unions and strict TypeScript eliminate runtime type checks
5. **Position accuracy** - Dual position tracking prevents offset drift through text transformations

## Position Tracking Architecture

### Problem: Position Offset Drift (Pitfall #1)

Legal citations must return accurate character positions in the original input text. However, parsing requires text transformations:

- HTML entity removal (`&nbsp;` → space)
- Whitespace normalization (multiple spaces → single space)
- Unicode normalization (smart quotes → straight quotes)

Each transformation shifts character positions. Naive approaches lead to position drift where returned spans point to the wrong text.

### Solution: Span Interface with Dual Position Tracking

```typescript
interface Span {
  cleanStart: number      // Position in transformed text (used during parsing)
  cleanEnd: number
  originalStart: number   // Position in original text (returned to user)
  originalEnd: number
}
```

**Implementation Strategy (Phase 2):**

1. **Text cleaning layer builds TransformationMap**
   - Maps each cleaned position → original position
   - Maps each original position → cleaned position
   - Bidirectional mapping supports both forward parsing and reverse annotation

2. **Parser operates on cleaned text**
   - Regex patterns match against normalized text
   - Match positions are cleanStart/cleanEnd

3. **Position translator converts to original**
   - Before returning citations, translate cleanStart/End → originalStart/End
   - TransformationMap provides O(1) lookup

**Benefits:**
- Parser logic stays simple (works with normalized text)
- User always gets accurate original positions
- No position drift accumulation
- Testable: verify original positions match input text

## Type System Design

### Discriminated Union Citation Types

All citation types use discriminated unions with a `type` field:

```typescript
type Citation = FullCaseCitation | StatuteCitation | IdCitation

interface FullCaseCitation {
  type: "case"
  volume: number
  reporter: string
  page: number
  // ...
}
```

**Why discriminated unions:**
- TypeScript compiler enforces exhaustive switch statements
- No instanceof checks or type guards needed (better DX)
- Auto-completion shows only valid fields per type
- Compile-time safety prevents field access errors

**Minimalism:**
- Phase 1 defines only 3 citation types (case, statute, id)
- More added in Phase 2/4 as parsing implements them
- Prevents over-engineering

### Type Re-exports

```typescript
// src/types/index.ts - internal type aggregation
export type { Span, Citation, /* ... */ } from "./span"

// src/index.ts - public API
export type { Span, Citation, /* ... */ } from "./types"
```

**Why two levels:**
- Internal modules import from `./types` (relative path)
- External consumers import from `eyecite-ts` (package entry)
- Consistent import structure supports refactoring

## Parsing Pipeline Architecture

**Phase 2 implements this pipeline:**

```
Input Text
  ↓
Clean Layer (HTML removal, normalization)
  ↓ (produces TransformationMap)
Extract Layer (regex-based citation detection)
  ↓ (produces raw matches with clean positions)
Position Translator (clean → original positions)
  ↓
Citation[] (with original positions)
```

**Key Principles:**

1. **Layer separation** - Each layer has single responsibility
2. **Position tracking** - TransformationMap flows through pipeline
3. **No backtracking** - One-pass extraction (performance)
4. **Immutable text** - Cleaned text never modified after cleaning

## Tree-Shaking Strategy

### Bundle Size Budget: <50KB gzipped

**Problem:** reporters-db contains ~500 reporters with metadata (~200KB JSON)

**Solutions (decision required in Phase 1):**

**Option A: Inline all reporters**
- Pros: Simple, zero network requests
- Cons: Violates <50KB budget, unused reporters bundled

**Option B: Tree-shakeable reporters**
- Pros: Consumers import only needed reporters
- Cons: Complex build, requires manual reporter selection

**Option C: CDN + cache**
- Pros: Zero bundle cost, lazy-load reporters
- Cons: Network dependency, offline mode broken

**Current Status:** Pending decision (marked as blocker in STATE.md)

**Implementation requirements:**
- `sideEffects: false` in package.json (already set in 01-01)
- Pure ESM exports (no CommonJS side effects)
- Named exports over default exports (better tree-shaking)

## Build Configuration Strategy

**Phase 1 (01-02) will configure:**

### tsdown (TypeScript bundler)
- Input: `src/index.ts`
- Output: `dist/index.js` (ESM), `dist/index.cjs` (CommonJS), `dist/index.d.ts` (types)
- Format: ESM + CJS dual publish
- Target: ES2020 (enables lookbehind regex for "Id." disambiguation)
- Minification: Enabled for production builds

### Biome (linter/formatter)
- Replaces ESLint + Prettier (faster, zero-dependency)
- Rules: TypeScript strict mode, no unused vars, consistent formatting
- Integration: Git pre-commit hook

### Vitest (test runner)
- Unit tests: Type checks, position tracking, regex patterns
- Integration tests: End-to-end citation extraction
- Coverage target: >90% for parser core

## Testing Strategy

**Phase 2+ will implement:**

### Position Accuracy Tests
```typescript
test("position tracking survives HTML entity removal", () => {
  const input = "Smith&nbsp;v.&nbsp;Doe, 500 F.2d 123"
  const citations = extract(input)

  // Verify original positions point to correct text
  expect(input.slice(citations[0].span.originalStart, citations[0].span.originalEnd))
    .toBe("500 F.2d 123")
})
```

### ReDoS Protection Tests
- Measure regex execution time per citation
- Fail if any pattern exceeds 100ms
- Use safe-regex analyzer in CI

### Cross-browser Tests
- Vitest browser mode (Playwright)
- Test on Chrome, Firefox, Safari
- Verify regex compatibility (no PCRE-only patterns)

## Performance Targets

- **Extraction:** <100ms for 10,000-word document
- **Bundle size:** <50KB gzipped (total package)
- **Tree-shaking:** Unused citation types fully eliminated
- **Position tracking:** <5% overhead vs. non-tracking extraction

## Security Considerations

1. **No eval or Function constructor** - All parsing is static regex
2. **ReDoS prevention** - Regex patterns audited for catastrophic backtracking
3. **Input sanitization** - HTML cleaned before parsing (XSS prevention)
4. **Type safety** - Discriminated unions prevent type confusion attacks

## Migration from Python eyecite

**Compatibility goal:** Same citation detection as Python version

**Differences documented:**
- JavaScript regex limitations (no Unicode categories, different flags)
- TransformationMap is explicit (Python tracks implicitly)
- Discriminated unions replace Python dataclasses

**Testing approach:**
- Port Python test cases to TypeScript
- Add regression tests for JS-specific edge cases
- Maintain parity test suite (same inputs, same outputs)

## Future Phases

**Phase 2:** Parser implementation (extract layer)
**Phase 3:** Annotation system (reporter resolution)
**Phase 4:** Full citation resolution (case law database integration)

Each phase builds on this architectural foundation. Position tracking and type system established in Phase 1 remain unchanged.
