# Architecture Research: Citation Extraction Library

**Domain:** Legal citation extraction / text parsing library
**Researched:** 2026-02-04
**Confidence:** HIGH (based on eyecite Python implementation + text parsing patterns)

## Standard Architecture

### System Overview

Citation extraction follows a **four-layer pipeline architecture**, treating text as an input stream that flows through progressively enriched stages. This pattern is common across text parsing libraries (spaCy, Beautiful Soup) and aligns with eyecite's proven design.

```
┌────────────────────────────────────────────────────────┐
│                     INPUT LAYER                        │
│  Raw Text → Cleaning Functions → Cleaned Text         │
├────────────────────────────────────────────────────────┤
│                  TOKENIZATION LAYER                    │
│  Text → Regex Patterns → Tokens (span, type, value)   │
├────────────────────────────────────────────────────────┤
│                  EXTRACTION LAYER                      │
│  Tokens → Reporters DB → Citation Objects             │
│  (with span, source, type info)                        │
├────────────────────────────────────────────────────────┤
│                  RESOLUTION LAYER                      │
│  Citations → Resolve Supra/Id → Full References       │
│  → Annotation/Output                                  │
└────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|-----------------|------------------------|
| **Cleaners** | Remove OCR noise, normalize whitespace, fix encoding issues | Modular functions (one per cleaning strategy); user-composable |
| **Tokenizers** | Match regex patterns against text; produce tokens with span information | Strategy pattern: default (regex via pyahocorasick equivalent) or high-perf (Hyperscan equivalent) |
| **Extractors** | Convert tokens → citation objects with metadata; validate against reporter DB | Citation factory functions; reporter/edition lookups |
| **Resolvers** | Link short-form citations (supra, id) to their full antecedents; resolve ambiguities | Graph-based or heuristic matching; maintains citation context |
| **Annotators** | Insert markup at citation positions; handle span diffs | Diff algorithm (original vs. cleaned); position reconciliation |
| **Data** | Reporter, court, law, journal databases | JSON files; tree-shakeable exports by category |

## Recommended Project Structure

```
src/
├── index.ts                    # Main entry point; public API exports
│
├── clean/                      # Text preprocessing (LOWER LAYER)
│   ├── index.ts               # Export cleanText() and named cleaners
│   ├── cleanText.ts           # Orchestrates sequential cleaning
│   ├── cleaners/              # Individual cleaning functions
│   │   ├── removeLineBreaks.ts
│   │   ├── normalizeWhitespace.ts
│   │   ├── fixUnicodeApostrophes.ts
│   │   └── ...other cleaners
│   └── types.ts               # Cleaner function signature types
│
├── tokenize/                   # Text → tokens (SECOND LAYER)
│   ├── index.ts               # Export getTokens() + tokenizer strategies
│   ├── Tokenizer.ts           # Abstract tokenizer interface
│   ├── RegexTokenizer.ts      # Default: regex-based tokenization
│   ├── HyperscanTokenizer.ts   # Optional: high-perf alternative (if used)
│   ├── types.ts               # Token, TokenType definitions
│   └── patterns/              # Regex patterns (organized by citation type)
│       ├── casePatterns.ts
│       ├── lawPatterns.ts
│       ├── journalPatterns.ts
│       └── patternUtils.ts    # Shared regex utilities
│
├── extract/                    # Tokens → citation objects (THIRD LAYER)
│   ├── index.ts               # Export getCitations()
│   ├── CitationExtractor.ts   # Main extraction orchestrator
│   ├── extractors/            # Specific extractors by citation type
│   │   ├── FullCaseExtractor.ts
│   │   ├── ShortCaseExtractor.ts
│   │   ├── IdExtractor.ts
│   │   ├── SupraExtractor.ts
│   │   ├── LawExtractor.ts
│   │   └── JournalExtractor.ts
│   ├── types.ts               # Citation class definitions
│   └── utils.ts               # Extraction helpers (span calc, validation)
│
├── resolve/                    # Citations → resolved references (OPTIONAL LAYER)
│   ├── index.ts               # Export resolveCitations()
│   ├── CitationResolver.ts    # Main resolver
│   ├── resolvers/             # Strategy per citation type
│   │   ├── SupraResolver.ts
│   │   ├── IdResolver.ts
│   │   └── ShortCaseResolver.ts
│   └── types.ts               # Resolution result types
│
├── annotate/                   # Text → annotated text (OUTPUT LAYER)
│   ├── index.ts               # Export annotateCitations()
│   ├── Annotator.ts           # Main annotation orchestrator
│   ├── DiffAlgorithm.ts       # Span reconciliation (handles cleaned vs original)
│   └── types.ts               # Annotation format types
│
├── data/                       # Databases (tree-shakeable)
│   ├── index.ts               # Re-exports all databases
│   ├── reporters.ts           # Reporter metadata (~600KB)
│   ├── courts.ts              # Court metadata
│   ├── laws.ts                # Law citations database
│   ├── journals.ts            # Journal citations database
│   └── types.ts               # Reporter, Edition, Court types
│
├── models/                     # Shared data structures
│   ├── index.ts               # Re-export all models
│   ├── Citation.ts            # Base Citation class + hierarchy
│   ├── Reporter.ts            # Reporter, Edition classes
│   ├── Court.ts               # Court class
│   └── types.ts               # Shared enums (CitationType, etc.)
│
├── types/                      # Project-wide type definitions
│   ├── index.ts               # Re-export all types
│   └── common.ts              # Shared types (Span, Token, etc.)
│
└── utils/                      # Utilities (internal)
    ├── index.ts
    ├── stringUtils.ts
    ├── spanUtils.ts           # Critical: span merging, overlaps
    ├── regexUtils.ts
    └── validation.ts
```

### Structure Rationale

- **Layered organization:** Each layer imports from layers below; no upward dependencies. Enables understanding data flow; easy to test each layer in isolation.
- **data/ folder:** Separate databases from logic. Allows consumers to import only needed databases (tree-shakeable with `"sideEffects": false`).
- **models/ folder:** Shared classes used across layers. Not algorithm-specific; contains data structures.
- **types/ folder:** Pure TypeScript interfaces/types; re-exported from each module for convenience.
- **Flat module structure within each layer:** `extract/extractors/` contains one file per extractor; easy to spot code, enables tree-shaking individual extractors.

## Architectural Patterns

### Pattern 1: Tokenizer Strategy Pattern

**What:** Tokenizers are interchangeable; user can choose performance profile.

**When to use:** When performance varies significantly by implementation (regex pool vs. compiled FSM) and both implementations serve the same contract.

**Trade-offs:**
- PRO: Users choose performance vs. memory; enables progressive enhancement
- CON: Two implementations to maintain; must keep APIs identical

**Example:**
```typescript
// User selects strategy
const citations = getCitations(text, {
  tokenizer: new RegexTokenizer(),    // or HyperscanTokenizer
});

// Both implement same interface
interface Tokenizer {
  tokenize(text: string): Token[];
}
```

### Pattern 2: Composable Cleaners

**What:** Text cleaning is a pipeline of optional, user-selectable functions.

**When to use:** When preprocessing is variable (OCR'd text needs different cleaning than API text); users should control trade-offs.

**Trade-offs:**
- PRO: Flexible; users only pay for cleaners they need; easy to add new cleaners
- CON: Order matters; must document this; harder to debug cleaning pipelines

**Example:**
```typescript
const cleaned = cleanText(text, [
  removeDiacritics(),
  normalizeWhitespace(),
  fixCommonOCRErrors(),
  // Custom cleaners also work
  (txt) => txt.replace(/foo/, 'bar'),
]);
```

### Pattern 3: Citation Polymorphism via Discriminated Union

**What:** Citation types are discriminated unions (CitationType enum); safe runtime matching.

**When to use:** When returning different citation shapes from `getCitations()`; avoids `instanceof` checks; enables TypeScript type narrowing.

**Trade-offs:**
- PRO: Type-safe; pattern matching on `type` field; extensible to new citation types
- CON: Slightly more verbose than inheritance; serialization is simpler though

**Example:**
```typescript
type Citation = FullCaseCitation | ShortCaseCitation | IdCitation | SupraCitation | ...;

// Type-safe matching
if (citation.type === CitationType.FullCase) {
  // TypeScript knows citation is FullCaseCitation
  console.log(citation.plaintiff, citation.defendant);
}
```

### Pattern 4: Span-Aware Annotation (Diff Algorithm)

**What:** Annotations work even when text has been cleaned by tracking original spans.

**When to use:** When source text may be transformed (OCR cleanup) before citation extraction; annotation must point to original locations.

**Trade-offs:**
- PRO: Annotation is robust to cleaning; solves the "text changed but I want original coordinates" problem
- CON: Complex algorithm; requires bidirectional span mapping

**Example:**
```typescript
// Original: "The  case  (with  extra  spaces)"
// Cleaned: "The case (with extra spaces)"
// Citation at span [4, 8] in cleaned text
// Annotator resolves to span in original

const result = annotateCitations(originalText, cleanedText, citations);
// Spans point to originalText
```

## Data Flow

### Citation Extraction Flow

```
User calls getCitations(text)
        ↓
[1. Clean] cleanText(text, [cleaners])
        ↓
[2. Tokenize] tokenizer.tokenize(cleanedText) → Token[]
        ↓
[3. Extract] CitationExtractor processes Tokens
        ├─→ For each Token matching a citation pattern:
        │   ├─ Route to appropriate Extractor (FullCaseExtractor, etc.)
        │   ├─ Validate against reporters DB / laws DB
        │   └─ Create Citation object with type, span, metadata
        ↓
[4. Resolve] CitationResolver (optional)
        ├─→ For each Citation with type=Supra/Id:
        │   └─ Find antecedent in preceding citations
        ↓
[5. Return] Citation[] with spans, metadata, resolved references
```

### Annotation Flow

```
User calls annotateCitations(originalText, citations, template)
        ↓
[1. Get cleaned] Clean original text (must use same cleaners as extraction)
        ↓
[2. Build span map] cleanedText ↔ originalText position mappings
        ↓
[3. Reconcile citations] Map citation spans (in cleanedText) → originalText
        ↓
[4. Sort & diff] Apply diff algorithm to insert markup safely
        ↓
[5. Return] Annotated original text with markup at citation positions
```

### State During Processing

```
Text Object (immutable)
  ├─ original: string
  ├─ cleaned: string (result of layer 1)
  └─ cleaners: Cleaner[] (for span reconstruction)

Token (immutable)
  ├─ span: [start, end] (in cleaned text)
  ├─ text: string (extracted substring)
  ├─ type: TokenType
  └─ regexId: string (which regex matched)

Citation (immutable)
  ├─ type: CitationType
  ├─ span: [start, end] (in original or cleaned text)
  ├─ text: string
  ├─ reporters?: Reporter[]
  ├─ resolvedTo?: Citation (if this is a supra/id)
  └─ metadata: { court?, year?, volume?, ... }
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **0-1K users** | Monolithic; no changes. Tokenizer strategy is sufficient for perf tuning. |
| **1K-100K users** | Profiling may show regex tokenization is bottleneck. Switch to HyperscanTokenizer variant if available; otherwise consider regex caching. |
| **100K+ users** | At scale, database (reporters.json) lookups become dominant. Consider: (1) Pre-index reporters DB; (2) Lazy-load only needed reporters; (3) Implement LRU cache for repeated lookups. Span diffing for annotation may become slow on massive texts; consider streaming annotation. |

### Performance Bottlenecks (in order)

1. **Regex tokenization:** Thousands of patterns applied per text. Mitigate: High-perf tokenizer (Hyperscan-equivalent) or regex pooling.
2. **Reporter database lookups:** O(n) per token where n = reporters.json size. Mitigate: Index by first few chars; cache common courts.
3. **Span diffing (annotation only):** O(text_length) diff algorithm. Mitigate: Only annotate citations, not entire document; streaming output.

## Anti-Patterns

### Anti-Pattern 1: Throwing Errors on Ambiguous Citations

**What people do:** Raise an error if a token matches multiple reporters or citation patterns.

**Why it's wrong:** In real legal text, ambiguity is common (same abbreviation for different reporters). Consumers may have domain knowledge to resolve; throwing prevents graceful degradation.

**Do this instead:** Return citation with `ambiguous: true` flag and all possible interpretations. Let consumer choose or handle gracefully.

```typescript
// Bad
if (possibleReporters.length > 1) {
  throw new AmbiguousReporterError();
}

// Good
return {
  type: CitationType.FullCase,
  span,
  text,
  possibleReporters: [Reporter1, Reporter2],
  ambiguous: true,
};
```

### Anti-Pattern 2: Modifying Input Text During Processing

**What people do:** Mutate the input text during cleaning or tokenization.

**Why it's wrong:** Breaks span tracking; annotation cannot map positions back to original. Makes debugging harder; violates functional paradigm.

**Do this instead:** Every transformation returns new immutable string; track span mappings alongside.

```typescript
// Bad
let text = originalText;
text = text.replace(/\s+/, ' ');  // Now spans are invalid

// Good
const cleaned = cleanText(originalText, [normalizeWhitespace()]);
// cleanText returns { text: cleaned, spanMap: ... }
```

### Anti-Pattern 3: Citation Class Inheritance Instead of Composition

**What people do:** Build a deep class hierarchy (Citation → CaseCitation → FullCaseCitation → ...).

**Why it's wrong:** Tight coupling; hard to add new citation types; inheritance doesn't model the domain well (a supra citation is contextual, not a subtype).

**Do this instead:** Use discriminated union types + composition. Each citation has a `type` field and optional metadata.

```typescript
// Bad
class FullCaseCitation extends CaseCitation extends Citation { ... }
new FullCaseCitation().isFullCase()  // instanceof checks

// Good
type Citation =
  | { type: 'FullCase'; plaintiff: string; defendant: string; ... }
  | { type: 'ShortCase'; ... }
  | { type: 'Supra'; ... };

// Type-safe pattern matching
if (c.type === 'FullCase') { c.plaintiff }
```

### Anti-Pattern 4: Hardcoding Reporter DB Lookups

**What people do:** Build reporter lookup into the extraction layer; mix data + logic.

**Why it's wrong:** Makes it impossible to swap databases or add custom reporters. Tight coupling to data format. Hard to tree-shake.

**Do this instead:** Separate data (reporters.json as importable module) from logic (lookup functions). Inject data dependency.

```typescript
// Bad
const extract = (token) => {
  const reporters = require('./data/reporters.json');
  return lookupReporter(token, reporters);
};

// Good
export const createCitationExtractor = (reportersDb: ReporterDB) => ({
  extract: (token) => lookupReporter(token, reportersDb),
});
// Caller decides which data to pass
```

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **reporters-db** (external npm package) | Import JSON files on startup; tree-shakeable. No API calls. | Consider: keep in sync with Python version; version together. |
| **LLM (future)** | Optional resolver strategy for ambiguous citations. | Not in MVP; would use adapter pattern to plug in resolver. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **clean → tokenize** | String (cleaned text) | One-way; tokenizer never calls cleaner. |
| **tokenize → extract** | Token[] | Extract receives tokens + original spans. |
| **extract → resolve** | Citation[] | Resolver reorders/links; doesn't modify individual citations. |
| **resolve → annotate** | Citation[] | Annotator places markup based on spans. |

## Build Order Implications

Recommended implementation order based on dependencies:

1. **types/ + models/** — Define all types, interfaces, enums upfront. No dependencies on other layers. ✓ Test-first friendly.
2. **data/** — Import reporters-db; create tree-shakeable re-exports. No dependencies on logic.
3. **clean/** — Implement cleaners; no dependencies on tokenizers or extractors. ✓ Self-contained; easy to test.
4. **tokenize/** — Implement tokenizers. Depends on: types, clean (optional; used for span mapping). ✓ Can be stubbed with regex tokenizer first.
5. **extract/** — Implement extractors. Depends on: types, data, tokenize. ✓ Core complexity; should come after everything else.
6. **resolve/** — Implement resolvers. Depends on: types, extract (to read citation context).
7. **annotate/** — Implement annotators. Depends on: types, extract, clean (for span mapping).
8. **index.ts** — Public API entry point. Glues all layers together.

## Module Export Strategy (Tree-Shaking)

To enable tree-shaking:

- **Each submodule exports individually:** `export const getCitations = (...)`
- **index.ts re-exports:** `export { getCitations, annotateCitations, cleanText, resolveCitations }`
- **Data (reporters.ts, etc.) are separate exports:** `export const reporters = { ... }`
- **Avoid default exports:** Use named exports exclusively (tree-shakers prefer them).
- **Mark package.json:** `"sideEffects": false` to signal no global mutation.
- **Use ES6 modules:** tsconfig.json: `"module": "ESNext"` for bundlers to tree-shake.

## Sources

- [eyecite Python library](https://github.com/freelawproject/eyecite) - Authoritative source for citation extraction architecture
- [eyecite API documentation](https://freelawproject.github.io/eyecite/) - Official component structure (HIGH)
- [eyecite whitepaper (ResearchGate)](https://www.researchgate.net/publication/355324840_eyecite_A_tool_for_parsing_legal_citations) - Technical architecture (MEDIUM)
- [spaCy Processing Pipelines](https://spacy.io/usage/processing-pipelines) - Standard NLP pipeline patterns (MEDIUM)
- [ts-parsec parser combinators](https://github.com/microsoft/ts-parsec) - TypeScript parser architecture patterns (MEDIUM)
- [Tree-shaking guide (SoftwareMill)](https://softwaremill.com/a-novel-technique-for-creating-ergonomic-and-tree-shakable-typescript-libraries/) - Module export strategy (MEDIUM)
- [TypeScript Library Structures (official)](https://www.typescriptlang.org/docs/handbook/declaration-files/library-structures.html) - TypeScript best practices (HIGH)

---

*Architecture research for: eyecite-ts citation extraction library*
*Researched: 2026-02-04*
