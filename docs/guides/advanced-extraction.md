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
