# Roadmap: eyecite-ts

## Milestones

- ✅ **v1.0-alpha** - Phases 1-4 (shipped 2026-02-05)
- ✅ **v1.1 Extraction Accuracy** - Phases 5-8 (shipped 2026-02-06)

## Phases

<details>
<summary>✅ v1.0-alpha (Phases 1-4) - SHIPPED 2026-02-05</summary>

### Phase 1: Foundation
**Goal**: Project scaffolding and core pipeline
**Plans**: 4 plans

Plans:
- [x] 01-01: Project setup
- [x] 01-02: Clean pipeline
- [x] 01-03: Tokenize pipeline
- [x] 01-04: Extract pipeline foundation

### Phase 2: Case Citations
**Goal**: Full and neutral case citation extraction
**Plans**: 3 plans

Plans:
- [x] 02-01: Case citation extraction
- [x] 02-02: Neutral citations (WL, LEXIS)
- [x] 02-03: Pincites and metadata

### Phase 3: Other Citation Types
**Goal**: Statutory, journal, and regulatory citations
**Plans**: 4 plans

Plans:
- [x] 03-01: U.S. Code citations
- [x] 03-02: State code citations
- [x] 03-03: Public law and Federal Register
- [x] 03-04: Law journal citations

### Phase 4: Resolution & Annotation
**Goal**: Short-form resolution and annotation
**Plans**: 6 plans

Plans:
- [x] 04-01: Id. resolution
- [x] 04-02: Supra resolution
- [x] 04-03: Short-form case resolution
- [x] 04-04: Annotation pipeline
- [x] 04-05: Integration testing
- [x] 04-06: Documentation and release

</details>

### ✅ v1.1 Extraction Accuracy (SHIPPED 2026-02-06)

**Milestone Goal:** Improve citation extraction accuracy with full spans, party names, parallel citation linking, blank page support, and complex parentheticals

#### Phase 5: Type System & Blank Pages
**Goal**: Extend type system with optional fields and support blank page placeholders
**Depends on**: Phase 4 (v1.0-alpha complete)
**Requirements**: QUAL-01, BLANK-01, BLANK-02, BLANK-03, BLANK-04
**Success Criteria** (what must be TRUE):
  1. Citation types accept optional fullSpan, caseName, plaintiff, defendant, hasBlankPage, and structured date fields
  2. Citations with blank page numbers (underscores or dashes) are extracted with hasBlankPage flag
  3. Blank page citations have undefined page field and confidence 0.8
  4. All existing tests pass unchanged (backward compatibility verified)
**Plans**: 2 plans

Plans:
- [x] 05-01-PLAN.md — Extend FullCaseCitation type with optional fields + backward compat tests
- [x] 05-02-PLAN.md — Blank page placeholder recognition (TDD: patterns + extraction + tests)

#### Phase 6: Full Span & Complex Parentheticals
**Goal**: Extract full citation boundaries and parse complex parentheticals with dates
**Depends on**: Phase 5
**Requirements**: SPAN-01, SPAN-02, SPAN-03, SPAN-04, PAREN-01, PAREN-02, PAREN-03, PAREN-04
**Success Criteria** (what must be TRUE):
  1. Case citations include fullSpan covering case name through closing parenthetical
  2. Case name is extracted via backward search for "v." pattern and exposed in caseName field
  3. Existing span field unchanged (core only) for backward compatibility
  4. Parentheticals containing month/day dates extract court and structured date (year, month, day)
  5. Parentheticals work correctly with court only, date only, or both
**Plans**: 2 plans

Plans:
- [x] 06-01-PLAN.md — Date parsing utilities (TDD: parseMonth, parseDate, toIsoDate)
- [x] 06-02-PLAN.md — Case name extraction, unified parenthetical parser, fullSpan calculation

#### Phase 7: Party Name Extraction
**Goal**: Extract plaintiff and defendant from case names for improved supra resolution
**Depends on**: Phase 6
**Requirements**: PARTY-01, PARTY-02, PARTY-03, PARTY-04, PARTY-05
**Success Criteria** (what must be TRUE):
  1. Citations expose plaintiff and defendant fields split on "v." / "vs."
  2. Procedural prefixes (In re, Ex parte, Matter of) handled correctly with plaintiff only
  3. Government entities like "United States" recognized as plaintiffs
  4. Supra resolution uses party names for improved matching (fixes #21)
  5. Confidence scoring reflects party name extraction quality
**Plans**: 2 plans

Plans:
- [x] 07-01-PLAN.md — Party name extraction (types, extractPartyNames, normalization, tests)
- [x] 07-02-PLAN.md — Augment supra resolution with party name matching

#### Phase 8: Parallel Linking & Quality Validation
**Goal**: Link parallel citations sharing a parenthetical and validate quality targets
**Depends on**: Phase 7
**Requirements**: PARA-01, PARA-02, PARA-03, PARA-04, SPAN-05, QUAL-02, QUAL-03, QUAL-04
**Success Criteria** (what must be TRUE):
  1. Comma-separated case citations sharing a parenthetical are linked via parallelCitations array
  2. All citations returned individually (backward compatible)
  3. No false positives in parallel linking (proximity and shared context required)
  4. Annotation supports full span mode (annotate from case name through parenthetical)
  5. Bundle size remains under 50KB gzipped
  6. Performance remains under 100ms for 10KB documents
**Plans**: 3 plans

Plans:
- [x] 08-01-PLAN.md — Parallel citation detection with groupId and parallelCitations (TDD)
- [x] 08-02-PLAN.md — Full-span annotation mode (useFullSpan option)
- [x] 08-03-PLAN.md — Golden test corpus and quality validation

## Progress

**Execution Order:**
Phases execute in numeric order: 5 -> 6 -> 7 -> 8

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0-alpha | 4/4 | Complete | 2026-02-05 |
| 2. Case Citations | v1.0-alpha | 3/3 | Complete | 2026-02-05 |
| 3. Other Citation Types | v1.0-alpha | 4/4 | Complete | 2026-02-05 |
| 4. Resolution & Annotation | v1.0-alpha | 6/6 | Complete | 2026-02-05 |
| 5. Type System & Blank Pages | v1.1 | 2/2 | Complete | 2026-02-05 |
| 6. Full Span & Complex Parentheticals | v1.1 | 2/2 | Complete | 2026-02-05 |
| 7. Party Name Extraction | v1.1 | 2/2 | Complete | 2026-02-05 |
| 8. Parallel Linking & Quality Validation | v1.1 | 3/3 | Complete | 2026-02-06 |
