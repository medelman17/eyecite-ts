# Phase 7: Party Name Extraction - Research

**Researched:** 2026-02-05
**Domain:** Legal citation party name parsing and normalization
**Confidence:** HIGH

## Summary

Party name extraction from legal case citations follows well-established patterns in legal citation processing. The standard approach splits case names on "v." or "vs." to separate plaintiff and defendant, with special handling for procedural case types ("In re", "Ex parte") that have only a subject, not adversarial parties.

The key challenge is normalization for matching. Legal party names contain noise that helps humans (corporate designations like "Inc.", procedural indicators like "et al.") but hinders machine matching. The dual raw+normalized field pattern solves this by preserving what users see while optimizing what the system matches.

Supra resolution currently uses Levenshtein fuzzy matching on full case name text (0.8 threshold in DocumentResolver). Augmenting this with direct party name matching provides a faster, more accurate path when party names are available.

**Primary recommendation:** Implement party name extraction as a pure parsing layer in extractCase.ts, storing four optional fields (plaintiff, defendant, plaintiffNormalized, defendantNormalized). Augment DocumentResolver to try party name match first before falling back to Levenshtein.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Name splitting rules:**
- Split on "v." / "vs." to separate plaintiff and defendant
- Store both raw and normalized versions: plaintiff/defendant (raw text as found) and plaintiffNormalized/defendantNormalized (cleaned for matching)
- "et al." kept in raw fields, stripped in normalized fields
- "d/b/a" and "aka" kept in raw, stripped in normalized

**Procedural prefixes:**
- Comprehensive prefix set: In re, Ex parte, Matter of, State ex rel., United States ex rel., Application of, Petition of, Estate of
- Case-insensitive matching for all prefixes
- Procedural cases store subject in plaintiff field (consistent across all prefix types)
- Both: full text in plaintiff ("In re Smith") AND a separate proceduralPrefix field ("In re") for structured access
- "People v.", "Commonwealth v.", "State v." treated as government-entity plaintiffs, NOT procedural prefixes

**Supra matching strategy:**
- Augment existing Levenshtein approach: try party name match first, fall back to full-text Levenshtein
- Party name match preferred over Levenshtein when available (fixes #21)

**Output normalization:**
- Dual fields: raw (plaintiff/defendant) + normalized (plaintiffNormalized/defendantNormalized)
- Normalization strips: et al., d/b/a, aka, leading articles (The, A), corporate suffixes (Inc., LLC, Corp.)
- All four fields optional (consistent with Phase 5 approach)

### Claude's Discretion

**Name splitting:**
- Multiple "v." handling (first vs last split heuristic)
- Corporate suffix treatment (Inc., LLC, Corp.) in raw fields
- d/b/a sub-splitting approach

**Procedural prefixes:**
- Handling of "Estate of" when "v." is present vs absent
- Format variations (periods, spacing) in prefix matching
- Compound prefix splitting (ex rel. relator extraction)

**Supra matching:**
- Which party to match on (defendant first vs either party)
- Confidence scoring for party name match vs Levenshtein match
- Impact of party name extraction failure on citation confidence

**Output normalization:**
- Whitespace normalization approach
- Casing in normalized fields (lowercase vs preserved)
- Comma-based name reordering (legal names may not follow last,first convention)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

## Standard Stack

**No external dependencies required.** Party name extraction is pure string parsing using built-in JavaScript/TypeScript string manipulation.

### Core Capabilities (Built-in)

| Feature | Implementation | Purpose | Why Standard |
|---------|---------------|---------|--------------|
| String.split() | Native JS | Split case names on "v." | Zero-cost abstraction |
| String.trim() | Native JS | Remove whitespace | Built-in, fast |
| String.replace() | Native JS | Strip normalization noise | Regex support built-in |
| String.toLowerCase() | Native JS | Case normalization | Unicode-aware |
| RegExp | Native JS | Pattern matching for prefixes | Already used throughout codebase |

### Existing Codebase Utilities

| Module | Current Use | Extend For Phase 7 |
|--------|-------------|-------------------|
| extractCase.ts | Volume/reporter/page parsing | Add party name extraction |
| extractCaseName() | Backward search for "v." pattern | Use result to split parties |
| DocumentResolver | Levenshtein supra matching | Add party name matching path |
| normalizedLevenshteinDistance() | Fuzzy string matching | Reuse for fallback matching |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Built-in regex | NLP library (compromise, spaCy) | Over-engineering: Legal citations follow strict patterns, NLP adds complexity and dependencies |
| Levenshtein only | Exact match only | Loses robustness: Typos and variations are common in legal text |
| Manual normalization | Unicode normalization library | Unnecessary: Legal names use ASCII, manual rules suffice |

**Installation:** None required (uses existing codebase utilities)

## Architecture Patterns

### Recommended Integration Points

Phase 7 extends three existing components:

```
src/
├── extract/
│   └── extractCase.ts         # Add extractPartyNames() function
├── resolve/
│   └── DocumentResolver.ts    # Add tryPartyNameMatch() before Levenshtein
└── types/
    └── citation.ts            # Fields already defined (plaintiff, defendant)
```

### Pattern 1: Pure Extraction Function

**What:** Party name extraction as a standalone function called from extractCase
**When to use:** Immediately after caseName is extracted (Phase 6)
**Example:**

```typescript
// Source: Current extractCase.ts pattern (lines 67-103)
function extractPartyNames(caseName: string): {
  plaintiff?: string
  plaintiffNormalized?: string
  defendant?: string
  defendantNormalized?: string
  proceduralPrefix?: string
} {
  // Check for procedural prefixes first
  const procRegex = /^(In re|Ex parte|Matter of|State ex rel\.|United States ex rel\.|Application of|Petition of|Estate of)\s+(.+)$/i
  const procMatch = procRegex.exec(caseName)

  if (procMatch) {
    const prefix = procMatch[1]
    const subject = procMatch[2].trim()
    return {
      plaintiff: `${prefix} ${subject}`,
      plaintiffNormalized: normalizePartyName(subject),
      proceduralPrefix: prefix
    }
  }

  // Standard adversarial case: split on "v."
  const vParts = caseName.split(/\s+v\.?\s+/i)
  if (vParts.length >= 2) {
    return {
      plaintiff: vParts[0].trim(),
      plaintiffNormalized: normalizePartyName(vParts[0]),
      defendant: vParts[1].trim(),
      defendantNormalized: normalizePartyName(vParts[1])
    }
  }

  return {} // No parties extracted
}
```

### Pattern 2: Normalization Pipeline

**What:** Multi-stage normalization to strip legal noise
**When to use:** On every party name before storage in normalized fields
**Example:**

```typescript
// Source: Industry best practices from Databar normalization rules
function normalizePartyName(raw: string): string {
  let normalized = raw

  // Strip procedural indicators
  normalized = normalized.replace(/\bet al\.?/gi, '')
  normalized = normalized.replace(/\bd\/b\/a\b/gi, '')
  normalized = normalized.replace(/\baka\b/gi, '')

  // Strip corporate suffixes
  normalized = normalized.replace(/\b(Inc|LLC|Corp|Ltd|Co|LLP|LP|P\.?C\.)\.?$/gi, '')

  // Strip leading articles
  normalized = normalized.replace(/^(The|A|An)\s+/i, '')

  // Normalize whitespace and case
  normalized = normalized.replace(/\s+/g, ' ').trim().toLowerCase()

  return normalized
}
```

### Pattern 3: Augmented Resolution Strategy

**What:** Try party name match before falling back to Levenshtein
**When to use:** In DocumentResolver.resolveSupra()
**Example:**

```typescript
// Source: Current DocumentResolver pattern (lines 163-209)
private resolveSupra(citation: SupraCitation): ResolutionResult | undefined {
  const currentIndex = this.context.citationIndex

  // NEW: Try party name match first
  const partyMatch = this.tryPartyNameMatch(citation.partyName, currentIndex)
  if (partyMatch) {
    return partyMatch // Higher confidence, direct match
  }

  // EXISTING: Fall back to Levenshtein on full case name
  const targetPartyName = this.normalizePartyName(citation.partyName)
  let bestMatch: { index: number; similarity: number } | undefined

  for (const [partyName, citationIndex] of this.context.fullCitationHistory) {
    if (!this.isWithinScope(citationIndex, currentIndex)) continue

    const similarity = normalizedLevenshteinDistance(targetPartyName, partyName)
    if (!bestMatch || similarity > bestMatch.similarity) {
      bestMatch = { index: citationIndex, similarity }
    }
  }

  // Continue with existing Levenshtein logic...
}
```

### Anti-Patterns to Avoid

- **Mutating caseName during parsing:** Keep caseName as-is, extract parties from it without modification
- **Normalization in raw fields:** plaintiff/defendant must match caseName text exactly
- **Overly aggressive normalization:** Don't strip government entities (United States, People, Commonwealth) — they're meaningful plaintiffs
- **Assuming single "v.":** Cases like "A v. B v. C" exist (rare but legal) — split on first "v." only
- **Regex complexity:** Keep patterns simple to avoid ReDoS (no nested quantifiers, as established in Phase 1)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fuzzy string matching | Custom edit distance | Existing normalizedLevenshteinDistance() in levenshtein.ts | Already tested, O(m*n) DP algorithm, handles edge cases |
| Case name extraction | New backward search | Existing extractCaseName() from Phase 6 | Already handles "v." patterns and procedural prefixes |
| Position tracking | Manual offset calculation | Existing TransformationMap | Dual position tracking is complex, tested infrastructure exists |
| Confidence scoring | New scoring system | Extend existing pattern from extractCase | Consistent scoring across citation types matters |

**Key insight:** Phase 7 is a pure parsing layer. All infrastructure (position tracking, fuzzy matching, resolution) already exists. Focus on extraction logic only.

## Common Pitfalls

### Pitfall 1: Multiple "v." in Case Name

**What goes wrong:** Cases like "People v. Smith v. Jones" (rare but legal, e.g., consolidated cases or intervention) get misparsed by naive split
**Why it happens:** Assuming "v." appears exactly once
**How to avoid:** Split on first "v." only using limit parameter or manual indexOf approach
**Warning signs:** Tests failing on multi-party cases, defendant containing "v."

```typescript
// BAD: Splits into 3 parts
const parts = caseName.split(/\s+v\.?\s+/i)

// GOOD: Split on first only
const vIndex = caseName.search(/\s+v\.?\s+/i)
if (vIndex >= 0) {
  const plaintiff = caseName.slice(0, vIndex)
  const defendant = caseName.slice(vIndex).replace(/^\s+v\.?\s+/i, '')
}
```

### Pitfall 2: Procedural Prefix False Positives

**What goes wrong:** "People v. In", "Matter v. Smith" misidentified as procedural cases
**Why it happens:** Checking prefix without requiring case start position
**How to avoid:** Anchor procedural prefix regex to start of case name (^)
**Warning signs:** Government entity cases incorrectly marked as procedural

```typescript
// BAD: Matches anywhere in string
const procRegex = /(In re|Ex parte)/i

// GOOD: Anchored to start
const procRegex = /^(In re|Ex parte)/i
```

### Pitfall 3: Over-Normalization Losing Identity

**What goes wrong:** "United States" → "united states" → stripped as article? "People" → "people" → stripped?
**Why it happens:** Normalization rules designed for corporate suffixes applied too broadly
**How to avoid:** Only strip trailing suffixes and leading articles "The", "A", "An" — never strip standalone words
**Warning signs:** Government entity plaintiffs becoming empty strings

```typescript
// BAD: Strips too much
normalized = normalized.replace(/\b(the|a|an|people|united|states)\b/gi, '')

// GOOD: Only strip leading articles
normalized = normalized.replace(/^(The|A|An)\s+/i, '')
```

### Pitfall 4: Confidence Scoring Inconsistency

**What goes wrong:** Party name extraction failure should lower citation confidence, but logic is unclear about when/how
**Why it happens:** User decision leaves Claude discretion on confidence impact
**How to avoid:** Document decision: Don't lower confidence for missing parties (backward compatibility), but do use party presence to boost supra match confidence
**Warning signs:** Confidence scores changing unpredictably across phases

## Code Examples

Verified patterns from existing codebase:

### Extracting Case Name (Phase 6 Foundation)

```typescript
// Source: extractCase.ts lines 67-103
function extractCaseName(
  cleanedText: string,
  coreStart: number,
  maxLookback = 150
): { caseName: string; nameStart: number } | undefined {
  const searchStart = Math.max(0, coreStart - maxLookback)
  const precedingText = cleanedText.substring(searchStart, coreStart)

  // Priority 1: Standard "v." format
  const vRegex = /([A-Z][A-Za-z0-9\s.,'&()-]+?)\s+v\.?\s+([A-Za-z0-9\s.,'&()-]+?)\s*,\s*$/
  const vMatch = vRegex.exec(precedingText)
  if (vMatch && !vMatch[0].includes(';')) {
    const caseName = `${vMatch[1].trim()} v. ${vMatch[2].trim()}`
    const nameStart = searchStart + vMatch.index
    return { caseName, nameStart }
  }

  // Priority 2: Procedural prefixes
  const procRegex = /\b(In re|Ex parte|Matter of)\s+([A-Za-z0-9\s.,'&()-]+?)\s*,\s*$/i
  const procMatch = procRegex.exec(precedingText)
  if (procMatch && !procMatch[0].includes(';')) {
    const caseName = `${procMatch[1]} ${procMatch[2].trim()}`
    const nameStart = searchStart + procMatch.index
    return { caseName, nameStart }
  }

  return undefined
}
```

### Levenshtein Fuzzy Matching (Supra Resolution)

```typescript
// Source: DocumentResolver.ts lines 163-209
private resolveSupra(citation: SupraCitation): ResolutionResult | undefined {
  const currentIndex = this.context.citationIndex
  const targetPartyName = this.normalizePartyName(citation.partyName)

  let bestMatch: { index: number; similarity: number } | undefined

  for (const [partyName, citationIndex] of this.context.fullCitationHistory) {
    if (!this.isWithinScope(citationIndex, currentIndex)) continue

    const similarity = normalizedLevenshteinDistance(targetPartyName, partyName)

    if (!bestMatch || similarity > bestMatch.similarity) {
      bestMatch = { index: citationIndex, similarity }
    }
  }

  if (!bestMatch || bestMatch.similarity < this.options.partyMatchThreshold) {
    return this.createFailureResult('No matching party name found')
  }

  return {
    resolvedTo: bestMatch.index,
    confidence: bestMatch.similarity,
    warnings: bestMatch.similarity < 1.0
      ? [`Fuzzy match: similarity ${bestMatch.similarity.toFixed(2)}`]
      : undefined
  }
}
```

### Optional Field Pattern (Phase 5 Precedent)

```typescript
// Source: citation.ts lines 60-152 (FullCaseCitation interface)
export interface FullCaseCitation extends CitationBase {
  type: "case"
  volume: number | string
  reporter: string
  page?: number           // Optional: blank page support
  pincite?: number        // Optional: not all citations have pincite
  court?: string          // Optional: not always present
  year?: number           // Optional: not always present
  caseName?: string       // Optional: Phase 6 added
  plaintiff?: string      // Optional: Phase 7 to add
  defendant?: string      // Optional: Phase 7 to add
  // ... normalized versions also optional
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Full-text Levenshtein only | Party name match + Levenshtein fallback | Phase 7 (2026-02) | Faster, more accurate supra resolution (fixes #21) |
| Single caseName field | caseName + plaintiff + defendant fields | Phase 7 (2026-02) | Enables structured party search, better matching |
| No normalization | Dual raw+normalized fields | Phase 7 (2026-02) | Preserves display quality while optimizing matching |

**Deprecated/outdated:**
- Extracting party names from citation.text directly: Citation text is "500 F.2d 123", not "Smith v. Doe, 500 F.2d 123" — must use caseName from Phase 6
- Modifying caseName during extraction: caseName is source of truth for user display, parties are derived fields

## Best Practices from Legal Citation Standards

### Bluebook Party Name Rules (22nd Edition, May 2025)

**Abbreviation rules:**
- Individual persons: surname only, no first names or initials
- "et al." indicates multiple parties, abbreviated out in short form
- Corporate entities: use full business name, abbreviate where possible

**Procedural case formats:**
- "In re" (bankruptcy, administrative matters): subject only, no adversarial parties
- "Ex parte" (one-sided motions): applicant only
- "Matter of": similar to "In re", subject-focused

**Supra citation matching:**
- Supra refers to party name, not full case name
- Party name should be distinctive enough to identify antecedent
- First party name traditionally used (plaintiff in original case)

**Sources:**
- [Understanding Case Citations - LARW](https://libguides.uakron.edu/LARW/casecitations)
- [Case Name - Bluebook Introduction](https://libguides.udmercy.edu/c.php?g=739087&p=5285800)
- [Short form: Id., Infra, Supra, Hereinafter - Bluebook](https://tarlton.law.utexas.edu/bluebook-legal-citation/short-form)

### String Matching Thresholds

**Industry standards for Levenshtein:**
- 0.8-0.9 threshold common for fuzzy matching (existing codebase uses 0.8)
- High precision use cases (financial, compliance): 0.9+
- Exploratory matching: 0.6-0.7

**For legal party names:**
- Existing DocumentResolver uses 0.8 threshold (appropriate)
- Party name direct match should have 1.0 confidence
- Levenshtein fallback maintains 0.8 threshold, confidence = similarity score

**Sources:**
- [Fuzzy String Matching in Python Tutorial](https://www.datacamp.com/tutorial/fuzzy-string-python)
- [Levenshtein algorithm for AML name matching](https://www.linkedin.com/pulse/levenshtein-algorithm-aml-sanctions-pep-name-matching-mohapatra-frm)

### Corporate Name Normalization

**Industry best practices:**
- Legal suffixes (Inc., LLC, Corp.) should be kept in raw, stripped in normalized
- d/b/a ("doing business as") indicates alternate name, keep in raw
- Standardize spacing and punctuation in normalized version
- Goal: 80% automation, 20% human judgment for edge cases

**Sources:**
- [Brand Name Normalization Rules](https://databar.ai/blog/article/brand-name-normalization-rules-how-to-standardize-company-names-in-your-crm)
- [Wikipedia Naming Conventions (companies)](https://en.wikipedia.org/wiki/Wikipedia:Naming_conventions_(companies))

## Open Questions

Things that couldn't be fully resolved:

1. **Multiple "v." Heuristic**
   - What we know: First split is safest (plaintiff v. defendant established before intervention)
   - What's unclear: Are there cases where last "v." is better? (consolidated appeals?)
   - Recommendation: Split on first "v.", document limitation, revisit if users report issues

2. **"Estate of" with Adversarial Parties**
   - What we know: "Estate of Smith v. Jones" is valid (estate suing or being sued)
   - What's unclear: Should "Estate of" be stripped as procedural prefix or kept?
   - Recommendation: Only treat "Estate of" as procedural when NO "v." present, otherwise it's part of plaintiff name

3. **ex rel. Relator Extraction**
   - What we know: "State ex rel. Attorney General v. Defendant" format exists
   - What's unclear: Should "Attorney General" be extracted separately?
   - Recommendation: Store entire "State ex rel. Attorney General" as plaintiff, don't split further (scope creep)

4. **Comma-Based Name Reordering**
   - What we know: Corporate names may have commas ("Smith, Inc."), individual names may be "Doe, John"
   - What's unclear: Should normalization reorder "Doe, John" to "John Doe"?
   - Recommendation: Don't reorder — commas in legal names aren't necessarily last,first format

## Sources

### Primary (HIGH confidence)

- Existing codebase:
  - `/src/extract/extractCase.ts` - Case name extraction pattern (lines 67-103)
  - `/src/resolve/DocumentResolver.ts` - Levenshtein supra matching (lines 163-209)
  - `/src/resolve/levenshtein.ts` - Normalized distance calculation (lines 62-89)
  - `/src/types/citation.ts` - Type system with plaintiff/defendant fields already defined (lines 129-137)
  - `/tests/extract/extractCase.test.ts` - Test patterns for case citations

### Secondary (MEDIUM confidence)

- Bluebook legal citation standards:
  - [Understanding Case Citations - LARW: Legal Analysis Research & Writing Guide](https://libguides.uakron.edu/LARW/casecitations)
  - [Case Name - Introduction to "The Bluebook: A Uniform System of Citation"](https://libguides.udmercy.edu/c.php?g=739087&p=5285800)
  - [Short form: Id., Infra, Supra, Hereinafter - Bluebook Legal Citation](https://tarlton.law.utexas.edu/bluebook-legal-citation/short-form)

- Corporate name normalization:
  - [Brand Name Normalization Rules: How to Standardize Company Names](https://databar.ai/blog/article/brand-name-normalization-rules-how-to-standardize-company-names-in-your-crm)
  - [Wikipedia: Naming conventions (companies)](https://en.wikipedia.org/wiki/Wikipedia:Naming_conventions_(companies))

### Tertiary (LOW confidence)

- Fuzzy matching thresholds:
  - [Fuzzy String Matching in Python Tutorial | DataCamp](https://www.datacamp.com/tutorial/fuzzy-string-python)
  - [Levenshtein algorithm for AML Sanctions / PEP name matching](https://www.linkedin.com/pulse/levenshtein-algorithm-aml-sanctions-pep-name-matching-mohapatra-frm)

- General procedural case information:
  - [Understanding In Re and Ex Parte Case Titles Explained](https://www.justanswer.com/education-law/af5ak-cases-title-ciatation-instead-of-v.html)

**Python eyecite reference:**
- [GitHub - freelawproject/eyecite](https://github.com/freelawproject/eyecite) - Original implementation reference, but party extraction not documented in detail
- [eyecite API documentation](https://freelawproject.github.io/eyecite/) - Confirms plaintiff/defendant metadata exists

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No dependencies, uses existing codebase utilities
- Architecture: HIGH - Clear integration points, follows Phase 5-6 patterns
- Normalization rules: MEDIUM - Industry best practices verified, but edge cases require decisions
- Supra matching: HIGH - Levenshtein already implemented, augmentation is straightforward
- Procedural prefixes: MEDIUM - List is comprehensive but "Estate of" dual-mode needs judgment

**Research date:** 2026-02-05
**Valid until:** 2026-03-05 (30 days — legal citation standards are stable)
