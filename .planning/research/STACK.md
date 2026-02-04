# Technology Stack Research

**Project:** eyecite-ts — TypeScript legal citation extraction library
**Domain:** TypeScript library for Node.js and browsers, zero runtime dependencies
**Researched:** 2026-02-04
**Confidence:** HIGH

## Executive Summary

The 2026 TypeScript library stack has converged around a lean, modern toolchain powered by Rust-based tools (Rolldown, Oxc) with strong ESM-first philosophy. For eyecite-ts specifically, the stack prioritizes:

1. **Bundler**: tsdown (0.20.1) over deprecated tsup — handles declaration files, tree-shaking, and <50KB targeting with zero config
2. **Testing**: Vitest 4.0.17 — 10-20x faster than Jest, native ESM/TypeScript, perfect for library testing
3. **Type checking**: TypeScript 5.9+ in strict mode with tsc — out-of-box `.d.ts` generation via tsdown
4. **Linting**: Biome 2.3+ — unified linter/formatter replacing ESLint+Prettier, 10-25x faster
5. **Runtime target**: Node.js 18+ (noting: 18 EOL in April 2025, users should upgrade to 22 LTS)
6. **Exports strategy**: Conditional exports with `types` condition first for TypeScript consumer resolution

**Key constraint implications:**
- <50KB gzipped is achievable with esbuild minification + tree-shaking (bundlers reduce 30-50% via minification alone)
- Zero runtime dependencies means no transitive bloat — feasible with careful regex/string parsing
- Browser + Node.js dual support requires ESM primary output with optional CJS fallback via conditional exports
- Tree-shakeable exports require explicit `package.json` exports field with entry points

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **TypeScript** | 5.9.x | Type system and transpilation | Standard choice for TS libraries; 5.9 adds compiler optimizations; strict mode enforced for type safety |
| **tsdown** | 0.20.1 | Bundler for library publishing | Actively maintained replacement for unmaintained tsup; powered by Rolldown (Rust); fast .d.ts generation via oxc; ESM-first; handles tree-shaking natively |
| **Vitest** | 4.0.17 | Unit testing framework | Jest-compatible but 10-20x faster on large suites; native ESM/TypeScript; reuses Vite's infrastructure; optimal for library testing |
| **Biome** | 2.3.x | Linter + formatter | Unified toolchain (replaces ESLint + Prettier); 10-25x faster; type-aware linting via TypeScript integration; single config file |
| **Node.js** | 18+, recommend 22 LTS | Runtime for development and consumers | Project specifies 18+ as target; note: Node 18 EOL April 2025, users should upgrade to 22 (LTS until April 2027) |

### Development Tools

| Tool | Purpose | Configuration Notes |
|------|---------|---------------------|
| **tsc** (TypeScript compiler) | Type checking + declaration generation | Use `declaration: true`, `strict: true`, `isolatedDeclarations: true` (enables fast .d.ts with oxc) |
| **tsdown** CLI | Bundling and build orchestration | Zero-config defaults work for most libraries; minimal tsdown.config.ts needed |
| **Vitest CLI** | Running tests in watch/CI mode | Works with Vitest config or tsconfig.json; built-in coverage via @vitest/coverage-v8 |
| **Biome CLI** | Linting and formatting | Single biome.json replaces .eslintrc, .prettierrc, and config duplication |

### Supporting Libraries (Dev Dependencies Only)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **@vitest/ui** | 4.0.x | Visual test runner | Optional; useful during development for test insights |
| **@vitest/coverage-v8** | 4.0.x | Code coverage reporting | Recommended for library CI/CD to track test coverage |
| **TypeDoc** | Latest | API documentation generation | Optional; generates HTML/JSON docs from JSDoc comments for library consumers |
| **size-limit** | Latest | Bundle size budget enforcement | Recommended for CI; enforces <50KB constraint per commit |

---

## Installation

```bash
# Core dependencies
npm install

# Dev dependencies — core tooling
npm install -D typescript@5.9 tsdown@0.20 vitest@4.0 biome@2.3

# Dev dependencies — optional but recommended
npm install -D @vitest/coverage-v8 size-limit typedoc

# Package manager note: pnpm or Yarn recommended over npm for lock file integrity
```

### Minimal Project Setup

```json
{
  "name": "eyecite-ts",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.js",
    "require": "./dist/index.cjs"
  },
  "files": ["dist"],
  "devDependencies": {
    "typescript": "^5.9",
    "tsdown": "^0.20",
    "vitest": "^4.0",
    "biome": "^2.3"
  }
}
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative | Why Not Recommended |
|-------------|-------------|-------------------------|-------------------|
| **tsdown** | tsup (8.5.1) | Legacy projects | tsup explicitly marked "not actively maintained"; maintainers recommend tsdown migration; Rolldown is future direction |
| **tsdown** | esbuild directly | Custom bundling needs | esbuild is lower-level; tsdown wraps it with library-specific defaults (tree-shaking, .d.ts, exports auto-gen) |
| **tsdown** | Rollup | Complex plugins needed | Rollup is powerful but requires config; Vite 8 (2026) replaces Rollup with Rolldown anyway; tsdown simpler for libraries |
| **Vitest** | Jest | Legacy Node projects | Jest requires ts-jest preprocessor; Vitest native TypeScript; Jest 30 (June 2025) dropped support for Node 14-21 anyway |
| **Biome** | ESLint + Prettier | Ecosystem lock-in | ESLint+Prettier = 127+ packages + 4 config files; Biome = 1 binary, 1 config, 10-25x faster |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **tsup** | Unmaintained as of 2025; maintainers explicitly recommend tsdown; no active bug fixes or TypeScript updates | **tsdown 0.20+** |
| **Jest** (in new projects) | Requires ts-jest; slower than Vitest; ESM support weaker; removed Node 14-21 support in Jest 30 | **Vitest 4.0+** |
| **ESLint + Prettier** | 127+ transitive packages; 4+ separate config files; slow on large codebases; unified tools now standard | **Biome 2.3+** |
| **Webpack** (for libraries) | Over-engineered for library bundling; complex config; slower than esbuild-based tools | **tsdown** |
| **CommonJS as primary output** | 2026 is ESM-first year; CommonJS only as fallback via conditional exports for legacy consumers | **ESM primary** |

---

## Stack Patterns by Variant

### Standard: Node.js + Browser Library
- **Bundler**: tsdown with default ESM + optional CJS fallback
- **Test environment**: jsdom + browser environment via Vitest (native support)
- **Bundle target**: ES2020 (covers Node 18+, modern browsers)
- **Output**: ESM primary in `dist/index.js`, optional CJS in `dist/index.cjs`
- **Declaration files**: Auto-generated by tsdown with oxc (if isolatedDeclarations: true)

### If you need Node.js only:
- **Bundle target**: ES2018 (async/await, spread)
- **Outputs**: ESM only (Node 18+ supports native ESM)
- **Remove**: browser-specific polyfills, jsdom test environment

### If you need legacy browser support (<ES2020):
- **Warning**: Increases bundle size; evaluate tradeoff vs. abandoning old browsers
- **Bundle target**: ES2015
- **Tree-shake aggressively**: Remove unused shims
- **Consider**: User documentation to upgrade browser versions

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| tsdown 0.20 | TypeScript 5.4+ | Uses oxc under hood; fast .d.ts generation |
| tsdown 0.20 | Rolldown (alpha) | tsdown wraps Rolldown; Vite 8 (2026) will ship Rolldown officially |
| Vitest 4.0 | TypeScript 5.4+ | Native support; no ts-jest needed |
| Biome 2.3 | TypeScript 5.x | Type-aware linting via .d.ts scanning |
| Node.js 18 | TypeScript 5.9 | 18 EOL April 2025; recommend upgrade to 22 |
| Node.js 22 | TypeScript 5.9+ | Native TypeScript support (behind flag); active LTS |

### Known Compatibility Issues

1. **TypeScript `moduleResolution`**: When publishing a library with conditional exports, consumers must use `moduleResolution: node16`, `nodext`, or `bundler` in their tsconfig.json (not `module` or `classic`)
2. **Vitest + jsdom**: Vitest auto-detects from test file environment; use `// @vitest-environment jsdom` comment for browser tests
3. **tsdown + monorepos**: If using workspaces, ensure each package has its own tsconfig.json; tsdown resolves from tsconfig root

---

## Build Optimization for <50KB Constraint

### Bundling Strategy
- **Minify**: tsdown enables minify by default in production; includes identifier shortening + syntax compression
- **Tree-shake**: tsdown performs tree-shaking automatically with ESM exports; ensure imports are side-effect-free
- **Conditional exports**: Use exports field to avoid shipping Node.js-specific code to browsers
- **Lazy loading**: Consider lazy-loading reporter database (if large) via dynamic import

### Measurement & Enforcement
- **size-limit** (recommended): CLI tool to check bundle size on every commit; fails CI if >50KB
- **Alternative**: bundlejs.com for manual checks; Bundlephobia for dependency impact analysis

### Example size-limit config
```json
{
  "size-limit": [
    {
      "path": "dist/index.js",
      "limit": "50 KB"
    }
  ]
}
```

### Expected baseline (before heavy reporter database):
- Minimal citation extraction lib: ~8-15 KB gzipped (similar to Zod, which is 8KB)
- + reporter database (if bundled): depends on scope; consider lazy-loading

---

## Browser Support Notes

| Browser | Support Path | Notes |
|---------|--------------|-------|
| Modern (Chrome, Firefox, Safari, Edge) | ES2020 target | Natively supports async/await, destructuring, arrow functions |
| Safari 14+ | ES2020 target | Covers ~98% of users; optional: test against caniuse.com for specific features |
| IE 11 | Not recommended | Would require ES5 target + polyfills; adds 20+ KB; recommend user upgrade docs |

**Testing approach**: Use Vitest with @testing-library/dom for browser-like testing locally; optional: BrowserStack for real browser CI.

---

## Tooling Philosophy

This stack embraces several 2026 trends:

1. **Rust-first**: Rolldown (bundler), oxc (parser/transformer), Biome (linter) — faster, safer, modern language ecosystem
2. **ESM primary**: 2026 is the year of dropping CJS from libraries; CommonJS only as fallback
3. **Zero-config philosophy**: tsdown, Vitest, Biome all provide sensible defaults; minimal config files needed
4. **Type-aware tooling**: Biome scans TypeScript .d.ts files; tsdown integrates declaration generation
5. **Single responsibility**: Each tool does one thing well (no bundler+formatter combinations; use Biome for both)

---

## Project-Specific Considerations for eyecite-ts

### Regex Performance
- Citation extraction will rely heavily on regex; use native JavaScript RegExp (heavily optimized in V8)
- Consider [Regolith](https://www.regolithjs.com/) if ReDoS (Regular Expression Denial of Service) becomes a concern
- For maintainability: use [ts-regex-builder](https://github.com/callstack/ts-regex-builder) for structured regex definitions

### Text Processing
- Avoid AST parsing (too heavy); regex-based state machine is sufficient for citations
- Precompile regex patterns outside hot loops (cached at module load)
- Use `string.match()` with compiled patterns for batch operations

### Bundle Size Breakdown (Estimate)
- Core citation extraction logic: ~5-8 KB gzipped
- Reporter database (optional/lazy): ~10-30 KB (depends on breadth)
- Type definitions: ~1-2 KB (not shipped in bundle, only in .d.ts)
- Overhead (tsdown/esbuild wrapper): <1 KB

### Testing Strategy
- Unit tests via Vitest (fast iteration)
- Browser compatibility: Vitest jsdom + @testing-library/dom
- Real browser testing: Optional CI integration with BrowserStack or Browserling for critical paths

---

## References

**Bundling & Build Tools:**
- [tsdown official docs](https://tsdown.dev/guide/) — Configuration, declaration files, tree-shaking
- [tsup GitHub](https://github.com/egoist/tsup) — (Note: unmaintained; see tsdown migration docs)
- [esbuild API](https://esbuild.github.io/api/) — Underlying minifier/transpiler for tsdown
- [Madeleine Miller: JavaScript Ecosystem 2026](https://madelinemiller.dev/blog/2025-javascript-ecosystem/) — SOTA trends

**Testing:**
- [Vitest official docs](https://vitest.dev/) — Configuration, coverage setup, browser environments
- [Jest vs Vitest comparison (2026)](https://dev.to/agent-tools-dev/choosing-a-typescript-testing-framework-jest-vs-vitest-vs-playwright-vs-cypress-2026-7j9) — Trade-offs

**Linting & Formatting:**
- [Biome official](https://biomejs.dev/) — Configuration, rule catalog, TypeScript integration
- [Biome vs ESLint comparison](https://betterstack.com/community/guides/scaling-nodejs/biome-eslint/) — Trade-offs

**TypeScript & Type System:**
- [TypeScript 5.9 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html) — Latest features
- [TypeScript strict mode guide](https://oneuptime.com/blog/post/2026-01-24-typescript-strict-mode/view) — Best practices
- [TypeScript library structures](https://www.typescriptlang.org/docs/handbook/declaration-files/library-structures.html) — .d.ts patterns

**Package Publishing:**
- [Package.json exports field guide](https://hirok.io/posts/package-json-exports) — Conditional exports, TypeScript resolution
- [Node.js packages documentation](https://nodejs.org/api/packages.html) — Exports semantics

**Bundle Size & Performance:**
- [size-limit tool](https://www.npmjs.com/package/size-limit) — Budget enforcement
- [bundlejs](https://bundlejs.com/) — Online bundle analyzer
- [esbuild minification guide](https://esbuild.github.io/api/) — Optimization strategies

**Documentation:**
- [TypeDoc official](https://typedoc.org/) — API documentation generation from JSDoc/TSDoc

**Node.js Versions:**
- [Node.js release schedule](https://nodejs.org/en/about/previous-releases) — EOL dates
- [Node.js 22 LTS announcement](https://nodejs.org/en/blog/release/v22.18.0) — Current stable LTS

---

**Stack research complete. Ready for roadmap creation.**
*Researched 2026-02-04. Next: Feature landscape, architecture patterns, domain pitfalls.*
