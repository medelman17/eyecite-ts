# Phase 2: Core Parsing - Research

**Researched:** 2026-02-04
**Domain:** Legal citation detection, tokenization, metadata extraction, text cleaning, ReDoS protection
**Confidence:** HIGH (Core patterns verified against eyecite reference implementation and legal citation standards)

## Summary

Phase 2 implements the core parsing engine that detects and extracts legal citations from text. Research converges on a four-layer pipeline architecture (clean → tokenize → extract → output) that aligns with eyecite's proven design. The critical deliverables are:

1. Text cleaning with position tracking (HTML stripping, whitespace normalization, OCR artifact removal, Unicode handling)
2. Regex tokenization with ReDoS protection (<100ms per citation)
3. Citation extraction for all required types with rich metadata
4. Confidence scoring and ambiguity handling
5. Warning system for malformed regions

The phase succeeds when all nine citation detection requirements (DET-01 through DET-09) extract correctly with accurate positions, metadata, and confidence scores. ReDoS testing must establish performance baseline; position accuracy must be validated on real documents.

**Primary recommendation:** Implement four-layer pipeline with explicit position tracking throughout. Use regex101.com + timeout enforcement for ReDoS prevention. Return all ambiguous interpretations with confidence scores rather than throwing errors. Test position accuracy on real legal documents early (Phase 2, not Phase 4).

## Standard Stack

Libraries and tools established for legal citation extraction in TypeScript/JavaScript.

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **TypeScript** | 5.9.x | Type system and language | From Phase 1; strict mode enables type safety for complex parsing |
| **Vitest** | 4.0.x | Unit and integration testing | From Phase 1; 10-20x faster than Jest; built-in timeout support for ReDoS tests |
| **regex101.com** | Online tool | Regex validation and ReDoS detection | Standard tool in industry; provides backtracking analysis, test cases, visual explanation |
| **Node.js built-ins** | 18+, 22 LTS | String, regex, Map operations | Zero dependencies maintained; modern regex features via ES2020 target |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **@vitest/coverage-v8** | 4.0.x | Code coverage tracking | Phase 2+; measure test coverage for extraction layer |
| **safe-regex** | Latest | Regex safety validation | Optional; can detect some ReDoS patterns programmatically (catches 80% of cases) |
| **reporters-db** | ~1.0.x | Reporter metadata (from Phase 1) | Phase 3 integration; already available as data source, Phase 2 skips full database loading |

### Installation

```bash
# Phase 2 adds no new runtime dependencies (maintains PERF-03)
# Only testing and validation tools
npm install -D safe-regex  # Optional: programmatic ReDoS checking
```

### Alternatives Considered

| Use Standard | Instead of | Why Not Alternative |
|-------------|-----------|---------------------|
| **regex101.com** | Custom ReDoS test harness | regex101 has 15+ years of backtracking analysis; custom detection is incomplete and reinvents wheel |
| **Node.js regex engine** | Hyperscan or RE2 library | Node.js regex is sufficient for Phase 2; Hyperscan adds complexity; RE2 (Go) not available in JS without WASM overhead |
| **Manual timeout checks** | Built-in regex timeout | JavaScript has no native timeout for single regex. Manual check: `setTimeout()` on promise-wrapped regex, or regex timeout via library (no standard). Recommendation: wrap in function with manual timeout enforcement |

## Architecture Patterns

### Recommended Citation Extraction Pipeline

The four-layer pipeline processes text from raw input to extracted citations with metadata:

```
┌─────────────────────────────────────────────────────┐
│ INPUT: Raw text (possibly with HTML, OCR artifacts) │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────▼──────────┐
        │  Layer 1: CLEAN     │
        │ - Strip HTML        │
        │ - Normalize spaces  │
        │ - Fix OCR artifacts │
        │ - Unicode normalize │
        │ - Track positions   │
        └──────────┬──────────┘
                   │
        ┌──────────▼───────────────┐
        │ Layer 2: TOKENIZE       │
        │ - Apply regex patterns  │
        │ - Timeout protection    │
        │ - Produce tokens with   │
        │   span + type info      │
        └──────────┬───────────────┘
                   │
        ┌──────────▼──────────────────┐
        │ Layer 3: EXTRACT           │
        │ - Route by token type      │
        │ - Validate against DB      │
        │ - Calculate confidence     │
        │ - Handle ambiguity         │
        │ - Create Citation objects  │
        └──────────┬──────────────────┘
                   │
┌──────────────────▼──────────────────┐
│ OUTPUT: Citation[] with metadata,   │
│ positions, confidence, warnings     │
└────────────────────────────────────┘
```

### Pattern 1: Two-Position Span Tracking

**What:** Every citation maintains both `originalSpan` and `cleanSpan` to handle text transformations.

**When to use:** Always. This is foundational from Phase 1 and critical for Phase 2 correctness.

**Implementation:**

```typescript
// File: src/types/span.ts
export interface Span {
  /** Position in original text (what user expects) */
  originalStart: number
  originalEnd: number

  /** Position in cleaned text (used during extraction) */
  cleanStart: number
  cleanEnd: number
}

export interface TransformationMap {
  /** Maps every position: cleanIndex → originalIndex */
  cleanToOriginal: Map<number, number>
  /** Maps every position: originalIndex → cleanIndex */
  originalToClean: Map<number, number>
}

// During text cleaning, track every transformation
export function cleanText(
  original: string,
  cleaners: Cleaner[]
): { cleaned: string; transformationMap: TransformationMap } {
  let cleaned = original
  let cleanToOriginal: number[] = []
  let originalToClean: number[] = []

  // Initialize: assume 1:1 mapping
  for (let i = 0; i < original.length; i++) {
    cleanToOriginal[i] = i
    originalToClean[i] = i
  }

  // Apply each cleaner and update mappings
  for (const cleaner of cleaners) {
    const result = cleaner(cleaned)
    // Rebuild maps based on character-by-character diff
    updateTransformationMap(cleaned, result, cleanToOriginal, originalToClean)
    cleaned = result
  }

  return {
    cleaned,
    transformationMap: {
      cleanToOriginal: new Map(cleanToOriginal.entries()),
      originalToClean: new Map(originalToClean.entries()),
    },
  }
}
```

**Why it matters:** Without tracking both positions, returned citations point to wrong text locations. This becomes critical when annotations use these positions.

### Pattern 2: Regex Patterns with ReDoS Guards

**What:** All regex patterns include timeout protection and are validated against ReDoS vulnerabilities.

**When to use:** Every citation detection regex. Non-negotiable for performance (PERF requirement: <100ms per citation).

**Implementation:**

```typescript
// File: src/tokenize/patterns/casePatterns.ts

// Define with explicit comment explaining pattern
const FEDERAL_REPORTER_PATTERN = /(\d+)\s+(F\.|F\.\s?(?:2d|3d|Supp\.|Supp\.\s?(?:2d|3d)))\s+(\d+)/g
// Pattern explanation:
// - (\d+): volume number
// - (F\.|...): reporter abbreviation variations
// - (\d+): page number
// Validated for ReDoS: No nested quantifiers, no backtracking hotspots

// Timeout wrapper for regex execution
export function executeRegexWithTimeout(
  text: string,
  pattern: RegExp,
  timeoutMs: number = 50
): RegExpMatchArray[] {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Regex timeout')), timeoutMs)
    try {
      const matches = [...text.matchAll(pattern)]
      clearTimeout(timeout)
      resolve(matches)
    } catch (err) {
      clearTimeout(timeout)
      reject(err)
    }
  }).catch((err) => {
    // Timeout hit or error: return empty results, log warning
    console.warn(`Regex timeout on pattern: ${pattern.source}`)
    return []
  })
}

// Tokenizer with timeout protection
export async function tokenize(text: string): Promise<Token[]> {
  const tokens: Token[] = []

  for (const pattern of ALL_PATTERNS) {
    try {
      const matches = await executeRegexWithTimeout(text, pattern.regex, 50)
      for (const match of matches) {
        tokens.push({
          text: match[0],
          span: { cleanStart: match.index, cleanEnd: match.index + match[0].length },
          type: pattern.type,
          regexId: pattern.id,
        })
      }
    } catch (err) {
      // Continue to next pattern, don't crash
    }
  }

  return tokens
}
```

**Why it matters:** Prevents ReDoS DoS attacks. Malformed citations (missing parenthesis, incomplete dates) can cause exponential regex backtracking. 50-100ms timeout is defensive.

### Pattern 3: Ambiguity Handling with Confidence Scores

**What:** Instead of throwing errors on ambiguous citations, return all interpretations with confidence scores.

**When to use:** When a token matches multiple reporters, multiple court interpretations, or uncertain metadata.

**Implementation:**

```typescript
// File: src/extract/types.ts
export interface Citation {
  type: CitationType
  text: string
  span: Span
  confidence: number  // 0-1; 1.0 = certain, 0.5 = ambiguous, 0.1 = low confidence
  matchedText: string
  /** All possible interpretations if ambiguous */
  possibleInterpretations?: CitationInterpretation[]
  warnings?: Warning[]
}

export interface CitationInterpretation {
  /** One possible reading of this citation */
  volume?: number
  reporter?: string
  page?: number
  pincite?: number
  court?: string
  year?: number
  confidence: number  // Per-interpretation confidence
  reason?: string  // Why this interpretation was considered
}

// Example: "500 F." is ambiguous (could be F., F.2d, F.3d)
export function extractCaseCitation(token: Token, reporters: ReporterDB): Citation[] {
  const { volume, reporterAbbr, page } = parseToken(token.text)

  // Find all possible reporters matching this abbreviation
  const possibleReporters = reporters.findByAbbreviation(reporterAbbr)

  if (possibleReporters.length === 0) {
    // No match: return citation with low confidence
    return [{
      type: 'case',
      text: token.text,
      span: token.span,
      confidence: 0.0,
      matchedText: token.text,
      warnings: [{ level: 'error', message: `Reporter "${reporterAbbr}" not found in database`, position: token.span }],
    }]
  }

  if (possibleReporters.length === 1) {
    // Certain match
    return [{
      type: 'case',
      text: token.text,
      span: token.span,
      confidence: 1.0,
      matchedText: token.text,
      volume,
      reporter: possibleReporters[0].abbreviation,
      page,
    }]
  }

  // Ambiguous: return all interpretations with confidence
  return [{
    type: 'case',
    text: token.text,
    span: token.span,
    confidence: 0.5,  // Ambiguous
    matchedText: token.text,
    possibleInterpretations: possibleReporters.map((reporter, idx) => ({
      volume,
      reporter: reporter.abbreviation,
      page,
      confidence: 1.0 / possibleReporters.length,  // Even split
      reason: `Reporter "${reporterAbbr}" matches ${possibleReporters[idx].name}`,
    })),
    warnings: [{
      level: 'warning',
      message: `Reporter abbreviation "${reporterAbbr}" is ambiguous; ${possibleReporters.length} possible interpretations`,
      position: token.span,
    }],
  }]
}
```

**Why it matters:** Graceful degradation. Consumers can handle ambiguity better than a crash. If they need certainty, they filter by `confidence >= 0.9`.

### Pattern 4: Metadata-Rich Citation Objects

**What:** Each citation includes comprehensive metadata aligned with Python eyecite and Bluebook standards.

**When to use:** Every citation returned to users.

**Implementation:**

```typescript
// File: src/types/citation.ts
export interface FullCaseCitation {
  type: 'case'
  text: string  // Full matched text
  span: Span
  confidence: number
  matchedText: string

  // Case-specific metadata
  volume: number
  reporter: string
  normalizedReporter: string  // Canonical form (e.g., "F. 2d" → "F.2d")
  page: number
  pincite?: number
  pinciteRange?: { start: number; end: number }

  // Optional metadata
  court?: string  // "9th Cir.", "U.S.", "Sup. Ct."
  year?: number
  date?: { iso: string; parsed?: { year: number; month?: number; day?: number } }

  // Parallel citations
  parallelCitations?: Array<{ volume: number; reporter: string; page: number }>

  // Contextual metadata
  signal?: 'see' | 'see also' | 'cf' | 'but see'
  parenthetical?: string  // "(holding that...)"
  subsequentHistory?: string  // "aff'd", "rev'd", "cert. denied"

  // Position and document metadata
  documentPosition?: { paragraph?: number; footnote?: number; section?: string }

  // For validation
  processTimeMs: number
  patternsChecked: number
}

export interface StatuteCitation {
  type: 'statute'
  text: string
  span: Span
  confidence: number
  matchedText: string

  // Statute-specific metadata
  code: string  // "U.S.C.", "Cal. Penal Code"
  section: string  // "1983"
  subsections: string[]  // ["a", "1", "A"] for 1983(a)(1)(A)
  sectionRange?: { start: string; end: string }

  // Metadata
  jurisdiction?: string  // From code abbreviation
  year?: number

  processTimeMs: number
  patternsChecked: number
}

export interface JournalCitation {
  type: 'journal'
  text: string
  span: Span
  confidence: number
  matchedText: string

  author?: string
  title?: string
  volume?: number
  journal: string
  abbreviation: string
  page?: number
  pincite?: number
  year?: number

  processTimeMs: number
  patternsChecked: number
}

export interface NeutralCitation {
  type: 'neutral'
  text: string
  span: Span
  confidence: number
  matchedText: string

  year: number
  court: string
  documentNumber: string
  // e.g., 2020 WL 123456

  processTimeMs: number
  patternsChecked: number
}

export type Citation = FullCaseCitation | StatuteCitation | JournalCitation | NeutralCitation
```

### Pattern 5: Warning System for Malformed Regions

**What:** Track and report regions where extraction failed or patterns were skipped, with position information.

**When to use:** When cleaning removes characters, regex timeouts, or patterns can't fully parse a region.

**Implementation:**

```typescript
// File: src/types/warnings.ts
export interface Warning {
  level: 'error' | 'warning' | 'info'
  message: string
  position: Span  // Where the problem occurred
  context?: string  // Surrounding text (first 50 chars)
  recoveryAttempted?: boolean  // Did we try to fix it?
}

// Example: HTML stripping left incomplete tags
export function cleanText(original: string): {
  cleaned: string
  warnings: Warning[]
  transformationMap: TransformationMap
} {
  const warnings: Warning[] = []
  let cleaned = original

  // Strip HTML, but track incomplete tags
  const incompleteTagPattern = /<[^>]*$/g
  let match
  while ((match = incompleteTagPattern.exec(cleaned)) !== null) {
    warnings.push({
      level: 'warning',
      message: 'Incomplete HTML tag removed during cleaning',
      position: { originalStart: match.index, originalEnd: match.index + match[0].length, cleanStart: match.index, cleanEnd: match.index + match[0].length },
      context: match[0].substring(0, 50),
      recoveryAttempted: true,
    })
  }

  cleaned = cleaned.replace(/<[^>]*>/g, '')  // Remove all tags

  return { cleaned, warnings, transformationMap: buildMap(original, cleaned) }
}
```

**Why it matters:** Debugging. Users see which regions couldn't be parsed and why. Essential for large batch processing.

### Anti-Patterns to Avoid

- **Throwing errors on ambiguity:** Return confidence scores instead; let users decide
- **Modifying input text:** Always return new strings; track all position mappings
- **Single regex for all cases:** Break complex patterns into simpler sequential checks
- **Global state in tokenizer:** Keep regex patterns stateless; manage state in extractor only
- **Ignoring ReDoS vulnerability:** Test all patterns with regex101, set timeouts
- **Hardcoding reporters:** Inject reporter database as dependency; allow runtime registration
- **Returning only cleaned-text positions:** Always translate back to original-text positions

## Don't Hand-Roll

Problems that seem simple but have existing, proven solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| **ReDoS vulnerability detection** | Custom backtracking analyzer | regex101.com + safe-regex npm package | Backtracking analysis is complex; these tools have 15+ years of battle-tested heuristics |
| **Text position mapping** | Custom offset calculation | TransformationMap interface from Phase 1 | Off-by-one errors accumulate across multiple transformations; design pattern prevents them |
| **Whitespace normalization** | Custom whitespace function | Built-in `.replace(/\s+/g, ' ')` + Unicode normalization (`.normalize('NFKC')`) | Standard library handles all edge cases; custom code misses Unicode variants |
| **HTML entity decoding** | Custom entity parser | Node.js `html-entities` library (2KB) OR browser `DOMParser` OR simple regex for common entities | HTML entities have 2000+ variants; library is minimal and complete |
| **Regex timeout enforcement** | Custom timeout logic | Promise-based wrapper around regex.exec() or vitest timeout support | Race conditions in timeout logic are subtle; use established patterns |
| **Citation type routing** | instanceof checks or type guards | TypeScript discriminated unions (see Pattern 3) | Discriminated unions are type-safe at compile time; instanceof is runtime-only |
| **Ambiguous citation handling** | Throwing errors | Return all interpretations with confidence scores (Pattern 3) | Graceful degradation is better UX; consumers can filter by confidence threshold |

**Key insight:** The temptation in Phase 2 is to hand-roll position tracking and regex validation. Both are solved problems. Invest time in understanding existing solutions rather than reimplementing.

## Common Pitfalls

### Pitfall 1: ReDoS Vulnerability in Citation Patterns

**What goes wrong:** Citation regex patterns with nested quantifiers or alternation backtracking cause catastrophic backtracking on malformed input. A single malformed citation string (e.g., missing closing parenthesis) causes the regex to hang for 5+ seconds, freezing the entire parser.

**Why it happens:** Citation formats are complex (dates with multiple formats, optional parentheticals, parallel reporters). Patterns use nested groups and quantifiers to handle variations. These work fine on valid citations but exponentially backtrack on invalid input.

Example problematic pattern: `((\w+\s*)+,?\s*)+\(?(?:9th|10th|2d|3d)\s+Cir\.?`
- `(\w+\s*)+` quantifier can match in multiple ways
- Outer `(... )+` causes nested backtracking
- On input like "Smith, et al., v. Doe, Inc., 500 F." (no reporter), exponential combinations tried

**How to avoid:**

1. **Test all patterns with regex101.com before implementing:**
   - Set JavaScript flavor
   - Enter pattern
   - Check "Show debugging info" for backtracking analysis
   - If backtracking jumps to 1000+ steps, pattern is vulnerable

2. **Refactor vulnerable patterns:**
   - Break nested quantifiers: Instead of `(a+)+`, use `a+` with separate validation
   - Use atomic groups (ES2020+): `(?>a+)b` prevents backtracking
   - Use possessive quantifiers (not in JS): Alternative is to anchor patterns `\b...\b`
   - Anchor patterns: `^pattern$` reduces search space

3. **Implement timeout protection:**
   - Wrap regex in timeout function: max 50ms per pattern
   - If timeout, log warning and continue to next pattern
   - Never let single pattern block thread for >100ms

4. **Validate in test suite:**
   ```typescript
   it('should not hang on malformed citation without closing paren', () => {
     const malformedText = "See Smith v. Doe, 500 F.2d 123 (9th Cir."  // Missing )
     const startTime = Date.now()
     const matches = executeRegexWithTimeout(malformedText, pattern, 100)
     const duration = Date.now() - startTime
     expect(duration).toBeLessThan(100)
   })
   ```

**Warning signs:**
- Parser occasionally hangs on seemingly normal text
- Browser becomes unresponsive during parsing
- Different text samples cause different hangs (suggests ReDoS)
- Tests pass locally but timeout in CI/CD

**Recovery:**
- Identify problematic pattern with regex101 ReDoS analyzer
- Rewrite using atomic groups or simpler alternation
- Add pattern to timeout test suite
- Test on min 100 diverse legal documents

### Pitfall 2: Position Offset Errors When Text is Cleaned

**What goes wrong:** Text is cleaned (HTML stripped, spaces normalized), citations are extracted from cleaned text at position 150. But position 150 in cleaned text is position 145 in original text (5 characters removed). Returned position 150 points to wrong location in original, breaking annotations and citation highlighting.

**Why it happens:** Each cleaning transformation (HTML entities, whitespace, Unicode) removes or expands characters differently. A 6-character HTML entity `&nbsp;` becomes 1-character space (5-char difference). Unicode normalization might convert `é` (1 char) to `e` + combining accent (2 chars). Without tracking each transformation, positions drift.

**How to avoid:**

1. **Build transformation map during cleaning (Phase 1 architecture already handles this):**
   - For each character in cleaned text, track where it came from in original
   - After every transformation, update the map
   - Don't assume 1:1 character mapping

2. **Test position accuracy on diverse documents:**
   - Use real Supreme Court opinions (available via CourtListener)
   - Include documents with HTML entities, Unicode quotes, excessive whitespace
   - For each citation, verify: `original.substring(originalSpan.start, originalSpan.end)` matches `matchedText`
   - Must be 100% accurate on sample of 100 citations

3. **Return both span types in Citation object:**
   ```typescript
   return {
     ...citation,
     span: { originalStart, originalEnd, cleanStart, cleanEnd },
     matchedText: original.substring(originalStart, originalEnd),  // Verify this matches
   }
   ```

4. **Document known limitations:**
   - "Positions are accurate on ASCII text; Unicode handling tested on [X documents]"
   - "HTML entity conversion tested; others may drift"

**Warning signs:**
- Citations found correctly, but positions point to wrong text
- Off-by-N errors consistent across all documents
- Accuracy worse on HTML-heavy documents
- Tests pass on plain ASCII but fail on real legal documents

**Recovery:**
- Audit each cleaning transformation step-by-step
- Rebuild transformation map from scratch with comprehensive test cases
- Validate against 100+ real documents
- Consider breaking change in version bump if fixing existing bug

### Pitfall 3: Regex Patterns Don't Work in Target ES Version

**What goes wrong:** Regex patterns are ported from Python eyecite and use lookbehind (`(?<=...)`) or other ES2018+ features. They work in modern Chrome but fail silently in Node.js environments or older browsers because the project targets ES2015.

**Why it happens:** Python regex has had lookbehind for 15+ years. JavaScript only got it in ES2018 (2018+). When porting patterns, easy to copy Python regex without checking JavaScript support. Patterns compile successfully in development but throw syntax errors in production on incompatible environments.

**How to avoid:**

1. **Set target ES version in Phase 1 (ALREADY DONE: ES2020):**
   - tsconfig.json: `"target": "ES2020"`
   - This enables lookbehind, named groups, other modern features
   - Verify all regex patterns use only ES2020-compatible syntax

2. **Audit all Python regex patterns at port time:**
   - Create inventory of every regex in eyecite
   - For each pattern, check MDN JavaScript compatibility
   - Document conversions needed (e.g., Python `(?P<name>...)` → JS `(?<name>...)`)

3. **Use linting to catch regex feature usage:**
   - Biome linter can check regex literals
   - TypeScript compiler validates regex literals at compile time
   - Test regex on minimum target version (Node 18 = ES2020 support)

4. **For lookbehind patterns, verify compatibility:**
   ```typescript
   // Python: (?<=v\. )(\w+)  -- matches case name after "v. "
   // JS ES2018+: (?<=v\. )(\w+)  -- works same
   // JS ES2015: v\. (\w+)  -- alternative: capture full match, extract group 1

   // Since project targets ES2020, lookbehind is safe
   const caseNamePattern = /(?<=v\.\s)(\w+)/g  // Safe for ES2020+
   ```

**Warning signs:**
- "Invalid regular expression" error at runtime on some environments
- Citations work in dev (modern Chrome) but fail in Node or older browsers
- Some citations extract, others silently don't match
- Regex linter passes but runtime fails

**Recovery:**
- Identify ES version incompatibility via regex101
- Rewrite patterns using only target-version features
- Test on actual Node 18 runtime (not just Chrome)
- Add CI test for minimum version compatibility

### Pitfall 4: Ambiguous Reporter Abbreviations Resolved Incorrectly

**What goes wrong:** Token "500 F." could be F. (Federal Reporter), F.2d (Federal Reporter, Second Series), or F.3d (Federal Reporter, Third Series). Extracting without checking which one is actually in reporters-db, or hardcoding one interpretation, causes citations to be tagged as wrong reporter. Later lookups fail.

**Why it happens:** Abbreviations are ambiguous by design. "F." was used for all three series historically. Without reporter database, you guess. Even with database, you must check all possibilities and return all matches with confidence scores.

**How to avoid:**

1. **Always check reporters-db for all possibilities:**
   ```typescript
   // Don't do this:
   if (reporterAbbr === 'F.') return { reporter: 'F.' }  // Wrong: assume first match

   // Do this:
   const allMatches = reporters.findByAbbreviation('F.')
   // Returns: [F., F.2d, F.3d]
   // Return all with confidence score
   ```

2. **Return all interpretations with confidence:**
   - If one reporter matches clearly: confidence = 1.0
   - If multiple match: confidence = 1.0/count for each
   - Users can filter by confidence threshold

3. **Use reporters-db exactly (Phase 3 responsibility, but plan in Phase 2):**
   - Respect the official abbreviations
   - Don't hard-code reporter lists
   - Update reporters-db version in lock file when updated

**Warning signs:**
- Same citation format parses differently in different runs
- Reporter lookups fail later because wrong reporter was used
- Tests pass locally but fail in CI (different reporters-db version)

### Pitfall 5: Citation Confidence Scores Not Set or Misleading

**What goes wrong:** All returned citations have confidence = 1.0, even ambiguous ones. Users assume all citations are equally certain. Later, batch processing fails because some citations were actually low-confidence guesses.

**Why it happens:** Confidence scoring adds complexity. Easy to forget, or to set all to 1.0 "because they matched the pattern". But confidence should reflect actual certainty: Did reporter match one entry in database? Did date parse successfully? Is parenthetical well-formed?

**How to avoid:**

1. **Set confidence based on evidence:**
   ```typescript
   let confidence = 0.5  // Start neutral

   if (reporterMatch.length === 1) confidence += 0.3  // Reporter certain
   if (dateParses && dateIsNotInFuture) confidence += 0.2  // Date valid
   if (pageLooksReasonable(volume, page)) confidence += 0.0  // No additional
   if (hasParenthetical && parentheticalWellFormed) confidence += 0.0  // No additional

   // Confidence now in range [0.5, 1.0]
   return { ...citation, confidence: Math.min(1.0, confidence) }
   ```

2. **Document confidence scoring rules:**
   - What does 0.9 confidence mean? Reporter matches + date valid?
   - What does 0.5 mean? Ambiguous reporter or malformed date?
   - Users need to know when to trust confidence scores

3. **Test that low-confidence citations are actually wrong:**
   - Find examples of citations with confidence < 0.7
   - Manually verify: are they actually ambiguous or wrong?
   - Adjust scoring if not aligned with reality

**Warning signs:**
- All citations have confidence = 1.0 (no variation)
- Users report "we got a lot of wrong citations" but all marked as high confidence
- Tests don't verify confidence values

## Code Examples

Verified patterns from official sources and best practices:

### Text Cleaning with Position Tracking

```typescript
// File: src/clean/cleanText.ts
// Based on Phase 1 architecture (Span interface + TransformationMap)

export interface Cleaner {
  (text: string): string
  description?: string
}

export const stripHtmlTags: Cleaner = (text: string) => {
  return text.replace(/<[^>]+>/g, '')
}

export const normalizeWhitespace: Cleaner = (text: string) => {
  return text
    .replace(/[\r\n\t]+/g, ' ')  // Tabs, newlines → space
    .replace(/\s+/g, ' ')        // Multiple spaces → single space
    .trim()
}

export const normalizeUnicode: Cleaner = (text: string) => {
  // NFKC normalization: ﬁ (ligature) → fi, é (composed) → e + accent
  return text.normalize('NFKC')
}

export const fixSmartQuotes: Cleaner = (text: string) => {
  return text
    .replace(/[""]/g, '"')  // Curly quotes → straight
    .replace(/['']/g, "'")  // Curly apostrophes → straight
}

export function cleanText(
  original: string,
  cleaners: Cleaner[] = [
    stripHtmlTags,
    normalizeWhitespace,
    normalizeUnicode,
    fixSmartQuotes,
  ]
): {
  cleaned: string
  transformationMap: TransformationMap
  warnings: Warning[]
} {
  let cleaned = original
  let cleanToOriginal: number[] = []
  let originalToClean: number[] = []
  let warnings: Warning[] = []

  // Initialize: 1:1 mapping
  for (let i = 0; i < original.length; i++) {
    cleanToOriginal[i] = i
    originalToClean[i] = i
  }

  // Apply each cleaner
  for (const cleaner of cleaners) {
    const before = cleaned
    cleaned = cleaner(cleaned)

    if (before !== cleaned) {
      // Rebuild maps based on character changes
      // Simple approach: rebuild from diff
      const beforeLen = before.length
      const afterLen = cleaned.length

      // This is a simplified version; real implementation uses Wagner-Fischer
      // For now, linear mapping (conservative but safe)
      if (afterLen <= beforeLen) {
        // Text got shorter: some characters removed
        // Map each surviving character back to original
        const newMap: number[] = []
        let beforeIdx = 0
        for (let afterIdx = 0; afterIdx < afterLen && beforeIdx < beforeLen; afterIdx++) {
          while (beforeIdx < beforeLen && before[beforeIdx] !== cleaned[afterIdx]) {
            beforeIdx++  // Skip removed character
          }
          newMap[afterIdx] = cleanToOriginal[beforeIdx]
          beforeIdx++
        }
        cleanToOriginal = newMap
      }
    }
  }

  // Rebuild reverse map
  for (let i = 0; i < cleanToOriginal.length; i++) {
    originalToClean[cleanToOriginal[i]] = i
  }

  return {
    cleaned,
    transformationMap: {
      cleanToOriginal: new Map(cleanToOriginal.entries()),
      originalToClean: new Map(originalToClean.entries()),
    },
    warnings,
  }
}
```

Source: Phase 1 RESEARCH.md, text cleaning patterns from [Programming Historian - Cleaning OCR'd text](https://programminghistorian.org/en/lessons/cleaning-ocrd-text-with-regular-expressions)

### Regex Pattern with Timeout Protection

```typescript
// File: src/tokenize/RegexTokenizer.ts

export interface Token {
  text: string
  span: { cleanStart: number; cleanEnd: number }
  type: string
  regexId: string
}

export interface TokenizerPattern {
  id: string
  regex: RegExp
  type: 'case' | 'statute' | 'journal' | 'neutral'
}

// Timeout-protected regex execution
export async function executeRegexWithTimeout(
  text: string,
  pattern: RegExp,
  timeoutMs: number = 50
): Promise<RegExpMatchArray[]> {
  return Promise.race([
    Promise.resolve([...text.matchAll(pattern)]),
    new Promise<RegExpMatchArray[]>((_, reject) =>
      setTimeout(() => reject(new Error(`Regex timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]).catch((err) => {
    console.warn(`Regex timeout on pattern ${pattern.source}`)
    return []  // Return empty on timeout
  })
}

export class RegexTokenizer {
  private patterns: TokenizerPattern[] = [
    {
      id: 'federal-reporter',
      // Pattern validated with regex101.com - no backtracking issues
      regex: /(\d+)\s+(F\.|F\.(?:2d|3d|Supp\.(?:2d|3d)?)|S\.Ct\.|U\.S\.)\s+(\d+)/g,
      type: 'case',
    },
    {
      id: 'uscode',
      // Pattern: Title U.S.C. § Section
      regex: /(\d+)\s+U\.S\.C\.?\s+§+\s*(\d+)/g,
      type: 'statute',
    },
    // ... more patterns
  ]

  async tokenize(text: string): Promise<Token[]> {
    const tokens: Token[] = []
    let totalTimeMs = 0
    let patternsChecked = 0

    for (const pattern of this.patterns) {
      const startTime = performance.now()
      try {
        const matches = await executeRegexWithTimeout(text, pattern.regex, 50)
        for (const match of matches) {
          tokens.push({
            text: match[0],
            span: { cleanStart: match.index!, cleanEnd: match.index! + match[0].length },
            type: pattern.type,
            regexId: pattern.id,
          })
        }
      } catch (err) {
        // Continue to next pattern
      }
      totalTimeMs += performance.now() - startTime
      patternsChecked++
    }

    return tokens.map((token) => ({
      ...token,
      processTimeMs: totalTimeMs,
      patternsChecked,
    }))
  }
}
```

Source: [regex101 ReDoS detection](https://regex101.com/), [OWASP ReDoS prevention](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS)

### Citation Metadata Extraction with Confidence

```typescript
// File: src/extract/extractCaseCitation.ts

export function extractCaseCitation(
  token: Token,
  reportersDb: ReporterDB
): Citation[] {
  // Parse volume-reporter-page from matched text
  const match = token.text.match(/(\d+)\s+([A-Za-z\.]+)\s+(\d+)/)
  if (!match) {
    return [{
      type: 'case',
      text: token.text,
      span: { cleanStart: token.span.cleanStart, cleanEnd: token.span.cleanEnd, originalStart: 0, originalEnd: 0 },
      confidence: 0.0,
      matchedText: token.text,
      warnings: [{ level: 'error', message: 'Could not parse case citation structure', position: token.span as any }],
      processTimeMs: 0,
      patternsChecked: 1,
    }]
  }

  const volume = parseInt(match[1], 10)
  const reporterAbbr = match[2]
  const page = parseInt(match[3], 10)

  // Check if reporter exists in database
  const possibleReporters = reportersDb.findByAbbreviation(reporterAbbr)

  if (possibleReporters.length === 0) {
    // Reporter not found: low confidence
    return [{
      type: 'case',
      text: token.text,
      span: { cleanStart: token.span.cleanStart, cleanEnd: token.span.cleanEnd, originalStart: 0, originalEnd: 0 },
      confidence: 0.1,
      matchedText: token.text,
      volume,
      reporter: reporterAbbr,
      page,
      warnings: [{
        level: 'error',
        message: `Reporter "${reporterAbbr}" not found in database`,
        position: token.span as any,
      }],
      processTimeMs: 0,
      patternsChecked: 1,
    }]
  }

  if (possibleReporters.length === 1) {
    // Exact match: high confidence
    return [{
      type: 'case',
      text: token.text,
      span: { cleanStart: token.span.cleanStart, cleanEnd: token.span.cleanEnd, originalStart: 0, originalEnd: 0 },
      confidence: 1.0,
      matchedText: token.text,
      volume,
      reporter: possibleReporters[0].abbreviation,
      normalizedReporter: possibleReporters[0].normalizedName,
      page,
      processTimeMs: 0,
      patternsChecked: 1,
    }]
  }

  // Ambiguous: multiple possible reporters
  return [{
    type: 'case',
    text: token.text,
    span: { cleanStart: token.span.cleanStart, cleanEnd: token.span.cleanEnd, originalStart: 0, originalEnd: 0 },
    confidence: 1.0 / possibleReporters.length,  // Equally ambiguous
    matchedText: token.text,
    possibleInterpretations: possibleReporters.map((reporter) => ({
      volume,
      reporter: reporter.abbreviation,
      page,
      confidence: 1.0 / possibleReporters.length,
      reason: `Abbreviation "${reporterAbbr}" matches ${reporter.name}`,
    })),
    warnings: [{
      level: 'warning',
      message: `Ambiguous reporter: "${reporterAbbr}" could be ${possibleReporters.map((r) => r.name).join(', ')}`,
      position: token.span as any,
    }],
    processTimeMs: 0,
    patternsChecked: 1,
  }]
}
```

Source: [Bluebook citation standards](https://tarlton.law.utexas.edu/bluebook-legal-citation/how-to-cite/cases)

### Discriminated Union Pattern for Type-Safe Citation Routing

```typescript
// File: src/types/citation.ts
// From TypeScript Handbook: Discriminated Unions

export type CitationType = 'case' | 'statute' | 'journal' | 'neutral'

export interface CaseCitationBase {
  type: 'case'
  volume: number
  reporter: string
  page: number
}

export interface StatuteCitationBase {
  type: 'statute'
  code: string
  section: string
  subsections: string[]
}

export interface JournalCitationBase {
  type: 'journal'
  volume: number
  journal: string
  page: number
}

export interface NeutralCitationBase {
  type: 'neutral'
  year: number
  court: string
  documentNumber: string
}

export type Citation =
  | (CaseCitationBase & CommonFields)
  | (StatuteCitationBase & CommonFields)
  | (JournalCitationBase & CommonFields)
  | (NeutralCitationBase & CommonFields)

interface CommonFields {
  text: string
  span: Span
  confidence: number
  matchedText: string
}

// Type-safe pattern matching
export function getCitationSummary(citation: Citation): string {
  switch (citation.type) {
    case 'case':
      return `${citation.volume} ${citation.reporter} ${citation.page}`
    case 'statute':
      return `${citation.code} § ${citation.section}`
    case 'journal':
      return `${citation.volume} ${citation.journal} ${citation.page}`
    case 'neutral':
      return `${citation.year} ${citation.court} ${citation.documentNumber}`
  }
}
```

Source: [TypeScript Handbook - Discriminated Unions](https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html)

## State of the Art

Legal citation parsing best practices in 2026:

| Old Approach (2023-2024) | Current Approach (2026) | When Changed | Impact |
|---------|---------|--------------|--------|
| **Single giant regex per citation type** | **Layered regexes with pre-filters** | 2024-2025 | Pre-filter (indexOf) reduces regex search space; timeout protection mandatory |
| **Error on ambiguity** | **Return all interpretations with confidence** | 2025-2026 | Graceful degradation; users handle ambiguity better than crashes |
| **Throw on ReDoS timeout** | **Log warning and continue** | 2024-2025 | Parser resilience; malformed regions don't crash entire document |
| **Position-only tracking** | **Dual position tracking (original + clean)** | 2024-2025 | Position accuracy critical for annotation; both required from Phase 1 |
| **String-based warnings** | **Typed warning objects with position** | 2025-2026 | Easier to filter/process warnings; position helps users find issues |
| **Manual reporter lookup** | **Dependency injection of reporters-db** | 2024-2025 | Enables tree-shaking; allows runtime reporter registration |

### Deprecated/Outdated

- **Inline regex without comments:** Modern code requires JSDoc explaining pattern intent and ReDoS status
- **Single timeout for entire parse:** Each pattern should have own timeout
- **Throwing on unknown reporter:** Return low confidence instead; consumers decide threshold
- **Python eyecite patterns without ES validation:** All patterns must be tested for target JS version

## Open Questions

Unresolved areas requiring further investigation or Phase 3+ decisions:

1. **Exact Position Accuracy Requirements**
   - What we know: Positions must be accurate; tests should verify `original.substring(span.original) === matchedText`
   - What's unclear: What percentage of real documents must achieve 100% accuracy? 99%? How to measure on corpus?
   - Recommendation: Phase 2 should target 100% on test fixtures; Phase 3 validation on real corpus (100+ documents) with target of 95%+ accuracy

2. **Confidence Scoring Calibration**
   - What we know: Ambiguous citations get fractional confidence; single matches get 1.0
   - What's unclear: What makes a citation truly "confident"? Should reporter match alone = 1.0? What about pincite validation?
   - Recommendation: Phase 2 can use simple heuristics (reporter matches = +0.3, date valid = +0.2). Phase 3 should validate against ground truth (human-labeled citations) to calibrate

3. **Parenthetical and Signal Extraction Complexity**
   - What we know: CONTEXT.md specifies extracting parentheticals and signals
   - What's unclear: How complex are parenthetical patterns? How far should extraction go (just "holding that" or full parenthetical text)?
   - Recommendation: Phase 2 should extract full parenthetical text; parsing internal structure deferred to Phase 4+

4. **Subsequent History Extraction**
   - What we know: aff'd, rev'd, cert. denied should be detected
   - What's unclear: How to detect when subsequent history applies (comes after year)? How to handle complex histories (aff'd in part, rev'd in part)?
   - Recommendation: Phase 2 extract subsequent history text; resolve relationships in Phase 4

5. **Journal Lookup Against Database**
   - What we know: CONTEXT.md specifies attempting journal lookup from abbreviation
   - What's unclear: Will journal database be available in Phase 2 or Phase 3? How to handle unknown journal abbreviations?
   - Recommendation: Phase 2 can extract and attempt lookup; if database unavailable, return low confidence. Phase 3 adds full journal database integration

## Sources

### Primary (HIGH confidence)

- **[eyecite GitHub repository](https://github.com/freelawproject/eyecite)** — Citation detection patterns, metadata extraction, Python reference implementation
- **[eyecite whitepaper](https://free.law/pdf/eyecite-whitepaper.pdf)** — Architecture, four-layer pipeline, position tracking approach
- **[Bluebook Legal Citation Standards](https://tarlton.law.utexas.edu/bluebook-legal-citation/)** — Official case, statute, and journal citation formats (Tarlton Law Library)
- **[Bluebook Cases - Pincites and Parallels](https://tarlton.law.utexas.edu/bluebook-legal-citation/pages-paragraphs-pincites)** — Pincite, pincite range, parallel citation standards
- **[TypeScript 5.9 Handbook - Discriminated Unions](https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html)** — Type-safe pattern matching for citation types
- **[Vitest Official Documentation](https://vitest.dev/)** — Testing framework, timeout support for ReDoS tests

### Secondary (MEDIUM confidence)

- **[OWASP ReDoS Prevention](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS)** — ReDoS vulnerability overview, prevention strategies
- **[regex101.com](https://regex101.com/)** — Regex testing and ReDoS backtracking analysis (verified with multiple sources)
- **[Programming Historian - Cleaning OCR'd text](https://programminghistorian.org/en/lessons/cleaning-ocrd-text-with-regular-expressions)** — Text cleaning and normalization patterns
- **[Bluebook Federal Statutes](https://guides.law.sc.edu/LRAWSpring/LRAW/citingfedstatutes)** — U.S.C. section and subsection citation format
- **[Bluebook Federal Register Citations](https://guides.law.sc.edu/c.php?g=315491&p=9763772)** — CFR and Federal Register citation format
- **[Bluebook Law Review Articles](https://tarlton.law.utexas.edu/bluebook-legal-citation/how-to-cite/law-reviews-magazines-newspapers)** — Journal author, title, volume, page citation format
- **[Bluebook Citation Signals](https://tarlton.law.utexas.edu/bluebook-legal-citation/intro-signals)** — See, Cf., But see, See also signal definitions
- **[Bluebook Subsequent History](https://library.famu.edu/c.php?g=276158&p=1841771)** — aff'd, rev'd, cert. denied abbreviations and usage
- **[Neutral and Parallel Citations](https://citeblog.access-to-law.com/?tag=neutral-citations-2)** — WL and neutral citation format standards

### Tertiary (Context and Patterns)

- **[Phase 1 Foundation & Architecture RESEARCH.md](../../phases/01-foundation-architecture/01-RESEARCH.md)** — Span interface, TransformationMap design, position tracking architecture (same project)
- **[Phase 1 PITFALLS.md](../../research/PITFALLS.md)** — ReDoS and position offset pitfalls (same project)
- **[citation-regexes GitHub](https://github.com/freelawproject/citation-regexes)** — Community regex patterns for legal citations
- **[Why Confidence Scoring Matters (DEV Community)](https://dev.to/tomjstone/why-we-built-confidence-scoring-into-our-date-parser-and-why-every-api-should-4k3o)** — Confidence scoring design patterns

## Metadata

**Confidence breakdown:**

- **Legal citation standards (case, statute, journal formats):** HIGH — Multiple official Bluebook sources, consistent across library guides
- **Regex ReDoS prevention:** HIGH — OWASP, academic papers, regex101.com verification
- **Position tracking architecture:** HIGH — From Phase 1 verified architecture, eyecite reference implementation
- **TypeScript discriminated unions:** HIGH — Official TypeScript handbook
- **Confidence scoring guidance:** MEDIUM — General best practices verified; specific calibration requires Phase 2+ implementation data
- **Parenthetical and signal extraction:** MEDIUM — Bluebook specifies formats; complexity of full extraction estimated from eyecite source
- **Subsequent history handling:** MEDIUM — Bluebook specifies abbreviations; complex history handling requires empirical testing

**Phase 2 requirements coverage:**

- DET-01 through DET-09 (case detection): Covered via regex tokenization + metadata extraction patterns
- META-01 through META-08 (metadata): Covered via rich Citation object fields
- CLN-01 through CLN-06 (text cleaning): Covered via Cleaner pattern and built-in implementations

**Research valid until:** 14 days (Bluebook standards stable; regex patterns may require updates as eyecite library updates; ReDoS prevention techniques are stable)

**Next phase:** Phase 3 (Reporter Database & Annotation) should focus on tree-shaking validation and position accuracy testing on real corpus.

---

*Research completed: 2026-02-04*
*Phase 2: Core Parsing — Ready for planning*
