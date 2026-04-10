# Component Spans (#172) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-component position data (`Span`) to every citation type so consumers can highlight, annotate, or link individual components (volume, reporter, page, court, year, etc.).

**Architecture:** New `spanFromGroupIndex` helper uses ES2022 `match.indices` to convert regex capture groups into `Span` objects. Per-type span interfaces (`CaseComponentSpans`, `StatuteComponentSpans`, etc.) are added to citation types. Each extractor threads positions through to the output. Always-on — no opt-in flag.

**Tech Stack:** TypeScript, Vitest, ES2022 `RegExp.prototype.indices` (`d` flag)

**Spec:** `docs/superpowers/specs/2026-04-10-component-spans-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/types/componentSpans.ts` | Per-type span interfaces (8 interfaces) |
| Modify | `src/types/span.ts` | Add `spanFromGroupIndex` helper |
| Modify | `src/types/citation.ts` | Add `spans?` to 8 citation types, `span?` to `Parenthetical` |
| Modify | `src/types/index.ts` | Re-export new span interfaces |
| Modify | `src/index.ts` | Re-export new span interfaces |
| Modify | `src/extract/extractCase.ts` | Wire up `CaseComponentSpans` |
| Modify | `src/extract/statutes/extractFederal.ts` | Wire up `StatuteComponentSpans` |
| Modify | `src/extract/statutes/extractProse.ts` | Wire up `StatuteComponentSpans` |
| Modify | `src/extract/statutes/extractAbbreviated.ts` | Wire up `StatuteComponentSpans` |
| Modify | `src/extract/statutes/extractNamedCode.ts` | Wire up `StatuteComponentSpans` |
| Modify | `src/extract/statutes/extractChapterAct.ts` | Wire up `StatuteComponentSpans` |
| Modify | `src/patterns/constitutionalPatterns.ts` | Add `d` flag to `CONSTITUTIONAL_BODY_RE` |
| Modify | `src/extract/extractConstitutional.ts` | Wire up `ConstitutionalComponentSpans` |
| Modify | `src/extract/extractJournal.ts` | Wire up `JournalComponentSpans` |
| Modify | `src/extract/extractNeutral.ts` | Wire up `NeutralComponentSpans` |
| Modify | `src/extract/extractPublicLaw.ts` | Wire up `PublicLawComponentSpans` |
| Modify | `src/extract/extractFederalRegister.ts` | Wire up `FederalRegisterComponentSpans` |
| Modify | `src/extract/extractStatutesAtLarge.ts` | Wire up `StatutesAtLargeComponentSpans` |
| Create | `tests/types/spanFromGroupIndex.test.ts` | Unit tests for the helper |
| Create | `tests/extract/componentSpans.case.test.ts` | Case extractor span tests |
| Create | `tests/extract/componentSpans.statute.test.ts` | Statute family span tests |
| Create | `tests/extract/componentSpans.others.test.ts` | Constitutional, journal, neutral, publicLaw, fedReg, statAtLarge span tests |
| Create | `tests/integration/componentSpans.test.ts` | CourtListener fixture integration tests |

---

### Task 1: Create `spanFromGroupIndex` Helper

**Files:**
- Modify: `src/types/span.ts:49-65`
- Create: `tests/types/spanFromGroupIndex.test.ts`

- [ ] **Step 1: Write failing tests for `spanFromGroupIndex`**

```typescript
import { describe, expect, it } from "vitest"
import { spanFromGroupIndex } from "@/types/span"
import type { TransformationMap } from "@/types/span"

/** Build a trivial TransformationMap where clean positions === original positions */
function identityMap(length: number): TransformationMap {
  const cleanToOriginal = new Map<number, number>()
  const originalToClean = new Map<number, number>()
  for (let i = 0; i <= length; i++) {
    cleanToOriginal.set(i, i)
    originalToClean.set(i, i)
  }
  return { cleanToOriginal, originalToClean }
}

describe("spanFromGroupIndex", () => {
  it("computes span for first capture group", () => {
    // Token text: "500 F.2d 123" starting at cleanStart=10
    // Regex: /^(\d+)\s+([\w.]+)\s+(\d+)/d
    // Group 1 (volume "500"): indices [0, 3]
    const map = identityMap(30)
    const span = spanFromGroupIndex(10, [0, 3], map)
    expect(span).toEqual({
      cleanStart: 10,
      cleanEnd: 13,
      originalStart: 10,
      originalEnd: 13,
    })
  })

  it("computes span for middle capture group", () => {
    // Group 2 (reporter "F.2d"): indices [4, 8]
    const map = identityMap(30)
    const span = spanFromGroupIndex(10, [4, 8], map)
    expect(span).toEqual({
      cleanStart: 14,
      cleanEnd: 18,
      originalStart: 14,
      originalEnd: 18,
    })
  })

  it("computes span for last capture group", () => {
    // Group 3 (page "123"): indices [9, 12]
    const map = identityMap(30)
    const span = spanFromGroupIndex(10, [9, 12], map)
    expect(span).toEqual({
      cleanStart: 19,
      cleanEnd: 22,
      originalStart: 19,
      originalEnd: 22,
    })
  })

  it("resolves through TransformationMap with offset", () => {
    // Simulate HTML entity expanding: clean pos 5 → original pos 9
    const map: TransformationMap = {
      cleanToOriginal: new Map([
        [5, 9],
        [8, 12],
      ]),
      originalToClean: new Map(),
    }
    const span = spanFromGroupIndex(5, [0, 3], map)
    expect(span.cleanStart).toBe(5)
    expect(span.cleanEnd).toBe(8)
    expect(span.originalStart).toBe(9)
    expect(span.originalEnd).toBe(12)
  })

  it("falls back to clean position when map entry missing", () => {
    const map: TransformationMap = {
      cleanToOriginal: new Map(),
      originalToClean: new Map(),
    }
    const span = spanFromGroupIndex(10, [0, 3], map)
    expect(span.originalStart).toBe(10)
    expect(span.originalEnd).toBe(13)
  })

  it("works end-to-end with actual d-flag regex execution", () => {
    // Verify match.indices integration with a real regex
    const regex = /^(\d+)\s+([A-Za-z.]+)\s+(\d+)/d
    const text = "500 F.2d 123"
    const match = regex.exec(text)
    expect(match).not.toBeNull()
    expect(match!.indices).toBeDefined()

    const map = identityMap(30)
    const tokenCleanStart = 10

    const volumeSpan = spanFromGroupIndex(tokenCleanStart, match!.indices![1]!, map)
    expect(volumeSpan).toEqual({ cleanStart: 10, cleanEnd: 13, originalStart: 10, originalEnd: 13 })
    expect(text.substring(match!.indices![1]![0], match!.indices![1]![1])).toBe("500")

    const reporterSpan = spanFromGroupIndex(tokenCleanStart, match!.indices![2]!, map)
    expect(text.substring(match!.indices![2]![0], match!.indices![2]![1])).toBe("F.2d")
    expect(reporterSpan.cleanEnd - reporterSpan.cleanStart).toBe(4)

    const pageSpan = spanFromGroupIndex(tokenCleanStart, match!.indices![3]!, map)
    expect(text.substring(match!.indices![3]![0], match!.indices![3]![1])).toBe("123")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/types/spanFromGroupIndex.test.ts`
Expected: FAIL — `spanFromGroupIndex` is not exported from `@/types/span`

- [ ] **Step 3: Implement `spanFromGroupIndex`**

Add to `src/types/span.ts` after the existing `resolveOriginalSpan` function:

```typescript
/**
 * Build a Span for a regex capture group using match.indices (ES2022 `d` flag).
 *
 * Requires the regex to have the `d` flag so match.indices is populated.
 * The indices are relative to the token text — tokenCleanStart translates
 * them to document-level clean-text positions, then resolveOriginalSpan
 * maps to original positions via TransformationMap.
 *
 * @param tokenCleanStart - The token's cleanStart position in the document
 * @param indices - match.indices[n] for the capture group: [start, end]
 * @param map - TransformationMap for clean→original resolution
 * @returns Span with both clean and original coordinates
 */
export function spanFromGroupIndex(
  tokenCleanStart: number,
  indices: [number, number],
  map: TransformationMap,
): Span {
  const cleanStart = tokenCleanStart + indices[0]
  const cleanEnd = tokenCleanStart + indices[1]
  const { originalStart, originalEnd } = resolveOriginalSpan(
    { cleanStart, cleanEnd },
    map,
  )
  return { cleanStart, cleanEnd, originalStart, originalEnd }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/types/spanFromGroupIndex.test.ts`
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/span.ts tests/types/spanFromGroupIndex.test.ts
git commit -m "feat(#172): add spanFromGroupIndex helper for regex group → Span conversion"
```

---

### Task 2: Create Component Span Interfaces and Wire Into Types

**Files:**
- Create: `src/types/componentSpans.ts`
- Modify: `src/types/citation.ts:143-148` (Parenthetical), `src/types/citation.ts:196-358` (FullCaseCitation), and all other citation interfaces
- Modify: `src/types/index.ts`
- Modify: `src/index.ts:28-58`

- [ ] **Step 1: Create `src/types/componentSpans.ts`**

```typescript
import type { Span } from "./span"

/**
 * Component spans for case citations (type: "case").
 *
 * Containment: when both `metadataParenthetical` and `court`/`year` are present,
 * `court` and `year` are sub-ranges within `metadataParenthetical`. Consumers
 * rendering highlights should use either the parent or child spans, not both.
 */
export interface CaseComponentSpans {
  caseName?: Span
  plaintiff?: Span
  defendant?: Span
  volume?: Span
  reporter?: Span
  page?: Span
  pincite?: Span
  court?: Span
  year?: Span
  signal?: Span
  metadataParenthetical?: Span
}

/** Component spans for statute citations (type: "statute"). */
export interface StatuteComponentSpans {
  title?: Span
  code?: Span
  section?: Span
  subsection?: Span
  signal?: Span
}

/** Component spans for constitutional citations (type: "constitutional"). */
export interface ConstitutionalComponentSpans {
  jurisdiction?: Span
  article?: Span
  amendment?: Span
  section?: Span
  clause?: Span
  signal?: Span
}

/** Component spans for journal citations (type: "journal"). */
export interface JournalComponentSpans {
  volume?: Span
  journal?: Span
  page?: Span
  pincite?: Span
  year?: Span
  signal?: Span
}

/** Component spans for neutral citations (type: "neutral"). */
export interface NeutralComponentSpans {
  year?: Span
  court?: Span
  documentNumber?: Span
  signal?: Span
}

/** Component spans for public law citations (type: "publicLaw"). */
export interface PublicLawComponentSpans {
  congress?: Span
  lawNumber?: Span
  signal?: Span
}

/** Component spans for federal register citations (type: "federalRegister"). */
export interface FederalRegisterComponentSpans {
  volume?: Span
  page?: Span
  year?: Span
  signal?: Span
}

/** Component spans for statutes at large citations (type: "statutesAtLarge"). */
export interface StatutesAtLargeComponentSpans {
  volume?: Span
  page?: Span
  year?: Span
  signal?: Span
}
```

- [ ] **Step 2: Add `span?` to `Parenthetical` in `src/types/citation.ts`**

Find the `Parenthetical` interface (around line 143) and add the `span` field:

```typescript
export interface Parenthetical {
  /** Full text content between the parentheses (excluding parens themselves) */
  text: string
  /** Signal-word classification based on leading gerund */
  type: ParentheticalType
  /** Position of full parenthetical block including delimiters */
  span?: Span
}
```

- [ ] **Step 3: Add `spans?` to each of the 8 full citation type interfaces in `src/types/citation.ts`**

Add the import at the top of `src/types/citation.ts`:

```typescript
import type {
  CaseComponentSpans,
  ConstitutionalComponentSpans,
  FederalRegisterComponentSpans,
  JournalComponentSpans,
  NeutralComponentSpans,
  PublicLawComponentSpans,
  StatuteComponentSpans,
  StatutesAtLargeComponentSpans,
} from "./componentSpans"
```

Then add to each interface, just before the closing `}`:

- `FullCaseCitation`: `spans?: CaseComponentSpans`
- `StatuteCitation`: `spans?: StatuteComponentSpans`
- `ConstitutionalCitation`: `spans?: ConstitutionalComponentSpans`
- `JournalCitation`: `spans?: JournalComponentSpans`
- `NeutralCitation`: `spans?: NeutralComponentSpans`
- `PublicLawCitation`: `spans?: PublicLawComponentSpans`
- `FederalRegisterCitation`: `spans?: FederalRegisterComponentSpans`
- `StatutesAtLargeCitation`: `spans?: StatutesAtLargeComponentSpans`

- [ ] **Step 4: Export from `src/types/index.ts`**

Add to the existing export block:

```typescript
export type {
  CaseComponentSpans,
  ConstitutionalComponentSpans,
  FederalRegisterComponentSpans,
  JournalComponentSpans,
  NeutralComponentSpans,
  PublicLawComponentSpans,
  StatuteComponentSpans,
  StatutesAtLargeComponentSpans,
} from "./componentSpans"

export { spanFromGroupIndex } from "./span"
```

- [ ] **Step 5: Export from `src/index.ts`**

Add `spanFromGroupIndex` to the granular API exports and the component span types to the type exports:

```typescript
// In the type exports block (top of file):
export type {
  // ... existing type exports ...
  CaseComponentSpans,
  ConstitutionalComponentSpans,
  FederalRegisterComponentSpans,
  JournalComponentSpans,
  NeutralComponentSpans,
  PublicLawComponentSpans,
  StatuteComponentSpans,
  StatutesAtLargeComponentSpans,
} from "./types"

// In the granular API section:
export { spanFromGroupIndex } from "./types"
```

- [ ] **Step 6: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS — all types compile, no existing tests break

- [ ] **Step 7: Commit**

```bash
git add src/types/componentSpans.ts src/types/citation.ts src/types/index.ts src/index.ts
git commit -m "feat(#172): add component span interfaces and wire into citation types"
```

---

### Task 3: Wire Up Simple Extractors (Neutral, FederalRegister, StatutesAtLarge, PublicLaw)

These 4 extractors each have a single regex with 2-3 capture groups. Simplest to wire up first.

**Files:**
- Modify: `src/extract/extractNeutral.ts`
- Modify: `src/extract/extractFederalRegister.ts`
- Modify: `src/extract/extractStatutesAtLarge.ts`
- Modify: `src/extract/extractPublicLaw.ts`
- Create: `tests/extract/componentSpans.others.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"

/** Assert a component span brackets the expected text in the original input */
function expectSpan(text: string, span: { originalStart: number; originalEnd: number } | undefined, expected: string) {
  expect(span).toBeDefined()
  expect(text.substring(span!.originalStart, span!.originalEnd)).toBe(expected)
}

describe("Component Spans — Neutral", () => {
  it("tracks year, court, documentNumber spans", () => {
    const text = "See 2020 WL 123456."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "neutral")
    expect(c).toBeDefined()
    if (c?.type !== "neutral") return

    expectSpan(text, c.spans?.year, "2020")
    expectSpan(text, c.spans?.court, "WL")
    expectSpan(text, c.spans?.documentNumber, "123456")
  })
})

describe("Component Spans — Federal Register", () => {
  it("tracks volume and page spans", () => {
    const text = "See 85 Fed. Reg. 12345."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "federalRegister")
    expect(c).toBeDefined()
    if (c?.type !== "federalRegister") return

    expectSpan(text, c.spans?.volume, "85")
    expectSpan(text, c.spans?.page, "12345")
  })
})

describe("Component Spans — Statutes at Large", () => {
  it("tracks volume and page spans", () => {
    const text = "See 124 Stat. 119."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "statutesAtLarge")
    expect(c).toBeDefined()
    if (c?.type !== "statutesAtLarge") return

    expectSpan(text, c.spans?.volume, "124")
    expectSpan(text, c.spans?.page, "119")
  })
})

describe("Component Spans — Public Law", () => {
  it("tracks congress and lawNumber spans", () => {
    const text = "See Pub. L. No. 116-283."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "publicLaw")
    expect(c).toBeDefined()
    if (c?.type !== "publicLaw") return

    expectSpan(text, c.spans?.congress, "116")
    expectSpan(text, c.spans?.lawNumber, "283")
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/extract/componentSpans.others.test.ts`
Expected: FAIL — `spans` is undefined on all citations

- [ ] **Step 3: Wire up `extractNeutral`**

In `src/extract/extractNeutral.ts`, add the `d` flag to the regex and compute spans:

```typescript
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import type { NeutralComponentSpans } from "@/types/componentSpans"

// Add `d` flag for match.indices:
const neutralRegex = /^(\d{4})\s+(.+?)\s+(\d+)$/d

// Inside extractNeutral, after the existing match check:
  let spans: NeutralComponentSpans | undefined
  if (match?.indices) {
    spans = {
      year: spanFromGroupIndex(span.cleanStart, match.indices[1]!, map),
      court: spanFromGroupIndex(span.cleanStart, match.indices[2]!, map),
      documentNumber: spanFromGroupIndex(span.cleanStart, match.indices[3]!, map),
    }
  }

// Add `spans` to the return object
```

Rename the `transformationMap` parameter to `map` for brevity (used in all `spanFromGroupIndex` calls), or keep it — just be consistent.

- [ ] **Step 4: Wire up `extractFederalRegister`**

In `src/extract/extractFederalRegister.ts`, add `d` flag and compute spans:

```typescript
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import type { FederalRegisterComponentSpans } from "@/types/componentSpans"

// Add `d` flag:
const federalRegisterRegex = /^(\d+(?:-\d+)?)\s+Fed\.\s?Reg\.\s+(\d+)/d

// After match check:
  let spans: FederalRegisterComponentSpans | undefined
  if (match?.indices) {
    spans = {
      volume: spanFromGroupIndex(span.cleanStart, match.indices[1]!, map),
      page: spanFromGroupIndex(span.cleanStart, match.indices[2]!, map),
    }
  }

// Add `spans` to return
```

- [ ] **Step 5: Wire up `extractStatutesAtLarge`**

In `src/extract/extractStatutesAtLarge.ts`, add `d` flag and compute spans:

```typescript
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import type { StatutesAtLargeComponentSpans } from "@/types/componentSpans"

// Add `d` flag:
const statRegex = /^(\d+(?:-\d+)?)\s+Stat\.\s+(\d+)/d

// After match check:
  let spans: StatutesAtLargeComponentSpans | undefined
  if (match?.indices) {
    spans = {
      volume: spanFromGroupIndex(span.cleanStart, match.indices[1]!, map),
      page: spanFromGroupIndex(span.cleanStart, match.indices[2]!, map),
    }
  }

// Add `spans` to return
```

- [ ] **Step 6: Wire up `extractPublicLaw`**

In `src/extract/extractPublicLaw.ts`, add `d` flag and compute spans:

```typescript
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import type { PublicLawComponentSpans } from "@/types/componentSpans"

// Add `d` flag:
const publicLawRegex = /Pub\.\s?L\.(?:\s?No\.)?\s?(\d+)-(\d+)/d

// After match check:
  let spans: PublicLawComponentSpans | undefined
  if (match?.indices) {
    spans = {
      congress: spanFromGroupIndex(span.cleanStart, match.indices[1]!, map),
      lawNumber: spanFromGroupIndex(span.cleanStart, match.indices[2]!, map),
    }
  }

// Add `spans` to return
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/extract/componentSpans.others.test.ts`
Expected: 4 tests PASS

- [ ] **Step 8: Run full test suite for regressions**

Run: `pnpm exec vitest run`
Expected: All existing tests PASS

- [ ] **Step 9: Commit**

```bash
git add src/extract/extractNeutral.ts src/extract/extractFederalRegister.ts src/extract/extractStatutesAtLarge.ts src/extract/extractPublicLaw.ts tests/extract/componentSpans.others.test.ts
git commit -m "feat(#172): add component spans to neutral, federal register, statutes at large, public law"
```

---

### Task 4: Wire Up Journal and Constitutional Extractors

**Files:**
- Modify: `src/extract/extractJournal.ts`
- Modify: `src/extract/extractConstitutional.ts`
- Modify: `tests/extract/componentSpans.others.test.ts` (add new describe blocks)

- [ ] **Step 1: Write failing tests for journal spans**

Add to `tests/extract/componentSpans.others.test.ts`:

```typescript
describe("Component Spans — Journal", () => {
  it("tracks volume, journal, page spans", () => {
    const text = "See 100 Harv. L. Rev. 1234."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "journal")
    expect(c).toBeDefined()
    if (c?.type !== "journal") return

    expectSpan(text, c.spans?.volume, "100")
    expectSpan(text, c.spans?.journal, "Harv. L. Rev.")
    expectSpan(text, c.spans?.page, "1234")
  })

  it("tracks pincite span when present", () => {
    const text = "See 75 Yale L.J. 456, 460."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "journal")
    expect(c).toBeDefined()
    if (c?.type !== "journal") return

    expectSpan(text, c.spans?.pincite, "460")
  })

  it("tracks year span when present in parenthetical", () => {
    const text = "See 75 Yale L.J. 456 (2020)."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "journal")
    expect(c).toBeDefined()
    if (c?.type !== "journal") return

    expectSpan(text, c.spans?.year, "2020")
  })
})
```

- [ ] **Step 2: Write failing tests for constitutional spans**

Add to `tests/extract/componentSpans.others.test.ts`:

```typescript
describe("Component Spans — Constitutional", () => {
  it("tracks amendment and section spans for US Constitution", () => {
    const text = "See U.S. Const. amend. XIV, § 1."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "constitutional")
    expect(c).toBeDefined()
    if (c?.type !== "constitutional") return

    expect(c.spans?.amendment).toBeDefined()
    expect(c.spans?.section).toBeDefined()
    expectSpan(text, c.spans?.jurisdiction, "U.S.")
  })

  it("tracks article and section spans", () => {
    const text = "See U.S. Const. art. III, § 2."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "constitutional")
    expect(c).toBeDefined()
    if (c?.type !== "constitutional") return

    expect(c.spans?.article).toBeDefined()
    expect(c.spans?.section).toBeDefined()
  })

  it("tracks jurisdiction span for state constitutions", () => {
    const text = "See Cal. Const. art. I, § 7."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "constitutional")
    expect(c).toBeDefined()
    if (c?.type !== "constitutional") return

    expectSpan(text, c.spans?.jurisdiction, "Cal.")
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/extract/componentSpans.others.test.ts`
Expected: New tests FAIL, previous tests still PASS

- [ ] **Step 4: Wire up `extractJournal`**

In `src/extract/extractJournal.ts`, add `d` flag and compute spans:

```typescript
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import type { JournalComponentSpans } from "@/types/componentSpans"

// Add `d` flag to main regex:
const journalRegex = /^(\d+(?:-\d+)?)\s+([A-Za-z.\s]+?)\s+(\d+)/d

// Add `d` flag to pincite regex:
const pinciteRegex = /,\s*(\d+)/d

// Add `d` flag to year regex (journal extractor doesn't currently extract year —
// add a year regex similar to federalRegister/statutesAtLarge):
const yearRegex = /\((?:.*?\s)?(\d{4})\)/d

// After match/pincite parsing, add year extraction:
  const yearMatch = yearRegex.exec(text)
  const year = yearMatch ? Number.parseInt(yearMatch[1], 10) : undefined

// Build spans:
  let spans: JournalComponentSpans | undefined
  if (match?.indices) {
    spans = {
      volume: spanFromGroupIndex(span.cleanStart, match.indices[1]!, map),
      journal: spanFromGroupIndex(span.cleanStart, match.indices[2]!, map),
      page: spanFromGroupIndex(span.cleanStart, match.indices[3]!, map),
    }
    if (pinciteMatch?.indices?.[1]) {
      spans.pincite = spanFromGroupIndex(span.cleanStart, pinciteMatch.indices[1], map)
    }
    if (yearMatch?.indices?.[1]) {
      spans.year = spanFromGroupIndex(span.cleanStart, yearMatch.indices[1], map)
    }
  }

// Add `spans` and `year` to return
```

- [ ] **Step 5: Wire up `extractConstitutional`**

In `src/extract/extractConstitutional.ts`, the body regex (`CONSTITUTIONAL_BODY_RE`) captures groups for the article/amendment numeral, section, and clause. The jurisdiction comes from the token's `patternId` but we need its text position. Use `match.indices` on the body regex for article/amendment/section/clause. For jurisdiction, find its position in the token text.

```typescript
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import type { ConstitutionalComponentSpans } from "@/types/componentSpans"

// Import CONSTITUTIONAL_BODY_RE and add `d` flag to it in constitutionalPatterns.ts
// (or create a local copy with `d` flag if the shared pattern is used elsewhere without it)

// After bodyMatch parsing and jurisdiction resolution:
  const spans: ConstitutionalComponentSpans = {}

  // Jurisdiction span: find the jurisdiction text in the token
  if (jurisdiction === "US") {
    const usIdx = text.indexOf("U.S.")
    if (usIdx !== -1) {
      spans.jurisdiction = spanFromGroupIndex(span.cleanStart, [usIdx, usIdx + 4], map)
    }
  } else if (jurisdiction && token.patternId === "state-constitution") {
    const prefixMatch = STATE_PREFIX_RE.exec(text)
    if (prefixMatch) {
      spans.jurisdiction = spanFromGroupIndex(span.cleanStart, [0, prefixMatch[1].length + 1], map)
    }
  }

  // Article/amendment, section, clause from bodyMatch.indices
  if (bodyMatch?.indices) {
    if (IS_AMENDMENT_RE.test(bodyMatch[0])) {
      if (bodyMatch.indices[1]) spans.amendment = spanFromGroupIndex(span.cleanStart, bodyMatch.indices[1], map)
    } else {
      if (bodyMatch.indices[1]) spans.article = spanFromGroupIndex(span.cleanStart, bodyMatch.indices[1], map)
    }
    if (bodyMatch.indices[2]) spans.section = spanFromGroupIndex(span.cleanStart, bodyMatch.indices[2], map)
    if (bodyMatch.indices[3]) spans.clause = spanFromGroupIndex(span.cleanStart, bodyMatch.indices[3], map)
  }

// Add `spans` to return
```

**Note:** `CONSTITUTIONAL_BODY_RE` is imported from `src/patterns/constitutionalPatterns.ts`. The `d` flag needs to be added there. Check if it's used elsewhere before adding — if so, create a local `d`-flagged copy.

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/extract/componentSpans.others.test.ts`
Expected: All tests PASS

- [ ] **Step 7: Run full test suite for regressions**

Run: `pnpm exec vitest run`
Expected: All existing tests PASS

- [ ] **Step 8: Commit**

```bash
git add src/extract/extractJournal.ts src/extract/extractConstitutional.ts src/patterns/constitutionalPatterns.ts tests/extract/componentSpans.others.test.ts
git commit -m "feat(#172): add component spans to journal and constitutional extractors"
```

---

### Task 5: Wire Up Statute Family Extractors

**Files:**
- Modify: `src/extract/statutes/extractFederal.ts`
- Modify: `src/extract/statutes/extractProse.ts`
- Modify: `src/extract/statutes/extractAbbreviated.ts`
- Modify: `src/extract/statutes/extractNamedCode.ts`
- Modify: `src/extract/statutes/extractChapterAct.ts`
- Create: `tests/extract/componentSpans.statute.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"

function expectSpan(text: string, span: { originalStart: number; originalEnd: number } | undefined, expected: string) {
  expect(span).toBeDefined()
  expect(text.substring(span!.originalStart, span!.originalEnd)).toBe(expected)
}

describe("Component Spans — Federal Statute (USC)", () => {
  it("tracks title, code, section spans", () => {
    const text = "See 42 U.S.C. § 1983."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "statute")
    expect(c).toBeDefined()
    if (c?.type !== "statute") return

    expectSpan(text, c.spans?.title, "42")
    expectSpan(text, c.spans?.code, "U.S.C.")
    expectSpan(text, c.spans?.section, "1983")
  })

  it("tracks subsection span", () => {
    const text = "See 42 U.S.C. § 1983(a)(1)."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "statute")
    expect(c).toBeDefined()
    if (c?.type !== "statute") return

    expectSpan(text, c.spans?.section, "1983")
    expect(c.spans?.subsection).toBeDefined()
  })
})

describe("Component Spans — Prose Statute", () => {
  it("tracks section and title spans", () => {
    const text = "See section 1983 of title 42."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "statute")
    expect(c).toBeDefined()
    if (c?.type !== "statute") return

    expectSpan(text, c.spans?.section, "1983")
    expectSpan(text, c.spans?.title, "42")
  })
})

describe("Component Spans — Named Code Statute", () => {
  it("tracks code and section spans for Cal. Civ. Code", () => {
    const text = "See Cal. Civ. Code § 1714."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "statute")
    expect(c).toBeDefined()
    if (c?.type !== "statute") return

    expect(c.spans?.code).toBeDefined()
    expectSpan(text, c.spans?.section, "1714")
  })
})

describe("Component Spans — Abbreviated Code Statute", () => {
  it("tracks code and section spans for Fla. Stat.", () => {
    const text = "See Fla. Stat. § 768.81."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "statute")
    expect(c).toBeDefined()
    if (c?.type !== "statute") return

    expect(c.spans?.code).toBeDefined()
    expectSpan(text, c.spans?.section, "768.81")
  })
})

describe("Component Spans — Chapter-Act Statute (ILCS)", () => {
  it("tracks title (chapter), code (act), section spans", () => {
    const text = "See 735 ILCS 5/2-1001."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "statute")
    expect(c).toBeDefined()
    if (c?.type !== "statute") return

    expectSpan(text, c.spans?.title, "735")
    expectSpan(text, c.spans?.code, "5")
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/extract/componentSpans.statute.test.ts`
Expected: FAIL — `spans` is undefined

- [ ] **Step 3: Wire up `extractFederal`**

In `src/extract/statutes/extractFederal.ts`:

```typescript
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import type { StatuteComponentSpans } from "@/types/componentSpans"

// Add `d` flag to both regexes:
const FEDERAL_SECTION_RE = /^(\d+)\s+(\S+(?:\.\S+)*)\s*§§?\s*(.+)$/d
const FEDERAL_PART_RE = /^(\d+)\s+(\S+(?:\.\S+)*)\s+(?:Part|pt\.)\s+(.+)$/d

// After bodyMatch and parseBody:
  let spans: StatuteComponentSpans | undefined
  if (bodyMatch?.indices) {
    spans = {
      title: bodyMatch.indices[1] ? spanFromGroupIndex(span.cleanStart, bodyMatch.indices[1], transformationMap) : undefined,
      code: bodyMatch.indices[2] ? spanFromGroupIndex(span.cleanStart, bodyMatch.indices[2], transformationMap) : undefined,
    }
    // Section and subsection positions come from parseBody's input — they're inside group 3
    // For section: find section text within the rawBody, offset by group 3 start
    if (bodyMatch.indices[3] && section) {
      const bodyStart = bodyMatch.indices[3][0]
      const sectionEnd = bodyStart + section.length
      spans.section = spanFromGroupIndex(span.cleanStart, [bodyStart, sectionEnd], transformationMap)
      if (subsection) {
        const subStart = sectionEnd
        const subEnd = subStart + subsection.length
        spans.subsection = spanFromGroupIndex(span.cleanStart, [subStart, subEnd], transformationMap)
      }
    }
  }

// Add `spans` to return
```

- [ ] **Step 4: Wire up `extractProse`**

In `src/extract/statutes/extractProse.ts`:

```typescript
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import type { StatuteComponentSpans } from "@/types/componentSpans"

// Add `d` flag:
const PROSE_RE = /[Ss]ection\s+(\d+[A-Za-z0-9-]*)((?:\([^)]*\))*)\s+of\s+title\s+(\d+)/d

// After match:
  let spans: StatuteComponentSpans | undefined
  if (match?.indices) {
    spans = {
      section: match.indices[1] ? spanFromGroupIndex(span.cleanStart, match.indices[1], transformationMap) : undefined,
      title: match.indices[3] ? spanFromGroupIndex(span.cleanStart, match.indices[3], transformationMap) : undefined,
    }
    if (match.indices[2] && subsection) {
      spans.subsection = spanFromGroupIndex(span.cleanStart, match.indices[2], transformationMap)
    }
  }

// Note: prose form uses "U.S.C." as implicit code — no code span since it's not in the text

// Add `spans` to return
```

- [ ] **Step 5: Wire up `extractAbbreviated`**

In `src/extract/statutes/extractAbbreviated.ts`:

```typescript
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import type { StatuteComponentSpans } from "@/types/componentSpans"

// Add `d` flag:
const ABBREVIATED_RE =
  /^(?:(\d+)\s+)?(.+?)\s*§?\s*(\d+[A-Za-z0-9.:/-]*(?:\([^)]*\))*(?:\s*et\s+seq\.?)?)$/d

// After match and parseBody:
  let spans: StatuteComponentSpans | undefined
  if (match?.indices) {
    spans = {}
    if (match.indices[1]) spans.title = spanFromGroupIndex(span.cleanStart, match.indices[1], transformationMap)
    if (match.indices[2]) spans.code = spanFromGroupIndex(span.cleanStart, match.indices[2], transformationMap)
    // Section/subsection from group 3 + parseBody
    if (match.indices[3] && section) {
      const bodyStart = match.indices[3][0]
      spans.section = spanFromGroupIndex(span.cleanStart, [bodyStart, bodyStart + section.length], transformationMap)
      if (subsection) {
        const subStart = bodyStart + section.length
        spans.subsection = spanFromGroupIndex(span.cleanStart, [subStart, subStart + subsection.length], transformationMap)
      }
    }
  }

// Add `spans` to return
```

- [ ] **Step 6: Wire up `extractNamedCode`**

In `src/extract/statutes/extractNamedCode.ts`:

```typescript
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import type { StatuteComponentSpans } from "@/types/componentSpans"

// Add `d` flag to both regexes:
const NAMED_CODE_RE =
  /^(N\.?\s*Y\.?|Cal(?:ifornia)?\.?|Tex(?:as)?\.?|Md\.?|Va\.?|Ala(?:bama)?\.?)\s+(.*?)\s*§§?\s*(.+)$/ds
const MASS_CHAPTER_RE = /^(.*?)\s+(?:ch\.?|c\.?)\s*(\w+),?\s*§\s*(.+)$/d

// After match, parseBody, code resolution:
  let spans: StatuteComponentSpans | undefined

  // For named-code pattern:
  if (token.patternId !== "mass-chapter" && match?.indices) {
    spans = {}
    if (match.indices[2]) spans.code = spanFromGroupIndex(span.cleanStart, match.indices[2], transformationMap)
    if (match.indices[3] && section) {
      const bodyStart = match.indices[3][0]
      spans.section = spanFromGroupIndex(span.cleanStart, [bodyStart, bodyStart + section.length], transformationMap)
      if (subsection) {
        const subStart = bodyStart + section.length
        spans.subsection = spanFromGroupIndex(span.cleanStart, [subStart, subStart + subsection.length], transformationMap)
      }
    }
  }

  // For mass-chapter pattern:
  if (token.patternId === "mass-chapter" && match?.indices) {
    spans = {}
    if (match.indices[2]) spans.code = spanFromGroupIndex(span.cleanStart, match.indices[2], transformationMap)
    if (match.indices[3] && section) {
      const bodyStart = match.indices[3][0]
      spans.section = spanFromGroupIndex(span.cleanStart, [bodyStart, bodyStart + section.length], transformationMap)
      if (subsection) {
        const subStart = bodyStart + section.length
        spans.subsection = spanFromGroupIndex(span.cleanStart, [subStart, subStart + subsection.length], transformationMap)
      }
    }
  }

// Add `spans` to return
```

- [ ] **Step 7: Wire up `extractChapterAct`**

In `src/extract/statutes/extractChapterAct.ts`:

```typescript
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import type { StatuteComponentSpans } from "@/types/componentSpans"

// Add `d` flag:
const CHAPTER_ACT_RE = /^(\d+)\s+(?:ILCS|Ill\.?\s*Comp\.?\s*Stat\.?)\s*(?:Ann\.?\s+)?(\d+)\/(.+)$/d

// After match and parseBody:
  let spans: StatuteComponentSpans | undefined
  if (match?.indices) {
    spans = {
      title: match.indices[1] ? spanFromGroupIndex(span.cleanStart, match.indices[1], transformationMap) : undefined,
      code: match.indices[2] ? spanFromGroupIndex(span.cleanStart, match.indices[2], transformationMap) : undefined,
    }
    if (match.indices[3] && section) {
      const bodyStart = match.indices[3][0]
      spans.section = spanFromGroupIndex(span.cleanStart, [bodyStart, bodyStart + section.length], transformationMap)
      if (subsection) {
        const subStart = bodyStart + section.length
        spans.subsection = spanFromGroupIndex(span.cleanStart, [subStart, subStart + subsection.length], transformationMap)
      }
    }
  }

// Add `spans` to return
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/extract/componentSpans.statute.test.ts`
Expected: All tests PASS

- [ ] **Step 9: Run full test suite**

Run: `pnpm exec vitest run`
Expected: All tests PASS

- [ ] **Step 10: Commit**

```bash
git add src/extract/statutes/ tests/extract/componentSpans.statute.test.ts
git commit -m "feat(#172): add component spans to all statute family extractors"
```

---

### Task 6: Wire Up Case Extractor — Core Components

The case extractor is the most complex. Split into two tasks: core regex components (volume, reporter, page, pincite) in this task, and backward/lookahead components (caseName, court, year, parentheticals) in Task 7.

**Files:**
- Modify: `src/extract/extractCase.ts:90-92` (add `d` flag to regex), `src/extract/extractCase.ts:857-1161` (extractCase function)
- Create: `tests/extract/componentSpans.case.test.ts`

- [ ] **Step 1: Write failing tests for core case spans**

```typescript
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"

function expectSpan(text: string, span: { originalStart: number; originalEnd: number } | undefined, expected: string) {
  expect(span).toBeDefined()
  expect(text.substring(span!.originalStart, span!.originalEnd)).toBe(expected)
}

describe("Component Spans — Case Core", () => {
  it("tracks volume, reporter, page spans", () => {
    const text = "See 500 F.2d 123 (2020)."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "case")
    expect(c).toBeDefined()
    if (c?.type !== "case") return

    expectSpan(text, c.spans?.volume, "500")
    expectSpan(text, c.spans?.reporter, "F.2d")
    expectSpan(text, c.spans?.page, "123")
  })

  it("tracks pincite span from comma-separated page", () => {
    const text = "See 500 F.2d 123, 130 (2020)."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "case")
    expect(c).toBeDefined()
    if (c?.type !== "case") return

    expectSpan(text, c.spans?.pincite, "130")
  })

  it("handles blank page placeholder", () => {
    const text = "See 500 F.2d ___ (2020)."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "case")
    expect(c).toBeDefined()
    if (c?.type !== "case") return

    expectSpan(text, c.spans?.volume, "500")
    expectSpan(text, c.spans?.reporter, "F.2d")
    expectSpan(text, c.spans?.page, "___")
  })

  it("handles hyphenated volume", () => {
    const text = "See 1984-1 C.M.R. 500 (2020)."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "case")
    expect(c).toBeDefined()
    if (c?.type !== "case") return

    expectSpan(text, c.spans?.volume, "1984-1")
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/extract/componentSpans.case.test.ts`
Expected: FAIL — `spans` is undefined

- [ ] **Step 3: Add `d` flag to `VOLUME_REPORTER_PAGE_REGEX` and `PINCITE_REGEX`**

In `src/extract/extractCase.ts`, update the regex patterns at module level:

```typescript
const VOLUME_REPORTER_PAGE_REGEX =
  /^(\d+(?:-\d+)?)\s+([A-Za-z0-9.\s']+)\s+(?:\((\d+)\s+([A-Z][A-Za-z.]+)\)\s+)?(\d+|_{3,}|-{3,})/d

const PINCITE_REGEX = /,\s*(\d+)/d
```

- [ ] **Step 4: Compute core component spans in `extractCase`**

In the `extractCase` function, after the existing `VOLUME_REPORTER_PAGE_REGEX` match (around line 874) and pincite parsing (around line 890), add:

```typescript
import type { CaseComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type Span, type TransformationMap } from "@/types/span"

// After match check and volume/reporter/page parsing:
  const spans: CaseComponentSpans = {}

  if (match.indices) {
    spans.volume = spanFromGroupIndex(span.cleanStart, match.indices[1]!, transformationMap)
    spans.reporter = spanFromGroupIndex(span.cleanStart, match.indices[2]!, transformationMap)
    spans.page = spanFromGroupIndex(span.cleanStart, match.indices[5]!, transformationMap)
  }

  // Pincite span (from token text)
  if (pinciteMatch?.indices?.[1]) {
    spans.pincite = spanFromGroupIndex(span.cleanStart, pinciteMatch.indices[1], transformationMap)
  }

// At the end, add `spans` to the return object
```

**Note:** The nominative reporter uses groups 3 and 4. The page number is in group 5. Verify with the regex pattern.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/extract/componentSpans.case.test.ts`
Expected: 4 tests PASS

- [ ] **Step 6: Run full test suite**

Run: `pnpm exec vitest run`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/extract/extractCase.ts tests/extract/componentSpans.case.test.ts
git commit -m "feat(#172): add component spans for case core (volume, reporter, page, pincite)"
```

---

### Task 7: Wire Up Case Extractor — Backward Search and Lookahead Components

**Files:**
- Modify: `src/extract/extractCase.ts` (extractCaseName result, parseParenthetical, collectParentheticals)
- Modify: `tests/extract/componentSpans.case.test.ts`

- [ ] **Step 1: Write failing tests for caseName, plaintiff, defendant, court, year, signal, parenthetical spans**

Add to `tests/extract/componentSpans.case.test.ts`:

```typescript
describe("Component Spans — Case Name and Parties", () => {
  it("tracks caseName, plaintiff, defendant spans", () => {
    const text = "The court held in Smith v. Jones, 500 F.2d 123 (2020)."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "case")
    expect(c).toBeDefined()
    if (c?.type !== "case") return

    expectSpan(text, c.spans?.caseName, "Smith v. Jones")
    expectSpan(text, c.spans?.plaintiff, "Smith")
    expectSpan(text, c.spans?.defendant, "Jones")
  })

  it("tracks procedural prefix case name span", () => {
    const text = "See In re Debtor LLC, 612 B.R. 45 (2020)."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "case")
    expect(c).toBeDefined()
    if (c?.type !== "case") return

    expectSpan(text, c.spans?.caseName, "In re Debtor LLC")
  })
})

describe("Component Spans — Case Court and Year", () => {
  it("tracks court and year spans from parenthetical", () => {
    const text = "See 500 F.2d 123 (9th Cir. 2020)."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "case")
    expect(c).toBeDefined()
    if (c?.type !== "case") return

    expectSpan(text, c.spans?.court, "9th Cir.")
    expectSpan(text, c.spans?.year, "2020")
  })

  it("tracks metadataParenthetical span", () => {
    const text = "See 500 F.2d 123 (9th Cir. 2020)."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "case")
    expect(c).toBeDefined()
    if (c?.type !== "case") return

    expectSpan(text, c.spans?.metadataParenthetical, "(9th Cir. 2020)")
  })

  it("tracks court span for multi-word court", () => {
    const text = "See 456 F. Supp. 3d 789 (N.D. Cal. Jan. 15, 2020)."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "case")
    expect(c).toBeDefined()
    if (c?.type !== "case") return

    expectSpan(text, c.spans?.court, "N.D. Cal.")
  })
})

describe("Component Spans — Case Signal", () => {
  it("tracks signal span", () => {
    const text = "See also Smith v. Jones, 500 F.2d 123 (2020)."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "case")
    expect(c).toBeDefined()
    if (c?.type !== "case") return

    expectSpan(text, c.spans?.signal, "See also")
  })
})

describe("Component Spans — Parenthetical.span", () => {
  it("tracks explanatory parenthetical span", () => {
    const text = "See 500 F.2d 123 (9th Cir. 2020) (holding that due process requires notice)."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "case")
    expect(c).toBeDefined()
    if (c?.type !== "case") return

    expect(c.parentheticals).toBeDefined()
    expect(c.parentheticals!.length).toBeGreaterThan(0)
    const paren = c.parentheticals![0]
    expect(paren.span).toBeDefined()
    expectSpan(text, paren.span, "(holding that due process requires notice)")
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/extract/componentSpans.case.test.ts`
Expected: New tests FAIL

- [ ] **Step 3: Compute caseName, plaintiff, defendant spans**

In `extractCase`, after the case name extraction (around line 1013-1037) and party name extraction (around line 1039-1077):

```typescript
  // Case name span: from nameStart to coreStart (minus trailing ", ")
  if (caseNameResult) {
    const caseNameCleanStart = caseNameResult.nameStart
    const caseNameCleanEnd = caseNameCleanStart + caseName!.length
    const caseNameOrig = resolveOriginalSpan({ cleanStart: caseNameCleanStart, cleanEnd: caseNameCleanEnd }, transformationMap)
    spans.caseName = {
      cleanStart: caseNameCleanStart,
      cleanEnd: caseNameCleanEnd,
      originalStart: caseNameOrig.originalStart,
      originalEnd: caseNameOrig.originalEnd,
    }

    // Plaintiff and defendant spans within the case name
    if (plaintiff && caseName) {
      const pIdx = caseName.indexOf(plaintiff)
      if (pIdx !== -1) {
        const pCleanStart = caseNameCleanStart + pIdx
        const pCleanEnd = pCleanStart + plaintiff.length
        const pOrig = resolveOriginalSpan({ cleanStart: pCleanStart, cleanEnd: pCleanEnd }, transformationMap)
        spans.plaintiff = { cleanStart: pCleanStart, cleanEnd: pCleanEnd, originalStart: pOrig.originalStart, originalEnd: pOrig.originalEnd }
      }
    }
    if (defendant && caseName) {
      const dIdx = caseName.lastIndexOf(defendant)
      if (dIdx !== -1) {
        const dCleanStart = caseNameCleanStart + dIdx
        const dCleanEnd = dCleanStart + defendant.length
        const dOrig = resolveOriginalSpan({ cleanStart: dCleanStart, cleanEnd: dCleanEnd }, transformationMap)
        spans.defendant = { cleanStart: dCleanStart, cleanEnd: dCleanEnd, originalStart: dOrig.originalStart, originalEnd: dOrig.originalEnd }
      }
    }
  }
```

- [ ] **Step 4: Compute court and year spans from parenthetical content**

Extend `parseParenthetical` to return sub-offsets. Currently it returns `{ court?, year?, date?, disposition? }`. Add `courtStart?`, `courtEnd?`, `yearStart?`, `yearEnd?` — character offsets within the parenthetical content string:

```typescript
function parseParenthetical(content: string): {
  court?: string
  year?: number
  date?: StructuredDate
  disposition?: string
  courtStart?: number
  courtEnd?: number
  yearStart?: number
  yearEnd?: number
} {
  // ... existing code ...

  // Track year position in content string
  if (dateResult) {
    const yearStr = String(dateResult.parsed.year)
    const yearIdx = content.lastIndexOf(yearStr)
    if (yearIdx !== -1) {
      result.yearStart = yearIdx
      result.yearEnd = yearIdx + yearStr.length
    }
  }

  // Track court position (courtResult is stripped of date — find it from the start)
  if (courtResult) {
    result.courtStart = 0  // Court always starts at beginning of parenthetical content
    result.courtEnd = courtResult.length
  }

  return result
}
```

Then in `extractCase`, when building the metadata parenthetical span and court/year spans from the first parenthetical:

```typescript
  // MetadataParenthetical span (from collectParentheticals data)
  if (allParens && allParens.length > 0) {
    const firstParen = allParens[0]
    const metaOrig = resolveOriginalSpan({ cleanStart: firstParen.start, cleanEnd: firstParen.end }, transformationMap)
    spans.metadataParenthetical = {
      cleanStart: firstParen.start,
      cleanEnd: firstParen.end,
      originalStart: metaOrig.originalStart,
      originalEnd: metaOrig.originalEnd,
    }

    // Court and year sub-spans within the parenthetical
    // Content starts at firstParen.start + 1 (past opening "(")
    const contentStart = firstParen.start + 1
    if (parenResult.courtStart !== undefined && parenResult.courtEnd !== undefined) {
      const courtCS = contentStart + parenResult.courtStart
      const courtCE = contentStart + parenResult.courtEnd
      const courtOrig = resolveOriginalSpan({ cleanStart: courtCS, cleanEnd: courtCE }, transformationMap)
      spans.court = { cleanStart: courtCS, cleanEnd: courtCE, ...courtOrig }
    }
    if (parenResult.yearStart !== undefined && parenResult.yearEnd !== undefined) {
      const yearCS = contentStart + parenResult.yearStart
      const yearCE = contentStart + parenResult.yearEnd
      const yearOrig = resolveOriginalSpan({ cleanStart: yearCS, cleanEnd: yearCE }, transformationMap)
      spans.year = { cleanStart: yearCS, cleanEnd: yearCE, ...yearOrig }
    }
  }
```

- [ ] **Step 5: Compute signal span**

After signal extraction (around line 1054), if a signal was found:

```typescript
  if (signal && fullSpan) {
    // Signal word appears before the case name in the original text
    // fullSpan.cleanStart is after signal stripping — walk back to find signal
    const signalText = signal.replace(/\s+/g, " ")  // normalize for length
    // The signal was stripped from the plaintiff via SIGNAL_STRIP_REGEX
    // We need to find where it was in the original text
    if (caseNameResult && cleanedText) {
      const searchStart = Math.max(0, caseNameResult.nameStart - 20)
      const beforeName = cleanedText.substring(searchStart, caseNameResult.nameStart)
      const sigMatch = SIGNAL_STRIP_REGEX.exec(beforeName.trimStart())
      if (sigMatch) {
        const trimOffset = beforeName.length - beforeName.trimStart().length
        const sigCleanStart = searchStart + trimOffset
        const sigCleanEnd = sigCleanStart + sigMatch[1].length
        const sigOrig = resolveOriginalSpan({ cleanStart: sigCleanStart, cleanEnd: sigCleanEnd }, transformationMap)
        spans.signal = { cleanStart: sigCleanStart, cleanEnd: sigCleanEnd, ...sigOrig }
      }
    }
  }
```

- [ ] **Step 6: Thread `Parenthetical.span` through**

In the parenthetical classification loop (around line 956-977), when building output `Parenthetical` objects, add the span from `RawParenthetical`:

```typescript
      } else {
        parentheticals ??= []
        const parenOrig = resolveOriginalSpan({ cleanStart: raw.start, cleanEnd: raw.end }, transformationMap)
        parentheticals.push({
          text: classified.text,
          type: classified.type,
          span: {
            cleanStart: raw.start,
            cleanEnd: raw.end,
            originalStart: parenOrig.originalStart,
            originalEnd: parenOrig.originalEnd,
          },
        })
      }
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/extract/componentSpans.case.test.ts`
Expected: All tests PASS

- [ ] **Step 8: Run full test suite**

Run: `pnpm exec vitest run`
Expected: All tests PASS

- [ ] **Step 9: Commit**

```bash
git add src/extract/extractCase.ts tests/extract/componentSpans.case.test.ts
git commit -m "feat(#172): add component spans for case name, court, year, signal, parentheticals"
```

---

### Task 8: Integration Tests — CourtListener Fixtures

**Files:**
- Create: `tests/integration/componentSpans.test.ts`

- [ ] **Step 1: Write integration tests using all 6 CourtListener fixtures**

```typescript
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"

function expectSpan(text: string, span: { originalStart: number; originalEnd: number } | undefined, expected: string) {
  expect(span).toBeDefined()
  expect(text.substring(span!.originalStart, span!.originalEnd)).toBe(expected)
}

describe("Component Spans — CourtListener Fixtures", () => {
  describe("Fixture 1: Parenthetical Chain", () => {
    const text =
      "The court reaffirmed this standard. Smith v. Jones, 500 F.2d 123, 130 (9th Cir. 2020) (holding that due process requires notice), aff'd, 550 U.S. 1 (2021)."

    it("extracts case name and core component spans for primary citation", () => {
      const cites = extractCitations(text)
      const s1 = cites.find((c) => c.type === "case" && c.matchedText?.includes("500 F.2d"))
      expect(s1).toBeDefined()
      if (s1?.type !== "case") return

      expectSpan(text, s1.spans?.caseName, "Smith v. Jones")
      expectSpan(text, s1.spans?.volume, "500")
      expectSpan(text, s1.spans?.reporter, "F.2d")
      expectSpan(text, s1.spans?.page, "123")
      expectSpan(text, s1.spans?.pincite, "130")
      expectSpan(text, s1.spans?.court, "9th Cir.")
      expectSpan(text, s1.spans?.year, "2020")
    })

    it("tracks metadataParenthetical and explanatory Parenthetical.span", () => {
      const cites = extractCitations(text)
      const s1 = cites.find((c) => c.type === "case" && c.matchedText?.includes("500 F.2d"))
      if (s1?.type !== "case") return

      expect(s1.spans?.metadataParenthetical).toBeDefined()
      expect(s1.parentheticals).toBeDefined()
      expect(s1.parentheticals!.length).toBeGreaterThan(0)
      expect(s1.parentheticals![0].span).toBeDefined()
    })
  })

  describe("Fixture 2: Nominative Reporter", () => {
    const text =
      "The principle was settled early in the Republic. Gelpcke v. City of Dubuque, 68 U.S. (1 Wall.) 175 (1864), held that municipal bonds could not be repudiated. See also Roosevelt v. Meyer, 68 U.S. (1 Wall.) 512 (1863)."

    it("tracks volume, reporter, page spans with nominative groups", () => {
      const cites = extractCitations(text)
      const s1 = cites.find((c) => c.type === "case" && c.matchedText?.includes("175"))
      expect(s1).toBeDefined()
      if (s1?.type !== "case") return

      expectSpan(text, s1.spans?.volume, "68")
      expectSpan(text, s1.spans?.reporter, "U.S.")
      expectSpan(text, s1.spans?.page, "175")
    })

    it("tracks signal span on second citation", () => {
      const cites = extractCitations(text)
      const s2 = cites.find((c) => c.type === "case" && c.matchedText?.includes("512"))
      expect(s2).toBeDefined()
      if (s2?.type !== "case") return

      expect(s2.spans?.signal).toBeDefined()
    })
  })

  describe("Fixture 3: Long Court Names", () => {
    const text =
      "The district court agreed. Anderson v. Tech Corp., 456 F. Supp. 3d 789, 795 (N.D. Cal. Jan. 15, 2020). The state appellate court reached the opposite conclusion in Rivera v. Dept. of Revenue, 98 N.E.3d 542 (Mass. App. Ct. 2019). The bankruptcy court also addressed the matter. In re Debtor LLC, 612 B.R. 45 (Bankr. S.D.N.Y. 2020)."

    it("tracks court span for N.D. Cal.", () => {
      const cites = extractCitations(text)
      const s1 = cites.find((c) => c.type === "case" && c.matchedText?.includes("456 F. Supp."))
      if (s1?.type !== "case") return

      expectSpan(text, s1.spans?.court, "N.D. Cal.")
    })

    it("tracks court span for Mass. App. Ct.", () => {
      const cites = extractCitations(text)
      const s2 = cites.find((c) => c.type === "case" && c.matchedText?.includes("98 N.E.3d"))
      if (s2?.type !== "case") return

      expectSpan(text, s2.spans?.court, "Mass. App. Ct.")
    })

    it("tracks court span for Bankr. S.D.N.Y.", () => {
      const cites = extractCitations(text)
      const s3 = cites.find((c) => c.type === "case" && c.matchedText?.includes("612 B.R."))
      if (s3?.type !== "case") return

      expectSpan(text, s3.spans?.court, "Bankr. S.D.N.Y.")
    })
  })

  describe("Fixture 4: Signal String Mixed", () => {
    const text =
      "The constitutional basis is clear. See U.S. Const. amend. XIV, § 1; see also 42 U.S.C. § 1983; But see Town of Castle Rock v. Gonzales, 545 U.S. 748 (2005) (limiting the scope); Cf. Cal. Civ. Code § 1714(a)."

    it("extracts citations of multiple types", () => {
      const cites = extractCitations(text)
      expect(cites.some((c) => c.type === "constitutional")).toBe(true)
      expect(cites.some((c) => c.type === "statute")).toBe(true)
      expect(cites.some((c) => c.type === "case")).toBe(true)
    })

    it("tracks case citation signal span for 'But see'", () => {
      const cites = extractCitations(text)
      const caseCite = cites.find((c) => c.type === "case")
      if (caseCite?.type !== "case") return

      expect(caseCite.signal).toBe("but see")
      expect(caseCite.spans?.signal).toBeDefined()
    })
  })

  describe("Fixture 5: Statute Edge Cases", () => {
    const text =
      "The statute provides the cause of action. 42 U.S.C. § 1983(a)(1)(A) et seq. governs this claim. Congress enacted the relevant provisions in Pub. L. No. 111-148, § 1501. The state analog is Cal. Civ. Proc. Code § 425.16(b)(1)."

    it("tracks subsection span for deep chain", () => {
      const cites = extractCitations(text)
      const s1 = cites.find((c) => c.type === "statute" && c.matchedText?.includes("1983"))
      if (s1?.type !== "statute") return

      expectSpan(text, s1.spans?.section, "1983")
      expect(s1.spans?.subsection).toBeDefined()
    })

    it("tracks public law congress and lawNumber spans", () => {
      const cites = extractCitations(text)
      const pl = cites.find((c) => c.type === "publicLaw")
      if (pl?.type !== "publicLaw") return

      expectSpan(text, pl.spans?.congress, "111")
      expectSpan(text, pl.spans?.lawNumber, "148")
    })
  })

  describe("Fixture 6: Dense Mixed Paragraph", () => {
    const text =
      "The Seventh Circuit held that plaintiffs must demonstrate standing under Lujan v. Defenders of Wildlife, 504 U.S. 555, 560-61 (1992). See also U.S. Const. art. III, § 2; 28 U.S.C. § 1331. This court previously addressed the issue in Thompson, 300 F.3d at 752, relying on id. at 561. Cf. 42 U.S.C. § 2000e-2(a)."

    it("extracts all citation types", () => {
      const cites = extractCitations(text, { resolve: true })
      const types = new Set(cites.map((c) => c.type))
      expect(types.has("case")).toBe(true)
      expect(types.has("constitutional")).toBe(true)
      expect(types.has("statute")).toBe(true)
    })

    it("all full-type citations have spans populated", () => {
      const cites = extractCitations(text, { resolve: true })
      for (const c of cites) {
        if (c.type === "id" || c.type === "supra" || c.type === "shortFormCase") continue
        if ("spans" in c) {
          expect(c.spans).toBeDefined()
        }
      }
    })

    it("primary case citation has case name and year spans", () => {
      const cites = extractCitations(text, { resolve: true })
      const lujan = cites.find((c) => c.type === "case" && c.matchedText?.includes("504 U.S."))
      if (lujan?.type !== "case") return

      expectSpan(text, lujan.spans?.caseName, "Lujan v. Defenders of Wildlife")
      expectSpan(text, lujan.spans?.year, "1992")
    })
  })
})
```

- [ ] **Step 2: Write HTML/whitespace transformation tests**

Add to `tests/integration/componentSpans.test.ts`:

```typescript
describe("Component Spans — HTML/Whitespace Transformations", () => {
  it("spans resolve to correct original positions after HTML entity stripping", () => {
    const text = "See 42 U.S.C. &sect; 1983."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "statute")
    if (c?.type !== "statute") return

    // After cleaning, &sect; becomes § — positions shift
    // Original positions must point to the right place in the HTML input
    expectSpan(text, c.spans?.title, "42")
    expectSpan(text, c.spans?.code, "U.S.C.")
  })

  it("spans resolve correctly with <em> tags stripped", () => {
    const text = "See <em>Smith v. Jones</em>, 500 F.2d 123 (2020)."
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "case")
    if (c?.type !== "case") return

    expectSpan(text, c.spans?.volume, "500")
    expectSpan(text, c.spans?.reporter, "F.2d")
    expectSpan(text, c.spans?.page, "123")
  })

  it("spans survive whitespace normalization", () => {
    const text = "See  500  F.2d  123  (2020)."  // double spaces
    const cites = extractCitations(text)
    const c = cites.find((c) => c.type === "case")
    if (c?.type !== "case") return

    // Original positions must point to the double-spaced input
    expectSpan(text, c.spans?.volume, "500")
    expectSpan(text, c.spans?.page, "123")
  })
})
```

- [ ] **Step 3: Run integration tests**

Run: `pnpm exec vitest run tests/integration/componentSpans.test.ts`
Expected: All tests PASS (if prior tasks were implemented correctly)

Some tests may fail due to edge cases in how the extractors handle these specific texts. Debug and fix as needed — the integration tests are the acceptance criteria.

- [ ] **Step 4: Run full test suite**

Run: `pnpm exec vitest run`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add tests/integration/componentSpans.test.ts
git commit -m "test(#172): add CourtListener fixture and HTML/whitespace integration tests for component spans"
```

---

### Task 9: Typecheck, Lint, Build Verification

**Files:** None (verification only)

- [ ] **Step 1: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: PASS (run `pnpm format` first if there are formatting issues)

- [ ] **Step 3: Run build**

Run: `pnpm build`
Expected: PASS — ESM + CJS + DTS all produce clean output

- [ ] **Step 4: Run size check**

Run: `pnpm size`
Expected: PASS — the new span interfaces are types only (zero runtime cost). The `spanFromGroupIndex` function is ~10 lines. The `d` flag on regexes adds no bundle size. Total increase should be minimal.

- [ ] **Step 5: Create changeset**

Run: `pnpm changeset`
- Select: `eyecite-ts` package
- Bump: `minor` (new feature, no breaking changes)
- Summary: "Add granular component spans for all citation types. Each citation now carries a `spans` record with per-component position data (volume, reporter, page, court, year, etc.). Explanatory parentheticals gain a `span` field. Closes #172, closes #171."

- [ ] **Step 6: Commit changeset**

```bash
git add .changeset/
git commit -m "chore: add changeset for #172 component spans"
```

- [ ] **Step 7: Close #171**

Run: `gh issue close 171 -c "Closed by #172 — signal spans are now part of the per-type component spans record (e.g., CaseComponentSpans.signal)."`
