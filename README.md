# eyecite-ts

[![CI](https://github.com/medelman17/eyecite-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/medelman17/eyecite-ts/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/medelman17/eyecite-ts/branch/main/graph/badge.svg)](https://codecov.io/gh/medelman17/eyecite-ts)
[![npm version](https://img.shields.io/npm/v/eyecite-ts.svg)](https://www.npmjs.com/package/eyecite-ts)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/eyecite-ts)](https://bundlephobia.com/package/eyecite-ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/node/v/eyecite-ts.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](https://www.npmjs.com/package/eyecite-ts)

TypeScript legal citation extraction library — port of Python [eyecite](https://github.com/freelawproject/eyecite).

Extract, resolve, and annotate legal citations from court opinions and legal documents with zero runtime dependencies.

## Features

- **Full citation extraction**: Case citations, statutes, journal articles, neutral citations, public laws, federal register
- **Case name & full span**: Backward search extracts case names ("Smith v. Jones", "In re Smith"), `fullSpan` covers case name through closing parenthetical
- **Complex parentheticals**: Unified parser handles court+year, full dates (Jan. 15, 2020 / January 15, 2020 / 1/15/2020), disposition (en banc, per curiam), and chained parentheticals
- **Short-form resolution**: Id./Ibid., supra, and short-form case citations resolved to their full antecedents
- **Reporter database**: 1,200+ reporters with variant matching and confidence scoring
- **Citation annotation**: HTML markup with auto-escape XSS protection and position tracking
- **Bundle optimization**: Tree-shakeable exports, lazy-loaded reporter data, separate entry points
- **TypeScript native**: Discriminated unions, conditional types, type guards, full IntelliSense
- **Zero dependencies**: No runtime dependencies, 4.4KB gzipped core bundle

## Installation

```bash
npm install eyecite-ts
```

## Quick Start

```typescript
import { extractCitations } from 'eyecite-ts'

const text = 'See Smith v. Jones, 500 F.2d 123 (9th Cir. Jan. 15, 2020)'
const citations = extractCitations(text)

console.log(citations[0])
// {
//   type: 'case',
//   volume: 500,
//   reporter: 'F.2d',
//   page: 123,
//   court: '9th Cir.',
//   year: 2020,
//   caseName: 'Smith v. Jones',
//   date: { iso: '2020-01-15', parsed: { year: 2020, month: 1, day: 15 } },
//   confidence: 0.85,
//   span: { originalStart: 20, originalEnd: 33, ... },
//   fullSpan: { originalStart: 4, originalEnd: 57, ... }
// }
```

## Citation Extraction

### Multiple Citation Types

```typescript
import { extractCitations } from 'eyecite-ts'

const text = `
  See Smith v. Jones, 500 F.2d 123 (9th Cir. 2020).
  Also 42 U.S.C. § 1983.
  Compare 123 Harv. L. Rev. 456.
`
const citations = extractCitations(text)

citations.forEach(citation => {
  console.log(citation.type) // 'case', 'statute', 'journal', etc.
})
```

### Async API

```typescript
import { extractCitationsAsync } from 'eyecite-ts'

const citations = await extractCitationsAsync(text)
```

### Custom Patterns

```typescript
import { extractCitations } from 'eyecite-ts'
import { casePatterns } from 'eyecite-ts'

// Extract only case citations
const citations = extractCitations(text, {
  patterns: casePatterns
})
```

### Custom Cleaners

```typescript
import { extractCitations, cleanText } from 'eyecite-ts'

// Use only HTML stripping
const citations = extractCitations(html, {
  cleaners: [(text) => text.replace(/<[^>]+>/g, '')]
})
```

## Case Names & Full Spans

Case citations can include the case name and full citation boundaries:

```typescript
const text = 'In Smith v. Jones, 500 F.2d 123 (9th Cir. 2020) (en banc), the court held...'
const citations = extractCitations(text)

if (citations[0].type === 'case') {
  console.log(citations[0].caseName)     // 'Smith v. Jones'
  console.log(citations[0].disposition)  // 'en banc'
  console.log(citations[0].fullSpan)     // covers "Smith v. Jones, 500 F.2d 123 (9th Cir. 2020) (en banc)"
  console.log(citations[0].span)         // covers "500 F.2d 123" only (citation core)
}
```

Procedural prefixes are recognized automatically:

```typescript
const text = 'In re Smith, 410 U.S. 113 (1973)'
// caseName: 'In re Smith'

const text2 = 'Ex parte Young, 209 U.S. 123 (1908)'
// caseName: 'Ex parte Young'
```

### Structured Dates

Parentheticals with full dates return structured date objects:

```typescript
const text = '500 F.3d 100 (2d Cir. Jan. 15, 2020)'
// date: { iso: '2020-01-15', parsed: { year: 2020, month: 1, day: 15 } }

const text2 = '410 U.S. 113 (1973)'
// date: { iso: '1973', parsed: { year: 1973 } }
```

Three date formats are supported: `Jan. 15, 2020`, `January 15, 2020`, and `1/15/2020`.

## Resolving Short-Form Citations

Short-form citations (Id., supra, short-form case) refer to earlier citations in the document. The resolution engine links them to their full antecedents.

### Convenience API

```typescript
import { extractCitations } from 'eyecite-ts'

const text = `
  Smith v. Jones, 500 F.2d 123 (2020).
  Id. at 125.
  Smith, supra, at 130.
  500 F.2d at 140.
`

const citations = extractCitations(text, { resolve: true })

// citations[1] is Id. citation
console.log(citations[1].resolution)
// { resolvedTo: 0, confidence: 1.0 }
```

### Power-User API

```typescript
import { extractCitations, resolveCitations } from 'eyecite-ts'

const citations = extractCitations(text)

const resolved = resolveCitations(citations, text, {
  scopeStrategy: 'paragraph',
  fuzzyPartyMatching: true,
  partyMatchThreshold: 0.8,
  reportUnresolved: true
})
```

### Resolution Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `scopeStrategy` | `'paragraph'` \| `'section'` \| `'footnote'` \| `'none'` | `'paragraph'` | How far back to search for antecedents |
| `autoDetectParagraphs` | `boolean` | `true` | Auto-detect paragraph boundaries from text |
| `paragraphBoundaryPattern` | `RegExp` | `/\n\n+/` | Pattern to detect paragraphs |
| `fuzzyPartyMatching` | `boolean` | `true` | Enable fuzzy party name matching for supra |
| `partyMatchThreshold` | `number` | `0.8` | Similarity threshold (0-1) for fuzzy matching |
| `allowNestedResolution` | `boolean` | `false` | Allow Id. to resolve to other short-form citations |
| `reportUnresolved` | `boolean` | `true` | Report failure reasons for unresolved citations |

### Resolution Examples

**Id. citations:**

```typescript
const text = 'Smith v. Jones, 500 F.2d 123. Id. at 125.'
const citations = extractCitations(text, { resolve: true })
// citations[1].resolution.resolvedTo === 0
```

**Supra citations:**

```typescript
const text = 'Smith v. Jones, 500 F.2d 123. Smith, supra, at 130.'
const citations = extractCitations(text, { resolve: true })
// citations[1].resolution.resolvedTo === 0 (party name matches "Smith")
```

**Short-form case citations:**

```typescript
const text = 'Brown v. Board, 347 U.S. 483. See 347 U.S. at 495.'
const citations = extractCitations(text, { resolve: true })
// citations[1].resolution.resolvedTo === 0 (volume/reporter matches)
```

**Unresolved citations:**

```typescript
const text = 'Id. at 100.' // Orphan Id. with no preceding citation
const citations = extractCitations(text, { resolve: true })
// citations[0].resolution.failureReason === 'No preceding full case citation found'
```

## Citation Annotation

Add HTML markup to citations in text:

```typescript
import { annotate } from 'eyecite-ts/annotate'
import { extractCitations } from 'eyecite-ts'

const text = 'See Smith v. Jones, 500 F.2d 123 (2020).'
const citations = extractCitations(text)

// Template mode
const result = annotate(text, citations, {
  template: { before: '<cite>', after: '</cite>' }
})
// result.text === 'See Smith v. Jones, <cite>500 F.2d 123</cite> (2020).'

// Callback mode (full control)
const result2 = annotate(text, citations, {
  callback: (citation, surrounding) => {
    if (citation.type === 'case') {
      return `<a href="/cases/${citation.volume}">${citation.matchedText}</a>`
    }
    return citation.matchedText
  }
})
```

Auto-escape is enabled by default for XSS protection:

```typescript
const result = annotate(text, citations, {
  template: { before: '<cite>', after: '</cite>' },
  autoEscape: true  // default — escapes &, <, >, ", ', /
})
```

## Reporter Validation

Validate case citations against the reporters database:

```typescript
import { extractWithValidation } from 'eyecite-ts'

const validated = await extractWithValidation(text, { validate: true })
// Confidence adjustments:
//   +0.2 boost for reporter match
//   -0.3 penalty for unknown reporter
//   -0.1 per extra match for ambiguous reporter
```

## Type System

All citation types use a discriminated union on the `type` field:

```typescript
import type {
  Citation,           // Union of all 9 types
  FullCaseCitation,
  StatuteCitation,
  JournalCitation,
  NeutralCitation,
  PublicLawCitation,
  FederalRegisterCitation,
  IdCitation,
  SupraCitation,
  ShortFormCaseCitation,
  CitationOfType,     // Extract subtype: CitationOfType<'case'> = FullCaseCitation
  ExtractorMap,       // Maps FullCitationType keys to citation subtypes
  FullCitation,       // Union of full citation types
  ShortFormCitation,  // Union of short-form types
} from 'eyecite-ts'
```

### Type Guards

```typescript
import {
  isFullCitation,
  isShortFormCitation,
  isCaseCitation,
  isCitationType,
  assertUnreachable
} from 'eyecite-ts'

// Specific guards
if (isFullCitation(citation)) {
  // citation: FullCitation
}

// Generic guard — narrows to any specific type
if (isCitationType(citation, 'statute')) {
  // citation: StatuteCitation
}

// Exhaustiveness check in switch statements
switch (citation.type) {
  case 'case': /* ... */ break
  case 'statute': /* ... */ break
  // ... all 9 types ...
  default: assertUnreachable(citation.type)
}
```

### Resolved Citation Types

`ResolvedCitation` uses a conditional type — `resolution` is only meaningfully present on short-form citations:

```typescript
import type { ResolvedCitation } from 'eyecite-ts'

// On short-form citations: resolution: ResolutionResult | undefined
// On full citations: resolution?: undefined
```

## Bundle Size

Three entry points for optimal tree-shaking:

| Entry Point | Import | Gzipped |
|------------|--------|---------|
| Core extraction | `eyecite-ts` | 4.4 KB |
| Annotation | `eyecite-ts/annotate` | 0.5 KB |
| Reporter data | `eyecite-ts/data` | 88.5 KB (lazy-loaded) |

```typescript
import { extractCitations } from 'eyecite-ts'           // Core only
import { annotate } from 'eyecite-ts/annotate'           // Annotation
import { loadReporters } from 'eyecite-ts/data'          // Reporter database
```

## Architecture

Citation extraction follows a 4-stage pipeline:

1. **Clean**: Remove HTML, normalize Unicode, fix smart quotes
2. **Tokenize**: Apply regex patterns to find citation candidates
3. **Extract**: Parse metadata (volume, reporter, page, etc.)
4. **Resolve** (optional): Link short-form citations to antecedents

All positions (spans) track both cleaned and original text offsets via `TransformationMap`.

See [ARCHITECTURE.md](ARCHITECTURE.md) for details.

## Development

```bash
pnpm install         # Install dependencies
pnpm test            # Run tests (vitest, watch mode)
pnpm exec vitest run # Run tests once
pnpm typecheck       # Type-check with tsc
pnpm build           # Build (ESM + CJS + DTS)
pnpm lint            # Lint with Biome
pnpm format          # Format with Biome
```

435 tests across 20 test files.

## License

MIT

## Credits

Ported from [eyecite](https://github.com/freelawproject/eyecite) (Python) by Free Law Project.
