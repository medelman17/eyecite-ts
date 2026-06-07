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

Extract structured data from legal citations in court opinions, briefs, and legal documents. A citation like `500 F.2d 123 (9th Cir. 2020)` encodes a volume (500), reporter (Federal Reporter, 2nd Series), page (123), court (Ninth Circuit), and year. This library parses all of that into typed objects, resolves short-form references like "Id." back to their antecedents, and can annotate the original text with HTML markup. Zero runtime dependencies, browser-compatible, ~37 KB brotli.

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
      console.log("Id. resolves to:", cite.resolution?.resolvedTo)
      // Id. resolves to: 0
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

12 citation types, each with its own TypeScript interface:

| Type | Example | Key Fields |
|------|---------|------------|
| `case` | `500 F.2d 123 (9th Cir. 2020)` | volume, reporter, page, court, year, caseName |
| `docket` | `No. 12-3456 (S.D.N.Y. 2024)` | docketNumber, court, year, caseName |
| `statute` | `42 U.S.C. § 1983(a)(1)` | title, code, section, subsection, jurisdiction |
| `constitutional` | `U.S. Const. amend. XIV, § 1` | jurisdiction, amendment, section, clause |
| `journal` | `123 Harv. L. Rev. 456` | volume, journal, page, year |
| `neutral` | `2020 WL 123456` | year, database, documentNumber |
| `publicLaw` | `Pub. L. No. 117-263` | congress, lawNumber |
| `federalRegister` | `87 Fed. Reg. 1234` | volume, page, year |
| `statutesAtLarge` | `136 Stat. 4459` | volume, page, year |
| `id` | `Id. at 125` | pincite, caseName (inherited) |
| `supra` | `Smith, supra, at 130` | partyName, pincite |
| `shortFormCase` | `500 F.2d at 140` | volume, reporter, pincite, partyName |

## Statute & Administrative Code Coverage

Statutes are extracted across 52 jurisdictions (50 states + DC + federal) using four pattern families:

| Family | Jurisdictions | Example |
|--------|--------------|---------|
| Federal | USC, CFR, USCA, prose ("section X of title Y") | `42 U.S.C. § 1983(a)(1) et seq.` |
| Named-code | NY (21 laws), CA (29 codes), TX (29 codes), MD (36 articles), VA, AL, MA | `N.Y. Penal Law § 125.25(1)(a)` |
| Abbreviated-code | FL, OH, MI, UT, CO, WA, NC, GA, PA, IN, NJ, DE + 20 more states | `Fla. Stat. § 775.082` |
| Chapter-act | IL (ILCS), IL (Ill. Rev. Stat.) | `735 ILCS 5/2-1001` |

State-specific forms include: Alabama Code of 1940, California bare-code (`Penal Code § 187`), Georgia pre-1983 Code Ann., Hawaii Revised Laws (pre-1955), Idaho postfix (`I.C. § N`), Kansas year-edition (`K.S.A. 2019 Supp.`), Nebraska R.R.S. 1943, Oregon chapter-only (`ORS chapter 174`), Rhode Island General Laws 1956, Washington RCW chapter-postfix, West Virginia Code 1931, Wisconsin Stats. postfix, and more.

Administrative codes: NMAC (New Mexico), OAR (Oregon), COMAR (Maryland), IDAPA (Idaho), ARM (Montana).

## Key Features

### Case Names & Full Spans

The library backward-searches for party names and tracks full citation boundaries:

```typescript
const text = "In Smith v. Jones, 500 F.2d 123 (9th Cir. 2020) (en banc), the court held..."
const [cite] = extractCitations(text)

if (cite.type === "case") {
  cite.caseName    // "Smith v. Jones"
  cite.plaintiff   // "Smith"
  cite.defendant   // "Jones"
  cite.disposition // "en banc"
  cite.span        // covers "500 F.2d 123" (citation core)
  cite.fullSpan    // covers "Smith v. Jones, 500 F.2d 123 (9th Cir. 2020) (en banc)"
}
```

Procedural prefixes recognized: `In re`, `Ex parte`, `Matter of`, `Estate of`, `In the Matter of`, and bankruptcy adversary captions (`Spence v. Hintze (In re Hintze)`). Case name search also runs on neutral/vendor citations (`2020 WL 123456`).

### Docket Citations

Slip opinions and unreported decisions identified by docket number:

```typescript
const text = "IKB Int'l, S.A. v. Wells Fargo Bank, N.A., No. 51 (N.Y. 2023)"
const [cite] = extractCitations(text)

if (cite.type === "docket") {
  cite.docketNumber // "51"
  cite.court        // "N.Y."
  cite.caseName     // "IKB Int'l, S.A. v. Wells Fargo Bank, N.A."
}
```

Accepts PACER colon prefixes (`2:17-cv-00413`), space-separated parts (`18 C 7039`), and prefix variants (`C.A.`, `Civ.`, `Civil Action`, `Adv.`).

### Parallel Citations

When multiple reporters cite the same case, the library groups them automatically:

```typescript
const text = "See 410 U.S. 113, 93 S. Ct. 705, 35 L. Ed. 2d 147 (1973)."
const citations = extractCitations(text)

citations[0].groupId // "410-U.S.-113"
citations[1].groupId // "410-U.S.-113" (same group)
citations[2].groupId // "410-U.S.-113" (same group)

if (citations[0].type === "case") {
  citations[0].parallelCitations
  // [{ volume: 93, reporter: 'S. Ct.', page: 705 },
  //  { volume: 35, reporter: 'L. Ed. 2d', page: 147 }]
}
```

### Short-Form Resolution

Pass `{ resolve: true }` to link Id., supra, and short-form case citations to their full antecedents:

```typescript
const text = `Smith v. Jones, 500 F.2d 123 (2020). Id. at 125. Smith, supra, at 130.`
const citations = extractCitations(text, { resolve: true })

// Id. resolves to most recent antecedent
citations[1].resolution  // { resolvedTo: 0 }

// Id. inherits case name from antecedent
if (citations[1].type === "id") {
  citations[1].caseName   // "Smith v. Jones" (inherited)
  citations[1].plaintiff  // "Smith" (inherited)
}
```

The resolver supports paragraph/section/footnote scope boundaries, fuzzy party name matching via Levenshtein distance, bare-party shortform (`Smith, at 12`), and bracketed `[supra]` (Connecticut style). See the [Resolution Guide](docs/guides/resolution.md) for the power-user API.

### Subsequent History & Dispositions

Case citations automatically extract subsequent history chains and disposition parentheticals:

```typescript
const text = "Smith v. Jones, 500 F.2d 123 (9th Cir. 2020), aff'd, 600 U.S. 456 (2021)"
const [cite] = extractCitations(text)

if (cite.type === "case") {
  cite.subsequentHistoryEntries
  // [{ signal: 'affirmed', rawSignal: "aff'd", signalSpan: { ... }, order: 0 }]

  // Ordered chain (root → latest), shared by every member, keyed by stable id:
  cite.historyChain
  // { links: [{ citationId: 'c0' }, { citationId: 'c1', signal: 'affirmed' }] }
  // The back-reference also carries the parent's id alongside the numeric index:
  // cite.subsequentHistoryOf // { index, priorId, signal }
}
```

Recognized history signals include federal (`aff'd`, `rev'd`, `vacated`, `remanded`, `cert. denied`, `rehearing denied`), Texas writ/petition history (`writ refused`, `pet. denied`), and California review history (`review denied`, `review granted`, `not published`, `superseded by grant of review`).

Dispositions extracted: `en banc`, `per curiam`, `dissent`, `concurrence`, `plurality opinion`, `mem.`, with justice attribution (`(Brennan, J., dissenting)` → `justices: ["Brennan"]`).

### Explanatory Parentheticals

Explanatory parentheticals following case citations are parsed and classified:

```typescript
const text = '500 F.2d 123 (9th Cir. 2020) (holding that X requires Y)'
const [cite] = extractCitations(text)

if (cite.type === "case") {
  cite.parentheticals
  // [{ text: "holding that X requires Y", type: "holding" }]
}
```

Classification types: `holding`, `finding`, `stating`, `noting`, `explaining`, `quoting`, `citing`, `discussing`, `describing`, `recognizing`, `applying`, `rejecting`, `adopting`, `requiring`, `other`.

### Citation Annotation

Mark up citations with HTML using template or callback modes:

```typescript
import { annotate } from "eyecite-ts/annotate"

// Template mode
const result = annotate(text, citations, {
  template: { before: '<cite>', after: '</cite>' },
})

// Callback mode for custom markup
const linked = annotate(text, citations, {
  callback: (citation, surrounding) => {
    if (citation.type === "case") {
      return `<a href="/cases/${citation.volume}-${citation.page}">${citation.matchedText}</a>`
    }
    return `<span>${citation.matchedText}</span>`
  },
})
```

XSS auto-escape is enabled by default. Use `useFullSpan: true` to annotate from case name through closing parenthetical.

### Confidence Scoring

Each citation carries a `confidence` score (0–1) based on pattern match quality, reporter validation, and metadata completeness:

```typescript
const [cite] = extractCitations(text)
cite.confidence // 0.85
```

Scores are adjusted by reporter validation (+0.2 for known reporters, -0.3 for unknown), year plausibility, case name presence, and court identification. False positives from international reporters or implausible years get reduced to 0.1.

### Citation Signals

Citations preceded by Bluebook signals are tagged:

```typescript
const text = "See also Smith v. Jones, 500 F.2d 123 (2020)."
const [cite] = extractCitations(text)
cite.signal // "see also"
```

Recognized signals: `see`, `see also`, `see generally`, `cf`, `but see`, `but cf`, `compare`, `accord`, `contra`, `e.g.`, and combined forms (`see, e.g.`, `see also, e.g.`, `but see, e.g.`, `cf., e.g.`, `but cf., e.g.`).

### Court Inference

Case citations carry a `inferredCourt` field derived from the reporter series:

```typescript
const [cite] = extractCitations(text)
if (cite.type === "case") {
  cite.inferredCourt
  // { level: "appellate", jurisdiction: "federal", confidence: 1.0 }
}
```

### Component Spans

Every citation carries per-field position data for precise source mapping:

```typescript
const [cite] = extractCitations(text)
if (cite.type === "case") {
  cite.spans?.volume    // { cleanStart, cleanEnd, originalStart, originalEnd }
  cite.spans?.reporter  // ...
  cite.spans?.page      // ...
  cite.spans?.court     // ...
  cite.spans?.year      // ...
  cite.spans?.caseName  // ...
}
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

Two strategies: HTML tag scanner (`<footnote>`, `<fn>`, footnote class/id attributes) and plaintext separator detection (5+ dashes/underscores followed by numbered markers). The `"footnote"` scope strategy enforces zone-based isolation: Id. is strict (same zone only), supra and short-form case can cross from footnotes to body.

### Structured Dates

Parentheticals with full dates return structured date objects:

```typescript
const text = "500 F.3d 100 (2d Cir. Jan. 15, 2020)"
const [cite] = extractCitations(text)
if (cite.type === "case") {
  cite.date // { iso: '2020-01-15', parsed: { year: 2020, month: 1, day: 15 } }
}
```

### Post-Extraction Utilities

The `eyecite-ts/utils` entry point provides composable post-processing:

```typescript
import { extractCitations, isCaseCitation } from "eyecite-ts"
import { groupByCase, toBluebook, toReporterKey, getSurroundingContext } from "eyecite-ts/utils"

const citations = extractCitations(text, { resolve: true })

// Group citations by case (parallel + short-form → full)
// Requires resolved citations — pass `{ resolve: true }` to extractCitations.
const groups = groupByCase(citations)

// Format as Bluebook citation string (any Citation)
const formatted = toBluebook(citations[0])

// Get canonical reporter key for deduplication (full case citations only)
const first = citations[0]
if (isCaseCitation(first)) {
  const key = toReporterKey(first) // "500 F.2d 123"
}

// Extract surrounding sentence context (pass a {start, end} span, not the citation)
const cite = citations[0]
const ctx = getSurroundingContext(
  text,
  { start: cite.span.originalStart, end: cite.span.originalEnd },
  { maxLength: 100 },
)
```

### Citation Identity (`id` + `byId`)

Every citation returned by `extractCitations()` carries a stable `id` (`"c0"`, `"c1"`, … in document order). The id is stable **within one result set** — it survives `filter`/`sort`/`map`, unlike array position — so you can reference and look up citations by id rather than by index.

```typescript
import { byId, extractCitations } from "eyecite-ts"

const citations = extractCitations(text)
citations[0].id // "c0"

// Build a lookup keyed by stable id:
const map = byId(citations) // Map<CitationId, Citation>
const cite = map.get(citations[0].id!)
```

Because the key is the id and not the array position, `byId(citations.filter(...))` still resolves correctly after you have filtered or reordered the array. `id` is **not** durable across runs (the same text re-extracts to fresh ids each call) — for cross-run / cross-document identity use `toDurableLocator()` from `eyecite-ts/utils`.

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
  case "docket": /* ... */ break
  case "statute": /* ... */ break
  case "constitutional": /* ... */ break
  case "journal": /* ... */ break
  case "neutral": /* ... */ break
  case "publicLaw": /* ... */ break
  case "federalRegister": /* ... */ break
  case "statutesAtLarge": /* ... */ break
  case "id": /* ... */ break
  case "supra": /* ... */ break
  case "shortFormCase": /* ... */ break
  default: assertUnreachable(citation.type)
}
```

`CitationOfType<'case'>` extracts the subtype: `CitationOfType<'case'>` = `FullCaseCitation`. See the [Type Reference](docs/api/types.md) for the full catalog.

## Bundle Size

Four entry points for tree-shaking:

| Entry Point | Import | Size (brotli) |
|-------------|--------|---------------|
| Core extraction | `eyecite-ts` | ~37 KB |
| Annotation | `eyecite-ts/annotate` | ~1 KB |
| Post-extraction utils | `eyecite-ts/utils` | ~1.8 KB |
| Reporter data | `eyecite-ts/data` | lazy-loaded |

Import only what you need — the reporter database is loaded on first use, not at import time.

## Comparison with Python eyecite

Every claim verified against [Python eyecite](https://github.com/freelawproject/eyecite) source code (May 2026).

| Capability | Python eyecite | eyecite-ts | Notes |
|---|---|---|---|
| Case citations | Yes | Yes | Both extract volume/reporter/page/court/year |
| Docket citations | No | Yes | Slip opinions, PACER docket numbers |
| Statute citations | Yes (50 states + DC + territories) | Yes (50 states + DC + federal) | Python uses `reporters-db`; TS uses built-in patterns |
| Constitutional citations | No | Yes (U.S. + 50 states) | Dedicated type with article/amendment/section/clause |
| State admin codes | No | Yes (NM, OR, MD, ID, MT) | NMAC, OAR, COMAR, IDAPA, ARM |
| Journal / law review | Yes | Yes | |
| Neutral (WL/LEXIS) | Yes (as case) | Yes (dedicated type) | Separate NeutralCitation with database/court split |
| Short-form resolution | Yes | Yes | |
| Case name extraction | Yes | Yes | Both use backward scanning; TS runs on neutral cites too |
| Parallel citation linking | Partial | Yes | `groupId` + `parallelCitations` array |
| Subsequent history | No | Yes | Federal, Texas writ/petition, California review signals |
| Explanatory parentheticals | No | Yes | Classified by gerund (holding, finding, stating, ...) |
| Justice attribution | No | Yes | `(Brennan, J., dissenting)` → justices + scope |
| Court inference | No | Yes | Level/jurisdiction from reporter series |
| Full span tracking | Yes | Yes | TS carries dual clean/original positions |
| Component spans | Minimal | Yes (all fields) | Per-component position data |
| Footnote detection | No | Yes | HTML + plaintext strategies |
| Citation signals | No (stop words) | Yes (metadata) | Bluebook signals including combined forms |
| Confidence scoring | No | Yes | Pattern quality + reporter validation |
| Annotation | Yes (HTML modes) | Yes (template/callback) | XSS auto-escape on by default |
| Position mapping | Yes (diff-based) | Yes (incremental) | TransformationMap during cleaning |
| Type system | Class inheritance | Discriminated union | Exhaustive switch, conditional types |
| Post-extraction utils | No | Yes | groupByCase, toBluebook, toReporterKey |

eyecite-ts started as a port and has diverged. Both are capable citation extractors — eyecite-ts adds docket citations, constitutional citations, subsequent history, explanatory parentheticals, footnote detection, citation signals, structured confidence scoring, court inference, rich component spans, and a TypeScript-native type system, while Python eyecite has broader statute coverage via `reporters-db` and a mature ecosystem.

Coming from Python eyecite? See the [Migration Guide](docs/guides/migration-from-python.md).

## Architecture

Citations flow through a 4-stage pipeline: **clean → tokenize → extract → resolve**. Text cleaning builds a `TransformationMap` that tracks position shifts, so every citation carries dual coordinates (cleaned and original text). Resolution is optional and runs as a final pass.

See [ARCHITECTURE.md](ARCHITECTURE.md) for details.

## Development

```bash
pnpm install           # Install dependencies (corepack, pnpm 10)
pnpm test              # Run tests (vitest, watch mode)
pnpm exec vitest run   # Run tests once (2,966 tests, 96 files)
pnpm typecheck         # Type-check with tsc
pnpm build             # Build (ESM + CJS + DTS)
pnpm lint              # Lint with Biome
pnpm format            # Format with Biome
pnpm size              # Check bundle size limits
```

Requires Node.js >= 18.0.0. See [ARCHITECTURE.md](ARCHITECTURE.md) for contributor orientation.

### Internal Bughunt CLI

`pnpm bughunt` is a repo-local development tool for reproducible citation-parser bug
hunting. It is intentionally private to this repository: it is not exported as a
package entry point and is not installed as a public binary.

```bash
pnpm bughunt run --lane all --seed 1234 --sample 5
pnpm bughunt inspect .bughunt/latest.json --id <finding-id>
pnpm bughunt promote .bughunt/latest.json --id <finding-id>
```

The `run` command writes local artifacts under `.bughunt/runs/<run-id>/` plus a
`.bughunt/latest.json` pointer. Runs include `manifest.json`, `findings.jsonl`,
`cases.jsonl`, `events.jsonl`, `report.json`, and `summary.md`; `.bughunt/` is
gitignored and should not be committed.

Available v1 lanes:

- `corpus`: runs extraction and resolution over inline smoke cases and reports
  crashes or performance outliers.
- `invariants`: checks citation/span invariants and records violations.
- `mutate`: uses `fast-check` with deterministic seeds and replay paths for
  generated-input failures.

`promote` is preview-only in v1. It prints a Vitest repro skeleton with the
finding ID, original command, source context, and minimized/input text when
available; it does not write files.

## License

MIT

## Credits

Inspired by and ported from [eyecite](https://github.com/freelawproject/eyecite) (Python) by [Free Law Project](https://free.law/). This TypeScript implementation extends the original with docket citations, constitutional citations, subsequent history, explanatory parentheticals, footnote detection, citation signals, structured confidence scoring, court inference, parallel citation grouping, component spans, post-extraction utilities, and a discriminated-union type system.
