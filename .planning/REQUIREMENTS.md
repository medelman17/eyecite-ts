# Requirements: eyecite-ts v1.1

**Defined:** 2026-02-05
**Core Value:** Developers can extract, resolve, and annotate legal citations from text without Python infrastructure

## v1.1 Requirements

Requirements for extraction accuracy milestone. Each maps to roadmap phases.

### Full Citation Span

- [ ] **SPAN-01**: Extract case name from text preceding citation core (backward search for "v." pattern)
- [ ] **SPAN-02**: Calculate `fullSpan` field covering case name through closing parenthetical
- [ ] **SPAN-03**: Provide structured `caseName` field with the extracted case name string
- [ ] **SPAN-04**: Existing `span` field unchanged (citation core only) for backward compatibility
- [ ] **SPAN-05**: Annotation supports full citation span mode (annotate from case name through parenthetical)

### Party Name Extraction

- [ ] **PARTY-01**: Extract `plaintiff` and `defendant` fields from case name split on "v." / "vs."
- [ ] **PARTY-02**: Handle procedural prefixes: "In re", "Ex parte", "Matter of" (plaintiff only, no defendant)
- [ ] **PARTY-03**: Handle "United States" and government entity plaintiffs
- [ ] **PARTY-04**: Party names available for supra resolution (fixes #21)
- [ ] **PARTY-05**: Confidence scoring reflects extraction quality (lower for complex/uncertain names)

### Blank Page Numbers

- [ ] **BLANK-01**: Recognize `___`, `---`, `____`, `----` as valid page placeholders in case citations
- [ ] **BLANK-02**: Set `hasBlankPage: true` flag on citations with placeholder pages
- [ ] **BLANK-03**: `page` field is `undefined` for blank-page citations
- [ ] **BLANK-04**: Confidence lowered to 0.8 for blank-page citations

### Parallel Citation Linking

- [ ] **PARA-01**: Detect comma-separated case citations sharing a parenthetical as parallel
- [ ] **PARA-02**: Populate `parallelCitations` array on the first citation in the group
- [ ] **PARA-03**: All citations returned individually in results (backward compatible)
- [ ] **PARA-04**: No false positives — only link citations with physical proximity and shared context

### Complex Parentheticals

- [ ] **PAREN-01**: Extract court from parentheticals containing month/day dates: `(2d Cir. Jan. 15, 2020)`
- [ ] **PAREN-02**: Extract structured date with year, month, day fields
- [ ] **PAREN-03**: Handle parentheticals with court only, date only, or both
- [ ] **PAREN-04**: Handle multiple date formats: `Jan. 15, 2020`, `January 15, 2020`, `1/15/2020`

### Quality & Compatibility

- [ ] **QUAL-01**: All new fields are optional — existing consumer code unaffected
- [ ] **QUAL-02**: Bundle size remains under 50KB gzipped
- [ ] **QUAL-03**: Performance remains under 100ms for 10KB documents
- [ ] **QUAL-04**: All existing tests continue to pass

## Future Requirements

Deferred to later milestones.

### Statute Pipeline (v1.2)

- **STAT-01**: Recognize short-form statute references (§ 24, sections 24)
- **STAT-02**: Link short-form statutes to antecedent full statute citations
- **STAT-03**: Support C.F.R. citation format

### Extensibility (v1.2)

- **EXT-01**: API for registering custom reporters
- **EXT-02**: Configurable OCR/Unicode cleaning presets
- **EXT-03**: Regional citation mode (California, New York)

### Advanced Citations (v1.3+)

- **ADV-01**: Infra citation detection (forward references)
- **ADV-02**: Nominative reporter support (5 U.S. (1 Cranch) 137)
- **ADV-03**: HTML annotation safety (markers inside HTML tags)

## Out of Scope

| Feature | Reason |
|---------|--------|
| NLP-based case name extraction | Regex heuristics sufficient; NLP adds dependency and complexity |
| Citation validation against databases | Out of library scope — we extract, not verify |
| 100% party name accuracy | Inherent limitation (~70-80%); documented with confidence scoring |
| Breaking type changes | All new fields optional; maintain backward compatibility |
| Streaming extraction | Deferred to v2 |
| International citation formats | Deferred to v2 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SPAN-01 | — | Pending |
| SPAN-02 | — | Pending |
| SPAN-03 | — | Pending |
| SPAN-04 | — | Pending |
| SPAN-05 | — | Pending |
| PARTY-01 | — | Pending |
| PARTY-02 | — | Pending |
| PARTY-03 | — | Pending |
| PARTY-04 | — | Pending |
| PARTY-05 | — | Pending |
| BLANK-01 | — | Pending |
| BLANK-02 | — | Pending |
| BLANK-03 | — | Pending |
| BLANK-04 | — | Pending |
| PARA-01 | — | Pending |
| PARA-02 | — | Pending |
| PARA-03 | — | Pending |
| PARA-04 | — | Pending |
| PAREN-01 | — | Pending |
| PAREN-02 | — | Pending |
| PAREN-03 | — | Pending |
| PAREN-04 | — | Pending |
| QUAL-01 | — | Pending |
| QUAL-02 | — | Pending |
| QUAL-03 | — | Pending |
| QUAL-04 | — | Pending |

**Coverage:**
- v1.1 requirements: 26 total
- Mapped to phases: 0
- Unmapped: 26 ⚠️

---
*Requirements defined: 2026-02-05*
*Last updated: 2026-02-05 after initial definition*
