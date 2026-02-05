# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2025-02-04)

**Core value:** Developers can extract, resolve, and annotate legal citations from text without Python infrastructure
**Current focus:** Phase 2 complete — ready for Phase 3

## Current Position

Phase: 3 of 4 (Reporter Database & Annotation)
Plan: 3 of 3 complete
Status: Phase complete
Last activity: 2026-02-05 — Completed 03-03-PLAN.md (citation validation with confidence scoring)

Progress: [███████░░░] 73%

## Phase 1 Plans (Complete)

| Plan | Wave | Description | Status |
|------|------|-------------|--------|
| 01-01 | 1 | Package.json, tsconfig.json, .gitignore | Complete ✅ |
| 01-03 | 2 | Type system (Span, Citation), src/index.ts, ARCHITECTURE.md | Complete ✅ |
| 01-02 | 3 | Build tooling (tsdown, Biome, Vitest configs) | Complete ✅ |

## Phase 2 Plans (Complete ✅)

| Plan | Wave | Description | Status |
|------|------|-------------|--------|
| 02-01 | 1 | Text cleaners (HTML stripping, Unicode normalization, whitespace) | Complete ✅ |
| 02-02 | 1 | Citation regex patterns (case, statute, journal, neutral) with ReDoS protection | Complete ✅ |
| 02-03 | 2 | Tokenizer (pattern matching, candidate extraction) | Complete ✅ |
| 02-04 | 2 | Extended citation types (journal, neutral, public law, federal register) with metadata | Complete ✅ |
| 02-05 | 3 | Citation extraction and metadata parsing | Complete ✅ |
| 02-06 | 3 | Main extraction pipeline with integration tests | Complete ✅ |

## Phase 3 Plans (Complete ✅)

| Plan | Wave | Description | Status |
|------|------|-------------|--------|
| 03-01 | 1 | Reporter database loading and lookup | Complete ✅ |
| 03-02 | 1 | Citation annotation API with dual-mode support | Complete ✅ |
| 03-03 | 2 | Citation validation with confidence scoring | Complete ✅ |

## Performance Metrics

**Velocity:**
- Total plans completed: 11
- Average duration: 158s
- Total execution time: 0.48 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 1 | 3/3 | 4 min | 80s |
| Phase 2 | 6/6 | 23.3 min | 233s |
| Phase 3 | 3/3 | 8.7 min | 175s |

**Recent Trend:**
- Last 5 plans: 02-05 (308s), 02-06 (296s), 03-01 (165s), 03-02 (164s), 03-03 (175s)
- Trend: Phase 3 plans averaging ~168s (consistent execution time)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Phase 1: TypeScript strict mode enforces type safety for complex parsing logic
- Phase 1: Zero runtime dependencies simplifies bundling and avoids supply chain risk
- Phase 1: reporters-db as data source ensures same data as Python eyecite
- Phase 1: ES2020 target enables modern regex features (lookbehind, named groups)

**From 01-01 execution:**

| ID | Decision | Impact |
|----|----------|--------|
| PKG-01 | Conditional exports with types-first ordering | All consumers get correct IntelliSense |
| PKG-02 | sideEffects: false for tree-shaking | Smaller bundles for downstream apps |
| PKG-03 | ES2020 target for modern regex | Can use lookbehind for "Id." vs "Idaho" disambiguation |
| PKG-04 | Zero runtime dependencies enforced | Package adds zero transitive dependencies |

**From 01-03 execution:**

| ID | Decision | Impact |
|----|----------|--------|
| TYPE-01 | Span interface with dual position tracking | Phase 2 text cleaning must build TransformationMap |
| TYPE-02 | Discriminated union Citation types | Switch statements on citation.type are compile-time safe |
| ARCH-01 | Three-layer position tracking architecture | Phase 2 implements clean → extract → translate pipeline |

**From 01-02 execution:**

| ID | Decision | Impact |
|----|----------|--------|
| BUILD-01 | Manual package.json exports (no tsdown auto-generation) | Preserves types-first ordering from plan 01-01 for correct IntelliSense |
| LINT-01 | Biome noExplicitAny as error (not warn) | Prevents any types from entering codebase (critical for DX-02 requirement) |
| TEST-01 | 10-second Vitest timeout | Enables Phase 2 ReDoS performance validation (<100ms per citation) |
| TEST-02 | Exclude src/types/** from coverage | Type definition files don't need test coverage |

**From 02-01 execution:**

| ID | Decision | Impact |
|----|----------|--------|
| CLEAN-01 | Simplified position tracking using lookahead algorithm (maxLookAhead=20) | Character-by-character diff handles multi-char deletions; conservative approach for MVP |
| CLEAN-02 | Default cleaners: stripHtmlTags, normalizeWhitespace, normalizeUnicode, fixSmartQuotes (not removeOcrArtifacts) | OCR artifacts less common; developers can opt-in when needed |
| CLEAN-03 | Conservative position mapping prioritizes correctness over performance | Phase 2 focus is correctness; Phase 3 can optimize if needed |

**From 02-02 execution:**

| ID | Decision | Impact |
|----|----------|--------|
| PATTERN-01 | Broad patterns for tokenization, validation in extraction layer | Tokenizer finds candidates quickly; extraction validates against reporters-db |
| PATTERN-02 | Simple regex structure without nested quantifiers | Prevents ReDoS - all patterns <100ms on pathological input (validated: 2ms) |
| PATTERN-03 | Individual named exports (casePatterns, statutePatterns, etc.) | Better tree-shaking, clearer API, modular imports |
| CONFIG-01 | Add path aliases (@/*) to tsconfig and vitest config | Clean imports in tests without relative paths |

**From 02-03 execution:**

| ID | Decision | Impact |
|----|----------|--------|
| TOKEN-01 | Synchronous tokenize() function | Enables both sync and async extraction APIs in Plan 6 |
| TOKEN-02 | Token includes only cleanStart/cleanEnd positions | TransformationMap (Plan 4) will map to original positions later |
| TOKEN-03 | Multiple pattern matches allowed | Extraction layer (Plan 5) must deduplicate and validate tokens |
| TOKEN-04 | Default patterns parameter concatenates all arrays | API is tokenize(text) for common case, tokenize(text, patterns) for control |

**From 02-05 execution:**

| ID | Decision | Impact |
|----|----------|--------|
| EXT-01 | Year extraction before court extraction in parentheticals | Both court and year correctly populated from combined parentheticals like "(9th Cir. 2020)" |
| EXT-02 | Greedy reporter regex with numbers | Multi-word reporters like "So. 2d" and "F.3d" correctly extracted instead of truncated |
| EXT-03 | Neutral citations have 1.0 confidence | Neutral format is unambiguous; always maximum confidence |
| EXT-04 | Journal citations have 0.6 base confidence | Validation against database happens in Phase 3; Phase 2 only validates structure |
| EXT-05 | Safe position translation fallback | cleanToOriginal.get(cleanPos) ?? cleanPos prevents errors with incomplete transformation maps |

**From 02-06 execution:**

| ID | Decision | Impact |
|----|----------|--------|
| PIPE-01 | Both sync and async API variants | Enables seamless transition when async operations added in Phase 3/4 |
| PIPE-02 | ProcessTimeMs tracked per citation | Performance monitoring for DX and optimization guidance |
| PIPE-03 | Warnings from cleaning layer attached to all citations | Preserves diagnostic context through pipeline layers |
| TEST-01 | Integration tests focus on MVP capabilities | Tests validate core metadata; parenthetical parsing deferred to Phase 3 pattern enhancements |

**From 03-01 execution:**

| ID | Decision | Impact |
|----|----------|--------|
| DATA-01 | Download reporters-db JSON directly from GitHub | No npm dependency; data vendored in project for reliability |
| DATA-02 | Use Map with lowercase-normalized keys for O(1) lookup | Fast lookups on 1235 reporters; case-insensitive matching |
| DATA-03 | Index both edition abbreviations and variant forms | All reporter variations (F.2d, F. 2d, Fed.2d, etc.) resolve correctly |
| DATA-04 | Lazy loading via dynamic import keeps reporters out of core bundle | Core bundle stays small; data loads only when needed |

**From 03-02 execution:**

| ID | Decision | Impact |
|----|----------|--------|
| ANN-01 | Auto-escape defaults to true for XSS protection | Prevents injection attacks by default; developers must explicitly opt-out (safer than opt-in) |
| ANN-02 | Process citations in reverse order | Avoids position shift invalidation when inserting markup |
| ANN-03 | Support both callback and template modes | Flexibility for simple cases (template) and complex logic (callback) |
| ANN-04 | Position map tracks original→new positions | Enables external systems to sync indices after annotation |

**From 03-03 execution:**

| ID | Decision | Impact |
|----|----------|--------|
| VAL-01 | Confidence boost/penalty values (+0.2/-0.3/-0.1) | Conservative adjustments that significantly impact scoring without saturating confidence values |
| VAL-02 | Degraded mode returns citations without errors | Library must work when database not loaded (browser, edge cases) |
| VAL-03 | Validation only applies to case citations | Other citation types (statute, journal, etc.) don't have reporters to validate |
| VAL-04 | Type intersection for ValidatedCitation | Allows citations to carry optional reporter metadata without breaking existing types |

### Pending Todos

None yet.

### Blockers/Concerns

**From Research (SUMMARY.md):**
- Phase 1: Regex pattern audit needed — inventory all Python eyecite patterns, flag ES incompatibilities
- Phase 1: Bundle strategy decision required — inline vs. tree-shake vs. CDN for reporters (affects architecture)
- Phase 2: ReDoS testing infrastructure — integrate analyzer, establish baseline (<100ms per citation) ✅ Done (02-02)
- Phase 3: Reporter database optimization — measure tree-shaking vs. compression trade-offs with actual bundle
- Phase 3: Position accuracy validation — requires access to diverse legal document corpus with HTML/Unicode

**From 02-06 execution:**
- Parenthetical extraction (court, year) requires enhanced patterns with ReDoS protection — Phase 3 should add optional parenthetical matching
- Duplicate citation filtering (overlapping pattern matches) deferred to Phase 3 annotation layer
- Unicode position accuracy edge cases (emoji, combining characters, RTL) need validation corpus in Phase 3

## Session Continuity

Last session: 2026-02-05 (03-03 execution)
Stopped at: Completed 03-03-PLAN.md - Citation validation with confidence scoring (Phase 3: Complete)
Resume file: None
