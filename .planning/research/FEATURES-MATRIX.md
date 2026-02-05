# Feature Comparison Matrix: Extraction Accuracy Features

**Purpose:** Quick reference for feature prioritization and phase planning
**Created:** 2026-02-05

---

## Quick Comparison

| Feature | Value | Complexity | Dependencies | Phase | Est. Effort |
|---------|-------|-----------|--------------|-------|------------|
| **Full Citation Span** | HIGH | MEDIUM | None | 1 | 1 week |
| **Party Name Extraction** | MEDIUM-HIGH | MEDIUM-HIGH | Feature 2 | 1 | 1.5 weeks |
| **Blank Page Numbers** | MEDIUM | LOW-MEDIUM | None | 1 | 3-4 days |
| **Parallel Citation Linking** | MEDIUM-HIGH | HIGH | Features 2-3 + DB | 2 | 1.5 weeks |
| **Complex Parentheticals** | LOW-MEDIUM | MEDIUM | Feature 2 | 2-3 | 1-2 weeks |

---

## Detailed Analysis

### Feature 2: Full Citation Span Detection

| Dimension | Assessment |
|-----------|-----------|
| **User Value** | HIGH — Enables proper hyperlinking, document understanding, core for other features |
| **Implementation Complexity** | MEDIUM — Case name detection + parenthetical boundary detection |
| **Edge Case Risk** | MEDIUM — OCR artifacts, shortened citations, multiple parentheticals |
| **Dependencies** | None — can implement independently |
| **Blocks Other Features?** | YES — 3 other features depend on this (parallel linking, parties, parentheticals) |
| **Quick Prototype Feasible?** | YES — could do MVP in 2-3 days |
| **Breaking Changes?** | Minor — adds new `fullSpan` field; existing fields unchanged |
| **Bundle Size Impact** | Minimal — pure logic, no data files |
| **Performance Impact** | Minimal — single backward scan for case name |

**Recommendation:** START HERE. Foundation for Phase 1 and 2.

---

### Feature 3: Party Name Extraction

| Dimension | Assessment |
|-----------|-----------|
| **User Value** | MEDIUM-HIGH — Enables case deduplication, legal research filtering |
| **Implementation Complexity** | MEDIUM-HIGH — Bluebook Rule 10.2 has many edge cases |
| **Edge Case Risk** | HIGH — In re/Ex parte, geographic designations, entity names, abbreviations |
| **Dependencies** | Feature 2 (Full Citation Span) — needs case name boundaries |
| **Blocks Other Features?** | Somewhat — parallel linking improved by party extraction, but not blocked |
| **Quick Prototype Feasible?** | PARTIAL — basic extraction works; edge cases need iteration |
| **Breaking Changes?** | Minor — adds `parties` field |
| **Bundle Size Impact** | Minimal — rule engine ~2KB |
| **Performance Impact** | Low — string operations on case name only |

**Recommendation:** SECOND in Phase 1. Depends on Feature 2; pairs well with Blank Page Numbers.

---

### Feature 4: Blank Page Number Handling

| Dimension | Assessment |
|-----------|-----------|
| **User Value** | MEDIUM — Solves slip opinion gap; users expect this |
| **Implementation Complexity** | LOW-MEDIUM — Tokenizer pattern update + confidence adjustment |
| **Edge Case Risk** | MEDIUM — OCR artifacts vs. real blanks hard to distinguish |
| **Dependencies** | None — completely independent |
| **Blocks Other Features?** | No — doesn't affect other features |
| **Quick Prototype Feasible?** | YES — regex change; could do in 1 day |
| **Breaking Changes?** | None — extend existing pattern matching |
| **Bundle Size Impact** | None — only regex pattern change |
| **Performance Impact** | Negligible — same pattern matching cost |

**Recommendation:** QUICK WIN. Can do in parallel with Feature 2 or right after. Independent, low risk.

---

### Feature 1: Parallel Citation Linking

| Dimension | Assessment |
|-----------|-----------|
| **User Value** | MEDIUM-HIGH — Legal research standard; differentiator feature |
| **Implementation Complexity** | HIGH — Reporter pair matching, disambiguation, context awareness |
| **Edge Case Risk** | HIGH — Risk of false positives (independent citations misidentified as parallel) |
| **Dependencies** | Features 2-3; reporter database enhancement |
| **Blocks Other Features?** | No — but improves by having Features 2-3 done first |
| **Quick Prototype Feasible?** | NO — needs reporter database work first |
| **Breaking Changes?** | Minor — adds `parallelCitations` array |
| **Bundle Size Impact** | Moderate — reporter data file +5-10KB |
| **Performance Impact** | Low — lookahead scan over 2-3 citations |

**Recommendation:** PHASE 2. Depends on Phase 1 completion. Significant differentiator but higher risk.

---

### Feature 5: Complex Parentheticals

| Dimension | Assessment |
|-----------|-----------|
| **User Value** | LOW-MEDIUM — Nice-to-have; not blocking any other features |
| **Implementation Complexity** | MEDIUM — Per curiam/docket extraction straightforward; full parsing harder |
| **Edge Case Risk** | HIGH — Explanatory parentheticals are free-form; no good structural parsing |
| **Dependencies** | Feature 2 (Full Citation Span) — needs parenthetical boundaries |
| **Blocks Other Features?** | No |
| **Quick Prototype Feasible?** | YES (basic) — per curiam flag + docket extraction doable in 3-4 days |
| **Breaking Changes?** | Minor — adds flags + optional fields |
| **Bundle Size Impact** | Minimal — ~1KB regex for docket extraction |
| **Performance Impact** | Low — string parsing on parenthetical text |

**Recommendation:** PHASE 2-3. Deferrable if Phase 1-2 takes longer. Can split into basic (Phase 2) + complete (Phase 3).

---

## Execution Timeline

### Scenario A: 4-Week Timeline (Aggressive)

**Week 1-2: Phase 1**
- Feature 2 (Full Span): 1 week
- Feature 3 (Parties): 1 week (basic rules only)
- Feature 4 (Blank Pages): 3-4 days (overlap with Feature 3)

**Week 3-4: Phase 2**
- Feature 1 (Parallel Linking): 1.5 weeks
- Feature 5 (Parentheticals - Basic): 3-4 days

**Output:** v1.1 with all 5 features (4 complete, 1 basic)

---

### Scenario B: 6-Week Timeline (Recommended)

**Week 1-2: Phase 1 - Foundations**
- Feature 2 (Full Span): 1 week
- Feature 3 (Parties): 1.5 weeks
- Feature 4 (Blank Pages): 3 days

**Week 3-4: Phase 2 - Advanced**
- Feature 1 (Parallel Linking): 1.5 weeks
- Feature 5 (Parentheticals - Basic): 4 days

**Week 5-6: Polish & Testing**
- Edge case validation
- Performance optimization
- Documentation

**Output:** v1.1 with 5 complete features, high polish

---

### Scenario C: 8-Week Timeline (Conservative)

**Week 1-2: Phase 1**
- Full Span, Parties (basic), Blank Pages

**Week 3-4: Phase 2**
- Parallel Linking (with extended reporter data work)

**Week 5-6: Phase 2 Continued**
- Complex Parentheticals (basic)

**Week 7-8: Phase 3 - Polish**
- Parentheticals (complete)
- Testing, optimization, documentation

**Output:** v1.1 with all features fully polished

---

## Risk Assessment

### High Risk Features

**Feature 1 (Parallel Linking):** HIGH RISK
- False positives = bad (linking unrelated citations)
- Requires complete reporter database
- Complex disambiguation logic needed
- Mitigation: Start conservative; only link known reporter pairs

**Feature 3 (Party Names):** HIGH RISK
- Edge cases abundant (In re, Ex parte, geographic designations, abbreviations)
- Rule 10.2 complex; real documents may violate it
- Confidence scoring needed; hard to determine when extraction is correct
- Mitigation: Start with conservative basic rules; expand based on test corpus

### Medium Risk Features

**Feature 5 (Complex Parentheticals):** MEDIUM RISK
- Explanatory parentheticals are free-form; hard to parse semantically
- New formats may be discovered in real documents
- Incomplete parsing may be worse than no parsing
- Mitigation: Start with basic (per curiam, docket); flag limitations

**Feature 4 (Blank Pages):** LOW-MEDIUM RISK
- OCR artifacts vs. real blanks hard to distinguish
- Confidence scoring approach (0.8 instead of 1.0) helps
- Mitigation: Document limitation; mark as "assumed valid but unverified"

### Low Risk Features

**Feature 2 (Full Span):** MEDIUM RISK
- Case name boundary detection may fail on unusual formats
- Parenthetical nesting can be complex
- Mitigation: Validate on real-document test corpus; fallback to reporter-only span if case name detection fails

---

## Dependency Verification

```
Feature 2 (Full Span)
├── MUST COMPLETE before:
│   ├── Feature 1 (Parallel Linking)
│   ├── Feature 3 (Party Names)
│   └── Feature 5 (Complex Parentheticals)
│
├── Can be done independently
│
└── Enables: Better document understanding, proper citation boundaries

Feature 4 (Blank Pages)
├── INDEPENDENT — no dependencies
│
├── No features depend on it
│
└── Enables: Slip opinion citation support

Feature 3 (Party Names)
├── DEPENDS ON: Feature 2 (Full Span)
│
├── Improves (but doesn't block):
│   └── Feature 1 (Parallel Linking) — party matching helps validation
│
└── Enables: Case deduplication, legal research filtering

Feature 1 (Parallel Linking)
├── DEPENDS ON:
│   ├── Feature 2 (Full Span) — detect citation boundaries
│   ├── Feature 3 (Party Names) — optional; improves validation
│   └── Reporter database enhancement — parallel pairs metadata
│
├── No features depend on it
│
└── Enables: Citation equivalence detection

Feature 5 (Complex Parentheticals)
├── DEPENDS ON: Feature 2 (Full Span)
│
├── No features depend on it
│
└── Enables: Advanced legal research (docket linking, procedural history)
```

---

## Decision Matrix: Which Features for v1.1?

**Question:** Which features are must-haves vs. nice-to-haves for v1.1?

### Recommendation: All 5, Phased

**Phase 1 (Must-Have):**
- Feature 2 (Full Span) — Foundation
- Feature 3 (Party Names - Basic) — Medium value
- Feature 4 (Blank Pages) — Solves real gap

**Phase 2 (Should-Have):**
- Feature 1 (Parallel Linking) — Differentiator
- Feature 5 (Parentheticals - Basic) — Nice-to-have with value

**Deferrable to v1.2 or later:**
- Feature 5 (Parentheticals - Complete)
- Advanced party name matching (beyond basic Rule 10.2)
- OCR artifact detection

---

## Effort vs. Value Chart

```
HIGH VALUE │
           │    Feature 2 (Full Span) ★★★★★
           │    Feature 1 (Parallel Linking) ★★★★
           │
MEDIUM     │    Feature 3 (Parties) ★★★
VALUE      │    Feature 5 (Parentheticals) ★★
           │    Feature 4 (Blank Pages) ★★
           │
LOW VALUE  │
           └─────────────────────────────────────
              LOW         MEDIUM        HIGH
              COMPLEXITY  COMPLEXITY  COMPLEXITY

★ = Recommended priority
Features in upper left = HIGH value, LOW complexity = START HERE
Features in lower right = NICE-TO-HAVE, HIGH complexity = DEFER
```

**Priority Order:**
1. Feature 2 (Full Span) — 1 week, HIGH value, MEDIUM complexity ← START
2. Feature 4 (Blank Pages) — 3-4 days, MEDIUM value, LOW complexity ← QUICK WIN
3. Feature 3 (Parties) — 1.5 weeks, MEDIUM-HIGH value, MEDIUM-HIGH complexity ← FOUNDATION
4. Feature 1 (Parallel) — 1.5 weeks, MEDIUM-HIGH value, HIGH complexity ← DIFFERENTIATOR
5. Feature 5 (Parentheticals) — 1-2 weeks, LOW-MEDIUM value, MEDIUM complexity ← NICE-TO-HAVE

---

## Summary: Recommended Approach

**Phase 1 (3 weeks):** Foundations
- Implement Features 2, 3, 4
- Establish type system changes
- Build comprehensive test suite

**Phase 2 (2-3 weeks):** Advanced
- Implement Feature 1 (Parallel Linking)
- Implement Feature 5 (Basic parentheticals)
- Optimize performance

**Release as v1.1** with 5 new accuracy features, significantly advancing eyecite-ts beyond Python eyecite baseline.

