# Research Summary: Extraction Accuracy Features

**Project:** eyecite-ts (legal citation extraction library)
**Milestone:** v1.1 Feature Planning (Subsequent Milestone)
**Research Date:** 2026-02-05
**Scope:** 5 extraction accuracy features for improving citation parsing
**Overall Confidence:** HIGH

---

## Executive Summary

eyecite-ts v1.0-alpha shipped with full citation extraction, short-form resolution, and text annotation. The next phase should focus on extraction **accuracy and completeness** — improving how citations are parsed and understood.

This research examines 5 features commonly requested in legal citation tools:

1. **Parallel Citation Linking** — Detect that "531 U.S. 98, 121 S.Ct. 525, 148 L.Ed.2d 388" all refer to the same case
2. **Full Citation Span Detection** — Identify complete citation boundaries (case name → parentheticals)
3. **Party Name Extraction** — Parse case names according to Bluebook Rule 10.2 ("Bush v. Gore" → ["Bush", "Gore"])
4. **Blank Page Number Handling** — Recognize slip opinion format "586 U.S. ____" with underscores/dashes
5. **Complex Parentheticals** — Extract court variants, docket numbers, per curiam flags, procedural history

**Key Finding:** All 5 are standard Bluebook patterns (Rules 10.2-10.7) with established conventions. Python eyecite treats most as out-of-scope:
- Parallel citations (Issue #76, debated since 2020, unimplemented)
- Party names (Issue #193, marked "very sloppy", unimplemented)

**Opportunity:** eyecite-ts can differentiate by implementing these as first-class features, not edge cases.

---

## Key Findings by Feature

### 1. Parallel Citation Linking [Differentiator]

**Standard:** All Supreme Court cases published in 3 reporters (U.S. Reports official + West's S.Ct. + Lexis L.Ed.2d). Federal/state cases have similar parallel relationships.

**Value:** HIGH — Legal research standard. Users expect tools to recognize equivalent citations.

**Complexity:** HIGH — Must detect consecutive citations, validate reporter pairs against database, avoid false positives (independent citations misidentified as parallel).

**Implementation Status:**
- Type system ready: `parallelCitations` field exists in FullCaseCitation
- Logic: NOT implemented
- Python eyecite: Issue #76 unresolved for 5+ years

**Differentiator Potential:** Only tool implementing this feature natively gives eyecite-ts major competitive edge.

---

### 2. Full Citation Span Detection [Table Stakes]

**Standard:** Complete citation = case name + reporter/page + parenthetical. Bluebook Rule 10.1 defines structure.

**Value:** HIGH — Enables proper hyperlinking, document understanding, annotation boundaries.

**Current Gap:** eyecite-ts only captures "531 U.S. 98" (reporter portion). Missing case name and parentheticals.

**Complexity:** MEDIUM — Must detect case name backward from reporter, parenthetical boundaries forward from page.

**Implementation Status:**
- Span tracking exists but only for reporter portion
- Case name detection: NOT implemented
- Parenthetical boundary: NOT implemented

**Why Critical:** Foundation for Features 1, 3, 5. Can't do parallel linking, party extraction, or parenthetical parsing without knowing full citation boundaries.

---

### 3. Party Name Extraction [Table Stakes]

**Standard:** Bluebook Rule 10.2 defines party name rules. Extract plaintiff + defendant, apply omission rules (omit geographic designations, given names, etc.).

**Value:** MEDIUM-HIGH — Enables case deduplication, legal research filtering ("find all cases involving Smith"), citation network analysis.

**Complexity:** MEDIUM-HIGH — Many edge cases (In re vs. Ex parte, government entities, multi-word names, abbreviations).

**Implementation Status:**
- NOT implemented
- No party fields in type system
- Python eyecite: Issue #193 marked "very sloppy"

**Edge Cases:** In re/Ex parte handling (procedural vs. party?), abbreviation standardization (write out "United States" vs. as-found?), geographic designation omission rules.

---

### 4. Blank Page Number Handling [Table Stakes]

**Standard:** Slip opinions use placeholders "____", "---", "—" before official pagination assigned. Bluebook Rule 10.3 defines format.

**Value:** MEDIUM — Slip opinions cited regularly before official page numbers assigned. Tools that reject these miss citations.

**Complexity:** LOW-MEDIUM — Tokenizer pattern update; confidence adjustment (0.8 vs 1.0).

**Implementation Status:**
- Tokenizer patterns expect numeric page (\d+)
- Blank placeholders (non-numeric) cause NO MATCH
- Quick fix: Add blank pattern to regex

**Current Problem:** "586 U.S. ____" not recognized as valid citation.

---

### 5. Complex Parentheticals [Nice-to-Have]

**Standard:** Bluebook Rule 10.6 defines parenthetical ordering. Types: court/year (mandatory), per curiam, docket number, explanatory, procedural history.

**Value:** LOW-MEDIUM — Needed for advanced legal research tools; not critical for MVP.

**Complexity:** MEDIUM — Parsing varied formats; structuring is harder. Explanatory parentheticals are free-form.

**Implementation Status:**
- Basic fields exist (court, year)
- Missing: per curiam flag, docket extraction, full date parsing, procedural history

**MVP Approach:** Start with per curiam flag + docket extraction; defer full Bluebook-compliant parsing.

---

## Implications for Roadmap

### Recommended Phase Structure

#### Phase 1: Foundations (2-3 weeks)
Focus on core accuracy improvements that enable downstream features.

**Features:**
- Feature 2: Full Citation Span Detection
- Feature 3: Party Name Extraction (basic)
- Feature 4: Blank Page Number Handling

**Why This Order:**
- Full span is foundation for parallel linking, party extraction, parenthetical parsing
- Blank page numbers are quick win; solve slip opinion gap
- Party names medium complexity but medium value

**Outputs:**
- Updated type system with `fullSpan`, `parties`, `isSlipOpinion` fields
- Enhanced tokenizer patterns for blank page placeholders
- Case name detection algorithm
- Bluebook Rule 10.2 party name parser (basic version)

**Success Criteria:**
- 95%+ accuracy on case name extraction
- 90%+ accuracy on party name extraction (basic rules)
- All 4 blank page formats recognized
- No performance regression

---

#### Phase 2: Advanced Features (2-3 weeks)
Build on Phase 1 foundation for specialized use cases.

**Features:**
- Feature 1: Parallel Citation Linking
- Feature 5: Complex Parentheticals (basic)

**Why Dependent on Phase 1:**
- Parallel linking uses full span + parties to match citations
- Parenthetical parsing uses full span to detect boundaries

**Outputs:**
- Reporter parallel relationship metadata (new data file)
- Parallel citation linking algorithm
- Per curiam flag extraction
- Docket number extraction
- Complex parenthetical raw text capture

**Success Criteria:**
- 95%+ detection of known parallel reporter pairs
- Per curiam flag 100% accurate on test corpus
- Docket extraction 90%+ accurate

---

#### Phase 3: Completeness (Future)
Polish and optimize; deferrable if user demand is low.

**Features:**
- Feature 5: Complex Parentheticals (full)
- Performance optimization
- Extended Bluebook parenthetical format support

---

### Phase Ordering Rationale

**1. Full Citation Span → All Others Depend On It**
- Can't do party extraction without case name start position
- Can't do parallel linking without identifying consecutive citation boundaries
- Can't do parenthetical parsing without detecting end boundary

**2. Party Names → Parallel Linking Depends On It**
- Party extraction enables citation deduplication
- Parallel linking needs to match parties to verify same case

**3. Blank Page Numbers → Independent Quick Win**
- Solves slip opinion handling gap
- No dependencies; low complexity
- Users expect this; low-hanging fruit

**4. Parallel Linking → Advanced Feature**
- Builds on Phase 1 foundation
- Higher complexity; medium value
- Differentiator feature

**5. Complex Parentheticals → Polish Phase**
- Nice-to-have; not critical for core functionality
- Can be deferred if Phase 1-2 takes longer than expected

---

## Confidence Assessment

| Area | Level | Notes |
|------|-------|-------|
| **Bluebook Rules** | HIGH | Official rules documented; university guides authoritative |
| **Standard Patterns** | HIGH | Multiple sources agree on formats (parallel reporters, blank pages, etc.) |
| **Feature Value** | MEDIUM-HIGH | Some features (full span) clearly high value; others (complex parentheticals) less so |
| **Implementation Complexity** | MEDIUM | Estimation based on pattern analysis; actual complexity may vary based on edge case handling |
| **Feature Dependencies** | HIGH | Clear dependency chain; features build on each other logically |
| **Existing Tool Gaps** | HIGH | Python eyecite issues #76, #135, #193 confirmed; these are recognized gaps in the ecosystem |

---

## Gaps and Uncertainties

### Open Questions Needing Phase-Specific Research

1. **Party Names:** How much Bluebook Rule 10.2 complexity to implement in Phase 1?
   - Conservative: Extract parties as-found; minimal abbreviation handling
   - Aggressive: Full Rule 10.2 compliance (omit geographic designations, abbreviate procedural phrases, etc.)
   - Recommendation: Start conservative; expand based on user feedback

2. **In re / Ex parte Handling:** Model as separate procedural field or exclude from party names?
   - Affects type system design
   - Impacts how citations like "In re Smith, 500 F.2d 123" are represented

3. **Parallel Citation Linking:** Scope of reporter pairs to support?
   - Minimal: US Supreme Court 3-way (U.S./S.Ct./L.Ed.2d) only
   - Moderate: All federal appellate + state supreme court pairs
   - Comprehensive: All known parallel relationships
   - Recommendation: Start with Supreme Court; expand with data

4. **Confidence Scoring:** How to score features with inherent ambiguity?
   - Example: Party extraction on "United States v. Miller" is clear (1.0), but "Smith v. Smith" is ambiguous (0.7)
   - Need clear rubric for each feature

5. **Blank Page Formats:** All three formats supported, or prioritize?
   - 4+ underscores (____) — most common
   - 3+ dashes (---) — federal district courts
   - Em-dashes (—) — editorial style
   - Recommendation: Support all; same regex complexity

### Deferred for Later Investigation

- OCR artifact detection (vs. real blank page numbers) — defer to Phase 3
- Full Bluebook-compliant parenthetical parsing — defer to Phase 3
- Procedural history citation linking — defer to Phase 3
- Confidence scoring rubric validation — need test corpus of real documents

---

## Competitive Context

### How eyecite-ts Differentiates

**Python eyecite:**
- Core extraction ✓ (excellent)
- Short-form resolution ✓
- Parallel citations ✗ (Issue #76, unimplemented)
- Party names ✗ (Issue #193, very sloppy)
- Full citation span ✗ (Issue #135, no solution)
- Blank page numbers ✗ (assumed not in scope)

**eyecite-ts v1.0-alpha:**
- Core extraction ✓ (matches Python)
- Short-form resolution ✓
- All above: ✗ (like Python)

**eyecite-ts v1.1 (After This Research):**
- Parallel citations ✓ (NEW — differentiator)
- Party names ✓ (NEW — differentiator)
- Full citation span ✓ (NEW — differentiator)
- Blank page numbers ✓ (NEW — differentiator)
- Complex parentheticals (partial) ✓ (NEW — nice-to-have)

**Result:** eyecite-ts becomes more complete than Python eyecite for the first time.

---

## Roadmap Recommendations

### Proceed With

1. **Feature 2 (Full Citation Span)** — Foundation; unblocks 3 other features
2. **Feature 3 (Party Names)** — Medium complexity, medium-high value
3. **Feature 4 (Blank Pages)** — Quick win; solves real gap
4. **Feature 1 (Parallel Linking)** — Once Phase 1 complete; high differentiator value

### Defer To Phase 2 or Later

1. **Feature 5 (Complex Parentheticals)** — Nice-to-have; not blocking any other features
2. **Advanced party name matching** — Beyond basic Bluebook Rule 10.2
3. **Procedural history citation linking** — Out of scope for v1.1

### Research Flags for Planning

- **Party Name Extraction Complexity:** Validate Rule 10.2 handling with test corpus. Edge cases may be more common than expected.
- **Parallel Citation Accuracy:** Ensure reporter pair database is complete before implementation. False positives are worse than false negatives.
- **OCR Artifact Distinction:** If slip opinion support goes to production, need strategy for OCR-induced blanks vs. real slip opinions.

---

## Success Criteria for v1.1 Release

**Feature Implementation:**
- [ ] Full citation span: 95%+ accuracy on test corpus
- [ ] Party name extraction: 90%+ on basic Bluebook rules
- [ ] Blank page numbers: 100% recognition of 4 placeholder formats
- [ ] Parallel citation linking: 95%+ accuracy on known parallel pairs
- [ ] Complex parentheticals (basic): Per curiam flag 100%, docket extraction 90%

**Quality:**
- [ ] Zero runtime dependency increase
- [ ] Bundle size increase <10KB gzipped
- [ ] All existing v1.0 tests pass
- [ ] New tests: 100+ tests covering new features

**Performance:**
- [ ] No regression on extract speed (vs. v1.0)
- [ ] Batch extraction of 10KB documents: <50ms

---

## Next Steps

1. **Roadmap Creation:** Use this research to structure v1.1 phases
2. **Phase-Specific Research:** Before implementation, deepen research on:
   - Party name Rule 10.2 edge cases (test against real case names)
   - Reporter parallel relationships (validate data completeness)
   - OCR artifact patterns (if slip opinion support in scope)
3. **Prototype:** Quick prototype of Feature 2 (Full Span) to validate approach before full implementation
4. **Community Feedback:** Share research findings with Python eyecite maintainers; opportunity for collaboration

---

## Sources

### Bluebook Standards (HIGH confidence)
- [Cases - Bluebook Legal Citation](https://tarlton.law.utexas.edu/bluebook-legal-citation/how-to-cite/cases)
- [Case Name Rule 10.2](https://libguides.udmercy.edu/c.php?g=739087&p=5285800)
- [Pages, Paragraphs Rule 10.3](https://tarlton.law.utexas.edu/bluebook-legal-citation/pages-paragraphs-pincites)
- [Court & Date Rules 10.4-10.5](https://library.famu.edu/c.php?g=276158&p=1842445)
- [Parentheticals Rule 10.6](https://library.famu.edu/c.php?g=276158&p=1842451)

### Legal Citation References
- [Parallel Citations](https://jdadvising.com/legal-citation-help-parallel-citations/)
- [Citing Federal Cases](https://guides.law.sc.edu/LRAWSpring/LRAW/citingfedcases)
- [Words Omitted in Case Names](https://www.law.cornell.edu/citation/4-300)
- [Parentheticals Handout](https://www.law.georgetown.edu/wp-content/uploads/2018/07/Parentheticals-Bluebook-Handout-Revision-Karl-Bock-2016.pdf)

### Existing Tools
- [Python eyecite GitHub](https://github.com/freelawproject/eyecite)
- [eyecite-ts GitHub](https://github.com/medelman17/eyecite-ts)

---

**Research Complete.** Ready for roadmap creation and phase planning.

