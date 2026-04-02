---
name: algorithmic-refactoring
description: >
  Implement an algorithm improvement spec from docs/algorithms/.
  Guides a coding agent through a 6-phase cycle: baseline → implement → test → verify parity → benchmark → finalize.
  Domain-specific to eyecite-ts legal citation extraction.
arguments:
  - name: spec
    description: "Spec number (e.g., '03') or slug (e.g., '03-space-optimized-levenshtein')"
---

# Algorithmic Refactoring Skill

You are implementing an internal algorithm improvement for **eyecite-ts**, a TypeScript legal citation extraction library with zero runtime dependencies.

## Domain Context

eyecite-ts processes legal text through a 4-stage pipeline:

1. **Clean** (`src/clean/`) — strip HTML, normalize whitespace/Unicode, fix smart quotes. Produces a `TransformationMap` for position tracking.
2. **Tokenize** (`src/tokenize/`) — apply regex patterns to find citation candidates.
3. **Extract** (`src/extract/`) — parse metadata (volume, reporter, page, court, year) from tokens. Orchestrator: `extractCitations.ts`.
4. **Resolve** (`src/resolve/`) — link short-form citations (Id., supra, short-form case) to full antecedents. Core: `DocumentResolver.ts`.

**What "correct" means for this codebase:**
- Same citations extracted from the same legal text
- Same `originalStart`/`originalEnd` span positions mapping back to the input
- Same resolution links (supra/id/short-form → antecedent citation index)
- Same confidence scores on resolved citations

## Phase 0 — Load Spec

Read the algorithm spec file:

```bash
# Find the spec by number
ls docs/algorithms/{SPEC_NUMBER}-*.md
```

Read the spec in full. Confirm:
- [ ] You understand the **Problem Statement** (what's fragile/incorrect)
- [ ] You understand the **Target Algorithm** (what replaces it and why)
- [ ] You understand the **Correctness Invariants** (the contract)
- [ ] You've identified the **Target Files** and their line ranges
- [ ] You've checked the **Depends on** field — if this spec depends on another, confirm the dependency is already implemented

Display a one-paragraph summary of what you're about to do and which files you'll touch.

## Phase 1 — Baseline

**This phase is mandatory. Do not skip it.**

### 1a. Verify all tests pass

```bash
pnpm exec vitest run
```

If any test fails, STOP. Do not proceed with a broken baseline. Fix the failing test first or report the issue.

### 1b. Capture golden corpus output

Run the integration tests that exercise the pipeline stage being changed:

```bash
# For resolve-layer specs (ALG-02, ALG-03, ALG-05):
pnpm exec vitest run tests/integration/resolution.test.ts

# For extract-layer specs (ALG-01):
pnpm exec vitest run tests/extract/extractCase.test.ts tests/integration/

# For clean-layer specs (ALG-04):
pnpm exec vitest run
# (position mapping affects everything — full suite is the golden corpus)
```

Note the test count and pass count. This is your golden baseline.

### 1c. Run micro-benchmark (if applicable)

If the spec describes a performance-sensitive operation, create a simple benchmark:

```typescript
// Example: benchmark Levenshtein distance
const start = performance.now()
for (let i = 0; i < 1000; i++) {
  levenshteinDistance("National Association of Machinists", "National Assoc. of Machinists")
}
const elapsed = performance.now() - start
console.log(`1000 iterations: ${elapsed.toFixed(2)}ms`)
```

Record the baseline number. You'll compare against it in Phase 5.

## Phase 2 — Implement

Follow the spec's **Implementation Plan → Step-by-Step** section exactly.

### Rules during implementation:

1. **After each file change**, run `pnpm typecheck` to catch type errors early
2. **Zero runtime dependencies** — implement all algorithms from scratch. Dev dependencies (vitest, etc.) are fine.
3. **No public API changes** — if you find yourself changing an exported type signature, STOP. Re-read the spec's "Blast radius minimization strategy" section. If no such section exists and you believe an API change is necessary, report it before proceeding.
4. **New files go in the same directory** as the target files (e.g., `src/resolve/bkTree.ts` alongside `src/resolve/DocumentResolver.ts`)
5. **Do NOT export new files from the package entry points** (`src/index.ts`, `src/data/index.ts`, `src/annotate/index.ts`). Algorithm implementations are internal.

### Code style:

Match the existing codebase conventions:
- Biome 2.x formatting (spaces, 100-char lines, double quotes, trailing commas, semicolons as needed)
- `noExplicitAny: error` — use proper types
- Regex patterns: avoid nested quantifiers (ReDoS prevention)
- Path alias: `@/*` maps to `src/*`

## Phase 3 — Test

Write tests per the spec's **Test Strategy** section:

1. **Unit tests** for the new algorithm's public interface
2. **Property/invariant tests** from the **Correctness Invariants** section
3. **Edge cases** from the spec's edge case list

Place tests in the `tests/` directory mirroring the source structure:
- `src/resolve/bkTree.ts` → `tests/resolve/bkTree.test.ts`
- `src/extract/unionFind.ts` → `tests/extract/unionFind.test.ts`
- `src/clean/segmentMap.ts` → `tests/clean/segmentMap.test.ts`

Run the new tests:

```bash
pnpm exec vitest run tests/{path-to-new-tests}
```

All new tests must pass before proceeding.

## Phase 4 — Verify Parity

**This phase is mandatory. Do not skip it.**

### 4a. Run the full test suite

```bash
pnpm exec vitest run
```

Every test must pass. If any test fails:
1. Read the failure message carefully
2. Compare against the golden baseline from Phase 1
3. Identify whether the failure is a regression (your change broke something) or a pre-existing issue
4. Fix regressions before proceeding. Do NOT ignore failures.

### 4b. Verify golden corpus parity

Run the same integration tests from Phase 1b. Compare:
- Same number of tests
- Same pass count
- Same test names

If any test that passed in Phase 1 now fails, this is a **parity violation**. Your algorithm change has altered the extraction/resolution behavior. Fix it.

### What "parity" means for each pipeline stage:

**Clean layer (ALG-04):** Every citation's `originalStart` and `originalEnd` must be identical to baseline. Position mapping changes are invisible to the API but affect all downstream span calculations.

**Extract layer (ALG-01):** Every citation's `subsequentHistoryOf` field must point to the same antecedent index. `subsequentHistoryEntries` on root citations must contain the same entries in the same order.

**Resolve layer (ALG-02, ALG-03, ALG-05):** Every resolved citation's `resolvedTo` index and `confidence` score must be identical. Supra citations must match the same party names.

## Phase 5 — Post-Benchmark

**This phase is mandatory. Do not skip it.**

Run the same benchmark from Phase 1c. Record the result.

Report:
```
Benchmark: {operation name}
Before: {baseline}ms (1000 iterations)
After:  {new}ms (1000 iterations)
Change: {percentage}% {faster|slower}
```

**Performance regression is NOT blocking** — correctness matters more than speed for these changes. But if you see a significant regression (>50% slower), investigate:
- Is the new algorithm doing more work than expected?
- Is there an implementation bug causing unnecessary computation?
- Does the benchmark accurately represent real-world usage?

Report findings but proceed to Phase 6 regardless.

## Phase 6 — Finalize

### 6a. Lint and format

```bash
pnpm lint
pnpm format
```

Fix any issues.

### 6b. Update spec status

Edit the spec file (`docs/algorithms/{NN}-*.md`) and change:
```
**Status:** Ready
```
to:
```
**Status:** Complete
```

### 6c. Create changeset

```bash
pnpm changeset
```

Select `patch`. Write summary: `internal: {algorithm name} — {one-line description}`

Examples:
- `internal: space-optimized Levenshtein DP with early termination`
- `internal: binary search for paragraph boundary assignment`
- `internal: BK-tree for supra citation party name matching`

### 6d. Final verification

```bash
pnpm exec vitest run && pnpm typecheck && pnpm lint
```

All three must pass.

### 6e. Summary report

Print a summary:

```
## ALG-{NN} Implementation Complete

**Algorithm:** {name}
**Files changed:** {list}
**Files created:** {list}
**Tests added:** {count}
**Parity verified:** Yes
**Benchmark:** {before}ms → {after}ms ({change}%)
**Changeset:** {summary}
```

## Enforcement Rules

These rules are non-negotiable:

1. **No skipping Phase 1 (Baseline)** — you need a known-good state to compare against
2. **No skipping Phase 4 (Parity)** — the whole point is correctness preservation
3. **No skipping Phase 5 (Benchmark)** — we need to know if performance changed
4. **No new runtime dependencies** — eyecite-ts has zero runtime deps, keep it that way
5. **No public API changes** — these are internal refactors
6. **One spec at a time** — do not implement multiple specs in one session
7. **Feature branch required** — never commit directly to main
8. **Test commands** — always use `pnpm exec vitest run` (not `pnpm test`, which enters watch mode)
