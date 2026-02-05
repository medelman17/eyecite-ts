# Phase 2: Core Parsing - Context

**Gathered:** 2026-02-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement core citation detection, tokenization, metadata extraction, and text cleaning with ReDoS protection. This phase delivers the parsing engine that extracts full case citations, U.S. Code, state code, public law, Federal Register, and journal citations from legal text. Short-form resolution (Id., Supra) is Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Citation output structure
- Always include confidence score (0-1) for every citation indicating match quality
- Track both original and clean text positions (originalSpan + cleanSpan)
- Include matchedText field containing the exact substring matched
- Match Python eyecite metadata fields 1:1 for case citations
- Include both combined and parsed subsection structure for statutes: `{ section: '1983(a)(1)(A)', subsections: ['a', '1', 'A'] }`
- Include both original reporter text and normalized form: `reporter` + `normalizedReporter`
- Return all possible interpretations for ambiguous citations, each with confidence score
- Extract citation signals (See, Cf., But see) as separate field
- Extract parenthetical explanations ("holding that...")
- Extract subsequent history (aff'd, rev'd, cert. denied)
- Include both span position and document position metadata (paragraph, footnote) when detectable
- Identify state from reporter for state citations using reporters-db
- Include both ISO string and structured object for dates
- Include processing stats: parseTimeMs, patternsChecked
- Array-only return (no streaming/generator)
- Both sync and async functions available: extractCitations() and extractCitationsAsync()
- Slip opinions under case type with published vs slip in metadata
- Authority classification (binding/persuasive) is out of scope — requires knowing citing court
- Attempt journal lookup from abbreviation against database

### Text cleaning API
- Separate function: cleanText(input, options) → cleaned
- Full set of built-in cleaners: HTML strip, whitespace normalize, OCR artifact fix, unicode normalize, smart quote fix
- Both composition patterns: options object for built-ins, pipeline array for custom functions

### Error handling approach
- Skip malformed regions and continue, but include warnings array describing skipped regions
- Warnings include position information for skipped/problematic regions

### Extensibility model
- Both unified and granular APIs: extractCitations() for convenience, extractCases()/extractStatutes()/tokenize() for power users

### Claude's Discretion
- Single flat array vs grouped by type for return structure
- Pincites/parallels nested vs separate with references
- Federal Register document type classification (rule, proposed_rule, notice)
- Whether to extract public law title from nearby text
- Deduplication hash inclusion
- Flagging obsolete citations if "overruled by" appears in text
- Citation ranges handling (startPage/endPage vs single page)
- Multi-citation string handling (separate objects vs single with array)
- Transformation map return strategy for cleanText
- Citation plausibility validation (future dates, impossible volumes)
- ReDoS timeout handling (warning vs throw)
- Warning format (typed objects vs strings)
- Custom pattern registration API
- Reporter database extension API
- Configuration scope (per-call vs global with override)
- String literals vs const enum for citation types

</decisions>

<specifics>
## Specific Ideas

- "Match Python eyecite exactly" for metadata fields — API should feel familiar to eyecite users
- Both sync and async variants of main function for flexibility
- Granular APIs available for users who need fine control (extractCases, extractStatutes, tokenize)
- Full cleaner set ships out of the box — don't make users hunt for basic functionality

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-core-parsing*
*Context gathered: 2026-02-04*
