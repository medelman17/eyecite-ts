# README Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite README.md as a "Pipeline Story" showcase (~350-400 lines) and create 6 supporting docs files for deep dives.

**Architecture:** The README becomes a curated front door: badges, intro, hero workflow, feature table, 6 brief examples, type system, bundle size, Python comparison, dev setup, migration pointer, credits. Detailed content migrates to `docs/guides/` (5 files) and `docs/api/` (1 file). Each doc file is self-contained with its own examples pulled from the current README plus new material.

**Tech Stack:** Markdown only. Code examples must be valid TypeScript that compiles against the library's public API.

**Key facts (verified):**
- Version: 0.10.1
- Tests: 1,748 across 72 files
- Bundle: ~20 KB brotli (core), ~1.8 KB brotli (utils)
- Jurisdictions: 52 total (50 states + DC + US federal)
- Node requirement: >=18.0.0
- Python eyecite comparison: verified 2026-04-11 (see spec)

---

### Task 1: Create docs directory structure and `advanced-extraction.md`

**Files:**
- Create: `docs/guides/advanced-extraction.md`

This is the largest doc file — it absorbs the most content from the current README.

- [ ] **Step 1: Create `docs/guides/` directory**

Run: `mkdir -p docs/guides docs/api`

- [ ] **Step 2: Write `docs/guides/advanced-extraction.md`**

```markdown
# Advanced Extraction

Detailed guide for customizing the eyecite-ts extraction pipeline beyond the defaults.

## Table of Contents

- [Statute Citations](#statute-citations)
- [Constitutional Citations](#constitutional-citations)
- [Custom Patterns](#custom-patterns)
- [Custom Cleaners](#custom-cleaners)
- [Structured Dates](#structured-dates)
- [Blank Page Citations](#blank-page-citations)
- [Component Spans](#component-spans)
- [Subsequent History](#subsequent-history)
- [Disposition Extraction](#disposition-extraction)
- [Reporter Validation](#reporter-validation)
- [False Positive Filtering](#false-positive-filtering)

## Statute Citations

Extract citations from 52 jurisdictions (50 states + DC + federal) across four pattern families:

| Family | Jurisdictions | Example |
|--------|--------------|---------|
| Federal | USC, CFR, prose ("section X of title Y") | `42 U.S.C. § 1983(a)(1) et seq.` |
| Named-code | NY (21 laws), CA (29 codes), TX (29 codes), MD (36 articles), VA, AL, MA | `N.Y. Penal Law § 125.25(1)(a)` |
| Abbreviated-code | FL, OH, MI, UT, CO, WA, NC, GA, PA, IN, NJ, DE + 31 more states | `Fla. Stat. § 775.082` |
| Chapter-act | IL (ILCS) | `735 ILCS 5/2-1001` |

```typescript
import { extractCitations } from "eyecite-ts"

const text = `
  See 42 U.S.C. § 1983(a)(1) et seq.
  Also Cal. Penal Code § 187.
  And N.Y. Penal Law § 125.25(1)(a).
  Compare 735 ILCS 5/2-1001.
`
const citations = extractCitations(text)

// Federal with subsections + et seq.
// { type: 'statute', title: 42, code: 'U.S.C.', section: '1983',
//   subsection: '(a)(1)', jurisdiction: 'US', hasEtSeq: true, confidence: 1.0 }

// California named-code
// { type: 'statute', code: 'Penal', section: '187', jurisdiction: 'CA', confidence: 0.95 }

// New York named-code with subsections
// { type: 'statute', code: 'Penal Law', section: '125.25',
//   subsection: '(1)(a)', jurisdiction: 'NY', confidence: 1.0 }

// Illinois chapter-act format
// { type: 'statute', title: 735, code: '5', section: '2-1001',
//   jurisdiction: 'IL', confidence: 0.95 }
```

## Constitutional Citations

Extract U.S. and state constitutional citations with article, amendment, section, and clause parsing:

```typescript
import { extractCitations } from "eyecite-ts"

const text = `
  Under U.S. Const. amend. XIV, § 1, equal protection is guaranteed.
  See also Cal. Const. art. I, § 7.
  And U.S. Const. art. I, § 8, cl. 3.
`
const citations = extractCitations(text)

// U.S. amendment with section
// { type: 'constitutional', jurisdiction: 'US', amendment: 14,
//   section: '1', confidence: 0.95 }

// California article with section
// { type: 'constitutional', jurisdiction: 'CA', article: 1,
//   section: '7', confidence: 0.9 }

// Commerce Clause (article + section + clause)
// { type: 'constitutional', jurisdiction: 'US', article: 1,
//   section: '8', clause: 3, confidence: 0.95 }
```

Roman numerals (I-XXVII) are automatically parsed to integers. All 50 state abbreviations are supported.

## Custom Patterns

Restrict extraction to specific citation types by passing custom patterns:

```typescript
import { extractCitations, casePatterns } from "eyecite-ts"

// Extract only case citations
const citations = extractCitations(text, {
  patterns: casePatterns,
})
```

Available pattern sets: `casePatterns`, `statutePatterns`, `journalPatterns`, `neutralPatterns`, `shortFormPatterns`, `constitutionalPatterns`.

## Custom Cleaners

Override the default cleaning pipeline (HTML stripping, Unicode normalization, smart quote fixing):

```typescript
import { extractCitations } from "eyecite-ts"

// Use only HTML stripping
const citations = extractCitations(html, {
  cleaners: [(text) => text.replace(/<[^>]+>/g, "")],
})
```

## Structured Dates

Parentheticals with full dates return structured date objects:

```typescript
const text = "500 F.3d 100 (2d Cir. Jan. 15, 2020)"
const citations = extractCitations(text)

if (citations[0].type === "case") {
  console.log(citations[0].date)
  // { iso: '2020-01-15', parsed: { year: 2020, month: 1, day: 15 } }
}
```

Three date formats are supported: `Jan. 15, 2020`, `January 15, 2020`, and `1/15/2020`. Year-only parentheticals produce `{ iso: '1973', parsed: { year: 1973 } }`.

## Blank Page Citations

Citations can reference blank pages using placeholder notation in slip opinions or unpublished decisions:

```typescript
const text = "500 F.2d ___ (2020)"
const citations = extractCitations(text)

if (citations[0].type === "case") {
  console.log(citations[0].hasBlankPage) // true
  console.log(citations[0].page) // undefined
}
```

Both `___` (triple underscore) and `---` (triple dash) are recognized as blank page placeholders.

## Component Spans

Every citation carries a `spans` record with per-component position data (added in v0.10.0):

```typescript
const text = "Smith v. Jones, 500 F.2d 123 (9th Cir. 2020)"
const citations = extractCitations(text)

if (citations[0].type === "case") {
  console.log(citations[0].spans)
  // {
  //   volume: { cleanStart: 16, cleanEnd: 19, originalStart: 16, originalEnd: 19 },
  //   reporter: { cleanStart: 20, cleanEnd: 24, originalStart: 20, originalEnd: 24 },
  //   page: { cleanStart: 25, cleanEnd: 28, originalStart: 25, originalEnd: 28 },
  //   court: { ... },
  //   year: { ... },
  //   caseName: { ... },
  //   ...
  // }
}
```

Use `spanFromGroupIndex()` to build spans from regex capture groups in custom extractors.

## Subsequent History

Case citations automatically extract subsequent history chains:

```typescript
const text = "Smith v. Jones, 500 F.2d 123 (9th Cir. 2020), aff'd, 600 U.S. 456 (2021)"
const citations = extractCitations(text)

if (citations[0].type === "case") {
  console.log(citations[0].subsequentHistoryEntries)
  // [{ signal: 'affirmed', rawSignal: "aff'd", signalSpan: { ... }, order: 0 }]
}
```

Recognized signals include: `aff'd`, `rev'd`, `vacated`, `remanded`, `cert. denied`, `cert. granted`, `overruled`, and more.

## Disposition Extraction

Disposition parentheticals (en banc, per curiam) are parsed from case citations:

```typescript
const text = "500 F.2d 123 (9th Cir. 2020) (en banc)"
const citations = extractCitations(text)

if (citations[0].type === "case") {
  console.log(citations[0].disposition) // 'en banc'
}
```

## Reporter Validation

Validate case citations against the reporters database for confidence adjustments:

```typescript
import { extractWithValidation } from "eyecite-ts"

const validated = await extractWithValidation(text, { validate: true })
// Confidence adjustments:
//   +0.2 boost for reporter match
//   -0.3 penalty for unknown reporter
//   -0.1 per extra match for ambiguous reporter
```

## False Positive Filtering

The library detects likely false positive citations using a blocklist of international (non-US) reporter abbreviations and year plausibility heuristics:

```typescript
import { extractCitations } from "eyecite-ts"

// Flag false positives with reduced confidence (default)
const citations = extractCitations(text)
// False positives get confidence: 0.1 and a warning

// Or remove them entirely
const clean = extractCitations(text, { filterFalsePositives: true })
```
```

- [ ] **Step 3: Commit**

```bash
git add docs/guides/advanced-extraction.md
git commit -m "docs: add advanced extraction guide (moved from README)"
```

---

### Task 2: Create `docs/guides/resolution.md`

**Files:**
- Create: `docs/guides/resolution.md`

- [ ] **Step 1: Write `docs/guides/resolution.md`**

```markdown
# Short-Form Resolution

Guide to resolving short-form citations (Id., supra, short-form case) to their full antecedents.

## Convenience API

The simplest way to resolve citations is passing `{ resolve: true }` to `extractCitations`:

```typescript
import { extractCitations } from "eyecite-ts"

const text = `
  Smith v. Jones, 500 F.2d 123 (2020).
  Id. at 125.
  Smith, supra, at 130.
  500 F.2d at 140.
`

const citations = extractCitations(text, { resolve: true })

// citations[1] is Id. — resolves to index 0 (Smith v. Jones)
console.log(citations[1].resolution)
// { resolvedTo: 0, confidence: 1.0 }
```

## Power-User API

For fine-grained control, extract first and then resolve separately:

```typescript
import { extractCitations, resolveCitations } from "eyecite-ts"

const citations = extractCitations(text)

const resolved = resolveCitations(citations, text, {
  scopeStrategy: "paragraph",
  fuzzyPartyMatching: true,
  partyMatchThreshold: 0.8,
  reportUnresolved: true,
})
```

## Resolution Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `scopeStrategy` | `'paragraph' \| 'section' \| 'footnote' \| 'none'` | `'none'` | How far back to search for antecedents |
| `autoDetectParagraphs` | `boolean` | `true` | Auto-detect paragraph boundaries from text |
| `paragraphBoundaryPattern` | `RegExp` | `/\n\n+/` | Pattern to detect paragraphs |
| `fuzzyPartyMatching` | `boolean` | `true` | Enable fuzzy party name matching for supra |
| `partyMatchThreshold` | `number` | `0.8` | Similarity threshold (0-1) for fuzzy matching |
| `reportUnresolved` | `boolean` | `true` | Report failure reasons for unresolved citations |

## Scope Strategies

- **`'none'`** (default): Resolve across the entire document. Best for HTML-stripped text where paragraph boundaries are unreliable.
- **`'paragraph'`**: Only resolve within the same paragraph. Stricter but prevents cross-paragraph false matches.
- **`'section'`**: Only resolve within the same section.
- **`'footnote'`**: Zone-based isolation. Id. is strict (same footnote only), supra and short-form case can cross from footnotes to body. Requires `footnoteMap` from `detectFootnotes()`.

## Resolution by Citation Type

### Id. Citations

Id. resolves to the most recently cited full citation (or most recently resolved short-form):

```typescript
const text = "Smith v. Jones, 500 F.2d 123. Id. at 125."
const citations = extractCitations(text, { resolve: true })
// citations[1].resolution.resolvedTo === 0
```

### Supra Citations

Supra resolves by matching the party name against previously seen case names:

```typescript
const text = "Smith v. Jones, 500 F.2d 123. Smith, supra, at 130."
const citations = extractCitations(text, { resolve: true })
// citations[1].resolution.resolvedTo === 0 (party name "Smith" matches)
```

With `fuzzyPartyMatching: true`, minor typos and variations are tolerated using Levenshtein distance.

### Short-Form Case Citations

Short-form case citations resolve by matching volume and reporter:

```typescript
const text = "Brown v. Board, 347 U.S. 483. See 347 U.S. at 495."
const citations = extractCitations(text, { resolve: true })
// citations[1].resolution.resolvedTo === 0 (volume/reporter matches)
```

## Unresolved Citations

When `reportUnresolved: true`, failed resolutions include a reason:

```typescript
const text = "Id. at 100." // Orphan Id. with no preceding citation
const citations = extractCitations(text, { resolve: true })
// citations[0].resolution.failureReason === 'No preceding citation found'
```

## Resolution Result Type

```typescript
interface ResolutionResult {
  resolvedTo?: number // Index of the antecedent citation
  failureReason?: string // Why resolution failed
  warnings?: string[] // Ambiguity warnings
  confidence: number // 0-1 confidence score
}
```

On full citations, `resolution` is typed as `undefined`. On short-form citations, it is `ResolutionResult | undefined`.
```

- [ ] **Step 2: Commit**

```bash
git add docs/guides/resolution.md
git commit -m "docs: add resolution guide (moved from README)"
```

---

### Task 3: Create `docs/guides/annotation.md`

**Files:**
- Create: `docs/guides/annotation.md`

- [ ] **Step 1: Write `docs/guides/annotation.md`**

```markdown
# Citation Annotation

Guide to marking up citations with HTML or custom markup in the original text.

## Template Mode

Wrap citation text with before/after strings:

```typescript
import { annotate } from "eyecite-ts/annotate"
import { extractCitations } from "eyecite-ts"

const text = "See Smith v. Jones, 500 F.2d 123 (2020)."
const citations = extractCitations(text)

const result = annotate(text, citations, {
  template: { before: "<cite>", after: "</cite>" },
})
// result.text === 'See Smith v. Jones, <cite>500 F.2d 123</cite> (2020).'
```

## Callback Mode

Full control over annotation output per citation:

```typescript
const result = annotate(text, citations, {
  callback: (citation, surrounding) => {
    if (citation.type === "case") {
      return `<a href="/cases/${citation.volume}-${citation.page}">${citation.matchedText}</a>`
    }
    return `<span>${citation.matchedText}</span>`
  },
})
```

The `surrounding` parameter provides ~30 characters of context around the citation for context-aware decisions.

## XSS Auto-Escape

Auto-escape is **enabled by default** to prevent XSS injection. Special HTML characters are escaped in non-markup text:

- `<` -> `&lt;`, `>` -> `&gt;`, `&` -> `&amp;`, `"` -> `&quot;`, `'` -> `&#39;`, `/` -> `&#x2F;`

```typescript
// Secure by default
const result = annotate(text, citations, {
  template: { before: "<cite>", after: "</cite>" },
  autoEscape: true, // default
})
```

**Security warning:** Only disable `autoEscape` if you are certain the text comes from a trusted source.

## Full Span Annotation

By default, annotation wraps only the citation core (volume-reporter-page). Use `useFullSpan` to annotate from the case name through the closing parenthetical:

```typescript
const text = "In Smith v. Jones, 500 F.2d 123 (9th Cir. 2020) (en banc), the court held..."
const citations = extractCitations(text)

// Default: annotates only "500 F.2d 123"
const coreOnly = annotate(text, citations, {
  template: { before: "<cite>", after: "</cite>" },
})
// "In Smith v. Jones, <cite>500 F.2d 123</cite> (9th Cir. 2020) (en banc), the court held..."

// useFullSpan: annotates "Smith v. Jones, 500 F.2d 123 (9th Cir. 2020) (en banc)"
const fullSpan = annotate(text, citations, {
  template: { before: "<cite>", after: "</cite>" },
  useFullSpan: true,
})
// "In <cite>Smith v. Jones, 500 F.2d 123 (9th Cir. 2020) (en banc)</cite>, the court held..."
```

Full span covers: case name, volume-reporter-page, court/date parenthetical, disposition parenthetical, chained parentheticals, and subsequent history.

## Annotation Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `useCleanText` | `boolean` | `false` | Annotate cleaned text (true) or original text (false) |
| `autoEscape` | `boolean` | `true` | Auto-escape HTML entities for XSS protection |
| `useFullSpan` | `boolean` | `false` | Annotate full citation span vs. core only |
| `template` | `{ before, after }` | - | Template mode: strings to wrap citation text |
| `callback` | `(citation, surrounding) => string` | - | Callback mode: custom annotation function |

## Position Tracking

The `AnnotationResult` includes a `positionMap` for mapping original positions to annotated positions:

```typescript
const result = annotate(text, citations, {
  template: { before: "<cite>", after: "</cite>" },
})

// result.positionMap: Map<number, number>
// Maps original character positions to new positions after markup insertion
// Useful for updating external indices (search highlights, cursor positions)
```
```

- [ ] **Step 2: Commit**

```bash
git add docs/guides/annotation.md
git commit -m "docs: add annotation guide (moved from README)"
```

---

### Task 4: Create `docs/guides/footnote-detection.md`

**Files:**
- Create: `docs/guides/footnote-detection.md`

- [ ] **Step 1: Write `docs/guides/footnote-detection.md`**

```markdown
# Footnote Detection

Opt-in feature that detects footnote zones in legal documents and tags citations with their footnote context.

## Quick Start

```typescript
import { extractCitations } from "eyecite-ts"

const citations = extractCitations(text, { detectFootnotes: true })

for (const cite of citations) {
  if (cite.inFootnote) {
    console.log(`Footnote ${cite.footnoteNumber}: ${cite.matchedText}`)
  }
}
```

## How It Works

Footnote detection runs on the **raw text** (before cleaning) to preserve newline structure. Two strategies are tried in order:

### HTML Strategy

Regex-based tag scanner (no DOM dependency) that detects:
- `<footnote>` and `<fn>` elements
- Elements with footnote-related class or id attributes (e.g., `class="footnote"`, `id="fn1"`)

### Plaintext Strategy

Used as a fallback when no HTML footnote tags are found. Detects:
- Separator lines (5+ dashes or underscores)
- Numbered markers after the separator: `1.`, `FN1.`, `[1]`, `n.1`

## Footnote Zones

Detection produces a `FootnoteMap` — an array of `{ start, end, footnoteNumber }` zones. The pipeline maps these zones through the `TransformationMap` to clean-text coordinates, then tags citations via binary search.

## Resolution Scope

With `scopeStrategy: 'footnote'`, the resolver enforces zone-based isolation:

- **Id. citations**: Strict — must resolve within the same footnote zone
- **Supra / short-form case**: Can cross from footnotes to body text (footnotes commonly reference citations introduced in the main text)

```typescript
const citations = extractCitations(text, {
  detectFootnotes: true,
  resolve: true,
  resolutionOptions: { scopeStrategy: "footnote" },
})
```

## Standalone API

For advanced use cases, detect footnotes independently:

```typescript
import { detectFootnotes } from "eyecite-ts"

const zones = detectFootnotes(rawText)
// [{ start: 1200, end: 1350, footnoteNumber: 1 }, ...]
```
```

- [ ] **Step 2: Commit**

```bash
git add docs/guides/footnote-detection.md
git commit -m "docs: add footnote detection guide"
```

---

### Task 5: Create `docs/guides/migration-from-python.md`

**Files:**
- Create: `docs/guides/migration-from-python.md`

This file requires verified claims about Python eyecite's API. The spec contains the verified comparison table from 2026-04-11.

- [ ] **Step 1: Write `docs/guides/migration-from-python.md`**

```markdown
# Migrating from Python eyecite

Guide for developers familiar with [Python eyecite](https://github.com/freelawproject/eyecite) who are switching to or evaluating eyecite-ts.

## API Mapping

| Python eyecite | eyecite-ts | Notes |
|---|---|---|
| `get_citations(text)` | `extractCitations(text)` | Returns typed array instead of generator |
| `resolve_citations(citations)` | `resolveCitations(citations, text)` | Requires text parameter; or use `extractCitations(text, { resolve: true })` |
| `annotate_citations(text, citations)` | `annotate(text, citations, options)` | Import from `eyecite-ts/annotate`; requires template or callback |
| `clean_text(text)` | `cleanText(text)` | Returns `{ cleaned, transformationMap }` instead of just string |

## Naming Conventions

Python eyecite uses `snake_case`; eyecite-ts uses `camelCase`:

| Python | TypeScript |
|--------|-----------|
| `FullCaseCitation` | `FullCaseCitation` (same) |
| `FullLawCitation` | `StatuteCitation` |
| `FullJournalCitation` | `JournalCitation` |
| `ShortCaseCitation` | `ShortFormCaseCitation` |
| `IdCitation` | `IdCitation` (same) |
| `SupraCitation` | `SupraCitation` (same) |
| `full_span_start` / `full_span_end` | `fullSpan.originalStart` / `fullSpan.originalEnd` |
| `metadata.plaintiff` | `citation.plaintiff` (top-level field) |

## Type System Differences

Python uses class inheritance; eyecite-ts uses a discriminated union on the `type` field:

```python
# Python
if isinstance(citation, FullCaseCitation):
    print(citation.volume)
```

```typescript
// TypeScript
if (citation.type === "case") {
  console.log(citation.volume) // fully typed
}

// Or with type guards
if (isCaseCitation(citation)) {
  console.log(citation.volume)
}
```

## Position Mapping

Python eyecite tracks positions via diff-based `SpanUpdater` at annotation time. eyecite-ts tracks positions incrementally during cleaning via `TransformationMap`:

- Every citation carries dual coordinates: `span.cleanStart`/`span.cleanEnd` (cleaned text) and `span.originalStart`/`span.originalEnd` (original text)
- No diffing step needed — positions are available immediately after extraction

## Data Source Differences

| Aspect | Python eyecite | eyecite-ts |
|--------|---------------|-----------|
| Reporter data | External `reporters-db` package (JSON) | Built-in, lazy-loaded via `eyecite-ts/data` |
| Statute data | `reporters-db/laws.json` (all 50 states + DC + territories) | Built-in regex patterns (50 states + DC + federal) |
| Journal data | `reporters-db/journals.json` | Built-in patterns |

## Features Unique to eyecite-ts

These features have no Python eyecite equivalent:

- **Constitutional citations** — dedicated `ConstitutionalCitation` type with article/amendment/section/clause parsing
- **Footnote detection** — opt-in `{ detectFootnotes: true }` with zone-based resolver scoping
- **Citation signals** — `See`, `See also`, `Cf.` etc. captured as `signal` field on citations
- **Component spans** — per-field position data via `spans` record (volume, reporter, page, court, year, caseName, etc.)
- **Parallel citation grouping** — `groupId` and `parallelCitations` array for linked reporters

## Features with Different Approaches

| Feature | Python | eyecite-ts |
|---------|--------|-----------|
| Parallel detection | `is_parallel_citation()` copies metadata between citations | `groupId` links citations; `parallelCitations` array on primary |
| Annotation HTML handling | Three modes: `unchecked`, `skip`, `wrap` | XSS auto-escape (default on), template or callback modes |
| Case name extraction | `find_case_name()` / `find_case_name_in_html()` | Integrated backward search during case extraction |
```

- [ ] **Step 2: Commit**

```bash
git add docs/guides/migration-from-python.md
git commit -m "docs: add Python eyecite migration guide"
```

---

### Task 6: Create `docs/api/types.md`

**Files:**
- Create: `docs/api/types.md`

- [ ] **Step 1: Write `docs/api/types.md`**

```markdown
# Type Reference

Complete type catalog for eyecite-ts. All types are importable from the main `eyecite-ts` entry point unless noted otherwise.

## Citation Types

eyecite-ts uses a [discriminated union](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions) on the `type` field. Switch on `citation.type` for type-safe access to subtype-specific fields.

### Union Types

```typescript
// All 11 citation types
type Citation =
  | FullCaseCitation
  | StatuteCitation
  | ConstitutionalCitation
  | JournalCitation
  | NeutralCitation
  | PublicLawCitation
  | FederalRegisterCitation
  | StatutesAtLargeCitation
  | IdCitation
  | SupraCitation
  | ShortFormCaseCitation

// Full citations (8 types)
type FullCitation =
  | FullCaseCitation
  | StatuteCitation
  | ConstitutionalCitation
  | JournalCitation
  | NeutralCitation
  | PublicLawCitation
  | FederalRegisterCitation
  | StatutesAtLargeCitation

// Short-form citations (3 types)
type ShortFormCitation = IdCitation | SupraCitation | ShortFormCaseCitation
```

### CitationBase (shared fields)

All citations share these fields:

| Field | Type | Description |
|-------|------|-------------|
| `type` | `CitationType` | Discriminator: `'case'`, `'statute'`, etc. |
| `text` | `string` | Matched citation text |
| `matchedText` | `string` | Raw matched text (before cleaning) |
| `span` | `Span` | Position in both cleaned and original text |
| `confidence` | `number` | 0-1 confidence score |
| `processTimeMs` | `number` | Extraction time in milliseconds |
| `patternsChecked` | `number` | Number of patterns tested |
| `signal` | `CitationSignal` | Citation signal (See, Cf., etc.) if present |
| `warnings` | `Warning[]` | Extraction warnings |
| `inFootnote` | `boolean` | Whether citation is inside a footnote zone |
| `footnoteNumber` | `number` | Footnote number if `inFootnote` is true |

### FullCaseCitation

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'case'` | |
| `volume` | `number \| string` | Volume number (string for hyphenated, e.g., "1984-1") |
| `reporter` | `string` | Reporter abbreviation |
| `page` | `number` | Starting page |
| `pincite` | `PinciteInfo` | Pin cite reference |
| `court` | `string` | Court abbreviation |
| `year` | `number` | Decision year |
| `caseName` | `string` | Full case name |
| `plaintiff` | `string` | Plaintiff name |
| `defendant` | `string` | Defendant name |
| `date` | `{ iso: string, parsed: { year, month?, day? } }` | Structured date |
| `disposition` | `string` | Disposition (en banc, per curiam) |
| `hasBlankPage` | `boolean` | Whether page is a blank placeholder |
| `groupId` | `string` | Parallel citation group identifier |
| `parallelCitations` | `Array<{ volume, reporter, page }>` | Linked parallel citations (primary only) |
| `parentheticals` | `Parenthetical[]` | Explanatory parentheticals |
| `subsequentHistoryEntries` | `SubsequentHistoryEntry[]` | History chain |
| `fullSpan` | `Span` | Case name through closing parenthetical |
| `spans` | `CaseComponentSpans` | Per-field position data |

### StatuteCitation

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'statute'` | |
| `title` | `number` | Title number (federal) |
| `code` | `string` | Code abbreviation |
| `section` | `string` | Section number |
| `subsection` | `string` | Subsection reference |
| `jurisdiction` | `string` | Two-letter jurisdiction code |
| `hasEtSeq` | `boolean` | Whether "et seq." follows |
| `spans` | `StatuteComponentSpans` | Per-field position data |

### ConstitutionalCitation

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'constitutional'` | |
| `jurisdiction` | `string` | Two-letter jurisdiction code |
| `article` | `number` | Article number |
| `amendment` | `number` | Amendment number |
| `section` | `string` | Section reference |
| `clause` | `number` | Clause number |
| `spans` | `ConstitutionalComponentSpans` | Per-field position data |

### JournalCitation

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'journal'` | |
| `volume` | `number` | Volume number |
| `journal` | `string` | Journal name |
| `abbreviation` | `string` | Journal abbreviation |
| `page` | `number` | Starting page |
| `pincite` | `PinciteInfo` | Pin cite reference |
| `author` | `string` | Author name |
| `title` | `string` | Article title |
| `year` | `number` | Publication year |
| `spans` | `JournalComponentSpans` | Per-field position data |

### NeutralCitation

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'neutral'` | |
| `year` | `number` | Decision year |
| `court` | `string` | Court/vendor (WL, LEXIS) |
| `documentNumber` | `string` | Document number |
| `spans` | `NeutralComponentSpans` | Per-field position data |

### PublicLawCitation

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'publicLaw'` | |
| `congress` | `number` | Congress number |
| `lawNumber` | `number` | Law number |
| `title` | `number` | Title reference |
| `spans` | `PublicLawComponentSpans` | Per-field position data |

### FederalRegisterCitation

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'federalRegister'` | |
| `volume` | `number` | Volume number |
| `page` | `number` | Starting page |
| `year` | `number` | Publication year |
| `spans` | `FederalRegisterComponentSpans` | Per-field position data |

### StatutesAtLargeCitation

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'statutesAtLarge'` | |
| `volume` | `number` | Volume number |
| `page` | `number` | Starting page |
| `year` | `number` | Publication year |
| `spans` | `StatutesAtLargeComponentSpans` | Per-field position data |

### IdCitation

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'id'` | |
| `pincite` | `PinciteInfo` | Pin cite reference |

### SupraCitation

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'supra'` | |
| `partyName` | `string` | Party name for matching |
| `pincite` | `PinciteInfo` | Pin cite reference |

### ShortFormCaseCitation

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'shortFormCase'` | |
| `volume` | `number \| string` | Volume number |
| `reporter` | `string` | Reporter abbreviation |
| `page` | `number` | Starting page |
| `pincite` | `PinciteInfo` | Pin cite reference |

## Supporting Types

### Span

Dual-position type tracking both cleaned and original text coordinates:

```typescript
interface Span {
  cleanStart: number
  cleanEnd: number
  originalStart: number
  originalEnd: number
}
```

### Warning

```typescript
interface Warning {
  level: "error" | "warning" | "info"
  message: string
  position: { start: number; end: number }
  context?: string
}
```

### CitationSignal

```typescript
type CitationSignal =
  | "see"
  | "see also"
  | "see generally"
  | "cf"
  | "but see"
  | "but cf"
  | "compare"
  | "accord"
  | "contra"
```

### Parenthetical

```typescript
interface Parenthetical {
  text: string
  type: ParentheticalType // 'holding' | 'finding' | 'stating' | ...
  span?: Span
}
```

### SubsequentHistoryEntry

```typescript
interface SubsequentHistoryEntry {
  signal: HistorySignal // 'affirmed' | 'reversed' | 'vacated' | ...
  rawSignal: string // Original text, e.g., "aff'd"
  signalSpan: Span
  order: number
}
```

### PinciteInfo

```typescript
interface PinciteInfo {
  page?: string
  footnote?: string
  raw: string
}
```

## Configuration Types

### ExtractOptions

```typescript
interface ExtractOptions {
  cleaners?: Array<(text: string) => string>
  patterns?: Pattern[]
  resolve?: boolean
  resolutionOptions?: ResolutionOptions
  filterFalsePositives?: boolean
  detectFootnotes?: boolean
}
```

### ResolutionOptions

See [Resolution Guide](../guides/resolution.md#resolution-options).

### AnnotationOptions

See [Annotation Guide](../guides/annotation.md#annotation-options).

## Type Guards

```typescript
import {
  isFullCitation, // (c: Citation) => c is FullCitation
  isShortFormCitation, // (c: Citation) => c is ShortFormCitation
  isCaseCitation, // (c: Citation) => c is FullCaseCitation
  isCitationType, // (c: Citation, type: string) => c is CitationOfType<T>
  assertUnreachable, // (value: never) => never
} from "eyecite-ts"
```

## Conditional Types

```typescript
// Extract citation subtype by discriminator
type CitationOfType<T extends CitationType> = Extract<Citation, { type: T }>

// Usage: CitationOfType<'case'> === FullCaseCitation
```
```

- [ ] **Step 2: Commit**

```bash
git add docs/api/types.md
git commit -m "docs: add full type reference"
```

---

### Task 7: Rewrite README.md

**Files:**
- Modify: `README.md` (complete rewrite)

This is the core task. The new README follows the "Pipeline Story" structure from the spec. All code examples use the verified public API.

- [ ] **Step 1: Write the new README.md**

Replace the entire contents of `README.md` with:

```markdown
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
```

- [ ] **Step 2: Verify all internal links resolve**

Run:
```bash
# Check that all linked files exist
ls docs/guides/advanced-extraction.md docs/guides/resolution.md docs/guides/annotation.md docs/guides/footnote-detection.md docs/guides/migration-from-python.md docs/api/types.md ARCHITECTURE.md
```

Expected: All 7 files listed without errors.

- [ ] **Step 3: Verify code examples compile**

Run:
```bash
pnpm typecheck
```

Expected: No type errors (README examples aren't checked, but this confirms the API surface hasn't drifted).

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README as pipeline story showcase

Restructure from ~550-line reference into ~380-line showcase with
hero workflow, feature table, and brief examples. Deep dives moved
to docs/guides/ and docs/api/. Adds previously undocumented features:
footnote detection, citation signals, confidence scoring, component
spans. Includes verified Python eyecite comparison table."
```

---

### Task 8: Final verification

- [ ] **Step 1: Verify no broken links**

Run:
```bash
# Check all markdown links in README point to existing files
grep -oP '\[.*?\]\((docs/[^)]+|[A-Z]+\.md)\)' README.md | grep -oP '\((.*?)\)' | tr -d '()' | while read f; do [ -f "$f" ] && echo "OK: $f" || echo "MISSING: $f"; done
```

Expected: All links show "OK".

- [ ] **Step 2: Verify README line count is in target range**

Run:
```bash
wc -l README.md
```

Expected: 350-420 lines.

- [ ] **Step 3: Verify docs files exist and are non-empty**

Run:
```bash
wc -l docs/guides/*.md docs/api/*.md
```

Expected: 6 files, each with substantive content (50+ lines).

- [ ] **Step 4: Run full test suite to confirm nothing broke**

Run:
```bash
pnpm exec vitest run
```

Expected: All 1,748 tests pass. (Docs changes shouldn't affect tests, but confirm.)

- [ ] **Step 5: Final commit if any fixups needed**

Only if previous steps revealed issues. Otherwise, skip.

Plan complete and saved to `docs/superpowers/plans/2026-04-11-readme-overhaul.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?