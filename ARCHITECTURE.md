# Architecture Documentation

## Overview

eyecite-ts is a TypeScript port of Python eyecite — a zero-dependency, browser-compatible library for extracting, resolving, and annotating legal citations. It is published on npm as `eyecite-ts` at v0.10.1.

## Core Constraints

1. **Zero runtime dependencies** - All parsing, resolution, and annotation logic is self-contained
2. **Browser compatibility** - No Node.js-specific APIs (fs, path, etc.)
3. **Tree-shakeable** - Consumers only bundle what they use (<50KB brotli target)
4. **Type-safe** - Discriminated unions and strict TypeScript eliminate runtime type checks
5. **Position accuracy** - Dual position tracking prevents offset drift through text transformations

## Parsing Pipeline

Citations flow through a 4-stage pipeline:

```
Raw Input Text
  ↓
[Optional: Footnote Detection] (detectFootnotes, pre-clean)
  ↓
Clean Layer (HTML removal, normalization → TransformationMap)
  ↓
Tokenize Layer (broad regex pass → candidate tokens)
  ↓
Extract Layer (validate tokens → typed Citation objects)
  ↓
[Optional: Resolve Layer] (link short-forms to antecedents)
  ↓
Citation[] (with originalStart/End positions)
```

**Key principles:**

1. **Layer separation** - Each layer has a single responsibility
2. **Position tracking** - `TransformationMap` flows from clean through extract
3. **No backtracking** - One-pass extraction (performance)
4. **Immutable text** - Cleaned text is never modified after cleaning
5. **Intentionally broad tokenization** - The tokenize layer captures potential matches without validation; the extract layer performs validation and type assignment

## Position Tracking Architecture

### Problem: Position Offset Drift

Legal citations must return accurate character positions in the original input text. However, parsing requires text transformations:

- HTML entity removal (`&nbsp;` → space)
- Whitespace normalization (multiple spaces → single space)
- Unicode normalization (smart quotes → straight quotes)

Each transformation shifts character positions. Naive approaches lead to position drift where returned spans point to the wrong text.

### Solution: Dual-Position Span

```typescript
interface Span {
  cleanStart: number      // Position in transformed text (used during parsing)
  cleanEnd: number
  originalStart: number   // Position in original text (returned to user)
  originalEnd: number
}
```

The clean layer builds a `TransformationMap` that maps between cleaned and original coordinates using a lookahead algorithm (`maxLookAhead=20`) in `cleanText.ts:rebuildPositionMaps`. Parsers operate on cleaned text using `cleanStart/cleanEnd`; all user-facing results carry `originalStart/originalEnd`.

**Benefits:**
- Parser logic stays simple (works with normalized text)
- User always gets accurate original positions
- No drift accumulation across transformations
- Testable: verify `original[Start..End]` slices into the input text correctly

### Full Span

The optional `fullSpan` field extends a case citation's `span` to cover from the case name through the final closing parenthetical (including chained parentheticals and subsequent history). The core `span` field remains citation-core-only for backward compatibility.

## Type System Design

### Discriminated Union Citation Types

All citation types share a `type` discriminator field:

```typescript
type Citation =
  | FullCaseCitation       // "500 F.2d 123"
  | StatuteCitation        // "42 U.S.C. § 1983"
  | JournalCitation        // "100 Harv. L. Rev. 1234"
  | NeutralCitation        // "2020 WL 123456"
  | PublicLawCitation      // "Pub. L. No. 116-283"
  | FederalRegisterCitation// "85 Fed. Reg. 12345"
  | StatutesAtLargeCitation// "134 Stat. 4416"
  | ConstitutionalCitation // "U.S. Const. art. III, § 2"
  | IdCitation             // "Id." / "Id. at 125"
  | SupraCitation          // "Smith, supra, at 460"
  | ShortFormCaseCitation  // "500 F.2d at 125"
```

Switch on `citation.type` for exhaustive, compiler-enforced field access. The compiler rejects access to fields that don't exist on the given variant.

`Volume` is typed as `number | string` to handle both standard volumes and hyphenated volumes (e.g., `"1984-1"`).

### CitationBase

All types extend `CitationBase`, which carries: `text`, `span`, `confidence` (0–1), `matchedText`, `processTimeMs`, optional `warnings`, optional `signal` (introductory citation signal), and optional footnote fields (`inFootnote`, `footnoteNumber`).

### Component Spans

Every citation type exposes an optional `spans` field containing per-component `Span` objects. For example, a `FullCaseCitation` has `spans?.caseName`, `spans?.volume`, `spans?.reporter`, `spans?.page`, `spans?.court`, `spans?.year`, etc. This allows consumers to highlight or extract individual citation parts without re-parsing.

For case citations, `spans.metadataParenthetical` is the parent range; `spans.court` and `spans.year` are sub-ranges within it. Consumers should use either the parent or child spans, not both.

### Type Re-exports

```typescript
// src/types/index.ts — internal type aggregation
export type { Span, Citation, ... } from "./citation"

// src/index.ts — public API surface
export type { Span, Citation, ... } from "./types"
```

Internal modules import from `@/types` (path alias). External consumers import from `eyecite-ts` (package entry point).

## Tree-Shaking Strategy

### Entry Points

The package exposes four entry points, each independently tree-shakeable:

| Import path        | Contents                                             | Size limit |
|--------------------|------------------------------------------------------|------------|
| `eyecite-ts`       | Core extraction + resolution (no reporter data)      | <50 KB     |
| `eyecite-ts/data`  | Reporter database (~500 reporters, lazy-loaded)      | —          |
| `eyecite-ts/annotate` | Text annotation utilities                         | —          |
| `eyecite-ts/utils` | Post-extraction utilities (context, grouping, etc.)  | <3 KB      |

Reporter data (~200KB JSON) is shipped in the separate `eyecite-ts/data` entry point. The core extraction engine does not import reporter data directly — it accepts an optional reporter map argument, allowing consumers to omit the data bundle entirely when they only need pattern matching without reporter validation.

The static `inferredCourt` lookup (court level/jurisdiction from reporter series) is embedded in the core bundle to avoid a `eyecite-ts/data` dependency for that feature.

**Implementation details:**
- `"sideEffects": false` in package.json
- Pure ESM exports (no CommonJS side effects in module graph)
- Named exports throughout (no default exports in public API)

## Footnote Detection

Footnote detection is opt-in via `extractCitations(text, { detectFootnotes: true })`. It runs before cleaning on the raw text to preserve newline structure.

### Detection Strategies

**HTML** (`src/footnotes/htmlDetector.ts`): Regex-based tag scanner for `<footnote>`, `<fn>`, and elements with footnote class/id attributes. No DOM dependency.

**Plain text** (`src/footnotes/textDetector.ts`): Finds separator lines (5+ dashes/underscores) followed by numbered markers (`1.`, `FN1.`, `[1]`, `n.1`).

`detectFootnotes(text)` selects the strategy automatically: HTML detection first, plain-text fallback.

### FootnoteMap and Zone Tagging

`detectFootnotes` returns a `FootnoteMap` (array of `{ start, end, footnoteNumber }` zones in raw-text coordinates). The pipeline maps zones through `TransformationMap` to clean-text coordinates (`src/footnotes/mapZones.ts`), then tags each citation with `inFootnote`/`footnoteNumber` via binary search (`src/footnotes/tagging.ts`).

## Parallel Citation Detection

The extract layer detects parallel citation groups (same case reported in multiple reporters) using a lookahead algorithm in `src/extract/detectParallel.ts`. Two case citations are considered parallel when:

1. They are both case-type tokens
2. A comma separates them within `MAX_PROXIMITY` (5) characters
3. Both citations share a closing parenthetical (verified against the cleaned text)

Detected parallel citations are linked via `groupId` on each `FullCaseCitation`. The primary citation also carries a `parallelCitations` array with the bare volume/reporter/page of each parallel.

## String Citation Detection

String citations (lists of citations supporting a single proposition, e.g., `"See Smith, 500 F.2d 123; Jones, 400 F.2d 456."`) are detected by `src/extract/detectStringCites.ts`. Each citation in a string group carries `stringCitationGroupId`, `stringCitationIndex`, and `stringCitationGroupSize`.

## Resolution

`DocumentResolver` (`src/resolve/DocumentResolver.ts`) resolves short-form citations to their full antecedents:

- **Id.** resolves to the most recently cited authority within scope
- **Supra** resolves by fuzzy party-name matching (Levenshtein distance via BK-tree, `src/resolve/bkTree.ts`)
- **Short-form case** resolves by matching volume and reporter

### Scope Strategies

The resolver accepts a `scopeStrategy` option:

- `"none"` — no scope limits (default)
- `"paragraph"` — auto-detected paragraph boundaries (double newlines)
- `"footnote"` — footnote-zone isolation: Id. is strict (same zone only); supra/shortFormCase can cross from footnotes to body text

## Build Configuration

### tsdown

- Input: one entry per package export (`src/index.ts`, `src/data/index.ts`, `src/annotate/index.ts`, `src/utils/index.ts`)
- Output: ESM (`.mjs`) + CJS (`.cjs`) dual publish with `.d.mts`/`.d.cts` declaration files
- Target: ES2020 (enables lookbehind regex for "Id." disambiguation)

### Biome

Linter and formatter (replaces ESLint + Prettier). Configured in `biome.json`. Key rules:
- `noExplicitAny: error` and `noImplicitAnyLet: error` — strict typing throughout
- `noAssignInExpressions: off` — regex exec loops use assignment-in-while pattern
- `noForEach: off` — forEach is allowed
- 100-character line width, double quotes, trailing commas, semicolons as needed

### Vitest

Test runner. Test files mirror `src/` structure under `tests/`. Coverage via `@vitest/coverage-v8` (requires Node 20+; CI runs coverage on Node 22 only).

## Testing

The test suite contains **1,748 tests across 72 files** (9 skipped). Tests are organized to mirror the source tree, with integration tests in `tests/integration/`.

### Position Accuracy Tests

```typescript
test("position tracking survives HTML entity removal", () => {
  const input = "Smith&nbsp;v.&nbsp;Doe, 500 F.2d 123"
  const citations = extractCitations(input)

  expect(input.slice(
    citations[0].span.originalStart,
    citations[0].span.originalEnd
  )).toBe("500 F.2d 123")
})
```

### ReDoS Protection

Regex patterns are audited for catastrophic backtracking. Patterns must avoid nested quantifiers. Execution time per citation is measured; patterns exceeding 100ms fail CI.

### Cross-browser Compatibility

No PCRE-only regex features. Patterns use ES2020 features available across Chrome, Firefox, and Safari.

## Performance Targets

- **Extraction:** <100ms for a 10,000-word document
- **Bundle size:** <50KB brotli (core entry point); ~20KB brotli typical
- **Tree-shaking:** Reporter data (~200KB) is excluded from the core bundle
- **Position tracking:** <5% overhead vs. non-tracking extraction

## Security Considerations

1. **No eval or Function constructor** — All parsing uses static regex
2. **ReDoS prevention** — Patterns audited for catastrophic backtracking; nested quantifiers are forbidden
3. **Input sanitization** — HTML is stripped before parsing (no XSS surface from citation output)
4. **Type safety** — Discriminated unions prevent type confusion at callsites

## Migration from Python eyecite

Both libraries are mature and in active use. eyecite-ts implements the same citation extraction semantics as Python eyecite. Key differences:

- **JavaScript regex limitations** — No Unicode property escapes in the same form; ES2020 lookbehind used for "Id." disambiguation instead
- **Explicit TransformationMap** — Python tracks position shifts implicitly; eyecite-ts makes the mapping a first-class data structure
- **Discriminated unions** — Replace Python dataclasses; TypeScript's exhaustiveness checking replaces `isinstance()` guards
- **Separate reporter data entry point** — Enables tree-shaking; Python always loads reporters eagerly

The test suite ports Python eyecite test cases directly, maintaining detection parity as a regression gate.
