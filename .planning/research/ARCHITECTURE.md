# Architecture: v1.1 Extraction Accuracy Features

**Domain:** Legal citation extraction — adding accuracy features to existing pipeline
**Researched:** 2026-02-05
**Confidence:** HIGH (based on existing codebase + legal citation domain patterns)

## Executive Summary

The v1.1 milestone adds 5 extraction accuracy features to eyecite-ts. All integrate with the existing 4-layer pipeline (clean → tokenize → extract → resolve) with **minimal disruption**. Key insight: Three features (blank pages, complex parentheticals, party names) fit naturally in the **extract** layer; one (full citation span) extends the existing **Span** type; one (parallel citation linking) requires a new **extraction-time detection** step, not resolution-time.

The recommended approach:

1. **Parallel citation linking** — Extract at **extraction time** by detecting physical proximity in cleaned text; store as `parallelCitations` array on `FullCaseCitation` (already in v1.0 type)
2. **Full citation span** — Add optional `fullSpan` field to `FullCaseCitation` to track case name + metadata span separately from citation core
3. **Party name extraction** — New heuristic in `extractCase()` to find case names by searching backward from "v." in surrounding text
4. **Blank page numbers** — Change page type from `number` to `number | string` in extraction; patterns unchanged
5. **Complex parentheticals** — Enhanced parenthetical parsing in `extractCase()` lookahead; leverage existing `stripDateFromCourt()` pattern

**Build order:** Features 4 and 5 first (low-risk pattern/type changes), then 1 and 3 (extraction-time detection), then 2 (span extension).

---

## Current Pipeline Architecture

Existing 4-layer flow (from v1.0):

```
┌────────────────────────────────────────────────────┐
│ 1. CLEAN (src/clean/)                              │
│    Raw text → Cleaned text + TransformationMap    │
│    Removes HTML, normalizes Unicode/whitespace     │
└────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────┐
│ 2. TOKENIZE (src/tokenize/ + src/patterns/)        │
│    Cleaned text → Tokens (broad matching)          │
│    Regex patterns find candidates                  │
│    Position: cleanStart/cleanEnd only              │
└────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────┐
│ 3. EXTRACT (src/extract/)                          │
│    Tokens → Citations (parse metadata)             │
│    Volume, reporter, page, court, year             │
│    Translate positions: cleanStart → originalStart │
└────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────┐
│ 4. RESOLVE (src/resolve/) [optional]               │
│    Citations → Resolved references                 │
│    Link supra/Id. to antecedents                   │
└────────────────────────────────────────────────────┘
```

**Key existing types:**

| Type | Location | Role |
|------|----------|------|
| `Span` | `src/types/span.ts` | Dual positions: `cleanStart/cleanEnd` + `originalStart/originalEnd` |
| `FullCaseCitation` | `src/types/citation.ts` | Case citations with optional `parallelCitations`, `signal`, `parenthetical`, `subsequentHistory` |
| `Token` | `src/tokenize/tokenizer.ts` | Matched text + `cleanStart/cleanEnd` position + `patternId` |
| `TransformationMap` | `src/types/span.ts` | Bidirectional position mapping built during cleaning |

**Current extraction orchestration** (`src/extract/extractCitations.ts`):

```typescript
for (const token of deduplicatedTokens) {
  switch (token.type) {
    case 'case':
      citation = extractCase(token, transformationMap, cleaned)  // ← passes cleanedText for lookahead
      break
    // ... other types
  }
}
```

---

## Feature Integration Points

### Feature 1: Parallel Citation Linking

**Scope:** Link comma-separated citations sharing parentheticals
**Example:** "500 F.2d 100, 501 F.3d 200 (1989)" → detect both citations, link second to first

**Current state in v1.0:** Type already supports `parallelCitations?: Array<{volume, reporter, page}>`

**Integration approach: EXTRACTION-TIME DETECTION**

**Where:** In `src/extract/extractCitations.ts` after deduplication loop

```
Current:
  deduplicatedTokens → extract each token independently → citations array

With parallel linking:
  deduplicatedTokens → DETECT ADJACENCY → extract tokens → LINK in parallel groups → citations array
                                          ↑                    ↑
                                    New step 1           New step 2
```

**Components to create/modify:**

| Component | Action | Notes |
|-----------|--------|-------|
| `src/extract/detectParallelCitations.ts` | **NEW** | Function: `detectParallelCitations(tokens, cleaned) → Map<number, number[]>` Maps citation index to indices of parallel citations by checking proximity + parenthetical sharing |
| `src/extract/extractCitations.ts` | MODIFY | After deduplication: detect parallel groups, then extract, then link |
| `FullCaseCitation.parallelCitations` | EXISTING | Already in type definition |

**Detection algorithm:**

```typescript
// Pseudocode
function detectParallelCitations(tokens: Token[], cleaned: string): Map<tokenIndex, parallelIndices[]> {
  const groups = new Map()

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== 'case') continue

    // Look ahead within 20 chars for comma + next case citation
    const afterToken = cleaned.substring(tokens[i].span.cleanEnd, tokens[i].span.cleanEnd + 20)

    if (/^\s*,\s*\d+/.test(afterToken) && i + 1 < tokens.length && tokens[i+1].type === 'case') {
      // Next token is a citation within 20 chars after comma
      // Check if parenthetical content is shared
      const nextAfter = cleaned.substring(tokens[i+1].span.cleanEnd, tokens[i+1].span.cleanEnd + 50)
      if (/^\s*\([^)]+\)/.test(nextAfter)) {
        groups.set(i, [...(groups.get(i) || []), i+1])
      }
    }
  }

  return groups
}
```

**Data flow change:**

```typescript
// In extractCitations.ts
const parallelGroups = detectParallelCitations(deduplicatedTokens, cleaned)

for (let i = 0; i < deduplicatedTokens.length; i++) {
  const token = deduplicatedTokens[i]
  let citation: Citation

  switch (token.type) {
    case 'case':
      citation = extractCase(token, transformationMap, cleaned)

      // If this citation has parallel citations, extract and attach them
      if (parallelGroups.has(i)) {
        const parallelIndices = parallelGroups.get(i)!
        const parallel: Array<{volume, reporter, page}> = []

        for (const parallelIdx of parallelIndices) {
          const parallelCit = extractCase(deduplicatedTokens[parallelIdx], transformationMap, cleaned)
          if (parallelCit.type === 'case') {
            parallel.push({
              volume: parallelCit.volume,
              reporter: parallelCit.reporter,
              page: parallelCit.page,
            })
          }
        }

        if (citation.type === 'case') {
          citation.parallelCitations = parallel
        }
      }
      break
    // ...
  }
}
```

**Position tracking:** No impact — both citations extracted independently with correct span translation

**Risk level:** LOW — new detection function is optional, doesn't change existing extraction logic

---

### Feature 2: Full Citation Span

**Scope:** Capture span from case name through parenthetical, not just core citation
**Example:** "Smith v. Jones, 500 F.2d 100 (9th Cir. 2020)" → fullSpan covers entire text including "Smith v. Jones" and "(9th Cir. 2020)"

**Current state in v1.0:**
- `FullCaseCitation.span` covers only "500 F.2d 100" (the tokenized match)
- `FullCaseCitation.matchedText` same as span
- No case name extraction

**Integration approach: SPAN EXTENSION + NAME EXTRACTION**

**Where:**
1. New optional field on `FullCaseCitation` type
2. Enhanced lookahead in `extractCase()` to find name start and parenthetical end

**Components to create/modify:**

| Component | Action | Notes |
|-----------|--------|-------|
| `src/types/citation.ts` | MODIFY | Add optional `fullSpan?: Span` and `caseName?: string` to `FullCaseCitation` |
| `src/extract/extractCase.ts` | MODIFY | Enhance `extractCase()` to find case name and parenthetical span |
| `src/extract/caseNameExtraction.ts` | **NEW** | Heuristic: search backward for " v. " pattern, extract case name from surrounding text |

**Type changes:**

```typescript
export interface FullCaseCitation extends CitationBase {
  // ... existing fields ...

  /** Optional full span from case name through closing parenthetical */
  fullSpan?: Span

  /** Optional extracted case name (e.g., "Smith v. Jones") */
  caseName?: string
}
```

**Extraction algorithm:**

```typescript
function extractCase(
  token: Token,
  transformationMap: TransformationMap,
  cleanedText?: string,
): FullCaseCitation {
  // ... existing extraction logic ...

  // NEW: Find full citation span if cleanedText available
  let fullSpan = token.span  // Default to core citation
  let caseName: string | undefined

  if (cleanedText) {
    // Backward search for case name (heuristic: " v. " pattern)
    const beforeToken = cleanedText.substring(0, token.span.cleanStart)
    const vPattern = /\b([A-Z][a-zA-Z\s.'-]+?)\s+v\.\s+([A-Z][a-zA-Z\s.'-]+?)(?:\s*,\s*$)/
    const nameMatch = vPattern.exec(beforeToken.slice(-100))  // Search last 100 chars

    if (nameMatch) {
      const nameStart = Math.max(0, token.span.cleanStart - 100 + nameMatch.index)
      caseName = `${nameMatch[1]} v. ${nameMatch[2]}`

      // Find lookahead parenthetical end
      const afterToken = cleanedText.substring(token.span.cleanEnd)
      const parenEndMatch = /^\s*(?:,\s*\d+)*\s*\([^)]+\)/.exec(afterToken)
      const fullEnd = parenEndMatch ? token.span.cleanEnd + parenEndMatch[0].length : token.span.cleanEnd

      // Create full span
      fullSpan = {
        cleanStart: nameStart,
        cleanEnd: fullEnd,
        originalStart: transformationMap.cleanToOriginal.get(nameStart) ?? nameStart,
        originalEnd: transformationMap.cleanToOriginal.get(fullEnd) ?? fullEnd,
      }
    }
  }

  return {
    // ... existing fields ...
    fullSpan,
    caseName,
  }
}
```

**Heuristic notes:**

- Search backward for " v. " within 100 chars of citation start (avoids matching unrelated "v." in text)
- Capture party names: allow capitalized words, apostrophes, periods, hyphens
- Stop at comma immediately after second party (delineates end of parties, before case number)
- Search forward for parenthetical end using existing `lookAheadRegex` pattern

**Position tracking:** Span translation handles cleanStart/cleanEnd → originalStart/originalEnd using existing `transformationMap`

**Risk level:** MEDIUM — new heuristic for party name extraction may have edge cases (see Pitfalls section)

---

### Feature 3: Party Name Extraction (Plaintiff/Defendant)

**Scope:** Expose individual plaintiff and defendant fields on `FullCaseCitation`
**Example:** "Smith v. Jones" → `plaintiff: "Smith"`, `defendant: "Jones"`

**Current state in v1.0:**
- `SupraCitation` has `partyName: string` (single field)
- `FullCaseCitation` does not extract parties separately

**Integration approach: EXTRACT-TIME PARSING**

**Where:** New function in extraction layer, called from `extractCase()`

**Components to create/modify:**

| Component | Action | Notes |
|-----------|--------|-------|
| `src/types/citation.ts` | MODIFY | Add optional `plaintiff?: string` and `defendant?: string` to `FullCaseCitation` |
| `src/extract/extractCase.ts` | MODIFY | Call `extractParties()` after finding case name |
| `src/extract/extractParties.ts` | **NEW** | Parse "Plaintiff v. Defendant" pattern into two fields |

**Type changes:**

```typescript
export interface FullCaseCitation extends CitationBase {
  // ... existing fields ...

  /** Plaintiff/appellant name extracted from case citation */
  plaintiff?: string

  /** Defendant/respondent name extracted from case citation */
  defendant?: string
}
```

**Extraction algorithm:**

```typescript
function extractParties(caseName: string): { plaintiff?: string; defendant?: string } {
  // Match "Name1 v. Name2" where names can contain capitalized words, apostrophes, hyphens
  const partyPattern = /^([A-Z][a-zA-Z\s.'-]*?)\s+v\.\s+([A-Z][a-zA-Z\s.'-]*?)$/
  const match = partyPattern.exec(caseName?.trim() || '')

  if (match) {
    return {
      plaintiff: match[1].trim(),
      defendant: match[2].trim(),
    }
  }

  return {}
}
```

**Integration into `extractCase()`:**

```typescript
if (caseName) {
  const { plaintiff, defendant } = extractParties(caseName)
  // Attach to citation object
}
```

**Heuristic notes:**

- Simple split on " v. " (not " vs. " or other variants — align with Bluebook Rule 10.2)
- Trim whitespace but preserve internal spacing in party names
- Return undefined if pattern doesn't match (e.g., "In re Smith" or corporate names with multiple words)

**Position tracking:** No impact — this is text parsing, not span-based

**Risk level:** LOW — simple text pattern, bounded scope (only on successfully extracted case names)

---

### Feature 4: Blank Page Numbers

**Scope:** Support citations with missing page numbers (e.g., "500 F.2d" without page)
**Example:** "500 F.2d" cited as-is, without requiring page number

**Current state in v1.0:**
- Pattern: `/\b(\d+)\s+([A-Za-z0-9.]+)\s+(\d+)/` — requires all 3: volume, reporter, page
- Type: `page: number` (required field)

**Integration approach: TYPE AND PATTERN CHANGES**

**Where:**
1. Modify regex patterns to make page optional
2. Change `page` type to `number | string | undefined`

**Components to modify:**

| Component | Action | Notes |
|-----------|--------|-------|
| `src/patterns/casePatterns.ts` | MODIFY | Make page digits optional: `(\d+)?` instead of `(\d+)` |
| `src/types/citation.ts` | MODIFY | Change `page: number` to `page?: number` in `FullCaseCitation` |
| `src/extract/extractCase.ts` | MODIFY | Handle undefined page in regex match |
| `src/extract/extractStatute.ts` | MODIFY | Similar changes for statute citations if needed |

**Pattern changes:**

```typescript
// Current (v1.0)
regex: /\b(\d+(?:-\d+)?)\s+(F\.|F\.2d|...)\s+(\d+)\b/g

// Changed (v1.1)
regex: /\b(\d+(?:-\d+)?)\s+(F\.|F\.2d|...)\s+(\d+)?\b/g
//                                                 ^
//                                         page is now optional
```

**Extraction changes in `extractCase()`:**

```typescript
const volumeReporterPageRegex = /^(\d+(?:-\d+)?)\s+([A-Za-z0-9.\s]+)\s+(\d+)?/
const match = volumeReporterPageRegex.exec(text)

if (!match) {
  throw new Error(`Failed to parse case citation: ${text}`)
}

const volume = parseVolume(match[1])
const reporter = match[2].trim()
const page = match[3] ? Number.parseInt(match[3], 10) : undefined
//                ^^^ Handle undefined
```

**Type changes:**

```typescript
export interface FullCaseCitation extends CitationBase {
  volume: number | string
  reporter: string
  page?: number  // Changed from: page: number
  // ... rest unchanged
}
```

**Risk level:** LOW — localized type and pattern changes, backward compatible (existing citations still have pages)

---

### Feature 5: Complex Parenthetical Parsing

**Scope:** Improve extraction of metadata from parentheticals with dates, multiple components
**Example:** "(D. Tex. Jan. 15, 2020)" → extract court "D. Tex." and year "2020", not "Jan. 15"

**Current state in v1.0:**
- Existing `stripDateFromCourt()` function removes year/month/day suffixes
- Works for simple cases but may miss multi-line or formatted parentheticals
- Lookahead captures parenthetical but parsing is basic

**Integration approach: ENHANCED EXTRACTION LOGIC**

**Where:** Enhanced parenthetical parsing in `extractCase()` lookahead

**Components to modify:**

| Component | Action | Notes |
|-----------|--------|-------|
| `src/extract/extractCase.ts` | MODIFY | Improve `stripDateFromCourt()` and parenthetical lookahead logic |
| `src/extract/extractCase.ts` | ENHANCE | Better handling of: "(Court Date)" vs "(Court, Date)" vs "(Date)" only |

**Current `stripDateFromCourt()` (v1.0):**

```typescript
function stripDateFromCourt(content: string): string | undefined {
  let court = content.replace(/\s*\d{4}\s*$/, '').trim()  // Strip trailing year
  court = court.replace(new RegExp(`\\s*,?\\s*\\d{1,2}\\s*,?\\s*$`), '').trim()  // Strip day
  court = court.replace(new RegExp(`\\s*${MONTH_PATTERN.source}\\s*$`), '').trim()  // Strip month
  court = court.replace(/,\s*$/, '').trim()
  return court && /[A-Za-z]/.test(court) ? court : undefined
}
```

**Enhanced version (v1.1):**

```typescript
function stripDateFromCourt(content: string): string | undefined {
  // Handle formats like:
  // "D. Tex. Jan. 15, 2020" → "D. Tex."
  // "9th Cir. 2020" → "9th Cir."
  // "Jan. 15, 2020" → undefined (no court abbreviation)

  let court = content.trim()

  // Strip trailing year (e.g., "2020")
  court = court.replace(/\s*\d{4}\s*$/, '').trim()

  // Strip trailing date pattern: "Month Day, Year" or just "Month Year"
  // Match: optional month, optional day+comma, optional year
  const datePattern = new RegExp(
    `(\\s*${MONTH_PATTERN.source}\\s*(?:\\d{1,2}\\s*,?\\s*)*)*\\s*$`
  )
  court = court.replace(datePattern, '').trim()

  // Strip trailing comma + whitespace
  court = court.replace(/,\s*$/, '').trim()

  // Validate: must have at least 2 characters and contain a letter
  return court && court.length >= 2 && /[A-Za-z]/.test(court) ? court : undefined
}
```

**Enhanced parenthetical lookahead in `extractCase()`:**

```typescript
// Existing lookahead (v1.0)
const lookAheadRegex = /^(?:,\s*\d+)*\s*\(([^)]+)\)/
const lookAheadMatch = lookAheadRegex.exec(afterToken)

// NEW: More robust handling of multi-component parentheticals
if (lookAheadMatch) {
  const parenContent = lookAheadMatch[1]

  // Try to extract year first (most specific)
  const yearMatch = /\b(\d{4})\b/.exec(parenContent)
  if (yearMatch && !year) {
    year = Number.parseInt(yearMatch[1], 10)
  }

  // Try to extract court (everything except dates)
  const courtContent = stripDateFromCourt(parenContent)
  if (courtContent) {
    court = courtContent
  }

  // Try to extract pincite from preceding content
  if (pincite === undefined) {
    const pinciteMatch = /,\s*(\d+)/.exec(afterToken)
    if (pinciteMatch) {
      pincite = Number.parseInt(pinciteMatch[1], 10)
    }
  }
}
```

**Additional parenthetical extraction:** Could be extended to parse `parenthetical` field (optional explanation after citation), but that's likely v1.2 scope.

**Risk level:** MEDIUM — improved regex logic, needs thorough testing with varied parenthetical formats

---

## Type System Changes

### FullCaseCitation Type Evolution

**v1.0:**

```typescript
export interface FullCaseCitation extends CitationBase {
  type: "case"
  volume: number | string
  reporter: string
  page: number
  pincite?: number
  court?: string
  year?: number
  normalizedReporter?: string
  parallelCitations?: Array<{volume: number | string; reporter: string; page: number}>
  signal?: 'see' | 'see also' | 'cf' | 'but see' | 'compare'
  parenthetical?: string
  subsequentHistory?: string
  date?: {iso: string; parsed?: {year: number; month?: number; day?: number}}
  possibleInterpretations?: Array<{...}>
}
```

**v1.1 (with all 5 features):**

```typescript
export interface FullCaseCitation extends CitationBase {
  type: "case"
  volume: number | string
  reporter: string
  page?: number  // ← Feature 4: now optional
  pincite?: number
  court?: string
  year?: number
  normalizedReporter?: string
  parallelCitations?: Array<{volume: number | string; reporter: string; page: number | undefined}>  // ← Feature 1: updated for blank pages
  signal?: 'see' | 'see also' | 'cf' | 'but see' | 'compare'
  parenthetical?: string
  subsequentHistory?: string
  date?: {iso: string; parsed?: {year: number; month?: number; day?: number}}
  possibleInterpretations?: Array<{...}>

  // NEW FIELDS (Features 2, 3)
  fullSpan?: Span  // ← Feature 2: case name + metadata span
  caseName?: string  // ← Feature 2: extracted case name
  plaintiff?: string  // ← Feature 3: extracted plaintiff
  defendant?: string  // ← Feature 3: extracted defendant
}
```

---

## Data Flow Changes

### Extraction Pipeline with v1.1 Features

```
┌──────────────────────────────────────────────────────────────────┐
│ CLEAN (unchanged)                                                │
│ Raw text → Cleaned text + TransformationMap                      │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ TOKENIZE (Pattern changes only)                                  │
│ Make page optional: (\d+)? instead of (\d+)                      │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ EXTRACT (NEW DETECTION STEPS)                                    │
│                                                                  │
│ 1. Deduplicate tokens (unchanged)                               │
│                                                                  │
│ 2. Detect parallel citations [NEW for Feature 1]                │
│    tokens → Map<index, parallelIndices>                         │
│                                                                  │
│ 3. Extract each token:                                          │
│    ├─ Parse volume, reporter, page (page now optional)          │
│    ├─ Find case name by searching backward [NEW for Feature 2]  │
│    ├─ Extract parties from case name [NEW for Feature 3]        │
│    ├─ Calculate full span [NEW for Feature 2]                   │
│    ├─ Improve parenthetical parsing [Feature 5]                 │
│    └─ Link parallel citations [Feature 1]                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ RESOLVE (unchanged)                                              │
│ Link short-form citations to full antecedents                    │
└──────────────────────────────────────────────────────────────────┘
```

### Files Modified/Created

| File | Change | Complexity | Risk |
|------|--------|------------|------|
| `src/patterns/casePatterns.ts` | Make page optional in regex | **LOW** | **LOW** |
| `src/types/citation.ts` | Add fields: `page?`, `fullSpan?`, `caseName?`, `plaintiff?`, `defendant?` | **LOW** | **LOW** |
| `src/extract/extractCase.ts` | Enhanced: name extraction, parties, blank pages, parenthetical parsing | **MEDIUM** | **MEDIUM** |
| `src/extract/extractCitations.ts` | Add parallel citation detection before extraction | **MEDIUM** | **MEDIUM** |
| `src/extract/detectParallelCitations.ts` | **NEW** — Parallel detection algorithm | **MEDIUM** | **LOW** |
| `src/extract/extractParties.ts` | **NEW** — Simple name splitting | **LOW** | **LOW** |
| `src/extract/caseNameExtraction.ts` | **NEW** — Backward search for case name | **MEDIUM** | **MEDIUM** |

---

## Build Order & Dependencies

Recommended implementation order based on dependency chains:

### Phase 1: Type & Pattern Updates (Lowest Risk)
1. **`src/types/citation.ts`** — Add all new optional fields
   - No code depends on new fields yet (they're optional)
   - Tests pass same as before
   - **Estimate:** 30 min

2. **`src/patterns/casePatterns.ts`** — Make page optional
   - Isolated change, backward compatible
   - Existing tests still pass (they have pages)
   - **Estimate:** 15 min

### Phase 2: Supporting Extractors (Preparation)
3. **`src/extract/extractParties.ts`** — Simple party name splitting
   - No dependencies on other new code
   - Trivial to test in isolation
   - **Estimate:** 20 min

4. **`src/extract/caseNameExtraction.ts`** — Case name extraction heuristic
   - Self-contained, can test with mock cleaned text
   - **Estimate:** 45 min

### Phase 3: Core Extraction Enhancement
5. **`src/extract/extractCase.ts`** — Integrate new features
   - Calls new functions from Phase 2
   - Updates extraction logic for pages, parentheticals, spans
   - Calls feature extractors in sequence
   - **Estimate:** 1.5 hours

### Phase 4: Parallel Citation Linking
6. **`src/extract/detectParallelCitations.ts`** — NEW detection logic
   - Operates on tokens before main extraction
   - Independent of case extraction details
   - **Estimate:** 45 min

7. **`src/extract/extractCitations.ts`** — Wire in parallel detection
   - Calls `detectParallelCitations()`
   - Loops changed to link parallel citations
   - **Estimate:** 45 min

### Testing & Integration (Concurrent)
- Unit tests for each new function (Phase 1-4 progress)
- Integration tests in `tests/extract/extractCase.test.ts`
- Pattern tests in `tests/patterns/casePatterns.test.ts`
- End-to-end tests with full examples

**Total estimate:** ~4-5 hours implementation + testing

**Dependency graph:**

```
types/citation.ts
      ↑
      ├── patterns/casePatterns.ts
      ├── extract/extractParties.ts
      ├── extract/caseNameExtraction.ts
      │
      └── extract/extractCase.ts
            ↑
            ├── detectParallelCitations.ts
            └── extractCitations.ts
```

---

## Component Integration Details

### How Parallel Citation Detection Fits

**Current behavior (v1.0):**
```
Text: "500 F.2d 100, 501 F.3d 200 (1989)"
Tokens: [
  {text: "500 F.2d 100", span: [0, 12], type: 'case', patternId: 'federal-reporter'},
  {text: "501 F.3d 200", span: [14, 26], type: 'case', patternId: 'federal-reporter'}
]
Citations: [
  {type: 'case', volume: 500, reporter: 'F.2d', page: 100},
  {type: 'case', volume: 501, reporter: 'F.3d', page: 200}
]
Return: array of 2 independent citations
```

**With v1.1 parallel linking:**
```
Text: "500 F.2d 100, 501 F.3d 200 (1989)"
Tokens: [same as above]
parallelGroups = { 0: [1] }  ← Citation 0 has parallel citation 1
Citations: [
  {
    type: 'case', volume: 500, reporter: 'F.2d', page: 100,
    parallelCitations: [
      {volume: 501, reporter: 'F.3d', page: 200}
    ]
  },
  {type: 'case', volume: 501, reporter: 'F.3d', page: 200}  ← Still included for continuity
]
Return: array of 2 citations, first has parallelCitations array
```

**Rationale for returning both:**
- Consistency with Python eyecite (returns all citations)
- Caller can access parallel via first citation or iterate all (choice)
- Resolver still works on all citations independently

---

### How Case Name Extraction Fits

**Integration into `extractCase()`:**

```typescript
export function extractCase(
  token: Token,
  transformationMap: TransformationMap,
  cleanedText?: string,
): FullCaseCitation {
  const { text, span } = token

  // ... existing extraction (volume, reporter, page, court, year, pincite) ...

  // NEW: Extract case name and parties (v1.1)
  let caseName: string | undefined
  let plaintiff: string | undefined
  let defendant: string | undefined
  let fullSpan: Span = {  // Default to citation core
    cleanStart: span.cleanStart,
    cleanEnd: span.cleanEnd,
    originalStart: transformationMap.cleanToOriginal.get(span.cleanStart) ?? span.cleanStart,
    originalEnd: transformationMap.cleanToOriginal.get(span.cleanEnd) ?? span.cleanEnd,
  }

  if (cleanedText) {
    // Step 1: Find case name by searching backward for " v. " pattern
    caseName = extractCaseNameFromContext(cleanedText, span.cleanStart, span.cleanEnd)

    if (caseName) {
      // Step 2: Parse case name into plaintiff/defendant
      const parties = extractParties(caseName)
      plaintiff = parties.plaintiff
      defendant = parties.defendant

      // Step 3: Calculate full span (name to parenthetical end)
      fullSpan = calculateFullCitationSpan(
        cleanedText,
        caseName,
        span,
        transformationMap
      )
    }
  }

  return {
    type: 'case',
    text,
    span: {
      cleanStart: span.cleanStart,
      cleanEnd: span.cleanEnd,
      originalStart: fullSpan.originalStart,
      originalEnd: fullSpan.originalEnd,
    },
    // ... existing fields (volume, reporter, page, court, year, pincite) ...

    // NEW FIELDS (v1.1)
    caseName,
    plaintiff,
    defendant,
    fullSpan,
  }
}
```

**Helper functions:**

```typescript
function extractCaseNameFromContext(
  cleanedText: string,
  citationStart: number,
  citationEnd: number,
): string | undefined {
  // Search backward from citationStart for "Plaintiff v. Defendant" pattern
  // Within a reasonable window (100-200 chars)
  const searchStart = Math.max(0, citationStart - 200)
  const context = cleanedText.substring(searchStart, citationStart)

  const pattern = /\b([A-Z][a-zA-Z\s.'-]+?)\s+v\.\s+([A-Z][a-zA-Z\s.'-]+?)\s*$/
  const match = pattern.exec(context)

  if (match) {
    return `${match[1].trim()} v. ${match[2].trim()}`
  }

  return undefined
}

function calculateFullCitationSpan(
  cleanedText: string,
  caseName: string,
  citationSpan: Pick<Span, 'cleanStart' | 'cleanEnd'>,
  transformationMap: TransformationMap,
): Span {
  // Find where case name starts in cleaned text
  const nameStart = cleanedText.lastIndexOf(caseName, citationSpan.cleanStart)

  // Find where parenthetical (if any) ends
  const afterCitation = cleanedText.substring(citationSpan.cleanEnd)
  const parenMatch = /^\s*(?:,\s*\d+)*\s*\(([^)]*)\)/.exec(afterCitation)
  const fullEnd = parenMatch
    ? citationSpan.cleanEnd + parenMatch[0].length
    : citationSpan.cleanEnd

  return {
    cleanStart: nameStart >= 0 ? nameStart : citationSpan.cleanStart,
    cleanEnd: fullEnd,
    originalStart: transformationMap.cleanToOriginal.get(nameStart >= 0 ? nameStart : citationSpan.cleanStart) ?? (nameStart >= 0 ? nameStart : citationSpan.cleanStart),
    originalEnd: transformationMap.cleanToOriginal.get(fullEnd) ?? fullEnd,
  }
}
```

---

## Testing Strategy

### Unit Tests

| Module | Test Cases | Complexity |
|--------|-----------|-----------|
| `extractParties()` | "Smith v. Jones" → plaintiff/defendant; "In re Smith" → no match; edge cases (apostrophes, hyphens) | LOW |
| `extractCaseNameFromContext()` | Found in preceding 100 chars; not found; multiple "v." in text | MEDIUM |
| `stripDateFromCourt()` enhanced | "(D. Tex. Jan. 15, 2020)", "(2020)", "(Cir. 2020)", malformed parentheticals | MEDIUM |
| `detectParallelCitations()` | Comma-separated case citations; non-adjacent; different reporters; with/without parenthetical | MEDIUM |

### Integration Tests

| Scenario | Expected Behavior |
|----------|------------------|
| "Smith v. Jones, 500 F.2d 100 (1989)" | fullSpan includes "Smith v. Jones...100"; plaintiff="Smith"; defendant="Jones" |
| "500 F.2d 100, 501 F.3d 200 (1989)" | parallelCitations[0] = {reporter: "F.3d", ...} |
| "500 F.2d (2020)" | page=undefined; year=2020 |
| "100, 200 (D.C. 1985)" | Multiple pincites; court="D.C."; year=1985 |
| "Roe v. Wade, 410 U.S. 113, 116 (1973)" | fullSpan spans entire; pincite=116 |

---

## Scalability & Performance

### Impact on Existing Performance Characteristics

| Component | v1.0 Perf | v1.1 Estimate | Notes |
|-----------|-----------|---------------|-------|
| Tokenization | ~2-3ms | ~2-3ms | Pattern changes minimal; page optional doesn't add cost |
| Extraction per token | ~0.5ms | ~1-2ms | Added backward search for case name (100-200 char window), parties parsing, full span calc |
| Parallel detection | N/A | ~0.5ms | One-pass scan of tokens, O(n) where n=tokens |
| Overall 10KB doc | ~40ms | ~50-60ms | Acceptable; still under 100ms budget |

### Scaling Concerns

1. **Case name extraction:** Backward search window is bounded (100-200 chars) — cost is constant
2. **Parallel detection:** Linear scan of tokens, no nested loops — cost is O(n) where n ≈ tokens
3. **Party extraction:** Simple regex split, no database lookup — cost is negligible

**Conclusion:** No scaling bottlenecks introduced; performance remains acceptable for target use case (10KB+ documents).

---

## Pitfalls to Avoid

### Pitfall 1: Case Name Extraction False Positives

**Risk:** Search for " v. " could match unrelated text (e.g., "noted v. carefully in the opinion")

**Prevention:**
- Bounded backward search window (100-200 chars)
- Require capitalization on both sides: `[A-Z][a-zA-Z...]*`
- Match must end at comma immediately after second party
- If unsure, leave `caseName` undefined (graceful degradation)

### Pitfall 2: Parallel Citation Detection Too Greedy

**Risk:** Link unrelated citations just because they're comma-separated (e.g., "500 F.2d 100, and separately 600 F.2d 200")

**Prevention:**
- Check proximity: next token must start within 20 chars after first ends
- Check for parenthetical sharing (both must have same court/year)
- Return parallelCitations only when confidence is high; otherwise omit field

### Pitfall 3: Page Becoming Truly Optional Breaks Validation

**Risk:** If page type is `number | undefined`, extraction code must handle undefined throughout

**Prevention:**
- Update type once, then systematically search for all `citation.page` accesses
- Add optional chaining: `citation.page?.toString()` instead of `String(citation.page)`
- Update any validation logic that assumes page exists (unlikely in v1.0)

### Pitfall 4: Full Span Overlaps Citation Span

**Risk:** `fullSpan` might incorrectly point to text outside the citation boundaries if name search is too aggressive

**Prevention:**
- Validate: `fullSpan.cleanStart <= span.cleanStart` (name comes before citation)
- Validate: `fullSpan.cleanEnd >= span.cleanEnd` (parenthetical comes after citation)
- If validation fails, discard fullSpan and use citation span only

### Pitfall 5: Party Names with Special Characters

**Risk:** Party names like "X-Y Corp." or "A&B Partners" might not match regex pattern `[a-zA-Z\s.'-]+`

**Prevention:**
- Regex allows: letters, spaces, periods, apostrophes, hyphens
- Test against real-world case names (e.g., "Abney & Dunn")
- If pattern doesn't match, leave plaintiff/defendant undefined

---

## Source Hierarchy

All findings based on:

- **Existing eyecite-ts codebase** (HIGH) — v1.0 implementation is source of truth for current architecture
- **eyecite Python implementation** (HIGH) — Parallel citation logic documented in issues #76 (GitHub: freelawproject/eyecite)
- **Bluebook Rule 10.2** (HIGH) — Legal citation standards for case names and court formatting
- **Domain knowledge** (MEDIUM) — Legal citation extraction heuristics are common across similar tools

---

## Summary: Integration Points

### By Feature

| Feature | Pipeline Layer | Components | Risk |
|---------|---|---|---|
| 1. Parallel linking | Extract (new detection step) | detectParallelCitations.ts, extractCitations.ts (wiring) | MEDIUM |
| 2. Full citation span | Extract (span calculation) + Type | extractCase.ts, caseNameExtraction.ts, citation.ts | MEDIUM |
| 3. Party name extraction | Extract (name parsing) | extractParties.ts, extractCase.ts | LOW |
| 4. Blank page numbers | Tokenize + Extract + Type | casePatterns.ts, extractCase.ts, citation.ts | LOW |
| 5. Complex parentheticals | Extract (parsing logic) | extractCase.ts enhancement | MEDIUM |

### By Component Change Type

**Type Changes (Lowest Risk):**
- Add optional fields to `FullCaseCitation`
- Change `page` from required to optional
- No code breaks because changes are backward-compatible

**Pattern Changes (Low Risk):**
- Make page capture group optional in case patterns
- Existing tests pass (they all have pages)

**Extraction Logic (Medium Risk):**
- Enhance `extractCase()` with new heuristics
- Add new helper functions (self-contained)
- Needs thorough testing with varied formats

**Pipeline Wiring (Medium Risk):**
- Add parallel detection step before extraction
- Integrate with existing extraction loop
- Straightforward but needs careful testing

---

## Recommendation

**Phased rollout:**

1. **Week 1:** Implement Features 4 + 5 (patterns + enhanced parenthetical parsing)
   - Low risk, immediate confidence gain
   - Validate with existing test suite

2. **Week 2:** Implement Features 2 + 3 (case name + parties)
   - Medium risk, depends on heuristic validation
   - Extensive edge case testing

3. **Week 3:** Implement Feature 1 (parallel linking)
   - Medium risk, new algorithm but isolated
   - Coordinate with any resolver impacts

All features fit naturally within the existing pipeline with minimal disruption. No architectural redesign needed.
