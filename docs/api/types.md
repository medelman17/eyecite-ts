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
