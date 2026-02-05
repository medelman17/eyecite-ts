# Research Summary: Extraction Accuracy Features (v1.1)

**Domain:** Legal citation extraction — Adding 5 accuracy-focused features to existing TypeScript parser

**Researched:** February 2026

**Overall confidence:** HIGH

## Executive Summary

Adding extraction accuracy features to eyecite-ts (parallel citation linking, full span extraction, party name extraction, blank page support, complex parenthetical parsing) presents moderate-to-critical integration challenges with the existing dual-span position tracking system and strict type definitions.

The Python eyecite library's maintainers explicitly acknowledged two core challenges: (1) parallel citation linking has been unresolved for years due to detection complexity, and (2) party name extraction is "one of those things that we just had to do a bad job on" (60-80% accuracy accepted). These features are not trivial additions.

**Key finding:** The five features interact in complex ways. You cannot implement them independently — parallel citations share parentheticals with full span extraction, party names require backward text scanning that conflicts with position mapping, blank pages create type ambiguity that affects all other features, and complex parentheticals create court/date ambiguity that cascades through the extraction pipeline. Careful integration architecture is essential.

## Key Findings

### Stack & Technology
No new dependencies required. All features can be implemented using existing TypeScript infrastructure (regex patterns, position tracking). The challenge is not technical but architectural.

### Features
**Table Stakes:**
- Full citation span extraction (case name through parenthetical) — users expect complete citation boundaries
- Complex parenthetical parsing with month/day dates — common in federal circuit opinions

**Differentiators:**
- Parallel citation linking with independent position tracking — adds value, but lower adoption impact
- Party name extraction — useful for legal workflows, acknowledged as <80% accurate
- Blank page number support — niche feature (pending U.S. Reports citations)

**Critical Integration Points:**
1. **Parallel citations + Full span:** Cannot design independently. Span semantics must be consistent across both.
2. **Party name + Position tracking:** Party name extraction requires backward-scanning original text; conflicts with position mapping assumptions.
3. **Blank page + Type system:** Changing `page: number` to `page: number | string | undefined` is a breaking change; requires major version bump or type restructuring.
4. **Parentheticals + Court inference:** Current court-from-reporter inference breaks when parenthetical contains complex dates.

## Architecture Impact

### Position Tracking (CRITICAL)
**Current state:** Dual positions (cleanStart/End, originalStart/End) via `TransformationMap`
**After parallel citations:** Each parallel needs independent span; primary span unchanged for backward compatibility
**Risk:** Position boundaries could overlap or become ambiguous if not carefully tracked per-citation

**Recommendation:** Design span semantics in Phase 1 before any implementation. Define:
- Primary span covers volume-reporter-page only (unchanged)
- Full span (new) covers case name through parenthetical
- Parallel citations (new) each have independent span
- No span overlaps across different citations

### Type System (CRITICAL)
**Current state:** `page: number`, all citation fields on single type per citation type
**After blank page support:** `page: number | string | undefined` — breaking change
**Risk:** User code assuming numeric page breaks at runtime; requires major version bump or redesign

**Recommendation:** Use discriminated union pattern:
```typescript
type FullCaseCitation = CaseWithPage | CaseWithBlankPage
// CaseWithPage has page: number (safe for arithmetic)
// CaseWithBlankPage has page: string (safe for display)
```
This preserves type safety without breaking existing code (type: "case" stays unchanged).

### Feature Interactions (MODERATE)
**Parallel + Full Span:** Which span field does user code use for highlighting? Spec must be unambiguous.
**Parallel + Party Name:** Can parallel citations have different party names? Spec required.
**Full Span + Party Name:** Does fullSpan include party name? Must be defined upfront.
**Blank Page + Parallel:** Can one parallel have numeric page, another blank? Type system must support or forbid.

**Recommendation:** Create feature interaction matrix in Phase 1 roadmap; design all features together, not sequentially.

## Roadmap Implications

### Phase 1: Foundation & Roadmap (NEW)
**Duration:** ~3-4 days (research/design)
**Deliverables:**
- Span semantics specification (primary, full, parallel)
- Type system breaking changes analysis & version planning
- Feature interaction matrix
- Party name extraction boundaries & limitations document
- Parenthetical parsing rules & edge cases
- Blank page type design decision

**Why first:** These five features cannot be implemented independently. Upfront design prevents rework.

### Phase 2: Parallel Citation Linking
**Duration:** ~8-10 days (medium complexity)
**Dependencies:** Phase 1 (design)
**Key challenge:** Detecting parallel citations without false positives (same volume number, different reporters); position mapping must be accurate
**Acceptance:** 100% position accuracy on boundaries; parallel + full span integration tested

### Phase 3: Party Name & Complex Parentheticals
**Duration:** ~10-12 days (moderate complexity)
**Dependencies:** Phase 1 (design), Phase 2 (parallel linking built)
**Key challenge:** Party name extraction ~60-80% accurate (acknowledged limitation); complex date parsing in parentheticals
**Acceptance:** Party name extraction tested on 50+ real cases; complex parentheticals (month/day dates) parsed correctly for 90%+ of cases

### Phase 4: Full Span & Blank Page Support
**Duration:** ~8-10 days (moderate complexity)
**Dependencies:** Phase 1 (design), Phase 2-3 (foundation built)
**Key challenge:** Full span boundaries must be precise (no extra text); blank page support requires type changes and validation
**Acceptance:** Full span boundaries validated on 50+ real documents; blank page format recognized correctly

### Phase 5: Integration, Testing & Documentation
**Duration:** ~6-8 days
**Dependencies:** All feature phases
**Key work:** Feature interaction testing (parallel ↔ full span ↔ party name), position accuracy validation on real legal documents, type system migration guide, breaking change communication
**Acceptance:** All features work together; position accuracy 100% on 50+ documents; documentation clearly explains feature interactions and type changes

**Suggested sequence:**
1. Phase 1 (Foundation) — Design everything upfront
2. Phase 2 (Parallel Linking) — Foundation for position tracking
3. Phase 3 (Party Name + Parentheticals) — Builds on parallel linking
4. Phase 4 (Full Span + Blank Page) — Uses span design from Phase 1
5. Phase 5 (Integration & Testing) — Validate all interactions

## Critical Pitfalls & Prevention

| Pitfall | Risk | Prevention Phase |
|---------|------|------------------|
| Position ambiguity with parallel citations | CRITICAL | Phase 1 (design span semantics), Phase 2 (implement with validation) |
| Type changes breaking user code | CRITICAL | Phase 0/1 (version planning, major bump if needed) |
| Party name extraction unreliability | MODERATE | Phase 1 (document ~60-80% accuracy), Phase 3 (add confidence scoring) |
| Full span boundaries unbounded | MODERATE | Phase 1 (define boundaries), Phase 4 (validate on real docs) |
| Blank page type confusion | MODERATE | Phase 1 (design discriminated union), Phase 4 (implement type-safe) |
| Feature interactions untested | MODERATE | Phase 1 (design together), Phase 5 (test all combinations) |

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| **Position tracking impact** | HIGH | Current system well-understood; changes to span semantics are clear architectural decision |
| **Type system breaking changes** | HIGH | TypeScript type semantics well-defined; discriminated union pattern is proven approach |
| **Party name extraction challenges** | HIGH | Python eyecite explicitly documents <80% accuracy; GitHub issue #193 confirms fundamental limitations |
| **Parallel citation complexity** | MEDIUM-HIGH | Python eyecite GitHub issue #76 shows years of unresolved debate; feasible but requires careful design |
| **Full span boundary definition** | MEDIUM | Bluebook rules are clear, but practical edge cases require testing on real legal documents |
| **Feature interactions** | MEDIUM | Interactions are interdependent but manageable with upfront design |

## Gaps to Address in Phase Planning

1. **Position accuracy validation framework:** What constitutes "100% accuracy"? Need concrete test methodology for Phase 2.
2. **Party name extraction groundtruth:** Need 50+ manually-verified test cases to measure accuracy. Recommend sourcing from CourtListener or similar.
3. **Full span boundary edge cases:** Need catalog of 20+ real legal documents with complex case names, multiple parentheticals, subsequent history.
4. **Blank page prevalence:** How common are blank page citations in practice? Affects phase prioritization.
5. **Type system versioning:** Clarify semver strategy — major version bump required, or can discriminated union be implemented as patch?

## Open Questions

- **Question 1:** Will the project tolerate a major version bump (v2.0.0) for type changes, or must backward compatibility be maintained at all costs?
  - **Impact:** Affects type design choices; discriminated union is less invasive than union with guards, but both work.

- **Question 2:** What is the acceptable accuracy floor for party name extraction? (Current: 60-80%)
  - **Impact:** Affects whether to ship party name extraction, add confidence scoring, or skip feature entirely.

- **Question 3:** Should parallel citations be detected at extraction time (Phase 2) or resolution time (Phase 3 or later)?
  - **Impact:** Affects architecture and complexity. Early detection prevents messy metadata but requires reporter knowledge during extraction.

- **Question 4:** Is full span extraction always enabled, or optional via configuration?
  - **Impact:** Optional (default false) is safer for backward compatibility; Phase 4 implementation.

## Recommendations for Roadmap

1. **Commit to Phase 1 design work (3-4 days).** This is not "nice to have" — it prevents rework in Phases 2-4. The five features interact deeply.

2. **Implement discriminated union for type safety.** Don't change `page: number` globally. Instead, create `CaseWithPage` and `CaseWithBlankPage` types. Users upgrading to v1.1 stay compatible with type: "case"; new blank-page citations use type: "caseBlank".

3. **Accept party name accuracy at ~70%.** Document clearly: "Party name extraction uses heuristics; accuracy ~70% for simple names, ~40% for complex names. Always verify for legal filings."

4. **Make full span optional by default.** Prevent surprises. Only extract fullSpan when user explicitly requests it.

5. **Prioritize parallel citation linking + complex parentheticals first** (Phases 2-3). These are higher-value features that foundation other features. Blank page + full span (Phase 4) can leverage foundation built in Phases 2-3.

6. **Plan explicit feature interaction testing** (Phase 5). Don't assume parallel + full span work together. Test all combinations.

7. **Version planning:** Strongly recommend **v1.1.0 → v2.0.0** if type changes are unavoidable. If discriminated union is used, v1.1.0 is acceptable with clear changelog.

---

*Accuracy features research for: eyecite-ts v1.1 milestone*

*Researched: February 2026*
