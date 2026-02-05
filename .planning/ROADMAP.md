# Roadmap: eyecite-ts

## Overview

eyecite-ts delivers a TypeScript legal citation extraction library with feature parity to Python eyecite, shipping in a sub-50KB browser-compatible bundle. The roadmap progresses from architectural foundation (Phase 1) through core parsing logic (Phase 2), reporter database integration (Phase 3), to short-form resolution and comprehensive validation (Phase 4), culminating in a production-ready v1.0 release.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Architecture** - Project scaffolding, TypeScript config, architectural design ✓
- [x] **Phase 2: Core Parsing** - Tokenization, citation extraction, metadata, text cleaning ✓
- [ ] **Phase 3: Reporter Database & Annotation** - Reporter data integration, bundle optimization, annotation
- [ ] **Phase 4: Short-Form Resolution & Integration** - Id./Supra resolution, comprehensive testing, documentation

## Phase Details

### Phase 1: Foundation & Architecture
**Goal**: Establish project scaffolding, architectural contracts, and design decisions that prevent costly rework
**Depends on**: Nothing (first phase)
**Requirements**: PLAT-01, PLAT-02, PLAT-03, PLAT-04, PLAT-05, PLAT-06, PLAT-07, PLAT-08, PLAT-09, PERF-03, DX-01, DX-02
**Success Criteria** (what must be TRUE):
  1. Developer can install package and import types in both Node.js 18+ and modern browsers
  2. TypeScript strict mode catches type errors in public API (zero `any` types exposed)
  3. Build produces ESM and CommonJS bundles with tree-shakeable exports
  4. Project has zero runtime dependencies verified by package.json
  5. Position offset tracking architecture documented and ready for implementation
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Package and TypeScript configuration with strict mode and conditional exports
- [x] 01-02-PLAN.md — Build tooling (tsdown, Biome, Vitest) with dual ESM/CJS output
- [x] 01-03-PLAN.md — Type system (Span, Citation unions) and architecture documentation

### Phase 2: Core Parsing
**Goal**: Implement core citation detection, tokenization, metadata extraction, and text cleaning with ReDoS protection
**Depends on**: Phase 1
**Requirements**: DET-01, DET-02, DET-03, DET-04, DET-05, DET-06, DET-07, DET-08, DET-09, DET-16, DET-17, DET-18, DET-19, DET-20, DET-21, DET-22, META-01, META-02, META-03, META-04, META-05, META-06, META-07, META-08, CLN-01, CLN-02, CLN-03, CLN-04, CLN-05, CLN-06
**Success Criteria** (what must be TRUE):
  1. Developer can extract full case citations with volume, reporter, page, court, date, and pincite from legal text
  2. Developer can extract U.S. Code, state code, public law, Federal Register, and journal citations
  3. All extracted citations include matched text, span positions, and structured metadata (volume, reporter, page, etc.)
  4. Developer can clean text (strip HTML, normalize whitespace, remove OCR artifacts) with custom functions
  5. No citation pattern triggers >100ms parse time (ReDoS protection validated)
**Plans**: 6 plans

Plans:
- [x] 02-01-PLAN.md — Text cleaning layer with position tracking (cleanText, built-in cleaners)
- [x] 02-02-PLAN.md — Regex patterns for all citation types with ReDoS protection
- [x] 02-03-PLAN.md — Tokenization layer applying patterns to cleaned text
- [x] 02-04-PLAN.md — Citation type system extension (journal, neutral, public law, federal register)
- [x] 02-05-PLAN.md — Citation extraction with metadata parsing and confidence scoring
- [x] 02-06-PLAN.md — Main pipeline (extractCitations API) with integration tests

### Phase 3: Reporter Database & Annotation
**Goal**: Integrate reporter database, optimize bundle size, implement position-aware annotation, validate performance constraints
**Depends on**: Phase 2
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, ANN-01, ANN-02, ANN-03, ANN-04, PERF-01, PERF-02
**Success Criteria** (what must be TRUE):
  1. Developer can extract citations validated against reporters-db (1200+ reporters recognized)
  2. Core bundle size is <50KB gzipped verified by CI/CD
  3. Library processes 10KB legal document in <100ms
  4. Developer can annotate citations with before/after markup or custom functions
  5. Annotation preserves HTML/XML markup and handles entities correctly with accurate position tracking
**Plans**: 4 plans

Plans:
- [ ] 03-01-PLAN.md — Reporter database loader with lazy loading and Map-based O(1) lookup
- [ ] 03-02-PLAN.md — Annotation API with callback and template modes, auto-escaping
- [ ] 03-03-PLAN.md — Citation validation with confidence scoring and degraded mode
- [ ] 03-04-PLAN.md — Bundle optimization, performance validation, integration tests

### Phase 4: Short-Form Resolution & Integration
**Goal**: Resolve Id., Supra, and short-form citations to antecedents with document-scoped state, complete testing and documentation
**Depends on**: Phase 3
**Requirements**: DET-10, DET-11, DET-12, DET-13, DET-14, DET-15, RES-01, RES-02, RES-03, RES-04, RES-05, RES-06, DX-03, DX-04
**Success Criteria** (what must be TRUE):
  1. Developer can detect Id., Ibid., and supra citations in text
  2. Id. citations resolve to immediately preceding citation respecting paragraph boundaries
  3. Supra citations resolve to earlier full citation by party name matching (with spelling variations)
  4. Short-form citations resolve by reporter and page with volume validation
  5. Parallel parsing has no state leakage (document-scoped resolver verified)
  6. API documentation includes examples, error messages guide invalid input
**Plans**: TBD

Plans:
- [ ] TBD (filled during planning)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Architecture | 3/3 | ✓ Complete | 2026-02-05 |
| 2. Core Parsing | 6/6 | ✓ Complete | 2026-02-05 |
| 3. Reporter Database & Annotation | 0/4 | Not started | - |
| 4. Short-Form Resolution & Integration | 0/TBD | Not started | - |
