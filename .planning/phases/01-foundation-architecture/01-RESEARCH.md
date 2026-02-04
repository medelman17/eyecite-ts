# Phase 1: Foundation & Architecture - Research

**Researched:** 2026-02-04
**Domain:** TypeScript library scaffolding, build configuration, architectural design for text parsing
**Confidence:** HIGH

## Summary

Phase 1 establishes the foundational architecture for eyecite-ts, a zero-dependency TypeScript library targeting sub-50KB browser distribution. The research converges on a modern 2026 stack (tsdown 0.20 + Vitest 4.0 + Biome 2.3) that enables fast builds, strict type checking, and tree-shakeable exports. This phase is critical because it prevents five major pitfalls: position offset drift, ReDoS vulnerabilities, bundle bloat, regex incompatibility, and state management issues.

The key deliverables are:
1. Project scaffolding with correct TypeScript/tsdown configuration
2. Architecture design for position offset tracking (not implementation, just design)
3. Bundle size strategy and tree-shaking setup
4. Regex audit plan from Python eyecite patterns
5. Resolver state management design (stateless vs. stateful patterns)

**Primary recommendation:** Use tsdown 0.20+ with conditional exports (types first), establish position tracking interface upfront, set ES2020 as target, and structure reporter database for tree-shaking from day one.

## Standard Stack

The 2026 TypeScript library stack has consolidated around Rust-based tooling with ESM-first philosophy. This is the proven standard for new libraries.

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **TypeScript** | 5.9.x | Language and type system | Current stable; strict mode enforced for type safety; 5.9 adds compiler optimizations |
| **tsdown** | 0.20.x | ESM/CJS bundler and publisher | Rust-based (Rolldown), replaces unmaintained tsup, native tree-shaking, declaration generation via oxc, ESM-first with CJS fallback |
| **Vitest** | 4.0.x | Unit testing framework | 10-20x faster than Jest; native ESM/TypeScript; no ts-jest overhead; built-in coverage with @vitest/coverage-v8 |
| **Biome** | 2.3.x | Linter and formatter | Unified tool (replaces ESLint + Prettier); 10-25x faster; type-aware linting; single config file |
| **Node.js** | 18+, recommend 22 LTS | Development and consumer runtime | v18 required by PLAT-01; note: v18 EOL April 2025; users should upgrade to v22 (active LTS until April 2027) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **tsc** | bundled in TypeScript 5.9 | Type checking and declaration generation | Build pipeline: verify strict types, generate .d.ts files before tsdown bundles |
| **@vitest/coverage-v8** | 4.0.x | Code coverage measurement | CI/CD phase; track test coverage over time |
| **size-limit** | Latest | Bundle size enforcement | CI/CD; fail build if gzipped bundle exceeds 50KB (PERF-03 requirement) |
| **TypeDoc** | Latest | API documentation generation | Optional; generates HTML docs from JSDoc comments for library consumers |

### Installation

```bash
# Core development dependencies
npm install -D typescript@^5.9 tsdown@^0.20 vitest@^4.0 biome@^2.3

# Optional but recommended for Phase 1+
npm install -D @vitest/coverage-v8 size-limit

# For documentation (Phase 4+)
npm install -D typedoc
```

### Alternatives Considered

| Use Standard | Instead of | Why Not Alternative |
|-------------|-----------|---------------------|
| **tsdown 0.20** | tsup 8.x | tsup explicitly unmaintained as of 2025; maintainers recommend tsdown migration; no active updates |
| **tsdown 0.20** | esbuild directly | esbuild is lower-level; tsdown wraps it with library-specific defaults (declaration generation, tree-shaking, exports field auto-gen) |
| **Vitest 4.0** | Jest 29.x | Jest requires ts-jest preprocessor; slower; weaker ESM support; Jest 30 (June 2025) dropped Node 14-21 |
| **Biome 2.3** | ESLint + Prettier | ESLint + Prettier = 127+ transitive packages + 4 config files; Biome = 1 binary, 1 JSON config, 10-25x faster |

## Architecture Patterns

### Recommended Project Structure

```
eyecite-ts/
├── src/
│   ├── index.ts              # Public API exports (re-exports from submodules)
│   ├── types/                # Shared type definitions
│   │   ├── citation.ts       # Citation interfaces, discriminated unions
│   │   ├── span.ts           # Position/offset types (CRITICAL: design first)
│   │   └── resolver.ts       # Resolver state interface
│   ├── clean/                # Text cleaning layer
│   │   ├── index.ts          # Cleaner pipeline exports
│   │   ├── html.ts           # HTML tag removal
│   │   ├── whitespace.ts     # Whitespace normalization
│   │   └── transformer.ts    # Offset tracking for transformations
│   ├── tokenize/             # Regex tokenization layer
│   │   ├── index.ts
│   │   └── default.ts        # Regex-based tokenizer
│   ├── extract/              # Citation extraction layer
│   │   ├── index.ts
│   │   ├── case.ts           # Case citation extractor
│   │   ├── statute.ts        # Statute citation extractor
│   │   └── factory.ts        # Citation type factory
│   ├── resolve/              # Short-form resolution layer (Phase 4)
│   │   ├── index.ts
│   │   ├── resolver.ts       # Document-scoped resolver
│   │   └── id.ts             # Id. citation resolver
│   ├── annotate/             # Annotation layer (Phase 3)
│   │   ├── index.ts
│   │   └── markup.ts         # HTML/markup insertion
│   └── data/                 # Static database exports (tree-shakeable)
│       ├── reporters.ts      # Named exports per reporter type
│       ├── courts.ts         # Court definitions
│       └── journals.ts       # Journal abbreviations
├── tests/
│   ├── unit/
│   │   ├── clean.test.ts
│   │   ├── tokenize.test.ts
│   │   ├── extract.test.ts
│   │   └── positions.test.ts
│   └── integration/
│       └── e2e.test.ts
├── tsconfig.json             # TypeScript configuration (strict mode)
├── tsdown.config.ts          # tsdown configuration
├── biome.json                # Biome linter/formatter config
├── vitest.config.ts          # Vitest configuration
└── package.json              # Dependencies, exports field, size-limit config
```

### Pattern 1: Position Tracking Architecture (Design Phase)

**What:** Design an architecture that tracks positions through multiple text transformations (HTML cleaning, whitespace normalization) so that returned citations point to the correct locations in the original text.

**When to use:** Always, from Phase 1. This is foundational; implementation happens in Phase 3 (annotation layer), but the interface and architecture must be locked in Phase 1.

**Design pattern:**

```typescript
// File: src/types/span.ts
export interface Span {
  /** Position in cleaned/tokenized text (used during parsing) */
  cleanStart: number
  cleanEnd: number

  /** Position in original text (returned to user) */
  originalStart: number
  originalEnd: number
}

// File: src/clean/transformer.ts
export interface TransformationMap {
  /** Maps each position in cleaned text to original text */
  cleanToOriginal: Map<number, number>
  /** Maps each position in original text to cleaned text */
  originalToClean: Map<number, number>
}

// During text cleaning, track every insertion/deletion:
export function cleanText(
  original: string,
): { cleaned: string; map: TransformationMap } {
  let cleaned = ""
  let cleanToOriginal: number[] = []
  let originalToClean: number[] = []

  // For each character in original:
  // - If removing it (e.g., HTML entity): track gap
  // - If keeping it: track position
  // - If expanding it (e.g., &nbsp; → space): track offset

  return {
    cleaned,
    map: {
      cleanToOriginal: new Map(cleanToOriginal.entries()),
      originalToClean: new Map(originalToClean.entries()),
    },
  }
}

// File: src/types/citation.ts
export interface CitationBase {
  /** Text matched by parser */
  text: string
  /** Span in original document (what user expects) */
  span: Span
}
```

**Why this matters:** Position accuracy is non-negotiable (Pitfall #2). Designing the interface upfront ensures every layer tracks positions correctly. Implementation details can wait until Phase 3, but the interface must be locked.

**Example verification:**
```typescript
// Phase 3/4: Position validation
const original = "Smith v. Doe, 500 F.2d 123 (2020)"
const { cleaned, map } = cleanText(original)
const citations = extract(cleaned)
const withOriginalPositions = citations.map(c => ({
  ...c,
  span: {
    originalStart: map.cleanToOriginal.get(c.span.cleanStart),
    originalEnd: map.cleanToOriginal.get(c.span.cleanEnd),
  },
}))
// Verify: original.substring(withOriginalPositions[0].span.originalStart, ...) === "500 F.2d 123"
```

### Pattern 2: Tree-Shakeable Reporter Database

**What:** Structure the reporter database as individual named exports so unused reporters are eliminated by bundlers.

**When to use:** Always. Set up from Phase 1 so Phase 3 can import reporters correctly.

**Pattern:**

```typescript
// File: src/data/reporters.ts
// Each reporter as named export, not default export
export const F_REPORTER = { abbreviation: "F.", jurisdiction: "Federal", ... }
export const F2D_REPORTER = { abbreviation: "F.2d", jurisdiction: "Federal", ... }
export const USREPORTS_REPORTER = { abbreviation: "U.S.", jurisdiction: "Federal", ... }
// ... ~1200 more reporters

// File: src/data/index.ts
export * from "./reporters.ts"
export * from "./courts.ts"
export * from "./journals.ts"

// File: package.json
{
  "sideEffects": false,  // Tell bundlers this is tree-shakeable
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./data": {          // Subpath export for data
      "types": "./dist/data/index.d.ts",
      "import": "./dist/data/index.mjs",
      "require": "./dist/data/index.cjs"
    }
  }
}
```

**Consumer usage:**
```typescript
// User imports only reporters they need
import { F_REPORTER, F2D_REPORTER } from "eyecite-ts/data"

// Bundler eliminates all other 1198 reporters from bundle
// Result: minimal bundle size
```

**Why this matters:** Full reporters-db is 50-100KB gzipped. Tree-shaking reduces it to 10-20KB if user imports only relevant reporters. This is how we hit the <50KB constraint (Pitfall #3).

### Pattern 3: Discriminated Union Citation Types

**What:** Use TypeScript discriminated unions instead of instanceof checks for type-safe citation routing.

**When to use:** All citation types (FullCase, ShortForm, Statute, etc.).

**Pattern:**

```typescript
// File: src/types/citation.ts
export type CitationType = "case" | "statute" | "journal" | "shortForm" | "id"

export interface FullCaseCitation {
  type: "case"
  text: string
  volume: number
  reporter: string
  page: number
  pincite?: number
  court?: string
  year?: number
  span: Span
}

export interface IdCitation {
  type: "id"
  text: string
  span: Span
}

export type Citation = FullCaseCitation | IdCitation | /* ... other types */

// Type-safe pattern matching (no instanceof, no type guards)
function citationTypeHandler(citation: Citation): string {
  switch (citation.type) {
    case "case":
      return `${citation.volume} ${citation.reporter} ${citation.page}`
    case "id":
      return "Id."
    // TypeScript ensures all types are handled
  }
}
```

**Why this matters:** Discriminated unions are enforced at compile time (strict types, DX-01/DX-02). No runtime overhead, no `any` types.

### Pattern 4: Stateful Resolver with Document Scope

**What:** Citation resolver maintains state at the document level, not globally. Users explicitly call resolve() method.

**When to use:** Short-form resolution (Phase 3+, but design in Phase 1).

**Pattern:**

```typescript
// File: src/types/resolver.ts
export interface ResolutionContext {
  /** Full document text for footnote/reference context */
  documentText: string
  /** All citations found in document (for Supra linking) */
  allCitations: Citation[]
}

// File: src/resolve/resolver.ts
export class CitationResolver {
  private previousCitation: Citation | null = null
  private citationHistory: Citation[] = []

  /** Resolve short-form citations (Id., Supra) to their antecedents */
  resolve(
    citation: IdCitation | ShortFormCitation,
    context: ResolutionContext,
  ): ResolvedCitation {
    if (citation.type === "id") {
      // Link to immediately preceding citation
      if (this.previousCitation) {
        return { ...citation, resolvedTo: this.previousCitation }
      }
    }
    // ... other resolution logic
    return { ...citation, resolvedTo: null }
  }

  /** Track citation so subsequent Id. can reference it */
  recordCitation(citation: Citation): void {
    this.previousCitation = citation
    this.citationHistory.push(citation)
  }

  /** Reset state between documents */
  clear(): void {
    this.previousCitation = null
    this.citationHistory = []
  }
}

// Usage: NOT parallel-safe without separate instance per thread
const resolver = new CitationResolver()
for (const citation of citations) {
  resolver.recordCitation(citation)
  const resolved = resolver.resolve(citation, context)
}
resolver.clear() // Essential between documents
```

**Why this matters:** Prevents state leakage across documents (Pitfall #5). Making resolver explicit (not automatic) keeps parsing stateless while allowing optional resolution.

### Anti-Patterns to Avoid

- **Global state for citation tracking** → Use document-scoped resolver instance instead
- **Default exports for database** → Use named exports for tree-shaking
- **Mixing cleaned and original positions** → Always track both; convert on return only
- **Inline regex without escape documentation** → All complex regex must have JSDoc explaining intent
- **Single giant index.ts re-exporting everything** → Use layer-specific indices (clean/index.ts, extract/index.ts) for modularity

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|------------|------------|-----|
| Bundle minification and tree-shaking | Custom webpack config | tsdown (wraps esbuild + Rolldown) | esbuild is battle-tested, tsdown adds library-specific optimizations (declaration generation, exports field auto-gen) |
| TypeScript strict type checking | Manual code review | TypeScript compiler + Biome linter | Type system catches errors at compile time; faster than review |
| Regex validation and ReDoS detection | Regex test harness | regex101.com + OWASP ReDoS guides | Existing tools have comprehensive backtracking detection; don't reinvent |
| Position offset mapping | Custom algorithm | Span interface + transformation map | Text transformation offset tracking is subtle; design-first approach prevents common errors |
| State management for resolution | Global state + locks | Document-scoped resolver instance | Explicit state instance is simpler and parallelizable than global state + synchronization |
| Package.json exports field generation | Manual maintenance | tsdown exports: true auto-generation | tsdown analyzes bundle and generates correct conditional exports automatically |

## Common Pitfalls

### Pitfall 1: Missing Position Offset Tracking Interface

**What goes wrong:** Parsing works, but returned positions don't match original text. User clicks position 150 expecting "500 F.2d", gets "d 12" instead. Happens because text cleaning shifts characters around and no one tracked the offset.

**Why it happens:** Position tracking looks simple ("just store start/end") but transformations compound. HTML entity removal (`&nbsp;` 6 chars → space 1 char), Unicode normalization, extra whitespace all shift positions differently.

**How to avoid:**
1. Design position types in Phase 1 (done via Span interface above)
2. Implement transformation map in cleaning layer (Phase 2)
3. Validate position accuracy on 100+ real documents (Phase 3/4)
4. Document in README: "Positions are guaranteed accurate on ASCII text; test on your documents with Unicode entities"

**Warning signs:**
- Positions work on plain text but fail on HTML-heavy documents
- Off-by-N errors consistent across all citations (systematic offset)
- Position tests pass on test fixtures but fail on real legal documents

### Pitfall 2: Bundler Not Tree-Shaking Database

**What goes wrong:** User imports 10 reporters, gets all 1200 in bundle (50KB+). Constraint violation. Takes weeks to debug if discovered late.

**Why it happens:** Default export of entire reporters-db object; bundler can't eliminate unused reporters. Common mistake: `export default allReporters` instead of `export const F_REPORTER = ...`.

**How to avoid:**
1. Set `"sideEffects": false` in package.json (Phase 1)
2. Use named exports only for database (Phase 1 design, Phase 3 implementation)
3. Test tree-shaking in Phase 2 CI: "If user imports only F_REPORTER, final bundle is <10KB"
4. Use size-limit to enforce constraint at every commit

**Warning signs:**
- Bundle size doesn't decrease when removing imports
- All 1200 reporters in final bundle even though only 5 are imported
- CI/CD bundle size check fails only after Phase 3 adds reporters

### Pitfall 3: TypeScript Configuration Not Strict

**What goes wrong:** Public API exports have `any` types (violates DX-02). Users lose IDE autocomplete and type safety. Hard to detect until code review.

**Why it happens:** Strict mode disabled by default in tsconfig.json. Easy to forget when scaffolding.

**How to avoid:**
1. Set `"strict": true` in tsconfig.json (Phase 1, this research deliverable)
2. Set `"isolatedDeclarations": true` for faster .d.ts generation
3. Biome linter should catch `any` types in public API
4. CI check: "No `any` types in /dist/*.d.ts files"

**Warning signs:**
- Exported function signatures have `any` parameters
- IDE shows "unknown type" for imported symbols
- Type checking works locally but fails in consumer code

### Pitfall 4: Package.json Exports Field Missing or Wrong

**What goes wrong:** TypeScript consumers can't import types. CommonJS consumers get ESM bundle. Browser users get Node.js-specific code. Each environment breaks for different reasons.

**Why it happens:** Conditional exports require specific field ordering. Getting order wrong means TypeScript falls back to `require` condition and loses type information.

**How to avoid:**
1. Use `tsdown` with `exports: true` to auto-generate correct field (Phase 1)
2. Manual check: `"types"` condition MUST come before `"import"` and `"require"`
3. Validate with `publint` npm package before publishing
4. Test in Phase 2: "Import works in Node ESM, CommonJS, TypeScript, browser bundler"

**Warning signs:**
- TypeScript says "No type declaration file found"
- Browser build imports Node-specific code (fs, path modules)
- CommonJS require gets ESM bundle (can't use)

### Pitfall 5: Regex Target Version Not Specified

**What goes wrong:** Regex patterns use lookbehind (ES2018+) but project targets ES2015. Pattern works in dev (modern Chrome) but silently fails in older environments. Some citations never match.

**Why it happens:** Python eyecite uses lookbehind extensively. When porting, easy to copy pattern as-is without checking JS support.

**How to avoid:**
1. Decide ES target in Phase 1: ES2020 is recommended (covers Node 18+, modern browsers)
2. Audit all Python regex patterns (Phase 1): Create inventory of features used
3. For each pattern: Verify it's supported in target ES version
4. If unsupported: Document conversion (e.g., `(?<=v\. )` → `v\. (\w+)`)
5. Test in Phase 2 on minimum target version (not just modern Chrome)

**Warning signs:**
- Regex works in VS Code but fails in browser tests
- Some citations extract, others silently don't match
- Error message "Invalid regular expression" only on certain browsers

## Code Examples

Verified patterns from official sources and best practices:

### TypeScript Strict Configuration

```typescript
// File: tsconfig.json
{
  "compilerOptions": {
    "strict": true,                    // All strict checks enabled
    "isolatedDeclarations": true,      // Fast .d.ts generation via oxc
    "declaration": true,               // Generate .d.ts files
    "declarationMap": true,            // Source maps for .d.ts (optional)
    "module": "ESNext",                // Preserve ES imports for bundler
    "target": "ES2020",                // Browser + Node 14+ compatibility
    "moduleResolution": "bundler",     // Bundler-aware resolution
    "lib": ["ES2020", "DOM"],          // Both browser and Node APIs
    "skipLibCheck": true,              // Skip checking node_modules .d.ts
    "esModuleInterop": true            // Compatibility for CommonJS imports
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

Source: [TypeScript 5.9 Handbook - isolatedDeclarations](https://www.typescriptlang.org/tsconfig#isolatedDeclarations)

### tsdown Configuration for ESM/CJS Dual Output

```typescript
// File: tsdown.config.ts
import { defineConfig } from "tsdown"

export default defineConfig({
  entry: "src/index.ts",
  format: ["esm", "cjs"],            // Both ESM and CommonJS
  dts: true,                         // Generate .d.ts via oxc
  minify: true,                      // Enable minification
  sourcemap: true,                   // Include source maps
  outDir: "dist",
  exports: true,                     // Auto-generate package.json exports
  declaration: {
    resolve: true,                   // Resolve types to dependencies
  },
})
```

Source: [tsdown Official Docs - Configuration](https://tsdown.dev/options/output-format), [tsdown Package Exports](https://tsdown.dev/options/package-exports)

### package.json with Conditional Exports

```json
{
  "name": "eyecite-ts",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./data": {
      "types": "./dist/data/index.d.ts",
      "import": "./dist/data/index.mjs",
      "require": "./dist/data/index.cjs"
    }
  },
  "files": ["dist"],
  "sideEffects": false,
  "devDependencies": {
    "@vitest/coverage-v8": "^4.0",
    "biome": "^2.3",
    "size-limit": "^latest",
    "tsdown": "^0.20",
    "typescript": "^5.9",
    "vitest": "^4.0"
  },
  "scripts": {
    "build": "tsdown",
    "test": "vitest",
    "lint": "biome lint src tests",
    "format": "biome format --write src tests",
    "size": "size-limit"
  },
  "size-limit": [
    {
      "path": "dist/index.mjs",
      "limit": "50 KB"
    }
  ]
}
```

Source: [Package.json Exports Field Guide](https://hirok.io/posts/package-json-exports), [TypeScript Library Structures](https://www.typescriptlang.org/docs/handbook/declaration-files/library-structures.html)

### Biome Linter Configuration for Strict Types

```json
{
  "linter": {
    "rules": {
      "recommended": true,
      "suspicious": {
        "noExplicitAny": "error",
        "noImplicitAnyLet": "error",
        "noInvalidTypeImport": "error"
      },
      "style": {
        "noNonNullAssertion": "warn",
        "noParameterAssign": "error",
        "noUnusedTemplateLiteral": "error"
      }
    }
  },
  "organizeImports": {
    "enabled": true
  },
  "javascript": {
    "formatter": {
      "lineWidth": 100
    }
  }
}
```

Source: [Biome Linter Rules](https://biomejs.dev/linter/), [Biome Configuration](https://biomejs.dev/docs/configuration/)

### Vitest Configuration for Browser + Node Testing

```typescript
// File: vitest.config.ts
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",                    // Default to Node environment
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",                      // Built-in coverage via v8
      reporter: ["text", "json", "html"],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
    },
    testTimeout: 10000,                    // Long timeout for ReDoS testing
  },
})
```

For browser testing, use:
```typescript
// In browser-specific test files
// @vitest-environment jsdom
test("parser works in browser", () => {
  // Test browser-specific APIs
})
```

Source: [Vitest Official Documentation](https://vitest.dev/)

## State of the Art

Current best practices and how they differ from older approaches:

| Old Approach (2023-2024) | Current Approach (2026) | When Changed | Impact |
|---------|---------|--------------|--------|
| **tsup** | **tsdown** | Mid-2025 | tsup maintainer explicitly recommended migration; tsdown uses Rolldown (Rust), handles type declarations better, zero-config library defaults |
| **Jest** | **Vitest** | 2024-2025 | Jest dropped Node 14-21 support; Vitest 10-20x faster; native TypeScript/ESM; reuses Vite infrastructure |
| **ESLint + Prettier** | **Biome** | 2024+ | ESLint+Prettier = 127+ packages; Biome is 1 binary; unified linting+formatting; 10-25x faster |
| **CommonJS as primary** | **ESM as primary** | 2025-2026 | Node 18+ supports native ESM; 2026 is year of dropping CommonJS from new libraries; CJS only as fallback via conditional exports |
| **Type definitions via tsc** | **Type declarations via tsdown + oxc** | 2025+ | tsdown auto-generates .d.ts using oxc (Rust parser); faster than tsc, fewer config options needed |
| **Manual exports field** | **Auto-generated via tsdown** | 2025+ | tsdown can auto-generate exports field from entry points; analyze bundle output and update package.json automatically |

### Deprecated/Outdated

- **tsup 8.x:** Explicitly marked as unmaintained. Do not use for new projects. [tsup GitHub Issue](https://github.com/egoist/tsup/discussions/1087)
- **Jest 29.x and earlier:** Too slow for modern monorepos. Jest 30 dropped Node 14-21 support. Use Vitest.
- **ESLint + Prettier combo:** Use Biome instead. 127+ packages vs. 1 binary.
- **CommonJS-first bundling:** All new libraries should be ESM-first with CJS as fallback.

## Open Questions

Things that couldn't be fully resolved through research:

1. **ReDoS Testing Integration**
   - What we know: regex101.com has ReDoS warnings; OWASP guides exist; Phase 2 should include regex timeout tests
   - What's unclear: What's the exact performance baseline for citation extraction regex? How should we set timeout threshold (50ms? 100ms?)?
   - Recommendation: Phase 2 must profile real regex patterns from Python eyecite to establish baseline; start with 100ms timeout, adjust based on empirical data

2. **Reporter Database Size and Compression**
   - What we know: Full reporters-db is ~200-400KB uncompressed, 50-100KB gzip; <50KB total budget is tight
   - What's unclear: Will tree-shaking alone get us under 50KB, or do we need binary compression (Protobuf, MessagePack)? How much size reduction from each technique?
   - Recommendation: Phase 2 should build parser without reporters (baseline <20KB); Phase 3 should measure tree-shaking effectiveness empirically; if still over budget, evaluate binary compression trade-offs

3. **Position Accuracy on Real Documents**
   - What we know: Design pattern is solid; offset tracking interface is correct
   - What's unclear: How many edge cases exist in real legal documents? Will HTML entity handling cover 99% or only 90% of cases?
   - Recommendation: Phase 3/4 must validate against eyecite's test corpus (100+ real documents with HTML/Unicode); adjust transformation map algorithm based on empirical failures

4. **Short-Form Resolution Complexity**
   - What we know: Document-scoped resolver pattern is correct; state isolation is necessary
   - What's unclear: How complex are Supra resolution rules in practice? Will footnote mapping be straightforward or require sophisticated NLP?
   - Recommendation: Phase 3 should start with Id. (simple) before Supra (complex); design should allow phased implementation (Id. in Phase 3, Supra in Phase 3.5 or Phase 4)

## Sources

### Primary (HIGH confidence)

- **tsdown Official Documentation** — [tsdown.dev](https://tsdown.dev/guide/) — Configuration, declaration generation, tree-shaking, package exports auto-generation
- **TypeScript 5.9 Release Notes** — [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html) — Latest features, compiler optimizations, strict mode
- **Vitest Official** — [vitest.dev](https://vitest.dev/) — Testing framework, coverage, browser environments, TypeScript support
- **Biome Official** — [biomejs.dev](https://biomejs.dev/) — Linter rules, configuration, TypeScript integration
- **Node.js Release Schedule** — [nodejs.org/about/previous-releases](https://nodejs.org/en/about/previous-releases) — EOL dates, LTS versions

### Secondary (MEDIUM confidence)

- **Tree-Shaking Guide** — [webpack.js.org/guides/tree-shaking](https://webpack.js.org/guides/tree-shaking/) — How tree-shaking works, sideEffects configuration, verified with multiple sources
- **Package.json Exports Field** — [hirok.io/posts/package-json-exports](https://hirok.io/posts/package-json-exports) — Conditional exports, TypeScript resolution order, verified with official Node.js documentation
- **TypeScript Library Structures** — [TypeScript Handbook - Declaration Files](https://www.typescriptlang.org/docs/handbook/declaration-files/library-structures.html) — .d.ts patterns, exports field structure
- **size-limit Documentation** — [npmjs.com/package/size-limit](https://www.npmjs.com/package/size-limit) — Bundle size enforcement tool and CI/CD integration

### Tertiary (Patterns and Context)

- **Prior Research: STACK.md** — eyecite-ts project's technology stack research (same project)
- **Prior Research: PITFALLS.md** — eyecite-ts project's pitfall analysis (same project)
- **eyecite Whitepaper** — [free.law/pdf/eyecite-whitepaper.pdf](https://free.law/pdf/eyecite-whitepaper.pdf) — Architecture reference, position tracking patterns
- **eyecite GitHub** — [github.com/freelawproject/eyecite](https://github.com/freelawproject/eyecite) — Source code reference for regex patterns and database structure

## Metadata

**Confidence breakdown:**
- Standard stack (tsdown, Vitest, Biome): **HIGH** — All verified with official documentation, 2026 ecosystem consensus
- Architecture patterns (tree-shaking, exports): **HIGH** — Based on official Node.js and webpack documentation, multiple sources agree
- TypeScript configuration: **HIGH** — Official TypeScript documentation, Biome docs
- Pitfall prevention strategies: **HIGH** — Based on prior eyecite research + general text parsing patterns
- Bundle size estimates: **MEDIUM** — Based on prior research; actual numbers only emerge during Phase 2/3 implementation

**Applicable requirements from scope:**
- PLAT-01 to PLAT-09: All addressed via stack choices and configuration
- PERF-03 (zero dependencies): Verified by stack (TypeScript/tsdown/Vitest are dev-only, zero runtime deps)
- DX-01 to DX-02 (strict types, no `any`): Addressed via TypeScript config, Biome linter

**Research valid until:** 30 days (tsdown and Vitest are stable; TypeScript may have patch updates)

**Next phase:** Phase 2 (Core Parsing) research should focus on ReDoS testing infrastructure and regex pattern validation methodology.

---

*Research completed: 2026-02-04*
*Phase 1 Foundation & Architecture — Ready for planning*
