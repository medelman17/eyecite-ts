# eyecite-ts

## What This Is

A TypeScript port of the Python [eyecite](https://github.com/freelawproject/eyecite) library, providing legal citation extraction, annotation, and resolution for JavaScript/TypeScript applications. Runs in both Node.js and browsers with zero runtime dependencies.

## Core Value

Developers can extract, resolve, and annotate legal citations from text without Python infrastructure — if citation extraction doesn't work accurately, nothing else matters.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Citation Detection**
- [ ] Full case citations (volume-reporter-page with court/year/pincite)
- [ ] Parallel citations (multiple reporters for same case)
- [ ] Neutral citations (WL, LEXIS)
- [ ] Short-form citations (Id., supra, short form references)
- [ ] U.S. Code citations (single section and ranges)
- [ ] State code citations
- [ ] Public law citations
- [ ] Federal Register citations
- [ ] Law journal citations (with and without author)

**Citation Resolution**
- [ ] Id. resolution to antecedent
- [ ] Supra resolution by party name
- [ ] Short-form resolution by reporter/page

**Citation Annotation**
- [ ] Insert markup around citations
- [ ] Custom annotation functions
- [ ] Markup-aware annotation (preserve HTML)

**Text Cleaning**
- [ ] HTML stripping
- [ ] Whitespace normalization
- [ ] OCR artifact removal (underscores)
- [ ] Inline whitespace normalization
- [ ] Custom cleaning functions

**Cross-Platform**
- [ ] Node.js 18+ support
- [ ] Browser support (Chrome 90+, Firefox 90+, Safari 15+, Edge 90+)
- [ ] ES Modules and CommonJS builds
- [ ] Tree-shakeable exports

**Developer Experience**
- [ ] Full TypeScript types for all public APIs
- [ ] Zero runtime dependencies
- [ ] <50KB gzipped bundle (core)
- [ ] <100ms extraction for 10KB documents

### Out of Scope

- PDF/OCR processing — use separate libraries, we process text
- Citation validation — we extract citations, not verify they exist
- Citation generation — we parse, not format from structured data
- Legal research features — no case law database integration
- NLP beyond citations — no entity extraction
- IE11/legacy browser support — modern browsers only
- Python API compatibility — TypeScript idioms take precedence

## Context

**Why this exists**: Legal tech applications in JavaScript lack a robust citation extraction library. Current options are unmaintained, incomplete, or require Python microservices.

**Data source**: Reporter definitions from [reporters-db](https://github.com/freelawproject/reporters-db) — ~1MB of reporter, law, and journal data.

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
| TypeScript strict mode | Prevents common errors in complex parsing logic | — Pending |
| Zero runtime deps | Simplifies bundling, avoids supply chain risk | — Pending |
| reporters-db as data source | Same data as Python eyecite, maintained by FLP | — Pending |
| ES2020 target | Enables modern regex features (lookbehind, named groups) | — Pending |

---
*Last updated: 2025-02-04 after initialization*
