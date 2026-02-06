# Phase 8: Parallel Linking & Quality Validation - Research

**Researched:** 2026-02-05
**Domain:** Legal citation parallel linking, annotation modes, bundle size/performance validation
**Confidence:** HIGH

## Summary

Parallel citation linking detects when multiple reporters publish the same case decision and links them as a group via a new `groupId` field. This is a standard pattern in legal citation tools — Supreme Court decisions appear in three official reporters (U.S. Reports, Supreme Court Reporter, Lawyers' Edition), and practitioners expect citation tools to recognize these as equivalent.

The phase adds three interrelated features:

1. **Parallel Citation Detection** — Identify comma-separated case citations sharing a parenthetical (court/year)
2. **Full-Span Annotation Mode** — Allow annotation from case name through final parenthetical, not just the citation core
3. **Quality Validation** — Bundle size <50KB gzipped, performance <100ms for 10KB documents, golden test corpus for regression testing

The implementation strategy is **extraction-time detection** (during extraction loop in `extractCitations.ts`), not post-processing. Detection happens between tokenization and citation extraction, creates a parallel groups map, then links citations as they're extracted.

**Primary recommendation:** Implement parallel detection as a separate pure function (`detectParallelCitations`) that returns a map of primary-to-parallel indices. Pass this map to extraction, enrich the primary citation with the `parallelCitations` array and new `groupId`. Add optional `useFullSpan` parameter to annotation options (extends existing `AnnotationOptions`). Implement golden corpus as structured JSON test data in `tests/fixtures/golden-corpus.json`.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- User wants `groupId` field for easy grouping/filtering of parallel citations
- Source order preserved — first in text is first in array, treated as primary reporter
- Shared fullSpan across parallel group — the entire group from case name to closing parenthetical is one span
- Golden corpus should be 20-30 samples covering major citation types and edge cases

### Claude's Discretion

- Separator rules for parallel detection (Bluebook conventions)
- Citation type scope for parallel linking (case-only vs broader)
- False-positive prevention strictness
- Pipeline placement of linking logic
- groupId type, generation, and singleton behavior
- Reference mechanism and directionality in parallelCitations
- Parenthetical data sharing strategy (copy to all vs only last)
- Full-span annotation activation API design
- Group annotation wrapping strategy
- Span overlap handling
- Formatter mode awareness
- CI enforcement level for quality gates
- Golden corpus match granularity

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

## Standard Stack

**No external dependencies required.** Parallel linking uses existing infrastructure: regex patterns for detection, type system already supports `parallelCitations`, annotation system already handles custom span selection.

### Core Libraries Used

| Library/Module | Version | Purpose | Why Standard |
|---|---|---|---|
| TypeScript 5.9 | 5.9+ | Type safety for discriminated union Citation types | Already in use; strict typing enforced |
| Vitest 4 | 4.0+ | Test framework with performance benchmarks | Existing CI pipeline |
| size-limit 12 | 12.0.0 | Bundle size validation | Configured in package.json, 50KB limit |

### Existing Codebase Infrastructure

| Module | Current Use | Extend For Phase 8 |
|---|---|---|
| `extractCitations.ts` | Orchestrates extraction loop | Add parallel detection between tokenization and extraction |
| `extractCase.ts` | Parses volume/reporter/page | Reuse for parallel citations (no changes) |
| `annotation/annotate.ts` | Template/callback markup | Extend AnnotationOptions with `useFullSpan?: boolean` |
| `annotation/types.ts` | AnnotationOptions interface | Add optional `useFullSpan` field |
| `TransformationMap` | Position mapping | Reuse existing dual-position tracking |
| `Span` type | Dual positions | Reuse; fullSpan already exists on FullCaseCitation |
| Vitest test suite | 235 passing tests | Add parallel detection tests, golden corpus tests |

### No New Dependencies

- Detection algorithm is pure string-based regex (no fuzzy matching library needed)
- Bundle size validation uses existing size-limit v12 (already configured)
- Performance testing uses existing Vitest `performance.now()` API

**Installation:** None — uses only existing devDependencies

## Architecture Patterns

### Recommended Project Structure

Phase 8 extends extraction and annotation:

```
src/
├── extract/
│   ├── extractCitations.ts       # MODIFY: Call detectParallel before extraction loop
│   ├── extractCase.ts            # Reuse as-is
│   └── detectParallel.ts         # NEW: Pure detection function
├── annotate/
│   ├── annotate.ts               # MODIFY: Add useFullSpan param to logic
│   └── types.ts                  # MODIFY: Extend AnnotationOptions
├── types/
│   └── citation.ts               # MODIFY: Add groupId to FullCaseCitation
└── ...

tests/
├── extract/
│   └── detectParallel.test.ts     # NEW: Detection algorithm tests
├── annotate/
│   └── annotate.test.ts           # MODIFY: Add useFullSpan tests
├── integration/
│   └── fullPipeline.test.ts       # MODIFY: Add parallel group tests
├── fixtures/
│   └── golden-corpus.json         # NEW: Golden test data
└── ...
```

### Pattern 1: Extraction-Time Parallel Detection

**What:** Detect parallel groups before extraction loop, create map of primary→secondary indices
**When to use:** In `extractCitations.ts` after deduplication, before the extraction loop
**Example:**

```typescript
// Source: Architecture research doc, adapted to current codebase
import { detectParallel } from '@/extract/detectParallel'

export function extractCitations(text: string, options?: ExtractOptions): Citation[] {
  // ... clean, tokenize, deduplicate ...

  // NEW: Detect parallel groups
  const parallelGroups = detectParallel(deduplicatedTokens, cleanedText)

  const citations: Citation[] = []
  const processedIndices = new Set<number>()

  for (let i = 0; i < deduplicatedTokens.length; i++) {
    if (processedIndices.has(i)) continue // Already processed as secondary

    const token = deduplicatedTokens[i]
    let citation = extractCase(token, transformationMap, cleanedText)

    // NEW: Link parallel citations
    if (citation.type === 'case' && parallelGroups.has(i)) {
      const secondaryIndices = parallelGroups.get(i)!
      const parallel: Array<{volume: number|string; reporter: string; page?: number}> = []

      for (const idx of secondaryIndices) {
        const secondaryCitation = extractCase(
          deduplicatedTokens[idx],
          transformationMap,
          cleanedText
        )
        if (secondaryCitation.type === 'case') {
          parallel.push({
            volume: secondaryCitation.volume,
            reporter: secondaryCitation.reporter,
            page: secondaryCitation.page
          })
          processedIndices.add(idx)
        }
      }

      citation.parallelCitations = parallel
      citation.groupId = `${citation.volume}-${citation.reporter}-${citation.page}` // Unique ID
    }

    citations.push(citation)
  }

  return citations
}
```

### Pattern 2: Pure Detection Function

**What:** Standalone function that examines tokens and cleaned text, returns parallel groups map
**When to use:** Called once per document before extraction loop
**Example:**

```typescript
// Source: Architecture patterns from existing codebase
export function detectParallel(
  tokens: Token[],
  cleanedText: string
): Map<number, number[]> {
  const groups = new Map<number, number[]>()

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== 'case') continue

    const currentEnd = tokens[i].span.cleanEnd
    const lookAheadText = cleanedText.substring(currentEnd, currentEnd + 30)

    // Check for comma followed by digit (parallel citation pattern)
    if (!/^\s*,\s*\d/.test(lookAheadText)) continue

    // Look for next case token within reasonable distance
    if (i + 1 >= tokens.length) continue
    const nextToken = tokens[i + 1]
    if (nextToken.type !== 'case') continue

    const gap = nextToken.span.cleanStart - currentEnd
    if (gap > 30) continue // Too far apart

    // Check if parenthetical content is similar (shared court/year)
    const afterNext = cleanedText.substring(
      nextToken.span.cleanEnd,
      nextToken.span.cleanEnd + 100
    )

    // If next token also has a parenthetical, consider them parallel
    if (/^\s*\([^)]*\)/.test(afterNext)) {
      if (!groups.has(i)) groups.set(i, [])
      groups.get(i)!.push(i + 1)
    }
  }

  return groups
}
```

### Pattern 3: Full-Span Annotation via Options

**What:** Extend AnnotationOptions to support annotating from case name to parenthetical end
**When to use:** When caller needs full citation span markup, not just reporter portion
**Example:**

```typescript
// Source: Extending existing annotation API (annotate.ts)
export function annotate(
  text: string,
  citations: Citation[],
  options: AnnotationOptions = {}
): AnnotationResult {
  const {
    useCleanText = false,
    useFullSpan = false,  // NEW: Use fullSpan instead of span
    autoEscape = true,
    template,
    callback
  } = options

  const sorted = [...citations].sort((a, b) => {
    const aStart = useFullSpan && 'fullSpan' in a && a.fullSpan
      ? (useCleanText ? a.fullSpan.cleanStart : a.fullSpan.originalStart)
      : (useCleanText ? a.span.cleanStart : a.span.originalStart)

    const bStart = useFullSpan && 'fullSpan' in b && b.fullSpan
      ? (useCleanText ? b.fullSpan.cleanStart : b.fullSpan.originalStart)
      : (useCleanText ? b.span.cleanStart : b.span.originalStart)

    return bStart - aStart
  })

  // ... rest of annotation logic, using selected span ...
}
```

### Anti-Patterns to Avoid

- **Detection during resolution phase:** Linking should happen during extraction when we have access to tokens and cleaned text, not post-hoc in resolver
- **Storing object references in parallelCitations:** Array format is simpler, more portable; object references create circular dependencies
- **Checking reporter names string-matching:** Use reporter normalization already in codebase; "F.2d" vs "F. 2d" must match
- **Case-insensitive detector:** Parallel detection must be strict to avoid false positives (e.g., "500 F.2d 123, see also 501 F.3d 456" is NOT parallel)
- **Modifying tokens array during detection:** Detection function must return map, not mutate tokens
- **Full-span as always-on:** Must be optional (useFullSpan flag) to maintain backward compatibility with existing annotation code

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Parallel group detection | Custom loop over all pairs | Pure function `detectParallel` returning map | Separates concerns; detection logic is reusable and testable |
| Full-span selection in annotation | If-statement checking presence | Extend AnnotationOptions with `useFullSpan?: boolean` | Consistent with existing options pattern; documented API |
| GroupId generation | Sequential counter | `\`${volume}-${reporter}-${page}\`` hash | Stable across runs, human-readable, deterministic |
| Reporter normalization | Regex to handle spacing variants | Existing reporters-db normalized fields | Already used in phase 3; consistency matters for matching |
| Position tracking with parallelCitations | Manual offset calculation | Existing TransformationMap + Span | Dual position system already handles dual-span annotations |

**Key insight:** Phase 8 is mostly **wiring** — connecting detection output to extraction pipeline and extending annotation API. The hard infrastructure (position tracking, reporter database, extraction orchestration) already exists.

## Common Pitfalls

### Pitfall 1: False-Positive Linking (Over-Zealous Detection)

**What goes wrong:** Linking unrelated citations that happen to be adjacent
Example: "The plaintiff cited 500 F.2d 123, compare 501 F.3d 456" → mistakenly linked as parallel

**Why it happens:** Simple proximity check without reporter relationship validation

**How to avoid:**
1. Check reporter pairs against known parallel mappings (e.g., U.S. + S.Ct. + L.Ed.2d for SCOTUS)
2. Require matching court code (both 9th Cir., or both S.Ct.) or context
3. Only link case citations (not statutes, journals, etc.) — cases have defined parallel relationships
4. If unsure about reporter pair, don't link — better to return separate citations than false parallel

**Warning signs:**
- Tests showing citations linked that user says are unrelated
- Parallel groups appearing with unusual reporter combinations
- CI build showing increased parallelCitations when expanding detection

```typescript
// BAD: Too broad
if (nextToken.type === 'case' && gap < 30) {
  groups.get(i)!.push(i + 1)
}

// GOOD: Verify reporter relationship
const PARALLEL_REPORTERS = [
  { primary: 'U.S.', secondary: ['S.Ct.', 'L.Ed.2d'] },
  { primary: 'F.', secondary: ['F.2d', 'F.3d'] },
  // ...
]

if (nextToken.type === 'case' && gap < 30) {
  const primary = tokens[i].reporter
  const secondary = tokens[i+1].reporter
  const isKnownPair = PARALLEL_REPORTERS.some(p =>
    (p.primary === primary && p.secondary.includes(secondary)) ||
    (p.primary === secondary && p.secondary.includes(primary))
  )
  if (isKnownPair) {
    groups.get(i)!.push(i + 1)
  }
}
```

### Pitfall 2: groupId Collision or Inconsistency

**What goes wrong:** Same case cited multiple times gets different groupIds; groupId generation is non-deterministic

**Why it happens:** Using timestamp, random, or sequential counter instead of deterministic hash

**How to avoid:**
- Use `${volume}-${reporter}-${page}` as stable key (deterministic)
- For parallel group, use PRIMARY citation's key (first in array)
- Every citation in same parallel group gets SAME groupId
- Consistent across runs (no timestamps, random values)

**Warning signs:**
- Same case getting different groupIds in different extractions
- groupId format varies (sometimes null, sometimes string, sometimes number)
- Tests failing because groupId doesn't match expected value

### Pitfall 3: Shared fullSpan vs Individual Spans

**What goes wrong:** Developer confusion about which span to use
- Some citations in parallel group have different core spans (e.g., "500 F.2d 123" vs "501 F.3d 456")
- But they share fullSpan (case name + parenthetical covers entire group)

**Why it happens:** Unclear documentation about dual-span semantics

**How to avoid:**
- Document clearly: `span` = citation core (always present), `fullSpan` = extended (only when phase 6 extracted it)
- For annotation, let user choose: `useFullSpan: true` for full text, `false` for core only
- Example in types: "parallel citations share fullSpan but have independent span"

**Warning signs:**
- Tests showing citations at wrong positions
- Annotation placing markup in wrong locations
- Confusion in code about which span field to use

### Pitfall 4: Parallel Detection Interfering with Deduplication

**What goes wrong:** Detecting parallels on already-deduplicated tokens, then deduplication removes one of the pairs

**Why it happens:** Detection happening in wrong place in pipeline; or deduplication happening AFTER detection

**How to avoid:**
- Detect parallels AFTER deduplication in `extractCitations.ts` (current plan is correct)
- Don't re-deduplicate detected parallel groups
- Mark secondary citations as "processed" to skip later in loop

**Warning signs:**
- Parallel groups disappearing after deduplication
- Same citation appearing in multiple groups
- Tests showing lost citations

### Pitfall 5: Bundle Size Creep from Golden Corpus

**What goes wrong:** Adding 20-30 test samples bloats bundle size above 50KB limit

**Why it happens:** Storing entire text snippets in test data; golden corpus included in production build

**How to avoid:**
- Store golden corpus in `tests/fixtures/golden-corpus.json` (outside `src/`)
- Use tree-shaking: import only in test files, not in exported API
- Keep samples small (100-300 chars each, not full documents)
- Test data is NOT part of bundle — verify in CI with `pnpm size`

**Warning signs:**
- `pnpm size` shows bundle over 50KB
- CI failing on bundle size check
- Golden corpus imported in `src/` code

## Code Examples

Verified patterns from existing codebase:

### Parallel Detection (New Module)

```typescript
// Source: Based on Phase 3 tokenization loop pattern
export interface ParallelGroup {
  primary: number    // Index of primary citation
  secondary: number[] // Indices of parallel citations
}

export function detectParallel(
  tokens: Token[],
  cleanedText: string,
  options?: { maxGap?: number }
): Map<number, number[]> {
  const maxGap = options?.maxGap ?? 30
  const groups = new Map<number, number[]>()

  for (let i = 0; i < tokens.length - 1; i++) {
    if (tokens[i].type !== 'case') continue

    const currentEnd = tokens[i].span.cleanEnd
    const nextStart = tokens[i + 1].span.cleanStart
    const gap = nextStart - currentEnd

    // Check gap first (cheap)
    if (gap > maxGap) continue

    // Check next token is also case (cheap)
    if (tokens[i + 1].type !== 'case') continue

    // Check for comma separator (cheap regex)
    const betweenText = cleanedText.substring(currentEnd, nextStart)
    if (!/^\s*,\s*$/.test(betweenText)) continue

    // At this point: consecutive case citations with comma separator
    // Future: Add reporter validation if known parallel mappings exist

    if (!groups.has(i)) {
      groups.set(i, [])
    }
    groups.get(i)!.push(i + 1)
  }

  return groups
}
```

### Extended AnnotationOptions (Type Update)

```typescript
// Source: Extending existing src/annotate/types.ts
export interface AnnotationOptions<C extends Citation = Citation> {
  useCleanText?: boolean
  autoEscape?: boolean
  template?: { before: string; after: string }
  callback?: (citation: C, surrounding: string) => string

  /**
   * NEW: Annotate full citation span instead of core.
   *
   * When true, uses citation.fullSpan if available (case citations only).
   * Falls back to citation.span if fullSpan not present.
   *
   * Effect:
   * - false (default): "500 F.2d 123" only
   * - true: "Smith v. Doe, 500 F.2d 123 (2020)" (entire citation with context)
   *
   * @default false (backward compatible)
   */
  useFullSpan?: boolean
}
```

### Golden Corpus Structure

```typescript
// Source: Test data pattern from fullPipeline.test.ts
// File: tests/fixtures/golden-corpus.json

[
  {
    "id": "scotus-3-way-parallel",
    "text": "In City of Indianapolis v. Edmond, 531 U.S. 32, 148 L.Ed.2d 333, 121 S.Ct. 447 (2000), the Court held...",
    "expectedCitations": [
      {
        "type": "case",
        "volume": 531,
        "reporter": "U.S.",
        "page": 32,
        "groupId": "531-U.S.-32",
        "parallelCitations": [
          { "volume": 148, "reporter": "L.Ed.2d", "page": 333 },
          { "volume": 121, "reporter": "S.Ct.", "page": 447 }
        ],
        "court": "S.Ct.",
        "year": 2000
      }
    ],
    "expectedCount": 3,
    "category": "parallel-linking"
  },
  {
    "id": "federal-circuit-parallel",
    "text": "See Doe v. United States, 487 F.2d 115, 487 F.2d 116 n.3 (9th Cir. 2019) for analysis.",
    "expectedCitations": [
      {
        "type": "case",
        "volume": 487,
        "reporter": "F.2d",
        "page": 115,
        "parallelCitations": []  // Not parallel, just multiple pincites
      }
    ],
    "expectedCount": 1,
    "category": "edge-case",
    "note": "Same reporter, different pages — NOT parallel (same case at different pages)"
  }
]
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| No parallel linking | Detect parallel groups, return in `parallelCitations` array with `groupId` | Phase 8 (2026-02) | Enables users to recognize case equivalences across reporters |
| Core-only annotation | Annotation supports `useFullSpan` option | Phase 8 (2026-02) | Users can annotate entire citation boundary for document understanding |
| No golden corpus | 20-30 real-world legal text samples in fixtures | Phase 8 (2026-02) | Regression test suite for extraction accuracy across v1.1+ |

**Deprecated/outdated:**
- Parsing parallel citations manually from text — now handled automatically
- Assuming parenthetical data only on last citation in group — all group members share fullSpan and parenthetical context

## Bluebook Standards for Parallel Citations

### Official Rules (22nd Edition, May 2025)

**Rule 10.3.1 — Parallel Citations:**
- Supreme Court: Cite to U.S. Reports first, then West's Supreme Court Reporter, then Lawyers' Edition (or modern format with just one primary)
- Federal Cases: Official reporter (Federal Reporter) primary, West/Lexis parallels may be included
- State Cases: State reporter (if exists) primary, then West reporter, then Lexis reporter

**Rule 10.1 — Citation Format:**
- Complete citation = case name + reporter + page + parenthetical (court, year, history)
- Case name extracted from parties separated by "v."
- Parenthetical contains court abbreviation and year (required for parallel citations to share context)

**Sources:**
- [Bluebook Citation Guide (Official)](https://www.legalbluebook.com/)
- [Understanding Parallel Citations in Legal Research](https://guides.law.sc.edu/LRAWSpring/LRAW/citingfedcases)

## Extraction-Time vs Post-Processing Decision

**Why extraction-time (CHOSEN):**
- Tokens are available and positions are exact
- Can access cleaned text for lookahead
- Positions not yet translated — no double-mapping complexity
- Detection output informs extraction (which citations to mark as secondary)
- High confidence in comma separator detection (strict regex)

**Why NOT post-processing:**
- Citations already extracted; would need to re-parse metadata
- Position mapping already done; harder to link after translation
- No access to token boundaries (would need to re-tokenize text)
- Lower confidence without token context

## Quality Targets

### Bundle Size Validation

**Existing configuration** (from package.json):
```json
"size-limit": [
  {
    "path": "dist/index.mjs",
    "limit": "50 KB"
  }
]
```

**Current state:** 4.2KB gzipped (core), 88.5KB lazy-loaded (data)
**Phase 8 budget:** parallelCitations field is optional, ~100 bytes per citation with parallel links (~0.1KB overhead)
**Test:** `pnpm size` in CI, must pass before merge

### Performance Validation

**Existing tests** (from fullPipeline.test.ts):
- Performance benchmarks use `performance.now()` API
- Sample 10KB document extraction takes <49ms (Phase 7 verified)
- Target: <100ms for 10KB docs (comfortable headroom)

**Phase 8 additions:**
- Parallel detection loop adds O(n) scan of tokens (~negligible, <1ms for typical documents)
- Test with 10KB sample containing 20+ citations with 3-way parallels
- Verify cumulative time <100ms

### Golden Corpus (Regression Testing)

**Purpose:** Ensure extraction accuracy doesn't regress as features are added

**Scope:** 20-30 real-world legal text samples covering:
- Supreme Court parallel citations (3-way: U.S./S.Ct./L.Ed.2d)
- Federal circuit parallels (2-way: F./F.2d/F.3d)
- State court citations (2-way: State reporter + West regional)
- Edge cases: blank pages, complex parentheticals, procedural prefixes
- Party name variations: abbreviated, "et al.", procedural cases
- Multiple citation types in single paragraph

**Format:** Structured JSON in `tests/fixtures/golden-corpus.json`
- Text sample
- Expected extracted citations
- Category/tags for filtering
- Notes on edge cases

**Test structure:**
```typescript
describe('Golden Corpus Regression Tests', () => {
  const corpus = JSON.parse(fs.readFileSync('tests/fixtures/golden-corpus.json', 'utf-8'))

  corpus.forEach(sample => {
    it(`extracts ${sample.id} correctly`, () => {
      const citations = extractCitations(sample.text)

      // Match count
      expect(citations).toHaveLength(sample.expectedCount)

      // Match key fields for each expected citation
      sample.expectedCitations.forEach((expected, idx) => {
        expect(citations[idx]).toMatchObject({
          type: expected.type,
          volume: expected.volume,
          reporter: expected.reporter,
          // ... match key fields, not full object
        })
      })
    })
  })
})
```

**Granularity:** Match key fields (type, volume, reporter, page, groupId) not full object snapshot — allows internal field updates without breaking test

## Open Questions

Things that couldn't be fully resolved:

1. **Reporter Parallel Mappings**
   - What we know: Bluebook defines official parallel relationships (U.S./S.Ct./L.Ed.2d for SCOTUS)
   - What's unclear: Should we hardcode all ~20 known pairs, or make it configurable?
   - Recommendation: Implement with hardcoded pairs first (see example below), make configurable in Phase 8.1 if needed

```typescript
const KNOWN_PARALLELS = [
  { official: 'U.S.', parallels: ['S.Ct.', 'L.Ed.2d'] },
  { official: 'F.', parallels: ['F.2d', 'F.3d'] },
  { official: 'A.', parallels: ['A.2d', 'A.3d'] },
  // ... ~15 more state reporters
]
```

2. **Semicolon as Separator**
   - What we know: Comma is standard parallel separator per Bluebook
   - What's unclear: Should semicolon ";" be detected as parallel separator? (e.g., "500 F.2d 100; 501 F.3d 200")
   - Recommendation: Phase 8 supports comma only, document limitation. Semicolon typically indicates "see also" or separate propositions, not parallels. Revisit if user requests.

3. **Copying Parenthetical Data to All Parallel Citations**
   - What we know: fullSpan is shared across parallel group
   - What's unclear: Should each parallel citation object have court/year copied, or only the last one?
   - Recommendation: Don't copy — share fullSpan, but individual citations have independent court/year fields (extracted at extraction time). This preserves independence if user wants to manipulate citations.

4. **Single Citation as "Group" (groupId on Singletons)**
   - What we know: User wants groupId for easy filtering
   - What's unclear: Should non-parallel citations get groupId too (all citations have groupId), or only parallels?
   - Recommendation: Only parallel groups get groupId (undefined for singletons). Simpler mental model: groupId exists ⟺ citation is in a parallel group.

## Sources

### Primary (HIGH confidence)

- **Existing codebase:**
  - `/src/extract/extractCitations.ts` - Extraction orchestration (lines 1-50)
  - `/src/types/citation.ts` - FullCaseCitation type (lines 60-173) already includes `parallelCitations` field
  - `/src/annotate/annotate.ts` - Annotation implementation with span selection logic (lines 48-114)
  - `/src/annotate/types.ts` - AnnotationOptions interface (lines 29-92)
  - `/tests/integration/fullPipeline.test.ts` - Performance benchmarks (lines 424-434)
  - `/package.json` - size-limit configuration (lines 54-59)

- **Architecture research:**
  - `.planning/research/ARCHITECTURE.md` - Parallel linking detection strategy (lines 79-180)
  - `.planning/research/FEATURES-EXTRACTION-ACCURACY.md` - Parallel citation feature spec (lines 29-100)

### Secondary (MEDIUM confidence)

- **Bluebook Legal Citation Standards:**
  - [Rule 10.3.1 — Parallel Citations](https://www.legalbluebook.com/) (official standard, last verified 2025)
  - [Understanding Parallel Citations in Legal Research](https://guides.law.sc.edu/LRAWSpring/LRAW/citingfedcases) - University of South Carolina legal research guide

- **Legal citation domain standards:**
  - [Federal Circuit Parallel Reporting](https://www.justice.gov/usao/resources) - U.S. Attorney guides (standard practice)
  - [Reporter Database](https://github.com/freelawproject/reporters-db) - Open source reporter metadata (used in existing extraction)

### Tertiary (LOW confidence)

- **TypeScript/JavaScript patterns:**
  - Vitest 4 documentation (already in use, stable)
  - size-limit bundle tracking (existing CI integration)

**Python eyecite reference:**
- [freelawproject/eyecite](https://github.com/freelawproject/eyecite) - Original implementation (parallel linking not implemented, issue #76 unresolved)

## Metadata

**Confidence breakdown:**
- Parallel detection algorithm: HIGH - Based on existing architecture research and Bluebook standards
- Bundle size validation: HIGH - size-limit already configured, no new dependencies
- Performance targets: HIGH - Existing benchmarks show <49ms baseline, parallel detection is O(n)
- Golden corpus structure: MEDIUM - Test data design pattern, but specific corpus content needs curation
- Bluebook parallel rules: HIGH - Official standards verified

**Research date:** 2026-02-05
**Valid until:** 2026-03-05 (30 days — legal citation standards stable, bundle size/performance may shift with new features)
