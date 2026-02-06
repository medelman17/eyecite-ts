# eyecite-ts

## What This Is

A TypeScript legal citation extraction, annotation, and resolution library — a port of Python [eyecite](https://github.com/freelawproject/eyecite). Runs in both Node.js and browsers with zero runtime dependencies and a 6.35KB gzipped core bundle. Extracts full citation spans with case names, party names, parallel groups, and structured dates.

## Core Value

Developers can extract, resolve, and annotate legal citations from text without Python infrastructure — if citation extraction doesn't work accurately, nothing else matters.

## Current State

**Version:** v1.1 Extraction Accuracy (shipped 2026-02-06)
**Codebase:** 4,980 LOC source, 7,674 LOC tests, 61 TypeScript files
**Tech stack:** TypeScript strict mode, tsdown (dual ESM/CJS), Vitest, Biome
**Tests:** 528 passing, 599ms runtime
**Bundle:** 6.35KB core (gzipped), 88.5KB reporters (lazy-loaded)
**Golden corpus:** 28 real-world samples for regression testing

## Requirements

### Validated

**Citation Detection** — v1.0-alpha
- Full case citations (volume-reporter-page with court/year/pincite)
- Parallel citations (multiple reporters for same case)
- Neutral citations (WL, LEXIS)
- Short-form citations (Id., supra, short form references)
- U.S. Code citations (single section and ranges)
- State code citations
- Public law citations
- Federal Register citations
- Law journal citations (with and without author)

**Citation Resolution** — v1.0-alpha
- Id. resolution to antecedent (with paragraph boundary)
- Supra resolution by party name (with fuzzy matching)
- Short-form resolution by reporter/page (with volume validation)

**Citation Annotation** — v1.0-alpha
- Insert markup around citations (template and callback modes)
- Custom annotation functions
- Markup-aware annotation (preserve HTML, auto-escape entities)

**Text Cleaning** — v1.0-alpha
- HTML stripping, whitespace normalization, OCR artifact removal
- Inline whitespace normalization, custom cleaning functions

**Cross-Platform** — v1.0-alpha
- Node.js 18+, Chrome 90+, Firefox 90+, Safari 15+, Edge 90+
- ES Modules and CommonJS builds, tree-shakeable exports

**Developer Experience** — v1.0-alpha
- Full TypeScript types, zero runtime dependencies
- 4.2KB gzipped bundle (<50KB target), <49ms for 10KB documents (<100ms target)

**Extraction Accuracy** — v1.1
- Full citation span from case name through parenthetical (fullSpan field)
- Case name extraction via backward search for "v." and procedural prefixes
- Plaintiff/defendant party name extraction with normalization pipeline
- Parallel citation linking into groups (groupId + parallelCitations)
- Blank page placeholder recognition with hasBlankPage flag
- Complex parenthetical parsing with structured dates (abbreviated, full month, numeric)
- Disposition extraction (en banc, per curiam)
- Full-span annotation mode (useFullSpan option)
- Golden test corpus with 28 real-world samples
- Party name supra resolution enhancement (defendant-first, Bluebook convention)

### Active

(No active requirements — next milestone not yet defined)

### Out of Scope

- PDF/OCR processing — use separate libraries, we process text
- Citation validation — we extract citations, not verify they exist
- Citation generation — we parse, not format from structured data
- Legal research features — no case law database integration
- NLP beyond citations — no entity extraction
- IE11/legacy browser support — modern browsers only
- Python API compatibility — TypeScript idioms take precedence
- Streaming extraction — deferred to v2
- International citation formats (UK, Canadian, Australian) — deferred to v2
- Web Worker integration — deferred to v2

## Context

**Why this exists**: Legal tech applications in JavaScript lack a robust citation extraction library. Current options are unmaintained, incomplete, or require Python microservices.

**Data source**: Reporter definitions from [reporters-db](https://github.com/freelawproject/reporters-db) — 1,235 reporters with edition and variant indexing.

**Relationship to eyecite**: Independent port, not a fork. Aims to track upstream functionality and use same test cases for validation. May offer to Free Law Project once mature.

**Target users**:
- Legal tech developers building document processing pipelines
- Frontend developers building browser-based legal tools
- Open source contributors in the legal tech space

## Constraints

- **Zero dependencies**: Core library must have no runtime dependencies
- **Bundle size**: <50KB gzipped for browser builds (excluding full reporter DB)
- **Performance**: <100ms for typical 10KB legal documents
- **Node.js**: Only active LTS versions (18+)
- **TypeScript**: Strict mode, no `any` in public API

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| TypeScript strict mode | Prevents common errors in complex parsing logic | ✓ Good — zero type errors, strict catches bugs early |
| Zero runtime deps | Simplifies bundling, avoids supply chain risk | ✓ Good — 6.35KB core bundle |
| reporters-db as data source | Same data as Python eyecite, maintained by FLP | ✓ Good — 1,235 reporters indexed |
| ES2020 target | Enables modern regex features (lookbehind, named groups) | ✓ Good — used in Id./supra patterns |
| Dual position tracking (Span) | Preserves original text positions through cleaning pipeline | ✓ Good — enables accurate annotation and fullSpan |
| Broad tokenization + strict extraction | Separation of concerns: find candidates fast, validate later | ✓ Good — simple patterns, no ReDoS |
| Lazy-loaded reporter data | Keeps core bundle small, data loads on demand | ✓ Good — 6.35KB core vs 88.5KB data |
| Levenshtein fuzzy matching (0.8 threshold) | Handles party name spelling variations in supra | ✓ Good — robust matching without false positives |
| Auto-escape annotation by default | XSS prevention out of the box | ✓ Good — secure defaults |
| All v1.1 fields optional | Incremental feature rollout with 100% backward compat | ✓ Good — zero breaking changes |
| Unified parenthetical parser | Single parser for all parenthetical formats | ✓ Good — replaced fragmented extraction |
| Defendant-first supra resolution | Bluebook convention prefers defendant name | ✓ Good — higher accuracy on standard citations |
| Comma-only parallel separator | Bluebook standard; semicolons separate distinct citations | ✓ Good — no false positives |
| Key field matching in golden corpus | Full snapshots break on new features | ✓ Good — flexible regression testing |

---
*Last updated: 2026-02-06 after v1.1 milestone completion*
