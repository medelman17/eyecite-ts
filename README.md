# eyecite-ts

[![CI](https://github.com/medelman17/eyecite-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/medelman17/eyecite-ts/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/medelman17/eyecite-ts/branch/main/graph/badge.svg)](https://codecov.io/gh/medelman17/eyecite-ts)
[![npm version](https://img.shields.io/npm/v/eyecite-ts.svg)](https://www.npmjs.com/package/eyecite-ts)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/eyecite-ts)](https://bundlephobia.com/package/eyecite-ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/node/v/eyecite-ts.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](https://www.npmjs.com/package/eyecite-ts)

TypeScript legal citation extraction — a port of Python [eyecite](https://github.com/freelawproject/eyecite) with extended capabilities.

Extract structured data from legal citations in court opinions, briefs, and legal documents. A citation like `500 F.2d 123 (9th Cir. 2020)` encodes a volume (500), reporter (Federal Reporter, 2nd Series), page (123), court (Ninth Circuit), and year. This library parses all of that into typed objects, resolves short-form references like "Id." back to their antecedents, and can annotate the original text with HTML markup. Zero runtime dependencies, browser-compatible, ~20 KB brotli.

## Installation

```bash
npm install eyecite-ts
```

## Quick Start

A complete extract → resolve → annotate workflow:

```typescript
import { extractCitations } from "eyecite-ts"
import { annotate } from "eyecite-ts/annotate"

const text = `In Smith v. Jones, 500 F.2d 123 (9th Cir. 2020), the court
applied 42 U.S.C. § 1983. Id. at 130. See also 123 Harv. L. Rev. 456 (2019).`

// Step 1: Extract and resolve in one call
const citations = extractCitations(text, { resolve: true })

// Step 2: Inspect results
for (const cite of citations) {
  switch (cite.type) {
    case "case":
      console.log(cite.caseName, cite.reporter, cite.year)
      // "Smith v. Jones" "F.2d" 2020
      break
    case "statute":
      console.log(cite.title, cite.code, cite.section)
      // 42 "U.S.C." "1983"
      break
    case "id":
      console.log("Id. resolves to index", cite.resolution?.resolvedTo)
      // Id. resolves to index 0
      break
    case "journal":
      console.log(cite.journal, cite.volume, cite.page)
      // "Harv. L. Rev." 123 456
      break
  }
}

// Step 3: Annotate the original text
const result = annotate(text, citations, {
  template: { before: '<cite>', after: '</cite>' },
})
console.log(result.text)
```

## What It Extracts

| Type | Example | Key Fields |
|------|---------|------------|
| `case` | `500 F.2d 123 (9th Cir. 2020)` | volume, reporter, page, court, year, caseName |
| `statute` | `42 U.S.C. § 1983(a)(1)` | title, code, section, subsection, jurisdiction |
| `constitutional` | `U.S. Const. amend. XIV, § 1` | jurisdiction, amendment, section, clause |
| `journal` | `123 Harv. L. Rev. 456` | volume, journal, page, year |
| `neutral` | `2020 WL 123456` | year, court, documentNumber |
| `publicLaw` | `Pub. L. No. 117-263` | congress, lawNumber |
| `federalRegister` | `87 Fed. Reg. 1234` | volume, page, year |
| `statutesAtLarge` | `136 Stat. 4459` | volume, page, year |
| `id` | `Id. at 125` | pincite |
| `supra` | `Smith, supra, at 130` | partyName, pincite |
| `shortFormCase` | `500 F.2d at 140` | volume, reporter, pincite |

Statute coverage spans 52 jurisdictions (50 states + DC + federal). See the [Advanced Extraction Guide](docs/guides/advanced-extraction.md) for jurisdiction details.

## Key Features

### Case Names & Full Spans

The library backward-searches for party names and tracks full citation boundaries:

```typescript
const text = "In Smith v. Jones, 500 F.2d 123 (9th Cir. 2020) (en banc), the court held..."
const [cite] = extractCitations(text)

if (cite.type === "case") {
  cite.caseName   // "Smith v. Jones"
  cite.plaintiff  // "Smith"
  cite.defendant  // "Jones"
  cite.disposition // "en banc"
  cite.span       // covers "500 F.2d 123" (citation core)
  cite.fullSpan   // covers "Smith v. Jones, 500 F.2d 123 (9th Cir. 2020) (en banc)"
}
```

Procedural prefixes like `In re`, `Ex parte`, and `Matter of` are recognized automatically.

### Parallel Citations

When multiple reporters cite the same case (common in older Supreme Court opinions), the library groups them automatically:

```typescript
const text = "See 410 U.S. 113, 93 S. Ct. 705, 35 L. Ed. 2d 147 (1973)."
const citations = extractCitations(text)

citations[0].groupId // "410-U.S.-113"
citations[1].groupId // "410-U.S.-113" (same group)
citations[2].groupId // "410-U.S.-113" (same group)

// Primary citation carries the linked array
if (citations[0].type === "case") {
  citations[0].parallelCitations
  // [{ volume: 93, reporter: 'S. Ct.', page: 705 },
  //  { volume: 35, reporter: 'L. Ed. 2d', page: 147 }]
}
```

### Short-Form Resolution

Pass `{ resolve: true }` to link Id., supra, and short-form case citations to their full antecedents:

```typescript
const text = `Smith v. Jones, 500 F.2d 123 (2020). Id. at 125.`
const citations = extractCitations(text, { resolve: true })

citations[1].resolution
// { resolvedTo: 0, confidence: 1.0 }
```

The resolver supports paragraph/section/footnote scope boundaries, fuzzy party name matching, and configurable thresholds. See the [Resolution Guide](docs/guides/resolution.md) for the power-user API.

### Citation Annotation

Mark up citations with HTML using template or callback modes:

```typescript
import { annotate } from "eyecite-ts/annotate"

const result = annotate(text, citations, {
  template: { before: '<cite>', after: '</cite>' },
})
// "See Smith v. Jones, <cite>500 F.2d 123</cite> (2020)."
```

XSS auto-escape is enabled by default. Use `useFullSpan: true` to annotate from case name through closing parenthetical. See the [Annotation Guide](docs/guides/annotation.md) for callback mode and full options.

### Confidence & Signals

Each citation carries a `confidence` score (0-1) based on pattern match quality and reporter validation. Citations preceded by legal signals are tagged:

```typescript
const text = "See also Smith v. Jones, 500 F.2d 123 (2020)."
const [cite] = extractCitations(text)

cite.confidence // 0.85
cite.signal     // "see also"
```

### Footnote Detection

Opt-in feature that tags citations with their footnote context and enables zone-scoped resolution:

```typescript
const citations = extractCitations(text, { detectFootnotes: true })

for (const cite of citations) {
  if (cite.inFootnote) {
    console.log(`Footnote ${cite.footnoteNumber}: ${cite.matchedText}`)
  }
}
```

Supports HTML footnote tags and plaintext footnote sections (separator + numbered markers). See the [Footnote Detection Guide](docs/guides/footnote-detection.md).

## Type System

All citation types use a [discriminated union](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions) on the `type` field:

```typescript
import type { Citation, FullCaseCitation, StatuteCitation } from "eyecite-ts"
import { isFullCitation, isCaseCitation, assertUnreachable } from "eyecite-ts"

// Type guards
if (isCaseCitation(citation)) {
  citation.reporter // typed as string
}

// Exhaustive switch
switch (citation.type) {
  case "case": /* ... */ break
  case "statute": /* ... */ break
  // ... all 11 types
  default: assertUnreachable(citation.type)
}
```

`CitationOfType<'case'>` extracts the subtype: `CitationOfType<'case'>` = `FullCaseCitation`. See the [Type Reference](docs/api/types.md) for the full catalog.

## Bundle Size

Three entry points for tree-shaking:

| Entry Point | Import | Size (brotli) |
|-------------|--------|---------------|
| Core extraction | `eyecite-ts` | ~20 KB |
| Annotation | `eyecite-ts/annotate` | ~1.3 KB |
| Reporter data | `eyecite-ts/data` | lazy-loaded |

Import only what you need — the reporter database is loaded on first use, not at import time.

## Comparison with Python eyecite

Every claim verified against [Python eyecite](https://github.com/freelawproject/eyecite) source code (April 2026).

| Capability | Python eyecite | eyecite-ts | Notes |
|---|---|---|---|
| Case citations | Yes | Yes | Both extract volume/reporter/page/court/year |
| Statute citations | Yes (all 50 states + DC + territories) | Yes (50 states + DC + federal) | Python uses `reporters-db`; TS uses built-in patterns |
| Constitutional citations | No | Yes (U.S. + 50 states) | Dedicated type with article/amendment/section/clause |
| Journal / law review | Yes | Yes | |
| Neutral (WL/LEXIS) | Yes (as case citations) | Yes (dedicated type) | |
| Short-form resolution | Yes | Yes | |
| Case name extraction | Yes | Yes | Both use backward scanning |
| Parallel citation linking | Partial (detection + metadata copy) | Yes (`groupId` + `parallelCitations`) | |
| Full span tracking | Yes | Yes | TS carries dual clean/original positions |
| Component spans | Minimal (pin cite only) | Yes (all fields) | |
| Footnote detection | No | Yes | HTML + plaintext strategies |
| Citation signals | No (stop words only) | Yes (extracted as metadata) | |
| Annotation | Yes (HTML modes) | Yes (template/callback + XSS auto-escape) | |
| Position mapping | Yes (diff-based) | Yes (incremental TransformationMap) | |
| Type system | Class inheritance | Discriminated union | TS enables exhaustive switch |

eyecite-ts started as a port and has diverged. Both are capable citation extractors — eyecite-ts adds constitutional citations, footnote detection, citation signals, rich component spans, and a TypeScript-native type system, while Python eyecite has broader statute coverage via `reporters-db` and a mature ecosystem.

Coming from Python eyecite? See the [Migration Guide](docs/guides/migration-from-python.md).

## Architecture

Citations flow through a 4-stage pipeline: **clean → tokenize → extract → resolve**. Text cleaning builds a `TransformationMap` that tracks position shifts, so every citation carries dual coordinates (cleaned and original text). Resolution is optional and runs as a final pass.

See [ARCHITECTURE.md](ARCHITECTURE.md) for details.

## Development

```bash
pnpm install           # Install dependencies (corepack, pnpm 10)
pnpm test              # Run tests (vitest, watch mode)
pnpm exec vitest run   # Run tests once (1,748 tests, 72 files)
pnpm typecheck         # Type-check with tsc
pnpm build             # Build (ESM + CJS + DTS)
pnpm lint              # Lint with Biome
pnpm format            # Format with Biome
pnpm size              # Check bundle size limits
```

Requires Node.js >= 18.0.0. See [ARCHITECTURE.md](ARCHITECTURE.md) for contributor orientation.

## License

MIT

## Credits

Inspired by and ported from [eyecite](https://github.com/freelawproject/eyecite) (Python) by [Free Law Project](https://free.law/). This TypeScript implementation extends the original with constitutional citations, footnote detection, citation signals, parallel citation grouping, component spans, and a discriminated-union type system.
