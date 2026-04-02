# Reporter Key Formatting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `toReporterKey` and `toReporterKeys` utility functions that extract the volume-reporter-page lookup key from a case citation.

**Architecture:** Two pure functions in `src/utils/reporterKey.ts`, exported from the `eyecite-ts/utils` barrel. `toReporterKey` returns the primary key; `toReporterKeys` returns all keys including parallel citations. Uses `normalizedReporter` when available, falls back to `reporter`. Handles blank-page citations.

**Tech Stack:** TypeScript 5.9+, Vitest 4

**Spec:** `docs/superpowers/specs/2026-04-02-post-extraction-utils-design.md` (Section 2c)
**Issue:** #97

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/utils/reporterKey.ts` | `toReporterKey` and `toReporterKeys` functions |
| `src/utils/index.ts` | (modify) Add function exports |
| `tests/utils/reporterKey.test.ts` | All test cases for both functions |

---

### Task 1: Write failing tests

**Files:**
- Create: `tests/utils/reporterKey.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { describe, expect, it } from "vitest"
import { toReporterKey, toReporterKeys } from "../../src/utils"
import type { FullCaseCitation } from "../../src/types/citation"

/**
 * Helper to build a minimal FullCaseCitation for testing.
 * Only includes fields relevant to reporter key formatting.
 */
function makeCitation(
  overrides: Partial<FullCaseCitation> & Pick<FullCaseCitation, "volume" | "reporter">,
): FullCaseCitation {
  return {
    type: "case",
    text: "",
    matchedText: "",
    span: { cleanStart: 0, cleanEnd: 0, originalStart: 0, originalEnd: 0 },
    confidence: 1,
    processTimeMs: 0,
    patternsChecked: 0,
    ...overrides,
  }
}

describe("toReporterKey", () => {
  it("formats a standard case citation", () => {
    const cite = makeCitation({ volume: 550, reporter: "U.S.", page: 544 })
    expect(toReporterKey(cite)).toBe("550 U.S. 544")
  })

  it("uses normalizedReporter when available", () => {
    const cite = makeCitation({
      volume: 500,
      reporter: "F. 2d",
      normalizedReporter: "F.2d",
      page: 123,
    })
    expect(toReporterKey(cite)).toBe("500 F.2d 123")
  })

  it("falls back to reporter when normalizedReporter is absent", () => {
    const cite = makeCitation({ volume: 500, reporter: "F.2d", page: 123 })
    expect(toReporterKey(cite)).toBe("500 F.2d 123")
  })

  it("handles string volume", () => {
    const cite = makeCitation({ volume: "2024-1", reporter: "F.4th", page: 100 })
    expect(toReporterKey(cite)).toBe("2024-1 F.4th 100")
  })

  it("omits page for blank-page citations", () => {
    const cite = makeCitation({
      volume: 500,
      reporter: "F.2d",
      hasBlankPage: true,
    })
    expect(toReporterKey(cite)).toBe("500 F.2d")
  })

  it("omits page when page is undefined", () => {
    const cite = makeCitation({ volume: 500, reporter: "F.2d" })
    expect(toReporterKey(cite)).toBe("500 F.2d")
  })
})

describe("toReporterKeys", () => {
  it("returns single-element array for citation without parallels", () => {
    const cite = makeCitation({ volume: 550, reporter: "U.S.", page: 544 })
    expect(toReporterKeys(cite)).toEqual(["550 U.S. 544"])
  })

  it("includes parallel citations", () => {
    const cite = makeCitation({
      volume: 410,
      reporter: "U.S.",
      page: 113,
      parallelCitations: [{ volume: 93, reporter: "S. Ct.", page: 705 }],
    })
    expect(toReporterKeys(cite)).toEqual(["410 U.S. 113", "93 S. Ct. 705"])
  })

  it("includes multiple parallel citations", () => {
    const cite = makeCitation({
      volume: 410,
      reporter: "U.S.",
      page: 113,
      parallelCitations: [
        { volume: 93, reporter: "S. Ct.", page: 705 },
        { volume: 35, reporter: "L. Ed. 2d", page: 147 },
      ],
    })
    expect(toReporterKeys(cite)).toEqual([
      "410 U.S. 113",
      "93 S. Ct. 705",
      "35 L. Ed. 2d 147",
    ])
  })

  it("returns single-element array when parallelCitations is empty", () => {
    const cite = makeCitation({
      volume: 550,
      reporter: "U.S.",
      page: 544,
      parallelCitations: [],
    })
    expect(toReporterKeys(cite)).toEqual(["550 U.S. 544"])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/medelman/Projects/OSS/eyecite-ts && pnpm vitest run tests/utils/reporterKey.test.ts`
Expected: FAIL — `toReporterKey` and `toReporterKeys` are not exported from `../../src/utils`

- [ ] **Step 3: Commit failing tests**

```bash
git add tests/utils/reporterKey.test.ts
git commit -m "test(utils): add failing tests for toReporterKey / toReporterKeys

Refs #97"
```

---

### Task 2: Implement and wire up

**Files:**
- Create: `src/utils/reporterKey.ts`
- Modify: `src/utils/index.ts`

- [ ] **Step 1: Create `src/utils/reporterKey.ts`**

```typescript
import type { FullCaseCitation } from "../types/citation"

/**
 * Format a volume-reporter-page key from citation fields.
 */
function formatKey(
  volume: number | string,
  reporter: string,
  page: number | undefined,
): string {
  if (page === undefined) {
    return `${volume} ${reporter}`
  }
  return `${volume} ${reporter} ${page}`
}

/**
 * Extract the volume-reporter-page lookup key from a case citation.
 *
 * Strips case name, pincite, year, and parenthetical.
 * Uses `normalizedReporter` when available, falls back to `reporter`.
 * Omits the page for blank-page citations.
 *
 * @example
 * ```typescript
 * toReporterKey(citation) // "550 U.S. 544"
 * ```
 */
export function toReporterKey(citation: FullCaseCitation): string {
  const reporter = citation.normalizedReporter ?? citation.reporter
  const page = citation.hasBlankPage ? undefined : citation.page
  return formatKey(citation.volume, reporter, page)
}

/**
 * Extract all volume-reporter-page lookup keys from a case citation,
 * including parallel citations.
 *
 * Returns the primary key first, followed by any parallel citation keys.
 *
 * @example
 * ```typescript
 * toReporterKeys(citation) // ["410 U.S. 113", "93 S. Ct. 705"]
 * ```
 */
export function toReporterKeys(citation: FullCaseCitation): string[] {
  const keys = [toReporterKey(citation)]

  if (citation.parallelCitations?.length) {
    for (const p of citation.parallelCitations) {
      keys.push(formatKey(p.volume, p.reporter, p.page))
    }
  }

  return keys
}
```

- [ ] **Step 2: Update barrel export in `src/utils/index.ts`**

Add the function exports after the existing type exports. The full file should be:

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
export { toReporterKey, toReporterKeys } from "./reporterKey"
```

- [ ] **Step 3: Run tests**

Run: `cd /Users/medelman/Projects/OSS/eyecite-ts && pnpm vitest run tests/utils/reporterKey.test.ts`
Expected: All 10 tests pass

- [ ] **Step 4: Run typecheck**

Run: `cd /Users/medelman/Projects/OSS/eyecite-ts && pnpm typecheck`
Expected: No errors

- [ ] **Step 5: Run full test suite to check for regressions**

Run: `cd /Users/medelman/Projects/OSS/eyecite-ts && pnpm vitest run`
Expected: All tests pass (1206+ tests)

- [ ] **Step 6: Run build + size check**

Run: `cd /Users/medelman/Projects/OSS/eyecite-ts && pnpm build && pnpm size`
Expected: Build passes. Utils bundle still under 3 KB.

- [ ] **Step 7: Commit**

```bash
git add src/utils/reporterKey.ts src/utils/index.ts
git commit -m "feat(utils): add toReporterKey and toReporterKeys

Extracts volume-reporter-page lookup keys from case citations.
Uses normalizedReporter when available, handles blank pages,
and includes parallel citation keys.

Closes #97"
```

---

### Task 3: Add changeset

**Files:**
- Create: `.changeset/reporter-key-formatting.md`

- [ ] **Step 1: Create changeset**

```markdown
---
"eyecite-ts": minor
---

Add `toReporterKey` and `toReporterKeys` utility functions to `eyecite-ts/utils` for extracting volume-reporter-page lookup keys from case citations
```

- [ ] **Step 2: Commit**

```bash
git add .changeset/reporter-key-formatting.md
git commit -m "chore: add changeset for reporter key formatting"
```
