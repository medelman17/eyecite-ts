# Case Mention Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `groupByCase` utility that composes resolution, parallel linking, and short-form relationships into case groups — the standard next step after `extract → resolve`.

**Architecture:** Iterates the resolved citation array in one pass. Full case citations are assigned to groups by `groupId` (parallel detection) or `volume/reporter/page` identity. Short-form citations are added to the group their `resolution.resolvedTo` index points at. Returns groups in document order. Reuses `toReporterKeys` for the `parallelCitations` string array.

**Tech Stack:** TypeScript 5.9+, Vitest 4

**Spec:** `docs/superpowers/specs/2026-04-02-post-extraction-utils-design.md` (Section 2b)
**Issue:** #96

---

## Key Types (for reference)

```typescript
// Already defined in src/utils/types.ts:
interface CaseGroup {
  primaryCitation: FullCaseCitation;
  mentions: ResolvedCitation[];
  parallelCitations: string[];
}

// From src/resolve/types.ts:
type ResolvedCitation<C> = C extends ShortFormCitation
  ? C & { resolution: ResolutionResult | undefined }
  : C & { resolution?: undefined }

// resolution.resolvedTo is the INDEX in the citations array
```

## File Structure

| File | Responsibility |
|------|---------------|
| `src/utils/groupByCase.ts` | `groupByCase` function |
| `src/utils/index.ts` | (modify) Add `groupByCase` export |
| `tests/utils/groupByCase.test.ts` | All test cases |

---

### Task 1: Write failing tests

**Files:**
- Create: `tests/utils/groupByCase.test.ts`

- [ ] **Step 1: Create the test file**

```typescript
import { describe, expect, it } from "vitest"
import { groupByCase } from "../../src/utils"
import type { FullCaseCitation, IdCitation, ShortFormCaseCitation, StatuteCitation, SupraCitation } from "../../src/types/citation"
import type { ResolvedCitation } from "../../src/resolve/types"

/** Minimal CitationBase fields */
const BASE = {
  text: "",
  matchedText: "",
  confidence: 1,
  processTimeMs: 0,
  patternsChecked: 0,
} as const

function span(start: number): { cleanStart: number; cleanEnd: number; originalStart: number; originalEnd: number } {
  return { cleanStart: start, cleanEnd: start + 10, originalStart: start, originalEnd: start + 10 }
}

describe("groupByCase", () => {
  it("returns empty array for empty input", () => {
    expect(groupByCase([])).toEqual([])
  })

  it("groups a single full citation", () => {
    const cite: ResolvedCitation<FullCaseCitation> = {
      ...BASE,
      type: "case",
      volume: 550,
      reporter: "U.S.",
      page: 544,
      span: span(0),
      resolution: undefined,
    }
    const groups = groupByCase([cite])
    expect(groups).toHaveLength(1)
    expect(groups[0].primaryCitation).toBe(cite)
    expect(groups[0].mentions).toEqual([cite])
    expect(groups[0].parallelCitations).toEqual(["550 U.S. 544"])
  })

  it("groups parallel citations by groupId", () => {
    const primary: ResolvedCitation<FullCaseCitation> = {
      ...BASE,
      type: "case",
      volume: 410,
      reporter: "U.S.",
      page: 113,
      groupId: "410-U.S.-113",
      parallelCitations: [{ volume: 93, reporter: "S. Ct.", page: 705 }],
      span: span(0),
      resolution: undefined,
    }
    const secondary: ResolvedCitation<FullCaseCitation> = {
      ...BASE,
      type: "case",
      volume: 93,
      reporter: "S. Ct.",
      page: 705,
      groupId: "410-U.S.-113",
      span: span(50),
      resolution: undefined,
    }
    const groups = groupByCase([primary, secondary])
    expect(groups).toHaveLength(1)
    expect(groups[0].primaryCitation).toBe(primary)
    expect(groups[0].mentions).toEqual([primary, secondary])
    expect(groups[0].parallelCitations).toEqual(["410 U.S. 113", "93 S. Ct. 705"])
  })

  it("groups full citations with identical volume/reporter/page", () => {
    const first: ResolvedCitation<FullCaseCitation> = {
      ...BASE,
      type: "case",
      volume: 500,
      reporter: "F.2d",
      page: 123,
      span: span(0),
      resolution: undefined,
    }
    const second: ResolvedCitation<FullCaseCitation> = {
      ...BASE,
      type: "case",
      volume: 500,
      reporter: "F.2d",
      page: 123,
      span: span(100),
      resolution: undefined,
    }
    const groups = groupByCase([first, second])
    expect(groups).toHaveLength(1)
    expect(groups[0].mentions).toEqual([first, second])
  })

  it("adds resolved short-form citation to antecedent group", () => {
    const full: ResolvedCitation<FullCaseCitation> = {
      ...BASE,
      type: "case",
      volume: 500,
      reporter: "F.2d",
      page: 123,
      span: span(0),
      resolution: undefined,
    }
    const short: ResolvedCitation<ShortFormCaseCitation> = {
      ...BASE,
      type: "shortFormCase",
      volume: 500,
      reporter: "F.2d",
      page: 123,
      pincite: 125,
      span: span(100),
      resolution: { resolvedTo: 0, confidence: 1 },
    }
    const groups = groupByCase([full, short])
    expect(groups).toHaveLength(1)
    expect(groups[0].mentions).toEqual([full, short])
  })

  it("adds resolved Id. citation to antecedent group", () => {
    const full: ResolvedCitation<FullCaseCitation> = {
      ...BASE,
      type: "case",
      volume: 500,
      reporter: "F.2d",
      page: 123,
      span: span(0),
      resolution: undefined,
    }
    const id: ResolvedCitation<IdCitation> = {
      ...BASE,
      type: "id",
      pincite: 125,
      span: span(100),
      resolution: { resolvedTo: 0, confidence: 1 },
    }
    const groups = groupByCase([full, id])
    expect(groups).toHaveLength(1)
    expect(groups[0].mentions).toHaveLength(2)
  })

  it("adds resolved supra citation to antecedent group", () => {
    const full: ResolvedCitation<FullCaseCitation> = {
      ...BASE,
      type: "case",
      volume: 500,
      reporter: "F.2d",
      page: 123,
      span: span(0),
      resolution: undefined,
    }
    const supra: ResolvedCitation<SupraCitation> = {
      ...BASE,
      type: "supra",
      partyName: "Smith",
      pincite: 130,
      span: span(200),
      resolution: { resolvedTo: 0, confidence: 1 },
    }
    const groups = groupByCase([full, supra])
    expect(groups).toHaveLength(1)
    expect(groups[0].mentions).toHaveLength(2)
  })

  it("excludes unresolved short-form citations", () => {
    const full: ResolvedCitation<FullCaseCitation> = {
      ...BASE,
      type: "case",
      volume: 500,
      reporter: "F.2d",
      page: 123,
      span: span(0),
      resolution: undefined,
    }
    const unresolved: ResolvedCitation<IdCitation> = {
      ...BASE,
      type: "id",
      span: span(100),
      resolution: { confidence: 0, failureReason: "no antecedent" },
    }
    const groups = groupByCase([full, unresolved])
    expect(groups).toHaveLength(1)
    expect(groups[0].mentions).toEqual([full])
  })

  it("ignores non-case citations", () => {
    const caseCite: ResolvedCitation<FullCaseCitation> = {
      ...BASE,
      type: "case",
      volume: 500,
      reporter: "F.2d",
      page: 123,
      span: span(0),
      resolution: undefined,
    }
    const statute: ResolvedCitation<StatuteCitation> = {
      ...BASE,
      type: "statute",
      code: "U.S.C.",
      section: "1983",
      span: span(50),
      resolution: undefined,
    }
    const groups = groupByCase([caseCite, statute])
    expect(groups).toHaveLength(1)
    expect(groups[0].mentions).toEqual([caseCite])
  })

  it("preserves document order within groups", () => {
    const cite1: ResolvedCitation<FullCaseCitation> = {
      ...BASE, type: "case", volume: 500, reporter: "F.2d", page: 123,
      span: span(0), resolution: undefined,
    }
    const cite2: ResolvedCitation<FullCaseCitation> = {
      ...BASE, type: "case", volume: 600, reporter: "F.3d", page: 456,
      span: span(50), resolution: undefined,
    }
    const id1: ResolvedCitation<IdCitation> = {
      ...BASE, type: "id", span: span(100),
      resolution: { resolvedTo: 1, confidence: 1 },
    }
    const id2: ResolvedCitation<IdCitation> = {
      ...BASE, type: "id", span: span(150),
      resolution: { resolvedTo: 0, confidence: 1 },
    }
    const groups = groupByCase([cite1, cite2, id1, id2])
    expect(groups).toHaveLength(2)
    // Group for cite1 (index 0): cite1 + id2 (resolvedTo: 0)
    expect(groups[0].mentions).toEqual([cite1, id2])
    // Group for cite2 (index 1): cite2 + id1 (resolvedTo: 1)
    expect(groups[1].mentions).toEqual([cite2, id1])
  })

  it("returns groups in document order by first mention", () => {
    const citeB: ResolvedCitation<FullCaseCitation> = {
      ...BASE, type: "case", volume: 600, reporter: "F.3d", page: 456,
      span: span(0), resolution: undefined,
    }
    const citeA: ResolvedCitation<FullCaseCitation> = {
      ...BASE, type: "case", volume: 500, reporter: "F.2d", page: 123,
      span: span(50), resolution: undefined,
    }
    const groups = groupByCase([citeB, citeA])
    expect(groups).toHaveLength(2)
    expect(groups[0].primaryCitation).toBe(citeB)
    expect(groups[1].primaryCitation).toBe(citeA)
  })

  it("handles short form resolving to a parallel-grouped citation", () => {
    const primary: ResolvedCitation<FullCaseCitation> = {
      ...BASE, type: "case", volume: 410, reporter: "U.S.", page: 113,
      groupId: "410-U.S.-113",
      parallelCitations: [{ volume: 93, reporter: "S. Ct.", page: 705 }],
      span: span(0), resolution: undefined,
    }
    const secondary: ResolvedCitation<FullCaseCitation> = {
      ...BASE, type: "case", volume: 93, reporter: "S. Ct.", page: 705,
      groupId: "410-U.S.-113",
      span: span(50), resolution: undefined,
    }
    const id: ResolvedCitation<IdCitation> = {
      ...BASE, type: "id", span: span(100),
      resolution: { resolvedTo: 1, confidence: 1 },
    }
    const groups = groupByCase([primary, secondary, id])
    expect(groups).toHaveLength(1)
    expect(groups[0].mentions).toEqual([primary, secondary, id])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/medelman/Projects/OSS/eyecite-ts && pnpm vitest run tests/utils/groupByCase.test.ts`
Expected: FAIL — `groupByCase` is not exported

- [ ] **Step 3: Commit**

```bash
git add tests/utils/groupByCase.test.ts
git commit -m "test(utils): add failing tests for groupByCase

Covers parallel grouping, short-form resolution, Id./supra linking,
unresolved exclusion, non-case filtering, and document ordering.

Refs #96"
```

---

### Task 2: Implement groupByCase

**Files:**
- Create: `src/utils/groupByCase.ts`
- Modify: `src/utils/index.ts`

- [ ] **Step 1: Create `src/utils/groupByCase.ts`**

```typescript
import type { FullCaseCitation } from "../types/citation"
import type { ResolvedCitation } from "../resolve/types"
import type { CaseGroup } from "./types"
import { toReporterKeys } from "./reporterKey"

/**
 * Build a lookup key for a full case citation: "volume-reporter-page".
 * Used to group duplicate full citations that lack a parallel groupId.
 */
function citeKey(c: FullCaseCitation): string {
  return `${c.volume}-${c.reporter}-${c.page ?? "blank"}`
}

/**
 * Group resolved citations by underlying case.
 *
 * Composes parallel linking, resolution, and volume/reporter/page identity
 * into `CaseGroup` objects. Non-case citations are ignored. Unresolved
 * short-form citations are excluded.
 *
 * @example
 * ```typescript
 * const citations = extractCitations(text)
 * const resolved = resolveCitations(citations, text)
 * const groups = groupByCase(resolved)
 * ```
 */
export function groupByCase(citations: ResolvedCitation[]): CaseGroup[] {
  // Map from citation index → group index (for short-form resolution lookup)
  const indexToGroup = new Map<number, number>()
  // Map from groupId or citeKey → group index (for dedup)
  const keyToGroup = new Map<string, number>()
  const groups: CaseGroup[] = []

  // First pass: assign full case citations to groups
  for (let i = 0; i < citations.length; i++) {
    const cite = citations[i]
    if (cite.type !== "case") continue

    const fullCite = cite as ResolvedCitation<FullCaseCitation>

    // Check if this citation belongs to an existing group
    const gid = fullCite.groupId
    const key = citeKey(fullCite)
    const existingIdx = keyToGroup.get(gid ?? "") ?? keyToGroup.get(key)

    if (existingIdx !== undefined) {
      // Add to existing group
      groups[existingIdx].mentions.push(cite)
      indexToGroup.set(i, existingIdx)
    } else {
      // Create new group
      const groupIdx = groups.length
      const group: CaseGroup = {
        primaryCitation: fullCite,
        mentions: [cite],
        parallelCitations: toReporterKeys(fullCite),
      }
      groups.push(group)
      indexToGroup.set(i, groupIdx)
      keyToGroup.set(key, groupIdx)
      if (gid) {
        keyToGroup.set(gid, groupIdx)
      }
    }
  }

  // Second pass: assign short-form citations to their resolved group
  for (let i = 0; i < citations.length; i++) {
    const cite = citations[i]
    if (cite.type !== "id" && cite.type !== "supra" && cite.type !== "shortFormCase") continue

    const resolution = (cite as ResolvedCitation<typeof cite> & { resolution?: { resolvedTo?: number } }).resolution
    if (resolution?.resolvedTo === undefined) continue

    const groupIdx = indexToGroup.get(resolution.resolvedTo)
    if (groupIdx === undefined) continue

    groups[groupIdx].mentions.push(cite)
    indexToGroup.set(i, groupIdx)
  }

  // Sort mentions within each group by document position
  for (const group of groups) {
    group.mentions.sort((a, b) => a.span.originalStart - b.span.originalStart)
  }

  return groups
}
```

- [ ] **Step 2: Update barrel export**

The full `src/utils/index.ts` should be:

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
export { toBluebook } from "./bluebook"
export { groupByCase } from "./groupByCase"
```

- [ ] **Step 3: Run tests**

Run: `cd /Users/medelman/Projects/OSS/eyecite-ts && pnpm vitest run tests/utils/groupByCase.test.ts`
Expected: All tests pass (12 tests)

- [ ] **Step 4: Run typecheck + full suite + build**

Run: `cd /Users/medelman/Projects/OSS/eyecite-ts && pnpm typecheck && pnpm vitest run && pnpm build && pnpm size`
Expected: All pass. Utils under 3 KB.

- [ ] **Step 5: Commit**

```bash
git add src/utils/groupByCase.ts src/utils/index.ts
git commit -m "feat(utils): add groupByCase for case mention grouping

Groups resolved citations by underlying case using parallel detection
groupId, volume/reporter/page identity, and short-form resolution.
Non-case citations ignored, unresolved short forms excluded.

Closes #96"
```

---

### Task 3: Add changeset

**Files:**
- Create: `.changeset/group-by-case.md`

- [ ] **Step 1: Create changeset**

```markdown
---
"eyecite-ts": minor
---

Add `groupByCase` utility function to `eyecite-ts/utils` that groups resolved citations by underlying case using parallel detection, volume/reporter/page identity, and short-form resolution
```

- [ ] **Step 2: Commit**

```bash
git add .changeset/group-by-case.md
git commit -m "chore: add changeset for groupByCase"
```
