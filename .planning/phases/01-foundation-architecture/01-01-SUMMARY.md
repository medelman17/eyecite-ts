---
phase: 01-foundation-architecture
plan: 01
subsystem: build-tooling
status: complete
completed: 2026-02-05

requires:
  - none (first plan)

provides:
  - package.json with conditional exports
  - tsconfig.json with strict mode
  - .gitignore for build artifacts

affects:
  - 01-02 (build tooling reads package.json scripts)
  - 01-03 (type system uses strict TypeScript config)

tech-stack:
  added:
    - typescript: "^5.9.0"
    - tsdown: "^0.20.0"
    - vitest: "^4.0.0"
    - "@vitest/coverage-v8": "^4.0.0"
    - "@biomejs/biome": "^2.3.0"
    - size-limit: "^11.1.6"
  patterns:
    - "Zero runtime dependencies"
    - "Conditional exports with types-first ordering"
    - "ESM-first with dual CJS support"

key-files:
  created:
    - package.json
    - tsconfig.json
    - .gitignore
  modified: []

decisions:
  - id: PKG-01
    what: Conditional exports with types-first ordering
    why: Ensures TypeScript consumers get correct type definitions (prevents Pitfall #4)
    impact: All package consumers will have proper TypeScript IntelliSense

  - id: PKG-02
    what: sideEffects false for tree-shaking
    why: Enables bundlers to eliminate unused reporter database entries (Pitfall #2)
    impact: Downstream applications can achieve smaller bundles

  - id: PKG-03
    what: ES2020 target
    why: Enables modern regex features (lookbehind, named groups) needed for citation patterns
    impact: Citation extraction regex will use lookbehind for "Id." and "v." matching

metrics:
  duration: 1min
  tasks-completed: 3/3
  commits: 3
  files-created: 3
  files-modified: 0

tags: [package-config, typescript, build-foundation, zero-deps]
---

# Phase 01 Plan 01: Package Configuration Summary

**One-liner:** Zero-dependency package with ESM-first conditional exports, TypeScript strict mode, and ES2020 target for modern regex.

## What Was Built

Created the foundational package configuration that enforces:
- **Zero runtime dependencies** (PERF-03) - Only 6 devDependencies for build/test tooling
- **TypeScript strict mode** (DX-01, DX-02) - Prevents `any` types and ensures type safety
- **ES2020 target** (PLAT-01-05) - Enables modern regex features for citation extraction
- **Conditional exports** - Types-first ordering ensures correct TypeScript resolution

### Files Created

1. **package.json** (63 lines)
   - Conditional exports with `.` and `./data` entry points
   - Types-first ordering in exports field (Pitfall #4 prevention)
   - `sideEffects: false` for tree-shaking (Pitfall #2 prevention)
   - Size-limit configuration enforcing <50KB bundle
   - Zero runtime dependencies verified

2. **tsconfig.json** (19 lines)
   - `strict: true` enforces type safety
   - `isolatedDeclarations: true` for fast .d.ts generation via oxc
   - `target: ES2020` enables lookbehind assertions for regex patterns
   - `moduleResolution: "bundler"` matches tsdown workflow
   - `lib: ["ES2020", "DOM"]` for Node.js and browser support

3. **.gitignore** (24 lines)
   - Standard Node.js patterns (node_modules, dist, coverage)
   - Editor and OS ignore patterns

## Decisions Made

| ID | Decision | Rationale | Impact |
|----|----------|-----------|--------|
| PKG-01 | Conditional exports with types-first ordering | TypeScript consumers need types before import/require resolution (Pitfall #4) | All consumers get correct IntelliSense |
| PKG-02 | `sideEffects: false` | Enables tree-shaking of unused reporter database entries (Pitfall #2) | Smaller bundles for downstream apps |
| PKG-03 | ES2020 target | Required for modern regex (lookbehind, named groups) in citation patterns (PLAT-01-05) | Can use lookbehind for "Id." vs "Idaho" disambiguation |
| PKG-04 | Zero runtime dependencies | Simplifies bundling, reduces supply chain risk (PERF-03) | Package adds zero transitive dependencies |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for Plan 01-03 (Type System):**
- TypeScript strict mode configured
- Source directory structure defined (rootDir: "src")
- Type declarations enabled

**Ready for Plan 01-02 (Build Tooling):**
- Package scripts defined (build, test, typecheck, lint, format, size)
- DevDependencies installed (tsdown, vitest, biome)
- Size-limit configuration in place

**Blockers:** None

**Concerns:**
- Bundle strategy for reporters-db not yet decided (inline vs tree-shake vs CDN)
- This is deferred to Phase 3 as noted in PROJECT.md

## Verification Results

All verification checks passed:
1. ✅ 6 devDependencies in package.json
2. ✅ Zero runtime dependencies (null)
3. ✅ `sideEffects: false` for tree-shaking
4. ✅ TypeScript strict mode enabled
5. ✅ ES2020 target configured
6. ✅ .gitignore exists

## Technical Notes

**Conditional Exports Pattern:**
The exports field uses types-first ordering:
```json
{
  "types": "./dist/index.d.ts",
  "import": "./dist/index.mjs",
  "require": "./dist/index.cjs"
}
```

This ordering is critical - TypeScript checks "types" condition before Node.js resolves "import"/"require". Wrong ordering causes type resolution failures (Pitfall #4).

**ES2020 Regex Capabilities:**
- Lookbehind assertions: `(?<=pattern)` for "Id." vs "Idaho"
- Named groups: `(?<name>pattern)` for citation components
- Unicode property escapes: `\p{L}` for legal name matching

These features are essential for accurate citation extraction and are guaranteed available in Node.js 18+ and modern browsers.

**Size-Limit Enforcement:**
The size-limit configuration (50KB) acts as a regression test. If bundle size exceeds limit, CI will fail. This prevents accidental dependency additions or code bloat.

## Performance Impact

**Bundle Size:** Target <50KB enforced by size-limit
**Tree-shaking:** Enabled via `sideEffects: false`
**Type Generation:** Fast via isolatedDeclarations + oxc in tsdown

## What's Next

**Immediate (Wave 2):** Plan 01-03 - Type System
- Define Span, Citation, CitationBase types
- Create src/index.ts with public API exports
- Document architecture in ARCHITECTURE.md

**Then (Wave 3):** Plan 01-02 - Build Tooling
- Configure tsdown for dual ESM/CJS output
- Set up Biome for linting/formatting
- Configure Vitest with coverage
