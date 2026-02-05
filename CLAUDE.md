# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install                      # Install dependencies (uses corepack, pinned in packageManager field)
pnpm test                         # Run all tests (vitest, watch mode)
pnpm exec vitest run              # Run all tests once (no watch)
pnpm exec vitest run tests/extract/extractCase.test.ts  # Run a single test file
pnpm exec vitest run -t "extracts volume"               # Run tests matching name pattern
pnpm build                        # Build with tsdown (ESM + CJS + DTS)
pnpm typecheck                    # Type-check with tsc --noEmit
pnpm lint                         # Lint with Biome
pnpm format                       # Format with Biome (auto-fix)
pnpm size                         # Check bundle size limits
pnpm changeset                    # Create a changeset for the next release
```

## Architecture

This is a TypeScript port of Python [eyecite](https://github.com/freelawproject/eyecite) — a legal citation extraction library with zero runtime dependencies.

### Pipeline

Citations flow through a 4-stage pipeline: **clean → tokenize → extract → (resolve)**

1. **Clean** (`src/clean/`): Strip HTML, normalize whitespace/Unicode, fix smart quotes. Builds a `TransformationMap` to track position shifts.
2. **Tokenize** (`src/tokenize/`): Apply regex patterns from `src/patterns/` to find citation candidates. Intentionally broad — captures potential matches without validation.
3. **Extract** (`src/extract/`): Parse metadata from tokens (volume, reporter, page, court, year). Each citation type has its own extractor (`extractCase.ts`, `extractStatute.ts`, etc.). The main orchestrator is `extractCitations.ts`.
   - `extractCase.ts` also handles case name backward search (`extractCaseName`), full span calculation (`findParentheticalEnd`), unified parenthetical parsing (`parseParenthetical`), and disposition extraction.
   - `dates.ts` provides date parsing utilities (`parseMonth`, `parseDate`, `toIsoDate`) for structured date extraction from parentheticals.
4. **Resolve** (`src/resolve/`): Link short-form citations (Id., supra, short-form case) to their full antecedents. `DocumentResolver` uses scope boundaries and Levenshtein matching.

Annotation (`src/annotate/`) and reporter data (`src/data/`) are separate entry points to enable tree-shaking.

### Position Tracking

The `Span` type carries dual positions: `cleanStart/cleanEnd` (for internal parsing) and `originalStart/originalEnd` (for user-facing results). `TransformationMap` maps between them using a lookahead algorithm (maxLookAhead=20) in `cleanText.ts:rebuildPositionMaps`.
- `fullSpan` (optional) extends from case name through final closing parenthetical (including chained parens and subsequent history). The core `span` field remains citation-core-only for backward compatibility.

### Type System

Citations use a discriminated union on the `type` field: `case | statute | journal | neutral | publicLaw | federalRegister | statutesAtLarge | id | supra | shortFormCase`. All share `CitationBase` (text, span, confidence, matchedText, processTimeMs). Switch on `citation.type` for type-safe field access.
- Volume is `number | string` — numeric for standard volumes, string for hyphenated (e.g., "1984-1")

### Entry Points

Three package entry points configured in `tsdown.config.ts` and `package.json`:
- `eyecite-ts` → `src/index.ts` (core extraction + resolution)
- `eyecite-ts/data` → `src/data/index.ts` (reporter database, lazy-loaded)
- `eyecite-ts/annotate` → `src/annotate/index.ts` (text annotation)

### Path Aliases

`@/*` maps to `src/*` in both `tsconfig.json` and `vitest.config.ts`.

## Code Style

- **Formatter/Linter**: Biome 2.x — spaces, 100-char line width, double quotes, trailing commas, semicolons as needed
- `noAssignInExpressions: off` — regex exec loops use assignment-in-while pattern
- `noExplicitAny: error` and `noImplicitAnyLet: error` — strict typing enforced
- `noForEach: off` — forEach is allowed
- Patterns are defined in `src/patterns/` with a `Pattern` interface (`id`, `regex`, `description`, `type`)
- Regex patterns must avoid nested quantifiers to prevent ReDoS

## Test Structure

Tests mirror source in `tests/` with the same directory structure. Integration tests live in `tests/integration/`. Vitest 4 is used — test options go as the second argument: `it(name, { timeout }, fn)`.

## CI & Releases

- **CI**: GitHub Actions — lint, typecheck, test (Node 18/20/22 matrix), build + size check
- **Coverage**: Vitest `--coverage` requires Node 20+ (`node:inspector/promises`). CI only runs coverage on Node 22.
- **Releases**: Changesets — `pnpm changeset` to add, merge to main creates "Version Packages" PR, merging that publishes to npm with provenance
- **Package manager**: pnpm 10 via corepack. Build script allowlist in `pnpm-workspace.yaml`.
- Each fix/feature branch needs a changeset: `pnpm changeset` → select patch/minor/major → write summary
