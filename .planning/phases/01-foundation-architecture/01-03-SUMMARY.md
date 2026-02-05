---
phase: 01-foundation-architecture
plan: 03
subsystem: type-system
status: complete
tags: [typescript, types, architecture, position-tracking, discriminated-unions]

dependency-graph:
  requires:
    - 01-01 # Package configuration provides tsconfig strict mode
  provides:
    - Span interface for dual position tracking
    - Citation type discriminated unions
    - ARCHITECTURE.md for Phase 2-4 implementation
  affects:
    - 01-02 # Build tooling will compile these types
    - 02-xx # All Phase 2 parsing uses these types
    - 03-xx # All Phase 3 annotation uses these types

tech-stack:
  added:
    - src/types/span.ts # Position tracking types
    - src/types/citation.ts # Citation discriminated unions
  patterns:
    - Discriminated unions for type-safe pattern matching
    - Dual position tracking (clean vs. original positions)
    - Type-first exports for optimal tree-shaking

file-tracking:
  created:
    - src/types/span.ts
    - src/types/citation.ts
    - src/types/index.ts
    - src/index.ts
    - ARCHITECTURE.md
  modified: []

decisions:
  - id: TYPE-01
    scope: project
    impact: high
  - id: TYPE-02
    scope: project
    impact: high
  - id: ARCH-01
    scope: phase-2
    impact: high

metrics:
  duration: 118s
  tasks: 3
  commits: 3
  files_created: 5
  files_modified: 0
  completed: 2026-02-05
---

# Phase 1 Plan 3: Type System & Architecture Summary

**One-liner:** Dual position tracking (Span) and discriminated union Citation types with architectural documentation for Phase 2-4 implementation

## What Was Built

### Position Tracking Type System
Created `Span` interface with dual position tracking to prevent offset drift (Pitfall #1):
- `cleanStart/End` - positions in transformed text (used during parsing)
- `originalStart/End` - positions in original input (returned to user)
- `TransformationMap` interface for bidirectional position mapping

### Discriminated Union Citation Types
Created type-safe citation types using discriminated unions (satisfies DX-01/DX-02):
- `CitationType` discriminator: "case" | "statute" | "id"
- `FullCaseCitation` - volume/reporter/page format
- `StatuteCitation` - code section format
- `IdCitation` - short form reference

Starting with minimal set (3 types). More added in Phase 2/4 as needed.

### Public API Entry Point
Created `src/index.ts` with type re-exports:
- All types exported for consumer use
- Placeholder comments for Phase 2-4 function exports
- Clean public API surface

### Architecture Documentation
Created `ARCHITECTURE.md` (151 lines) documenting:
- Position tracking architecture (TransformationMap flow)
- Tree-shaking strategy (pending bundle size decision)
- Type system design (discriminated unions)
- Parsing pipeline (clean → extract → translate)
- Build configuration (Phase 1 completion)
- Testing strategy (ReDoS, position accuracy, cross-browser)

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create Span interface for position offset tracking | e469443 | src/types/span.ts |
| 2 | Create discriminated union Citation types | c90f73d | src/types/citation.ts |
| 3 | Create project structure and public API entry point | 3e49fa0 | src/types/index.ts, src/index.ts, ARCHITECTURE.md |

## Decisions Made

**TYPE-01: Span Interface with Dual Position Tracking**
- **Decision:** All citations use Span type with both clean and original positions
- **Rationale:** Prevents position offset drift (Pitfall #1 from research)
- **Implementation:** cleanStart/End for parsing, originalStart/End for user-facing results
- **Impact:** Phase 2 text cleaning must build TransformationMap
- **Trade-offs:** Slight memory overhead (~8 bytes per citation) vs. position accuracy guarantee
- **Alternatives considered:** Single position tracking (rejected - causes drift), position calculation on-demand (rejected - O(n) cost per citation)

**TYPE-02: Discriminated Union Citation Types**
- **Decision:** All citation types use `type` field discriminator
- **Rationale:** TypeScript exhaustive checking, no instanceof/type guards needed (DX-01/DX-02)
- **Implementation:** `type Citation = FullCaseCitation | StatuteCitation | IdCitation`
- **Impact:** Switch statements on citation.type are compile-time safe
- **Trade-offs:** Cannot use classes (accepted - prefer data over behavior)
- **Alternatives considered:** Class hierarchy with instanceof (rejected - worse DX), separate type predicates (rejected - manual exhaustiveness checking)

**ARCH-01: Position Tracking Implementation Strategy**
- **Decision:** Text cleaning layer builds TransformationMap, parser operates on cleaned text, translator converts positions
- **Rationale:** Separation of concerns, single-pass extraction, O(1) position lookup
- **Implementation:** Clean layer → Map<clean, original> → Extract layer → Position translator
- **Impact:** Phase 2 must implement all three layers together
- **Trade-offs:** Three-layer architecture vs. simpler single-pass (accepted - correctness over simplicity)
- **Alternatives considered:** On-demand position calculation (rejected - O(n) per citation), reverse parsing from original (rejected - complex regex patterns)

## Technical Details

### Type System Contract
```typescript
// All citations have original positions
interface Citation {
  span: Span  // originalStart/End always point to original input
}

// Type-safe pattern matching
function processCitation(citation: Citation) {
  switch (citation.type) {
    case "case":
      return citation.volume  // TypeScript knows this exists
    case "statute":
      return citation.code    // TypeScript knows this exists
    case "id":
      return citation.pincite // TypeScript knows this is optional
  }
}
```

### Position Tracking Flow
```
Input: "Smith v. Doe, 500 F.2d 123"
  ↓ Clean (no changes in this example)
Cleaned: "Smith v. Doe, 500 F.2d 123"
  ↓ Extract (regex match at positions 14-27)
Match: {cleanStart: 14, cleanEnd: 27}
  ↓ Translate (lookup in TransformationMap)
Citation: {
  span: {
    cleanStart: 14,
    cleanEnd: 27,
    originalStart: 14,  // Mapped from cleanStart
    originalEnd: 27     // Mapped from cleanEnd
  }
}
```

## Test Coverage

TypeScript compiler validates:
- All type definitions compile without errors
- No circular dependencies in type imports
- Strict mode type checking passes

Phase 2 will add:
- Position tracking unit tests
- Discriminated union exhaustiveness tests
- Cross-type compatibility tests

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Phase 1 (01-02) - Build Tooling:**
- Ready: All types defined, TypeScript compiler validates
- Requires: tsdown config to compile types, Vitest config to test them

**Phase 2 - Parser Implementation:**
- Ready: Span and Citation types are the contract for parser
- Requires: Implement clean layer (builds TransformationMap), extract layer (regex patterns), position translator

**Phase 3 - Annotation System:**
- Ready: Citation types support reporter metadata addition
- Requires: Reporter database integration (load from reporters-db)

**Blockers:**
- None for Phase 1 completion
- Reporter database strategy decision needed before Phase 3 (inline vs. tree-shake vs. CDN)

**Open Questions:**
- Bundle size optimization: Which reporter database strategy? (documented in ARCHITECTURE.md, decision deferred to Phase 3)

## Success Metrics

- **Type safety:** All types compile with strict mode ✅
- **Position tracking:** Span interface prevents offset drift ✅
- **Type ergonomics:** Discriminated unions enable pattern matching ✅
- **Documentation:** ARCHITECTURE.md guides Phase 2-4 implementation (151 lines) ✅
- **Minimalism:** Started with 3 citation types (not over-engineered) ✅

## Links

**Commits:**
- e469443: Create Span interface for position offset tracking
- c90f73d: Create discriminated union Citation types
- 3e49fa0: Create project structure and public API

**Files:**
- `/Users/medelman/GitHub/medelman17/eyecitets/src/types/span.ts` - Position tracking types
- `/Users/medelman/GitHub/medelman17/eyecitets/src/types/citation.ts` - Citation discriminated unions
- `/Users/medelman/GitHub/medelman17/eyecitets/src/index.ts` - Public API entry point
- `/Users/medelman/GitHub/medelman17/eyecitets/ARCHITECTURE.md` - Implementation guide

**Related Plans:**
- 01-01: Package configuration (provides tsconfig strict mode)
- 01-02: Build tooling (next to complete Phase 1)
- Phase 2: Parser implementation (uses these types)
