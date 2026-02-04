# Project Research Summary: eyecite-ts

**Project:** eyecite-ts — TypeScript legal citation extraction library
**Domain:** Legal technology / text parsing library
**Researched:** 2026-02-04
**Confidence:** HIGH

---

## Executive Summary

eyecite-ts is a TypeScript port of the proven Python eyecite library, targeting sub-50KB browser distribution while maintaining citation accuracy at 99.9977%. The research converges on a modern 2026 stack (tsdown + Vitest + Biome) that aligns with Rust-first ecosystem trends and enables zero-dependency browser shipping. The core competitive advantage is not the feature set — feature parity with Python eyecite is table stakes — but the delivery format: a single npm package that extracts citations in-browser without a Python backend, server dependency, or external API calls.

The recommended approach is a layered pipeline architecture (clean → tokenize → extract → resolve → annotate) that separates concerns, enables tree-shaking, and isolates state management. This architecture allows incremental feature delivery: core parsing ships in Phase 2, reporter database optimization in Phase 3, and advanced features (streaming, international support) defer to v1.1+.

The dominant risk is **position offset drift during text transformation**, a subtle but critical pitfall that invalidates citation positions if text cleaning isn't tracked perfectly. Secondary risks include **catastrophic regex backtracking** (ReDoS) on malformed citations and **reporter database bloat** consuming the 50KB bundle budget. Both are addressable through upfront architectural decisions in Phase 1 (offset tracking design, bundle strategy) and Phase 2 validation (ReDoS testing, bundle size CI/CD).

---

## Key Findings

### Recommended Stack

The 2026 TypeScript library stack has consolidated around Rust-based tooling and ESM-first philosophy. For eyecite-ts:

**Core technologies:**
- **TypeScript 5.9** — Type system and transpilation. Strict mode enforced for type safety; 5.9 adds compiler optimizations for fast iteration.
- **tsdown 0.20** — Bundle and publish. Powered by Rolldown (Rust); replaces unmaintained tsup; native tree-shaking, declaration generation via oxc, ESM-first output with optional CJS fallback.
- **Vitest 4.0** — Testing framework. 10-20x faster than Jest; native ESM/TypeScript; reuses Vite infrastructure; optimal for library testing with low setup friction.
- **Biome 2.3** — Unified linter + formatter. Replaces ESLint + Prettier (127+ packages); 10-25x faster; type-aware linting via TypeScript integration.
- **Node.js 18+ (recommend 22 LTS)** — Runtime target. Note: Node 18 EOL April 2025; users should upgrade to 22 LTS (EOL April 2027).

**Supporting tools:**
- **size-limit** for bundle size enforcement (<50KB gzipped via CI/CD)
- **@vitest/coverage-v8** for test coverage tracking
- **TypeDoc** for optional API documentation generation

**Export strategy:** Conditional exports with `types` condition first for TypeScript consumer resolution; ESM primary, CJS as fallback.

**Bundle constraint:** <50KB gzipped is achievable via tsdown minification + tree-shaking. Minimal citation logic is ~8-15KB; reporter database is the dominant variable (10-30KB depending on scope). See Pitfall #3 for database strategy.

See **[STACK.md](/Users/medelman/GitHub/medelman17/eyecitets/.planning/research/STACK.md)** for detailed configuration, alternatives, and version compatibility notes.

### Expected Features

Feature set is driven by feature parity with Python eyecite (table stakes) plus browser-native delivery (differentiator). The MVP achieves parity; advanced features phase in post-validation.

**Must have (v1.0 — table stakes for feature parity):**
- Full case citation extraction (primary format: "Bush v. Gore, 531 U.S. 98, 99-100 (2000)")
- Statutory citation extraction (state/federal codes: "Mass. Gen. Laws ch. 1, § 2")
- Law journal citation recognition ("1 Minn. L. Rev. 1")
- Short-form citation detection (pattern matching against full citations)
- Id. citation resolution (link "Id., at 101" to immediately preceding citation)
- Text annotation (insert markup at citation positions)
- Text cleaning (remove HTML, normalize whitespace, handle OCR artifacts)
- Zero runtime dependencies (no npm imports in bundle; databases are static data)
- Browser + Node.js dual support

**Should have (v1.1-v1.5 — complete feature set after validation):**
- Supra citation resolution ("Bush, supra, at 100" → earlier full citation)
- Streaming extraction (large documents without memory bloat)
- Enhanced HTML annotation (configurable markup for downstream viewers)
- Citation linking utilities (generate links to CourtListener, Google Scholar)

**Defer (v2+):**
- Supra resolution (complex, not critical for MVP)
- International citations (UK, CA, AU — separate modular packages)
- Citation sentiment/authority analysis (out of domain)
- Live API validation (conflicts with zero-dependency constraint)
- Advanced text cleaning / PDF+DOCX parsing (requires heavy dependencies)

**Anti-features (explicitly NOT building):**
- Machine learning detection (hallucination risk in legal domain; regex+database is proven)
- Citation validation against live legal databases (breaks zero-dependency constraint)

**Feature dependencies:**
- Citation extraction → reporter database (static JSON, tree-shakeable)
- Text annotation → text cleaning → position offset mapping (critical for accuracy)
- Short-form resolution → citation context tracking (stateful, document-scoped)

**Validation criteria for MVP:** Achieve 99.99% parity with Python eyecite on 100K+ test citations; drop into JavaScript legal tech projects without backend dependency.

See **[FEATURES.md](/Users/medelman/GitHub/medelman17/eyecitets/.planning/research/FEATURES.md)** for detailed feature matrix, prioritization, and competitor analysis.

### Architecture Approach

The recommended architecture is a four-layer **pipeline** (clean → tokenize → extract → resolve → annotate) that treats text as an immutable input stream flowing through progressively enriched stages. This pattern is proven in spaCy (NLP), Beautiful Soup (HTML parsing), and eyecite's own Python implementation.

**Major components:**

1. **Cleaners** (optional preprocessing) — Remove OCR noise, normalize whitespace, fix Unicode. Composable, user-selectable pipeline.

2. **Tokenizers** (pattern matching) — Apply regex patterns to produce tokens with span information. Strategy pattern enables swapping high-perf tokenizer (Hyperscan-equivalent) without API change.

3. **Extractors** (citation factory) — Convert tokens to citation objects with metadata. Route by type (FullCase, Short, Id, Supra, Law, Journal). Validate against reporter database.

4. **Resolvers** (context linking) — Link short-form citations (supra, id) to antecedents. Maintains document-scoped citation history (NOT global state).

5. **Annotators** (output markup) — Insert markup at citation positions. Reconciles cleaned positions back to original via diff algorithm.

6. **Data** (tree-shakeable) — Reporter, court, law, journal databases as JSON imports. Separate from logic for modularity.

**Key patterns:**
- **Tokenizer strategy:** Users choose regex vs. high-perf; both implement same interface.
- **Composable cleaners:** Pipeline of optional, user-selectable functions; order matters.
- **Discriminated union citations:** `type: CitationType` enum for type-safe pattern matching (no `instanceof`).
- **Span-aware annotation:** Tracks original positions during text transformation; survives cleaning.
- **Immutable transformations:** Every layer returns new string; no mutation; enables span tracking.
- **Tree-shakeable exports:** One file per extractor; named exports only; package.json `"sideEffects": false`.

**Build order:** types/models → data → clean → tokenize → extract → resolve → annotate → index.ts. Enables parallel work, testability at each layer.

**Scaling:** At 0-1K users, monolithic is fine. At 100K+ users, profiling shows regex tokenization and reporter DB lookups are bottlenecks; mitigate with pre-indexed database or LRU caching. Annotation span diffing becomes slow on massive texts; consider streaming output.

See **[ARCHITECTURE.md](/Users/medelman/GitHub/medelman17/eyecitets/.planning/research/ARCHITECTURE.md)** for detailed component structure, data flow, anti-patterns, and integration boundaries.

### Critical Pitfalls

The research identifies five critical pitfalls with clear prevention strategies. Each is mapped to a roadmap phase for targeted mitigation.

**1. Catastrophic regex backtracking (ReDoS) — Can freeze parser on malformed citations**
- **Risk:** Complex citation patterns can enter exponential time complexity. Missing closing parenthetical or special characters cause 100% CPU hang, freezing browser or blocking Node.js thread.
- **Prevention:** (1) Test all regex with ReDoS analyzer before deployment (regex101.com warns on backtracking); (2) Set 100ms timeout on single regex match (fail fast); (3) Use atomic grouping for supported features; (4) Break complex patterns into sequential checks.
- **Phase:** Phase 2 (Core Parsing) — include ReDoS profiling in test suite; Phase 3 (Reporter DB) — re-validate all 1200+ reporter patterns.
- **Acceptance:** No citation parses >100ms on modern hardware.

**2. Position offset drift after text cleaning — Citations point to wrong text**
- **Risk:** Text cleaning (remove HTML, normalize quotes, handle OCR artifacts) shifts positions. If transformation offset tracking is imperfect, returned positions are off by 10-100 characters, breaking annotation.
- **Prevention:** (1) Design offset tracking architecture upfront (Phase 1); (2) Build transformation offset map for every change; (3) Test position mapping on 10+ real documents with HTML/Unicode; (4) Do NOT assume 1:1 character mapping.
- **Phase:** Phase 1 (Foundation) — establish position tracking design; Phase 4 (Integration) — validate against 100+ real documents.
- **Acceptance:** 100% position accuracy on random citation sample from real legal documents.

**3. Reporter database bloat — Entire 1200-reporter database in bundle**
- **Risk:** Full reporters-db is 200-400KB uncompressed (50-100KB gzip). At <50KB total budget, database alone consumes entire allowance.
- **Prevention:** (1) Decide bundle strategy early (Phase 1): inline vs. CDN vs. tree-shake vs. binary compression; (2) Implement tree-shaking from day one (separate exports, no giant default export); (3) Measure bundle size in CI/CD; (4) Consider "lite" mode with Federal + top 5 state reporters (~10% size); (5) Compress with binary format (Protobuf, MessagePack) instead of JSON.
- **Phase:** Phase 1 (Foundation) — strategy decision; Phase 2 (Core Parsing) — implement with size checks; Phase 3 (Reporter DB) — optimize if needed.
- **Acceptance:** Bundle size <50KB gzipped, parser ready in <100ms.

**4. JavaScript regex incompatibility — Python patterns fail silently in some JS environments**
- **Risk:** Python eyecite uses lookbehind, named groups, atomic groups. JavaScript doesn't support all of these pre-ES2018. Patterns work in modern Chrome but fail in Node 14 or older browsers, causing silent extraction failures.
- **Prevention:** (1) Document target ES version upfront (Phase 1); (2) Audit all regex patterns against JS support; (3) For lookbehind, use capture groups instead; (4) Convert named groups syntax (Python `(?P<name>)` → JS `(?<name>)`); (5) Test patterns on minimum target version.
- **Phase:** Phase 1 (Foundation) — audit and set target; Phase 2 (Core Parsing) — convert and validate.
- **Acceptance:** All patterns pass linter for target ES version; no silent failures on supported runtimes.

**5. Short-form resolution state management — "Id." fails or leaks state across documents**
- **Risk:** Short-form resolution (id., supra) requires tracking preceding citation. Naive implementation either forgets state (all id. fail to resolve) or uses global state (breaks parallel parsing, causes race conditions).
- **Prevention:** (1) Design stateful resolver at document level (Phase 1); (2) Scope state to document instance, not global; (3) Make resolution explicit (separate `resolve()` method, not automatic); (4) Provide clear() method to reset state between documents; (5) Test parallel parsing to ensure no state leakage.
- **Phase:** Phase 1 (Foundation) — design; Phase 3 (Short-Form Resolution) — implement with parallel safety.
- **Acceptance:** All short-form citations resolve correctly; zero state leakage in parallel parsing tests.

See **[PITFALLS.md](/Users/medelman/GitHub/medelman17/eyecitets/.planning/research/PITFALLS.md)** for performance traps, integration gotchas, security mistakes, and recovery strategies.

---

## Implications for Roadmap

Based on research findings, suggested phase structure with explicit rationale and pitfall avoidance:

### Phase 1: Foundation & Architecture
**Rationale:** Establish architectural contracts, design decisions, and safety guardrails before coding. Pitfalls #2, #4, #5 are prevented through upfront design; Pitfall #3 requires early strategy decision.

**Delivers:**
- Project scaffolding (tsdown config, Vitest setup, Biome config)
- TypeScript configuration (strict mode, isolation flags, target ES version documented)
- Offset tracking architecture (design for position mapping; don't implement yet)
- Resolver state design (document-scoped resolver interface, clear/reset mechanism)
- Bundle strategy decision (inline vs. tree-shake vs. CDN for reporters)
- Regex audit (inventory all patterns from Python eyecite, flag ES incompatibilities)

**Addresses features from FEATURES.md:**
- Zero dependencies design (confirm no runtime imports needed)
- Browser + Node dual support (establish compatibility strategy)

**Avoids pitfalls:**
- #2 Position drift: Design offset map architecture
- #3 Bundle bloat: Decide database strategy
- #4 Regex incompatibility: Set target ES version, audit patterns
- #5 State leak: Design resolver scope

**Research flags:**
- Regex pattern audit from Python eyecite (detailed inventory needed; straightforward once started)
- Bundle size measurement tooling (standard; no special research needed)

### Phase 2: Core Parsing (Extract + Tokenize)
**Rationale:** Implement core extraction logic once architecture is locked in. Pitfall #1 prevention happens here (ReDoS testing). This phase delivers value: a working parser without reporter database. Can be validated against test suite.

**Delivers:**
- Tokenizer framework (default regex-based; can swap strategies later)
- Citation extractor (routes tokens to type-specific extractors)
- FullCase, ShortCase, Journal, Law extractors (basic implementations)
- Regex pattern conversions (Python → JavaScript with ES target in mind)
- Test suite with ReDoS profiling (all patterns tested <100ms per citation)
- Bundle size CI/CD check (enforce <50KB)

**Implements from ARCHITECTURE.md:**
- Tokenization layer (regex strategy pattern)
- Extraction layer (discriminated union citation types)
- Type/model definitions (full type hierarchy)

**Avoids pitfalls:**
- #1 ReDoS: Include regex timeout + ReDoS analyzer in test pipeline
- #3 Bundle bloat: Measure base parser without reporters (should be <20KB)

**Research flags:**
- ReDoS testing infrastructure (need to set up ReDoS analyzer integration; well-documented)
- Regex performance baseline (standard benchmarking; establish expected max time per citation)

### Phase 3: Reporter Database & Optimization
**Rationale:** Add the reporter database (the heavy lifting for bundle size). Test and optimize bundle size, position accuracy. Pitfall #3 gets addressed here (optimize database, ensure tree-shaking works).

**Delivers:**
- Reporter database import (from reporters-db npm or vendored)
- Tree-shakeable database exports (one file per reporter type; named exports)
- Bundle size optimization (compression, lazy-loading, tree-shaking validation)
- Position offset validation (test on real legal documents with HTML/Unicode)
- Short-form extraction (Id., Supra pattern detection; no resolution yet)
- Bundle size measurement (update CI/CD to track gzipped size)

**Implements from ARCHITECTURE.md:**
- Data layer (reporters, courts, laws, journals as tree-shakeable exports)
- Annotation layer (span-aware annotation with diff algorithm)

**Avoids pitfalls:**
- #1 ReDoS: Re-test all 1200+ reporter patterns against ReDoS analyzer
- #2 Position drift: Validate position mapping on 100+ real documents
- #3 Bundle bloat: Measure and optimize before shipping (binary compression, lazy-load, tree-shake)

**Research flags:**
- Reporter database optimization strategies (tree-shaking vs. binary compression vs. splitting — trade-off analysis needed; evaluate based on bundle measurements)
- Position accuracy testing on real legal documents (requires access to real corpus; eyecite has test suite; can reuse)

### Phase 4: Integration & Cleanup
**Rationale:** Resolve all short-form citations, add advanced features, polish. Final validation of all pitfalls before 1.0 release.

**Delivers:**
- Resolver implementation (CitationResolver with document-scoped state, clear() method)
- Short-form resolution (Supra + Id. linking to antecedents)
- Comprehensive test suite (all features, edge cases, performance, parallel parsing)
- Documentation (README with state requirements, position accuracy caveats, environment compatibility)
- CI/CD pipeline (all checks: tests, bundle size, ReDoS profiling, coverage)

**Implements from ARCHITECTURE.md:**
- Resolve layer (Supra/Id resolvers with context tracking)
- Index.ts public API (all layer exports)

**Avoids pitfalls:**
- #5 State leak: Parallel parsing tests confirm no state leakage
- #2 Position drift: Final validation on diverse documents

**Research flags:**
- None (all previous phases completed research)

### Phase 5: Performance & Future (v1.1+)
**Rationale:** Post-1.0 enhancements: streaming, advanced features, ecosystem expansion.

**Defers to v1.1+:**
- Streaming extraction (chunked processing for large documents)
- Web Worker integration (background parsing)
- Enhanced HTML annotation (configurable markup templates)
- Citation linking utilities (optional integration with CourtListener, Google Scholar)
- International citation packages (separate modules for CA, UK, AU)

---

### Phase Ordering Rationale

1. **Phase 1 first:** Architecture and design decisions prevent costly rework. Offset tracking design, resolver scope, bundle strategy, and regex audit are foundational; cannot be deferred.

2. **Phase 2 before Phase 3:** Core parser works without reporter database. Separates concerns: parser logic vs. data volume. Allows validation of core extraction before database optimization.

3. **Phase 3 before Phase 4:** Bundle size and position accuracy are hard constraints. Phase 3 resolves these before Phase 4 integration. Solves Pitfall #3 and #2 at scale.

4. **Phase 4 completes MVP:** All features, state management, and testing. Delivers 1.0 with 99.99% parity to Python eyecite.

5. **Phase 5 is post-validation:** Only after 1.0 ships and users validate product-market fit.

---

### Research Flags

**Phases needing deeper research during planning:**

- **Phase 2 (Core Parsing):** ReDoS testing infrastructure. How to integrate ReDoS analyzer into test pipeline? What's the performance baseline? This is straightforward (regex101.com, OWASP resources are detailed) but needs hands-on validation.

- **Phase 3 (Reporter Database):** Tree-shaking vs. compression trade-off. How much size reduction from tree-shaking alone? How much from binary compression? Need to measure with actual bundle tooling (tsdown + esbuild). Secondary: lazy-loading strategy if database remains large.

**Phases with standard patterns (skip deep research):**

- **Phase 1 (Foundation):** Scaffolding, TypeScript config, architecture design. These are established best practices. No special research needed.

- **Phase 4 (Integration):** State management, resolver design, testing. Well-documented patterns from eyecite Python implementation. No special research needed.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | HIGH | Verified with official tsdown, Vitest, Biome docs. 2026 ecosystem trends align. Version compatibility confirmed. |
| **Features** | HIGH | Direct mapping from Python eyecite docs + FEATURES.md research. Table stakes clear. Competitive differentiation validated. |
| **Architecture** | HIGH | Based on eyecite Python implementation (authoritative), plus standard NLP pipeline patterns (spaCy, NLTK). Four-layer pipeline is proven. |
| **Pitfalls** | MEDIUM-HIGH | Critical pitfalls are based on eyecite whitepaper + Python implementation details + general text parsing patterns. Some prevention strategies (ReDoS testing, position tracking) are inferred from best practices; not all verified on JavaScript port yet. |

**Overall confidence: HIGH**

The research has converged on specific, actionable recommendations. Stack is based on official documentation. Features and architecture derive from eyecite's proven design. The main gap is **Phase 2 validation**: once core parsing is implemented, ReDoS testing must be hands-on (cannot be fully researched beforehand). Position accuracy testing in Phase 3 also requires actual implementation + real document corpus.

### Gaps to Address

1. **ReDoS testing baseline:** Need hands-on profiling with actual regex patterns from Python eyecite. Research has identified prevention strategies, but real performance baselines only emerge during Phase 2 implementation.

2. **Reporter database optimization:** Bundle size trade-offs (tree-shaking vs. compression vs. lazy-loading) require measurement with actual tsdown build. Decision framework from research is clear, but specific numbers need Phase 3 validation.

3. **Position accuracy on edge cases:** Validation is straightforward (test on real legal documents with HTML entities, Unicode, OCR artifacts) but requires access to diverse test corpus. Eyecite's test suite likely has this; may need licensing/permission.

4. **JavaScript regex feature parity:** Audit identified in Phase 1 is straightforward but requires detailed comparison of each Python pattern. Not a research gap (patterns are in eyecite source), but a task requiring hands-on inventory.

---

## Sources

### Primary Sources (HIGH confidence)

- **[eyecite Official Project](https://free.law/projects/eyecite)** — Feature set, accuracy claims, architectural philosophy
- **[eyecite GitHub Repository](https://github.com/freelawproject/eyecite)** — Source code reference for architecture and patterns
- **[eyecite Whitepaper](https://free.law/pdf/eyecite-whitepaper.pdf)** — Technical architecture, performance design, database approach (HIGH)
- **[TypeScript 5.9 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html)** — Latest features, compiler optimizations
- **[tsdown Official Docs](https://tsdown.dev/guide/)** — Configuration, declaration generation, tree-shaking (HIGH)
- **[Vitest Official Docs](https://vitest.dev/)** — Testing framework, coverage, environment setup (HIGH)
- **[Biome Official Docs](https://biomejs.dev/)** — Linting, formatting, TypeScript integration (HIGH)
- **[Node.js Release Schedule](https://nodejs.org/en/about/previous-releases)** — EOL dates, LTS versions (HIGH)

### Secondary Sources (MEDIUM confidence)

- **[TypeScript Library Structures Guide](https://www.typescriptlang.org/docs/handbook/declaration-files/library-structures.html)** — Export strategies, .d.ts generation
- **[Package.json Exports Field Guide](https://hirok.io/posts/package-json-exports)** — Conditional exports, TypeScript resolution
- **[size-limit Tool Documentation](https://www.npmjs.com/package/size-limit)** — Bundle size enforcement strategies
- **[ReDoS Analysis Tools and Patterns](https://www.regular-expressions.info/catastrophic.html)** — Prevention strategies, testing approaches
- **[Tree-Shaking Guide](https://softwaremill.com/a-novel-technique-for-creating-ergonomic-and-tree-shakable-typescript-libraries/)** — Module design for tree-shaking
- **[spaCy Processing Pipelines](https://spacy.io/usage/processing-pipelines)** — Standard NLP architecture patterns

### Tertiary Sources (LOWER confidence, context-building)

- **[JavaScript Regex Feature Support (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/)** — ES version compatibility (needs Phase 1 audit against Python patterns)
- **[Legal Tech Trends 2026 (Rev)](https://www.rev.com/blog/legal-technology-trends)** — Market context (not core research)
- **[Citation.js Library](https://github.com/unitedstates/citation)** — Comparison reference for feature prioritization

---

*Research completed: 2026-02-04*
*Status: All four research files synthesized*
*Ready for roadmap creation: YES*
