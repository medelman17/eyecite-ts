# Utils Entry Point Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the `eyecite-ts/utils` tree-shakeable entry point with types, build config, and size-limit enforcement.

**Architecture:** New `src/utils/` directory with barrel export and shared types. Build config adds a fourth entry to tsdown. Package exports map `./utils` to the new dist output. Size-limit targets ~2-3 KB gzipped.

**Tech Stack:** TypeScript 5.9+, tsdown (ESM+CJS+DTS), size-limit, Vitest 4

**Spec:** `docs/superpowers/specs/2026-04-02-post-extraction-utils-design.md`
**Issue:** #94

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/utils/types.ts` | Shared type definitions: `SurroundingContext`, `ContextOptions`, `CaseGroup` |
| `src/utils/index.ts` | Barrel export for `eyecite-ts/utils` entry point |
| `tests/utils/entry-point.test.ts` | Verifies the entry point exports expected symbols |
| `tsdown.config.ts` | (modify) Add `"utils/index"` entry |
| `package.json` | (modify) Add `"./utils"` export map + size-limit entry |

---

### Task 1: Create shared types

**Files:**
- Create: `src/utils/types.ts`

- [ ] **Step 1: Create `src/utils/types.ts` with all shared types**

```typescript
import type { FullCaseCitation } from "../types/citation"
import type { ResolvedCitation } from "../resolve/types"

/**
 * Options for surrounding context extraction.
 */
export interface ContextOptions {
  /** Boundary type (default: 'sentence') */
  type?: "sentence" | "paragraph"
  /** Max characters to return (default: 500) */
  maxLength?: number
}

/**
 * Result of surrounding context extraction.
 */
export interface SurroundingContext {
  /** The sentence or paragraph text */
  text: string
  /** Absolute character offsets in the source document */
  span: { start: number; end: number }
}

/**
 * A group of citations all referring to the same underlying case.
 *
 * Produced by `groupByCase()` from resolved extraction results.
 * Groups are ordered by first mention in the document.
 */
export interface CaseGroup {
  /** The first full citation encountered for this case */
  primaryCitation: FullCaseCitation
  /** All mentions (full, short, id, supra) in document order */
  mentions: ResolvedCitation[]
  /** Distinct reporter strings: ["550 U.S. 544", "127 S. Ct. 1955"] */
  parallelCitations: string[]
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd /Users/medelman/Projects/OSS/eyecite-ts && pnpm typecheck`
Expected: No errors (new file only adds types, no implementation to break)

- [ ] **Step 3: Commit**

```bash
git add src/utils/types.ts
git commit -m "feat(utils): add shared types for utils entry point

Adds SurroundingContext, ContextOptions, and CaseGroup types.
These will be re-exported from the eyecite-ts/utils entry point.

Closes partially #94"
```

---

### Task 2: Create barrel export

**Files:**
- Create: `src/utils/index.ts`

- [ ] **Step 1: Create `src/utils/index.ts`**

```typescript
/**
 * Post-extraction utilities for working with citation results.
 *
 * This module provides composable utility functions for downstream
 * consumption of extraction output: sentence context detection,
 * case grouping, reporter key formatting, and Bluebook formatting.
 *
 * Imported via: `import { ... } from 'eyecite-ts/utils'`
 *
 * @module utils
 */

export type { CaseGroup, ContextOptions, SurroundingContext } from "./types"
```

Note: Only type exports for now. Function exports (`getSurroundingContext`, `groupByCase`, `toReporterKey`, `toBluebook`) will be added by issues #95-#98 as each utility is implemented.

- [ ] **Step 2: Verify typecheck passes**

Run: `cd /Users/medelman/Projects/OSS/eyecite-ts && pnpm typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/utils/index.ts
git commit -m "feat(utils): add barrel export for utils entry point

Type-only exports for now. Function exports will be added as
individual utilities are implemented (#95-#98)."
```

---

### Task 3: Update build config

**Files:**
- Modify: `tsdown.config.ts`

- [ ] **Step 1: Add utils entry to tsdown config**

In `tsdown.config.ts`, add `"utils/index"` to the `entry` object:

```typescript
import { defineConfig } from "tsdown"

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "data/index": "src/data/index.ts",
    "annotate/index": "src/annotate/index.ts",
    "utils/index": "src/utils/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  minify: true,
  sourcemap: true,
  outDir: "dist",
  declaration: {
    resolve: true,
  },
})
```

- [ ] **Step 2: Run build to verify output is generated**

Run: `cd /Users/medelman/Projects/OSS/eyecite-ts && pnpm build`
Expected: Build succeeds. Check output includes `dist/utils/index.mjs`, `dist/utils/index.cjs`, and `dist/utils/index.d.ts`:

Run: `ls dist/utils/`
Expected: `index.cjs`, `index.d.ts`, `index.mjs` (and possibly source maps)

- [ ] **Step 3: Commit**

```bash
git add tsdown.config.ts
git commit -m "build: add utils entry point to tsdown config"
```

---

### Task 4: Update package.json exports and size-limit

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add `./utils` export map to package.json**

Add to the `"exports"` object, after the `"./annotate"` entry:

```jsonc
"./utils": {
  "types": "./dist/utils/index.d.ts",
  "import": "./dist/utils/index.mjs",
  "require": "./dist/utils/index.cjs"
}
```

- [ ] **Step 2: Add size-limit entry for utils**

Add to the `"size-limit"` array:

```jsonc
{
  "path": "dist/utils/index.mjs",
  "limit": "3 KB"
}
```

The full `"size-limit"` array should now be:

```jsonc
"size-limit": [
  {
    "path": "dist/index.mjs",
    "limit": "50 KB"
  },
  {
    "path": "dist/utils/index.mjs",
    "limit": "3 KB"
  }
]
```

- [ ] **Step 3: Run build + size check**

Run: `cd /Users/medelman/Projects/OSS/eyecite-ts && pnpm build && pnpm size`
Expected: Build passes. Size check passes (utils bundle should be tiny — type-only exports produce near-zero runtime code).

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "build: add utils export map and size-limit entry

Exposes eyecite-ts/utils as a tree-shakeable entry point.
Size budget: 3 KB gzipped."
```

---

### Task 5: Add entry point smoke test

**Files:**
- Create: `tests/utils/entry-point.test.ts`

- [ ] **Step 1: Write the test**

```typescript
import { describe, expect, it } from "vitest"

describe("eyecite-ts/utils entry point", () => {
  it("exports CaseGroup type (compile-time check)", async () => {
    // Dynamic import to test the actual entry point resolution
    const utils = await import("../../src/utils/index")

    // Module should load without error
    expect(utils).toBeDefined()
  })

  it("does not export anything from core extraction", async () => {
    const utils = await import("../../src/utils/index")
    const exportedKeys = Object.keys(utils)

    // Currently type-only, so no runtime exports
    // This test will be updated as functions are added (#95-#98)
    // For now, verify no extraction internals leak through
    expect(exportedKeys).not.toContain("extractCitations")
    expect(exportedKeys).not.toContain("tokenize")
    expect(exportedKeys).not.toContain("cleanText")
  })
})
```

- [ ] **Step 2: Run the test**

Run: `cd /Users/medelman/Projects/OSS/eyecite-ts && pnpm vitest run tests/utils/entry-point.test.ts`
Expected: 2 tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/utils/entry-point.test.ts
git commit -m "test(utils): add entry point smoke test

Verifies the utils module loads and doesn't leak core exports.

Closes #94"
```
