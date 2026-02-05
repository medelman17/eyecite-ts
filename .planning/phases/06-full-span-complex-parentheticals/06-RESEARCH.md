# Phase 6: Full Span & Complex Parentheticals - Research

**Researched:** 2026-02-05
**Domain:** Case name extraction, full citation boundaries, and complex parenthetical parsing
**Confidence:** HIGH

## Summary

Phase 6 extends citation extraction to capture complete citation boundaries (case name through closing parenthetical) and parse complex parentheticals containing month/day dates, court info, and disposition signals. This phase is **implementation-ready** with clear architectural patterns established from Phase 5's blank page work.

The phase addresses two interconnected concerns:
1. **Full Citation Span**: Detect case name before citation core, track full span from name through all parentheticals
2. **Complex Parentheticals**: Parse month/day dates, extract court from complex formats, detect disposition info (en banc, per curiam)

Both build on existing infrastructure: `stripDateFromCourt()` already handles basic date stripping, `MONTH_PATTERN` already exists for date detection, and the lookahead mechanism from `extractCase()` provides the foundation for backward/forward searching.

**Primary recommendation:** Implement as unified phase with case name extraction enabling fullSpan calculation, and parenthetical parser replacing/extending existing year-only logic.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.9 | Type definitions with optional fields | Already used; `Span` type exists for dual position tracking |
| Native regex | ES2020 | Pattern matching for "v.", dates, court abbreviations | Existing patterns work; simple extensions sufficient |
| JavaScript Date | Native | Month name parsing, ISO string generation | Zero dependencies; handles YYYY-MM-DD format natively |

### Supporting
None required. This phase uses only existing infrastructure.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Backward search for case names | AST-based parsing | More complex; regex sufficient for legal citation structure |
| Custom date parser | date-fns, dayjs | 17KB-20KB overhead for features we don't need (timezones, formatting) |
| Separate date formats | Single unified parser | More code duplication; single parser handles all three formats |
| Nested parenthetical tracking | Regex lookahead chains | Harder to maintain; depth counter is clearer |

**Installation:**
No new packages needed.

## Architecture Patterns

### Recommended Project Structure
Minimal changes to existing structure:
```
src/
├── types/
│   └── citation.ts           # fullSpan, caseName already declared (Phase 5)
├── extract/
│   ├── extractCase.ts        # Add case name extraction, unified parenthetical parser
│   └── dates.ts              # NEW: Month parsing, ISO conversion, structured date builder
└── patterns/
    └── casePatterns.ts       # No changes needed (tokenizer already broad)
```

### Pattern 1: Backward Search for Case Names
**What:** Search backward from citation core to find case name with "v." separator or procedural prefix
**When to use:** When calculating fullSpan or extracting caseName field
**Example:**
```typescript
function extractCaseName(
  cleanedText: string,
  coreStart: number,
  maxLookback = 150
): { caseName: string; nameStart: number } | undefined {
  const searchStart = Math.max(0, coreStart - maxLookback)
  const precedingText = cleanedText.substring(searchStart, coreStart)

  // Priority 1: Standard "v." format
  // Match: "Smith v. Jones, " or "United States v. Doe, "
  const standardMatch = precedingText.match(
    /([A-Z][A-Za-z\s.,'&-]+?)\s+v\.?\s+([A-Z][A-Za-z\s.,'&-]+?)\s*,\s*$/i
  )
  if (standardMatch) {
    const caseName = standardMatch[0].replace(/,\s*$/, '').trim()
    return {
      caseName,
      nameStart: searchStart + standardMatch.index!
    }
  }

  // Priority 2: Procedural prefixes (In re, Ex parte, Matter of)
  // Match: "In re Smith, " or "Ex parte Jones, "
  const proceduralMatch = precedingText.match(
    /\b(In re|Ex parte|Matter of)\s+([A-Z][A-Za-z\s.,'&-]+?)\s*,\s*$/i
  )
  if (proceduralMatch) {
    const caseName = proceduralMatch[0].replace(/,\s*$/, '').trim()
    return {
      caseName,
      nameStart: searchStart + proceduralMatch.index!
    }
  }

  // No case name found within lookback window
  return undefined
}
```

**Key principles:**
- Search backward up to 150 characters (covers most case names)
- Require comma after case name to avoid false positives
- Handle multi-word names: "United States", "New York", "Jones, Inc."
- Prioritize standard format over procedural format

### Pattern 2: Forward Search for Parenthetical End
**What:** Track parenthesis depth to find true closing paren, handling nested content
**When to use:** When calculating fullSpan end position
**Example:**
```typescript
function findParentheticalEnd(
  cleanedText: string,
  searchStart: number,
  maxLookahead = 200
): number | undefined {
  let depth = 0
  let inParenthetical = false
  let lastCloseIndex: number | undefined

  const searchEnd = Math.min(cleanedText.length, searchStart + maxLookahead)

  for (let i = searchStart; i < searchEnd; i++) {
    const char = cleanedText[i]

    if (char === '(') {
      depth++
      inParenthetical = true
    } else if (char === ')') {
      depth--
      if (depth === 0 && inParenthetical) {
        lastCloseIndex = i + 1  // Include closing paren
        // Check if another parenthetical follows immediately
        const nextNonSpace = cleanedText.substring(i + 1).search(/\S/)
        if (nextNonSpace !== -1) {
          const nextChar = cleanedText[i + 1 + nextNonSpace]
          if (nextChar === '(') {
            // Continue searching for chained parentheticals like "(2020) (en banc)"
            continue
          }
        }
        // No more parentheticals, this is the end
        break
      }
    }
  }

  return lastCloseIndex
}
```

**Key principles:**
- Track depth to handle nested parens: "(holding that X (citing Y))"
- Handle chained parens: "(2020) (en banc)"
- Stop at final closing paren or max lookahead limit

### Pattern 3: Unified Parenthetical Parser
**What:** Single parser replacing year-only logic, handling all parenthetical formats
**When to use:** When extracting court, year, date, disposition from citation
**Example:**
```typescript
interface ParentheticalData {
  court?: string
  year?: number
  date?: {
    iso: string
    parsed: { year: number; month?: number; day?: number }
  }
  disposition?: string  // "en banc", "per curiam", etc.
  raw: string          // Full parenthetical text
}

function parseParenthetical(content: string): ParentheticalData {
  const result: ParentheticalData = { raw: content }

  // Extract year (always present in legal citations)
  const yearMatch = content.match(/\b(\d{4})\b/)
  if (yearMatch) {
    result.year = Number.parseInt(yearMatch[1], 10)
  }

  // Extract full date if present (month + day + year)
  const fullDateMatch = content.match(
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+(\d{1,2}),?\s+(\d{4})\b/i
  )
  if (fullDateMatch) {
    const month = parseMonth(fullDateMatch[1])
    const day = Number.parseInt(fullDateMatch[2], 10)
    const year = Number.parseInt(fullDateMatch[3], 10)

    result.date = {
      iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      parsed: { year, month, day }
    }
  } else if (result.year) {
    // Year-only format
    result.date = {
      iso: `${result.year}`,
      parsed: { year: result.year }
    }
  }

  // Extract court (after stripping date components)
  const court = stripDateFromCourt(content)
  if (court) {
    result.court = court
  }

  // Extract disposition signals
  if (/\ben banc\b/i.test(content)) {
    result.disposition = 'en banc'
  } else if (/\bper curiam\b/i.test(content)) {
    result.disposition = 'per curiam'
  }

  return result
}
```

**Key principles:**
- Parse in priority order: year → full date → court → disposition
- Reuse existing `stripDateFromCourt()` for court extraction
- Return structured date with both ISO string and parsed object
- Keep raw parenthetical text for debugging/verification

### Pattern 4: Month Name Parsing
**What:** Convert abbreviated/full month names to numeric values
**When to use:** When parsing full dates from parentheticals
**Example:**
```typescript
// src/extract/dates.ts
const MONTH_MAP: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
}

export function parseMonth(monthStr: string): number {
  const normalized = monthStr.toLowerCase().replace(/\.$/, '')  // Strip trailing period
  const month = MONTH_MAP[normalized]
  if (!month) {
    throw new Error(`Invalid month: ${monthStr}`)
  }
  return month
}

export function parseDateString(dateStr: string): { year: number; month?: number; day?: number } | undefined {
  // Format 1: "Jan. 15, 2020" or "January 15, 2020"
  const abbrevMatch = dateStr.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+(\d{1,2}),?\s+(\d{4})\b/i)
  if (abbrevMatch) {
    return {
      year: Number.parseInt(abbrevMatch[3], 10),
      month: parseMonth(abbrevMatch[1]),
      day: Number.parseInt(abbrevMatch[2], 10),
    }
  }

  // Format 2: Numeric "1/15/2020" (US format: month/day/year)
  const numericMatch = dateStr.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/)
  if (numericMatch) {
    return {
      year: Number.parseInt(numericMatch[3], 10),
      month: Number.parseInt(numericMatch[1], 10),
      day: Number.parseInt(numericMatch[2], 10),
    }
  }

  // Format 3: Year only "2020"
  const yearMatch = dateStr.match(/\b(\d{4})\b/)
  if (yearMatch) {
    return {
      year: Number.parseInt(yearMatch[1], 10),
    }
  }

  return undefined
}

export function toIsoDate(parsed: { year: number; month?: number; day?: number }): string {
  if (parsed.month && parsed.day) {
    const m = String(parsed.month).padStart(2, '0')
    const d = String(parsed.day).padStart(2, '0')
    return `${parsed.year}-${m}-${d}`
  }
  return `${parsed.year}`
}
```

**Key principles:**
- Handle both abbreviated ("Jan.") and full ("January") month names
- Handle "Sept." special case (4-letter abbreviation)
- Support US numeric format (month/day/year) as default
- Return year-only for parentheticals without month/day

### Anti-Patterns to Avoid
- **Don't parse case names from within parentheticals**: Case names appear BEFORE citation core, not inside parens
- **Don't use unbounded backward search**: 150-char limit prevents false matches from earlier sentences
- **Don't create separate parsers for each date format**: Single unified parser reduces duplication
- **Don't modify existing `span` field**: Keep citation core span frozen; add new `fullSpan` field
- **Don't extract explanatory parenthetical content**: "(holding that...)" text parsing is complex; defer to future phase

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Month name to number conversion | Custom switch statement | MONTH_MAP object lookup | Cleaner, easier to extend for international formats later |
| ISO date formatting | Template strings with manual padding | Built-in `String.padStart()` | Handles edge cases (single-digit months/days) correctly |
| Nested parenthesis tracking | Recursive descent parser | Simple depth counter | Legal citations have shallow nesting; counter sufficient |
| Case name boundary detection | Full sentence parser | Regex with comma boundary | Legal citations always have ", " after case name; regex works |

**Key insight:** Legal citations follow strict Bluebook formatting rules. Pattern matching with boundary heuristics is sufficient; don't over-engineer with parsing theory.

## Common Pitfalls

### Pitfall 1: Case Name Search Too Greedy
**What goes wrong:** Backward search matches text from previous sentences or paragraph headings
**Why it happens:** Not enforcing comma boundary after case name
**How to avoid:** ALWAYS require `, ` (comma + space) after case name in regex pattern
**Warning signs:** Extracted case name includes sentence fragments or unrelated text
**Example:**
```typescript
// BAD: No comma boundary
const match = text.match(/([A-Z][a-z]+)\s+v\.\s+([A-Z][a-z]+)/)
// Matches "Smith v. Jones" anywhere, even mid-sentence

// GOOD: Require comma boundary
const match = text.match(/([A-Z][a-z]+)\s+v\.\s+([A-Z][a-z]+),\s*$/)
// Only matches "Smith v. Jones, " at end of search window
```

### Pitfall 2: Not Handling Chained Parentheticals
**What goes wrong:** fullSpan stops at first closing paren, missing "(2020) (en banc)" second paren
**Why it happens:** Assuming single parenthetical per citation
**How to avoid:** After finding closing paren, check if next non-space char is '(' and continue
**Warning signs:** fullSpan ends prematurely; disposition info missing
**Example:**
```typescript
// BAD: Stop at first closing paren
const parenEnd = text.indexOf(')', coreEnd)

// GOOD: Track depth and check for chained parens
for (let i = coreEnd; i < text.length; i++) {
  if (text[i] === ')') {
    depth--
    if (depth === 0) {
      // Check for chained paren
      const nextParen = text.substring(i + 1).search(/\(/)
      if (nextParen !== -1 && nextParen < 5) continue  // Likely chained
      break
    }
  }
}
```

### Pitfall 3: Modifying Existing `span` Field
**What goes wrong:** Changing citation core span breaks backward compatibility
**Why it happens:** Confusing fullSpan (new field) with span (existing field)
**How to avoid:** NEVER modify `span.cleanStart/cleanEnd/originalStart/originalEnd`. Only populate new `fullSpan` field.
**Warning signs:** Existing tests fail; consumers report wrong citation positions
**Example:**
```typescript
// BAD: Modifying existing span
return {
  ...citation,
  span: {
    cleanStart: nameStart,     // ❌ Changed from core start
    cleanEnd: parenEnd,         // ❌ Changed from core end
    originalStart,
    originalEnd,
  }
}

// GOOD: Add separate fullSpan
return {
  ...citation,
  span: {
    cleanStart: coreStart,      // ✅ Unchanged (citation core)
    cleanEnd: coreEnd,
    originalStart,
    originalEnd,
  },
  fullSpan: {
    cleanStart: nameStart,      // ✅ New field (full citation)
    cleanEnd: parenEnd,
    originalStart: transformationMap.cleanToOriginal.get(nameStart) ?? nameStart,
    originalEnd: transformationMap.cleanToOriginal.get(parenEnd) ?? parenEnd,
  }
}
```

### Pitfall 4: Not Supporting Year-Only Parentheticals
**What goes wrong:** Parser expects court+year format, fails on "(2020)" year-only
**Why it happens:** Over-complicating parser logic for common case
**How to avoid:** Year-only should be simplest case; parse year first, then optional court/date
**Warning signs:** Citations with year-only parentheticals fail extraction or have undefined court
**Example:**
```typescript
// BAD: Assume court always present
const courtYearMatch = content.match(/([A-Z].+?)\s+(\d{4})/)

// GOOD: Year optional, court optional
const year = content.match(/(\d{4})/)?.[1]
const court = stripDateFromCourt(content)  // Returns undefined if no court
```

### Pitfall 5: Numeric Date Format Ambiguity
**What goes wrong:** "1/2/2020" interpreted as January 2 (US) vs. Feb 1 (international)
**Why it happens:** Multiple date format standards exist globally
**How to avoid:** Default to US format (month/day/year) per Bluebook; document assumption; provide option to override
**Warning signs:** Day value >12 causes parsing error (e.g., "13/1/2020")
**Example:**
```typescript
// GOOD: US format default with clear documentation
/**
 * Parses numeric dates in US format: month/day/year (e.g., "1/15/2020").
 * For international format (day/month/year), set option `intlDateFormat: true`.
 */
function parseNumericDate(dateStr: string, intlFormat = false): DateParsed {
  const parts = dateStr.split('/')
  const month = intlFormat ? Number(parts[1]) : Number(parts[0])
  const day = intlFormat ? Number(parts[0]) : Number(parts[1])
  const year = Number(parts[2])
  return { year, month, day }
}
```

## Code Examples

Verified patterns from existing codebase and Phase 6 requirements:

### Existing Date Handling Infrastructure
```typescript
// Source: src/extract/extractCase.ts (existing)
/** Month abbreviations found in legal citation parentheticals */
const MONTH_PATTERN = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?/

/**
 * Strips date components (month, day, year) from parenthetical content
 * to isolate the court abbreviation.
 * E.g., "2d Cir. Jan. 15, 2020" → "2d Cir."
 */
function stripDateFromCourt(content: string): string | undefined {
  // Strip trailing year
  let court = content.replace(/\s*\d{4}\s*$/, '').trim()
  // Strip trailing date components: optional day+comma, month abbreviation
  court = court.replace(new RegExp(`\\s*,?\\s*\\d{1,2}\\s*,?\\s*$`), '').trim()
  court = court.replace(new RegExp(`\\s*${MONTH_PATTERN.source}\\s*$`), '').trim()
  // Strip any trailing commas left over
  court = court.replace(/,\s*$/, '').trim()
  return court && /[A-Za-z]/.test(court) ? court : undefined
}
```

**Key insight:** This infrastructure ALREADY handles month/day stripping. Phase 6 extends it by CAPTURING the date components instead of just removing them.

### Case Name Extraction
```typescript
// src/extract/extractCase.ts (new function for Phase 6)
interface CaseNameResult {
  caseName: string
  nameStart: number
}

/**
 * Searches backward from citation core to find case name.
 * Handles standard "v." format and procedural prefixes.
 */
function extractCaseName(
  cleanedText: string,
  coreStart: number,
  maxLookback = 150
): CaseNameResult | undefined {
  const searchStart = Math.max(0, coreStart - maxLookback)
  const precedingText = cleanedText.substring(searchStart, coreStart)

  // Pattern 1: Standard "Party v. Party" format
  // Require comma after case name to avoid false positives
  const standardMatch = precedingText.match(
    /([A-Z][A-Za-z\s.,'&-]+?)\s+v\.?\s+([A-Z][A-Za-z\s.,'&-]+?)\s*,\s*$/i
  )
  if (standardMatch) {
    const caseName = standardMatch[0].replace(/,\s*$/, '').trim()
    return {
      caseName,
      nameStart: searchStart + standardMatch.index!
    }
  }

  // Pattern 2: Procedural prefix formats
  const proceduralMatch = precedingText.match(
    /\b(In re|Ex parte|Matter of)\s+([A-Z][A-Za-z\s.,'&-]+?)\s*,\s*$/i
  )
  if (proceduralMatch) {
    const caseName = proceduralMatch[0].replace(/,\s*$/, '').trim()
    return {
      caseName,
      nameStart: searchStart + proceduralMatch.index!
    }
  }

  return undefined
}
```

### Full Span Calculation
```typescript
// src/extract/extractCase.ts (extend extractCase function)
export function extractCase(
  token: Token,
  transformationMap: TransformationMap,
  cleanedText?: string,
): FullCaseCitation {
  // ... existing volume/reporter/page parsing ...

  // NEW: Calculate fullSpan if cleanedText provided
  let fullSpan: Span | undefined
  let caseName: string | undefined

  if (cleanedText) {
    // Search backward for case name
    const caseNameResult = extractCaseName(cleanedText, span.cleanStart)
    if (caseNameResult) {
      caseName = caseNameResult.caseName

      // Find parenthetical end (forward search)
      const parenEnd = findParentheticalEnd(cleanedText, span.cleanEnd) ?? span.cleanEnd

      // Build fullSpan
      fullSpan = {
        cleanStart: caseNameResult.nameStart,
        cleanEnd: parenEnd,
        originalStart: transformationMap.cleanToOriginal.get(caseNameResult.nameStart) ?? caseNameResult.nameStart,
        originalEnd: transformationMap.cleanToOriginal.get(parenEnd) ?? parenEnd,
      }
    }
  }

  return {
    type: 'case',
    // ... existing fields ...
    fullSpan,
    caseName,
  }
}
```

### Date Parsing Module
```typescript
// src/extract/dates.ts (new file)
export interface ParsedDate {
  year: number
  month?: number
  day?: number
}

export interface StructuredDate {
  iso: string
  parsed: ParsedDate
}

const MONTH_MAP: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
}

export function parseMonth(monthStr: string): number {
  const normalized = monthStr.toLowerCase().replace(/\.$/, '')
  const month = MONTH_MAP[normalized]
  if (!month) {
    throw new Error(`Invalid month: ${monthStr}`)
  }
  return month
}

export function parseDate(dateStr: string): StructuredDate | undefined {
  // Format 1: Abbreviated month with day and year (most common)
  // "Jan. 15, 2020", "Feb 9, 2015", "Sept. 30, 2019"
  const abbrevMatch = dateStr.match(
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+(\d{1,2}),?\s+(\d{4})\b/i
  )
  if (abbrevMatch) {
    const year = Number.parseInt(abbrevMatch[3], 10)
    const month = parseMonth(abbrevMatch[1])
    const day = Number.parseInt(abbrevMatch[2], 10)

    return {
      iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      parsed: { year, month, day }
    }
  }

  // Format 2: Full month name with day and year
  // "January 15, 2020", "February 9, 2015"
  const fullMonthMatch = dateStr.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/i
  )
  if (fullMonthMatch) {
    const year = Number.parseInt(fullMonthMatch[3], 10)
    const month = parseMonth(fullMonthMatch[1])
    const day = Number.parseInt(fullMonthMatch[2], 10)

    return {
      iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      parsed: { year, month, day }
    }
  }

  // Format 3: Numeric date (US format: month/day/year)
  // "1/15/2020", "02/09/2015"
  const numericMatch = dateStr.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/)
  if (numericMatch) {
    const year = Number.parseInt(numericMatch[3], 10)
    const month = Number.parseInt(numericMatch[1], 10)
    const day = Number.parseInt(numericMatch[2], 10)

    return {
      iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      parsed: { year, month, day }
    }
  }

  // Format 4: Year only
  const yearMatch = dateStr.match(/\b(\d{4})\b/)
  if (yearMatch) {
    const year = Number.parseInt(yearMatch[1], 10)
    return {
      iso: `${year}`,
      parsed: { year }
    }
  }

  return undefined
}
```

### Unified Parenthetical Parser
```typescript
// src/extract/extractCase.ts (replace existing court/year extraction)
interface ParentheticalInfo {
  court?: string
  year?: number
  date?: StructuredDate
  disposition?: string
}

function parseParenthetical(content: string): ParentheticalInfo {
  const result: ParentheticalInfo = {}

  // Extract structured date (handles year-only, month/day, all formats)
  const parsedDate = parseDate(content)
  if (parsedDate) {
    result.date = parsedDate
    result.year = parsedDate.parsed.year
  }

  // Extract court (after stripping date components)
  const court = stripDateFromCourt(content)
  if (court) {
    result.court = court
  }

  // Extract disposition signals
  if (/\ben banc\b/i.test(content)) {
    result.disposition = 'en banc'
  } else if (/\bper curiam\b/i.test(content)) {
    result.disposition = 'per curiam'
  }

  return result
}
```

### Test Coverage Pattern
```typescript
// tests/extract/extractCase.test.ts (Phase 6 additions)
describe('full span and case names (Phase 6)', () => {
  it('should extract fullSpan including case name and parenthetical', () => {
    const text = 'Smith v. Jones, 500 F.2d 123 (2020)'
    const citations = extractCitations(text)

    expect(citations).toHaveLength(1)
    if (citations[0].type === 'case') {
      expect(citations[0].caseName).toBe('Smith v. Jones')
      expect(citations[0].fullSpan).toBeDefined()
      expect(citations[0].fullSpan?.originalStart).toBe(0)  // Start of "Smith"
      expect(citations[0].fullSpan?.originalEnd).toBe(text.length)  // End of ")"
    }
  })

  it('should handle case name with procedural prefix', () => {
    const text = 'In re Smith, 410 U.S. 113 (1973)'
    const citations = extractCitations(text)

    expect(citations).toHaveLength(1)
    if (citations[0].type === 'case') {
      expect(citations[0].caseName).toBe('In re Smith')
      expect(citations[0].fullSpan?.originalStart).toBe(0)
    }
  })

  it('should leave fullSpan undefined when case name not found', () => {
    const text = '500 F.2d 123 (2020)'  // No case name preceding
    const citations = extractCitations(text)

    expect(citations).toHaveLength(1)
    if (citations[0].type === 'case') {
      expect(citations[0].caseName).toBeUndefined()
      expect(citations[0].fullSpan).toBeUndefined()
    }
  })
})

describe('complex parentheticals (Phase 6)', () => {
  it('should extract month/day date from parenthetical', () => {
    const text = '500 F.3d 100 (2d Cir. Jan. 15, 2020)'
    const citations = extractCitations(text)

    expect(citations).toHaveLength(1)
    if (citations[0].type === 'case') {
      expect(citations[0].court).toBe('2d Cir.')
      expect(citations[0].year).toBe(2020)
      expect(citations[0].date).toBeDefined()
      expect(citations[0].date?.iso).toBe('2020-01-15')
      expect(citations[0].date?.parsed).toEqual({ year: 2020, month: 1, day: 15 })
    }
  })

  it('should handle full month name', () => {
    const text = '500 F.3d 100 (D. Mass. January 15, 2020)'
    const citations = extractCitations(text)

    if (citations[0].type === 'case') {
      expect(citations[0].date?.iso).toBe('2020-01-15')
    }
  })

  it('should handle numeric date format', () => {
    const text = '500 F.3d 100 (D. Mass. 1/15/2020)'
    const citations = extractCitations(text)

    if (citations[0].type === 'case') {
      expect(citations[0].date?.iso).toBe('2020-01-15')
    }
  })

  it('should extract disposition info', () => {
    const text = '500 F.2d 123 (9th Cir. 2020) (en banc)'
    const citations = extractCitations(text)

    if (citations[0].type === 'case') {
      expect(citations[0].disposition).toBe('en banc')
    }
  })

  it('should handle per curiam flag', () => {
    const text = '500 F.2d 123 (per curiam)'
    const citations = extractCitations(text)

    if (citations[0].type === 'case') {
      expect(citations[0].disposition).toBe('per curiam')
    }
  })

  it('should handle year-only parenthetical with structured date', () => {
    const text = '410 U.S. 113 (1973)'
    const citations = extractCitations(text)

    if (citations[0].type === 'case') {
      expect(citations[0].year).toBe(1973)
      expect(citations[0].date).toBeDefined()
      expect(citations[0].date?.iso).toBe('1973')
      expect(citations[0].date?.parsed).toEqual({ year: 1973 })
    }
  })
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Year-only extraction | Unified date parser (year, month/day, all formats) | Phase 6 (v1.1) | Supports unpublished cases with full dates |
| Citation core only | Full span (case name through parentheticals) | Phase 6 (v1.1) | Enables proper document annotation, hyperlinking |
| Manual date stripping | Structured date with ISO + parsed object | Phase 6 (v1.1) | Machine-readable dates for filtering, sorting |
| No disposition detection | en banc / per curiam flags | Phase 6 (v1.1) | Weight of authority analysis possible |

**Deprecated/outdated:**
- **Separate year/court parsers**: Unified parenthetical parser handles all cases with single code path
- **Custom date libraries**: Native JavaScript Date sufficient for ISO formatting; no external deps needed

## Open Questions

Things that couldn't be fully resolved:

1. **Should caseName extraction be required for fullSpan, or can fullSpan exist without caseName?**
   - What we know: Most citations have case names, but short-form citations don't
   - What's unclear: Is fullSpan useful without case name? (Just reporter + parenthetical?)
   - Recommendation: Allow fullSpan without caseName; use citation core start as fallback

2. **How aggressive should backward search be for multi-citation contexts?**
   - What we know: "Smith v. Jones, 500 F.2d 123; Doe v. Roe, 600 F.3d 456" has two citations close together
   - What's unclear: How to prevent first search from grabbing second citation's name
   - Recommendation: Use comma boundary + max lookback 150 chars; validate case name doesn't contain semicolon

3. **Should subsequent history signals (aff'd, rev'd) be extracted into separate field?**
   - What we know: User wants them in fullSpan, unclear if separate field needed
   - What's unclear: Are these part of `disposition`, or new `subsequentHistory` field?
   - Recommendation: Include in fullSpan, populate existing `subsequentHistory` field if present, leave detailed extraction to future phase

4. **How to handle explanatory parentheticals like "(holding that...)"?**
   - What we know: User wants to flag their existence, not parse content
   - What's unclear: New boolean field, or reuse `parenthetical` string field?
   - Recommendation: Store in existing `parenthetical?: string` field; add boolean `hasExplanatoryParenthetical?: boolean` flag

## Sources

### Primary (HIGH confidence)
- **Existing codebase**: `src/extract/extractCase.ts` — `stripDateFromCourt()`, `MONTH_PATTERN`, lookahead mechanism already implemented
- **Phase 5 research**: `.planning/phases/05-type-system-blank-pages/05-RESEARCH.md` — Established pattern for optional fields, backward compatibility
- **Type definitions**: `src/types/citation.ts` — `fullSpan`, `caseName` already declared in v1.1 type system
- **Prior FEATURES research**: `.planning/research/FEATURES-EXTRACTION-ACCURACY.md` — Detailed analysis of full span and party name extraction patterns

### Secondary (MEDIUM confidence)
- **Bluebook Legal Citation**: [Pages, Paragraphs, and Pincites](https://tarlton.law.utexas.edu/bluebook-legal-citation/pages-paragraphs-pincites) — Date format standards
- **Bluebook Rule 10.2**: Case name rules and procedural phrases ("In re", "Ex parte")
- **DocumentResolver implementation**: `src/resolve/DocumentResolver.ts` — Already does backward search for case names (extractPartyName method)

### Tertiary (LOW confidence)
- **Python eyecite**: No explicit full span or complex parenthetical documentation; Issues #135, #193 show gaps

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Zero new dependencies, uses existing TypeScript/regex infrastructure
- Architecture: HIGH - Extends existing extraction patterns, reuses stripDateFromCourt logic
- Pitfalls: HIGH - Clear risks identified (greedy search, chained parens, span modification)
- Implementation complexity: MEDIUM - More complex than Phase 5 due to backward search heuristics

**Research date:** 2026-02-05
**Valid until:** 60 days (stable TypeScript/testing stack, slow-moving legal citation standards)

---

## Ready for Planning

Research complete. Key findings:

1. **Existing infrastructure reusable** - `stripDateFromCourt()`, `MONTH_PATTERN`, lookahead logic already present
2. **Backward search pattern established** - DocumentResolver already searches backward for party names; adapt for case name extraction
3. **Three date formats required** - Abbreviated months, full months, numeric (US format default)
4. **Unified parenthetical parser** - Replace year-only logic with single parser handling all cases
5. **Disposition field separate** - "en banc", "per curiam" get dedicated field, not mixed with court
6. **fullSpan additive** - Keep existing `span` frozen, add new `fullSpan` field

Planner can now create PLAN.md files focusing on:
- Case name extraction function (backward search with 150-char limit, comma boundary)
- Parenthetical end detection (forward search with depth tracking)
- Date parsing module (`dates.ts` with month map, ISO conversion)
- Unified parenthetical parser (replace existing year-only logic)
- Test coverage (case names, full dates, chained parens, procedural prefixes)
