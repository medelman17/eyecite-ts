# Requirements: eyecite-ts

**Defined:** 2025-02-04
**Core Value:** Developers can extract, resolve, and annotate legal citations from text without Python infrastructure

## v1 Requirements

Requirements for initial release. Full feature parity with Python eyecite.

### Citation Detection

- [ ] **DET-01**: Extract full case citations (volume-reporter-page format)
- [ ] **DET-02**: Extract case citations with pincite (123 F.3d 456, 460)
- [ ] **DET-03**: Extract case citations with pincite range (123 F.3d 456, 460-62)
- [ ] **DET-04**: Extract case citations with court (123 F.3d 456 (9th Cir. 2020))
- [ ] **DET-05**: Extract case citations with date only (123 F.3d 456 (2020))
- [ ] **DET-06**: Extract case citations with full date (123 F.3d 456 (9th Cir. Jan. 15, 2020))
- [ ] **DET-07**: Extract case citations with parenthetical (123 F.3d 456 (9th Cir. 2020) (holding that...))
- [ ] **DET-08**: Extract parallel citations (123 U.S. 456, 78 S.Ct. 901)
- [ ] **DET-09**: Extract neutral citations (2020 WL 123456)
- [ ] **DET-10**: Detect Id. citations
- [ ] **DET-11**: Detect Id. with pincite (Id. at 460)
- [ ] **DET-12**: Detect Ibid. citations
- [ ] **DET-13**: Detect supra citations (Smith, supra)
- [ ] **DET-14**: Detect supra with pincite (Smith, supra, at 460)
- [ ] **DET-15**: Detect short-form citations (Smith, 123 F.3d at 460)
- [ ] **DET-16**: Extract U.S. Code citations (42 U.S.C. § 1983)
- [ ] **DET-17**: Extract U.S. Code range citations (42 U.S.C. §§ 1983-1988)
- [ ] **DET-18**: Extract state code citations (Cal. Penal Code § 187)
- [ ] **DET-19**: Extract public law citations (Pub. L. No. 116-283)
- [ ] **DET-20**: Extract Federal Register citations (85 Fed. Reg. 12345)
- [ ] **DET-21**: Extract journal citations (123 Harv. L. Rev. 456)
- [ ] **DET-22**: Extract journal citations with author (Smith, Title, 123 Harv. L. Rev. 456)

### Citation Metadata

- [ ] **META-01**: Extract matched text and span positions for all citations
- [ ] **META-02**: Extract volume number from citations
- [ ] **META-03**: Extract reporter abbreviation from citations
- [ ] **META-04**: Extract page number from citations
- [ ] **META-05**: Extract pincite from citations
- [ ] **META-06**: Extract court from citations
- [ ] **META-07**: Extract year from citations
- [ ] **META-08**: Extract plaintiff/defendant names from full citations

### Citation Resolution

- [ ] **RES-01**: Resolve Id. citations to immediately preceding citation
- [ ] **RES-02**: Respect paragraph boundary for Id. resolution (configurable)
- [ ] **RES-03**: Resolve supra citations by party name matching
- [ ] **RES-04**: Handle variations in party name spelling for supra
- [ ] **RES-05**: Resolve short-form citations by reporter and page
- [ ] **RES-06**: Validate volume number consistency in resolution

### Annotation

- [ ] **ANN-01**: Annotate citations with before/after markup strings
- [ ] **ANN-02**: Support custom annotation functions per citation
- [ ] **ANN-03**: Preserve existing HTML/XML markup during annotation
- [ ] **ANN-04**: Handle HTML entities correctly during annotation

### Text Cleaning

- [ ] **CLN-01**: Strip HTML tags from text
- [ ] **CLN-02**: Normalize whitespace in text
- [ ] **CLN-03**: Remove underscores (OCR artifacts)
- [ ] **CLN-04**: Normalize inline whitespace in citations
- [ ] **CLN-05**: Support aggressive whitespace normalization
- [ ] **CLN-06**: Support custom cleaning functions in pipeline

### Data

- [ ] **DATA-01**: Load reporter database from reporters-db
- [ ] **DATA-02**: Load laws database
- [ ] **DATA-03**: Load journals database
- [ ] **DATA-04**: Support lazy-loading of reporter data
- [ ] **DATA-05**: Support custom reporter registration at runtime

### Platform

- [ ] **PLAT-01**: Run in Node.js 18+
- [ ] **PLAT-02**: Run in Chrome 90+
- [ ] **PLAT-03**: Run in Firefox 90+
- [ ] **PLAT-04**: Run in Safari 15+
- [ ] **PLAT-05**: Run in Edge 90+
- [ ] **PLAT-06**: Export ESM bundle
- [ ] **PLAT-07**: Export CommonJS bundle
- [ ] **PLAT-08**: Provide TypeScript type declarations
- [ ] **PLAT-09**: Tree-shakeable exports

### Performance

- [ ] **PERF-01**: Bundle size <50KB gzipped (core, without full reporter DB)
- [ ] **PERF-02**: Process 10KB document in <100ms
- [ ] **PERF-03**: Zero runtime dependencies

### Developer Experience

- [ ] **DX-01**: Full TypeScript types for all public APIs
- [ ] **DX-02**: No `any` types in public API
- [ ] **DX-03**: Helpful error messages for invalid input
- [ ] **DX-04**: API documentation with examples

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Features

- **ADV-01**: Streaming extraction for large documents
- **ADV-02**: Web Worker integration for background parsing
- **ADV-03**: Citation linking utilities (CourtListener, Google Scholar URLs)

### International Support

- **INTL-01**: UK citation formats
- **INTL-02**: Canadian citation formats
- **INTL-03**: Australian citation formats

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| PDF/OCR processing | Use separate libraries, we process text |
| Citation validation | We extract citations, not verify they exist |
| Citation generation | We parse, not format from structured data |
| ML-based detection | Hallucination risk in legal domain; regex+database is proven |
| Legal research features | No case law database integration |
| NLP beyond citations | No entity extraction |
| IE11/legacy browser support | Modern browsers only |
| Python API compatibility | TypeScript idioms take precedence |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DET-01 | Phase 2 | Pending |
| DET-02 | Phase 2 | Pending |
| DET-03 | Phase 2 | Pending |
| DET-04 | Phase 2 | Pending |
| DET-05 | Phase 2 | Pending |
| DET-06 | Phase 2 | Pending |
| DET-07 | Phase 2 | Pending |
| DET-08 | Phase 2 | Pending |
| DET-09 | Phase 2 | Pending |
| DET-10 | Phase 4 | Pending |
| DET-11 | Phase 4 | Pending |
| DET-12 | Phase 4 | Pending |
| DET-13 | Phase 4 | Pending |
| DET-14 | Phase 4 | Pending |
| DET-15 | Phase 4 | Pending |
| DET-16 | Phase 2 | Pending |
| DET-17 | Phase 2 | Pending |
| DET-18 | Phase 2 | Pending |
| DET-19 | Phase 2 | Pending |
| DET-20 | Phase 2 | Pending |
| DET-21 | Phase 2 | Pending |
| DET-22 | Phase 2 | Pending |
| META-01 | Phase 2 | Pending |
| META-02 | Phase 2 | Pending |
| META-03 | Phase 2 | Pending |
| META-04 | Phase 2 | Pending |
| META-05 | Phase 2 | Pending |
| META-06 | Phase 2 | Pending |
| META-07 | Phase 2 | Pending |
| META-08 | Phase 2 | Pending |
| RES-01 | Phase 4 | Pending |
| RES-02 | Phase 4 | Pending |
| RES-03 | Phase 4 | Pending |
| RES-04 | Phase 4 | Pending |
| RES-05 | Phase 4 | Pending |
| RES-06 | Phase 4 | Pending |
| ANN-01 | Phase 3 | Pending |
| ANN-02 | Phase 3 | Pending |
| ANN-03 | Phase 3 | Pending |
| ANN-04 | Phase 3 | Pending |
| CLN-01 | Phase 2 | Pending |
| CLN-02 | Phase 2 | Pending |
| CLN-03 | Phase 2 | Pending |
| CLN-04 | Phase 2 | Pending |
| CLN-05 | Phase 2 | Pending |
| CLN-06 | Phase 2 | Pending |
| DATA-01 | Phase 3 | Pending |
| DATA-02 | Phase 3 | Pending |
| DATA-03 | Phase 3 | Pending |
| DATA-04 | Phase 3 | Pending |
| DATA-05 | Phase 3 | Pending |
| PLAT-01 | Phase 1 | Pending |
| PLAT-02 | Phase 1 | Pending |
| PLAT-03 | Phase 1 | Pending |
| PLAT-04 | Phase 1 | Pending |
| PLAT-05 | Phase 1 | Pending |
| PLAT-06 | Phase 1 | Pending |
| PLAT-07 | Phase 1 | Pending |
| PLAT-08 | Phase 1 | Pending |
| PLAT-09 | Phase 1 | Pending |
| PERF-01 | Phase 3 | Pending |
| PERF-02 | Phase 3 | Pending |
| PERF-03 | Phase 1 | Pending |
| DX-01 | Phase 1 | Pending |
| DX-02 | Phase 1 | Pending |
| DX-03 | Phase 4 | Pending |
| DX-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 56 total
- Mapped to phases: 56
- Unmapped: 0

**Phase Distribution:**
- Phase 1 (Foundation & Architecture): 12 requirements
- Phase 2 (Core Parsing): 30 requirements
- Phase 3 (Reporter Database & Annotation): 9 requirements
- Phase 4 (Short-Form Resolution & Integration): 12 requirements

---
*Requirements defined: 2025-02-04*
*Last updated: 2026-02-04 after roadmap creation*
