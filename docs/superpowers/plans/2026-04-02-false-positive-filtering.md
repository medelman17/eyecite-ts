# False Positive Filtering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a post-extraction filter that flags (or removes) false positive citations from non-US and historical sources using a static blocklist and year plausibility heuristic.

**Architecture:** A new `filterFalsePositives.ts` module runs as Step 4.9 in the extraction pipeline. It checks each citation's reporter against a static blocklist of ~15 non-US reporters and flags citations with years before 1750. Default mode penalizes confidence + adds warnings. Opt-in `filterFalsePositives: true` removes flagged citations entirely.

**Tech Stack:** TypeScript, Vitest, Biome

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/extract/filterFalsePositives.ts` | Blocklist, year heuristic, filter/penalize logic |
| Modify | `src/extract/extractCitations.ts:51-114` | Add `filterFalsePositives` option to `ExtractOptions` |
| Modify | `src/extract/extractCitations.ts:363-371` | Wire filter into pipeline (Step 4.9) |
| Create | `tests/extract/filterFalsePositives.test.ts` | Unit tests for filter logic |
| Modify | `tests/fixtures/thorny-corpus.json` | Remove `knownLimitation` from 4 false positive samples |
| Modify | `tests/integration/thornyCorpus.test.ts` | Add `filterFalsePositives: true` to extraction call |

---

### Task 1: Add filterFalsePositives option to ExtractOptions

**Files:**
- Modify: `src/extract/extractCitations.ts:51-114`

- [ ] **Step 1: Add the option**

In `src/extract/extractCitations.ts`, add the `filterFalsePositives` field to the `ExtractOptions` interface. Insert after the `resolutionOptions` field (after line 113, before the closing `}`):

```typescript
  /**
   * Remove citations flagged as likely false positives (default: false).
   *
   * When false (default), flagged citations get reduced confidence (0.1) and a warning.
   * When true, flagged citations are removed from results entirely.
   *
   * False positive detection uses:
   * - A static blocklist of known non-US reporter abbreviations (international, UK, European)
   * - A year plausibility heuristic (years before 1750 predate US legal reporting)
   *
   * @example
   * ```typescript
   * // Remove false positives from results
   * const citations = extractCitations(text, { filterFalsePositives: true })
   * ```
   */
  filterFalsePositives?: boolean
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS — additive change to interface.

- [ ] **Step 3: Commit**

```bash
git add src/extract/extractCitations.ts
git commit -m "feat(types): add filterFalsePositives option to ExtractOptions (#57, #58)"
```

---

### Task 2: Create filterFalsePositives.ts with tests

**Files:**
- Create: `src/extract/filterFalsePositives.ts`
- Create: `tests/extract/filterFalsePositives.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/extract/filterFalsePositives.test.ts`:

```typescript
/**
 * Tests for false positive citation filtering.
 *
 * Filters non-US and historical citations using a static blocklist
 * and year plausibility heuristic.
 */

import { describe, expect, it } from "vitest"
import { applyFalsePositiveFilters } from "@/extract/filterFalsePositives"
import type { Citation, FullCaseCitation, JournalCitation } from "@/types/citation"
import type { Span } from "@/types/span"

/** Helper to create a minimal case citation */
function makeCase(reporter: string, year?: number): FullCaseCitation {
  const span: Span = { cleanStart: 0, cleanEnd: 10, originalStart: 0, originalEnd: 10 }
  return {
    type: "case",
    text: "",
    span,
    confidence: 0.8,
    matchedText: "",
    processTimeMs: 0,
    patternsChecked: 1,
    volume: 100,
    reporter,
    page: 1,
    year,
  }
}

/** Helper to create a minimal journal citation */
function makeJournal(abbreviation: string, year?: number): JournalCitation {
  const span: Span = { cleanStart: 0, cleanEnd: 10, originalStart: 0, originalEnd: 10 }
  return {
    type: "journal",
    text: "",
    span,
    confidence: 0.6,
    matchedText: "",
    processTimeMs: 0,
    patternsChecked: 1,
    journal: abbreviation,
    abbreviation,
    year,
  }
}

describe("applyFalsePositiveFilters", () => {
  describe("blocklist — penalize mode (remove: false)", () => {
    it("flags I.C.J. as false positive", () => {
      const cit = makeCase("I.C.J.")
      const result = applyFalsePositiveFilters([cit], false)
      expect(result).toHaveLength(1)
      expect(result[0].confidence).toBe(0.1)
      expect(result[0].warnings).toBeDefined()
      expect(result[0].warnings![0].message).toContain("non-US")
    })

    it("flags U.N.T.S. as false positive", () => {
      const cit = makeCase("U.N.T.S.")
      const result = applyFalsePositiveFilters([cit], false)
      expect(result[0].confidence).toBe(0.1)
    })

    it("flags Co. Rep. as false positive", () => {
      const cit = makeCase("Co. Rep.")
      const result = applyFalsePositiveFilters([cit], false)
      expect(result[0].confidence).toBe(0.1)
    })

    it("flags Edw. as false positive", () => {
      const cit = makeCase("Edw.")
      const result = applyFalsePositiveFilters([cit], false)
      expect(result[0].confidence).toBe(0.1)
    })

    it("does NOT flag Edw. Ch. (valid US reporter)", () => {
      const cit = makeCase("Edw. Ch.")
      const result = applyFalsePositiveFilters([cit], false)
      expect(result[0].confidence).toBe(0.8) // unchanged
      expect(result[0].warnings).toBeUndefined()
    })

    it("does NOT flag valid US reporters", () => {
      const cit1 = makeCase("F.2d")
      const cit2 = makeCase("U.S.")
      const cit3 = makeCase("S. Ct.")
      const result = applyFalsePositiveFilters([cit1, cit2, cit3], false)
      expect(result[0].confidence).toBe(0.8)
      expect(result[1].confidence).toBe(0.8)
      expect(result[2].confidence).toBe(0.8)
    })

    it("flags journal citations by abbreviation", () => {
      const cit = makeJournal("All E.R.")
      const result = applyFalsePositiveFilters([cit], false)
      expect(result[0].confidence).toBe(0.1)
    })

    it("blocklist is case-insensitive", () => {
      const cit = makeCase("i.c.j.")
      const result = applyFalsePositiveFilters([cit], false)
      expect(result[0].confidence).toBe(0.1)
    })
  })

  describe("year plausibility — penalize mode (remove: false)", () => {
    it("flags year 1297 as implausible", () => {
      const cit = makeCase("Edw.", 1297)
      const result = applyFalsePositiveFilters([cit], false)
      expect(result[0].confidence).toBe(0.1)
      expect(result[0].warnings![0].message).toContain("1750")
    })

    it("flags year 1610 as implausible", () => {
      const cit = makeCase("Some Rep.", 1610)
      const result = applyFalsePositiveFilters([cit], false)
      expect(result[0].confidence).toBe(0.1)
    })

    it("does NOT flag year 1850", () => {
      const cit = makeCase("Some Rep.", 1850)
      const result = applyFalsePositiveFilters([cit], false)
      expect(result[0].confidence).toBe(0.8)
    })

    it("does NOT flag citations without a year", () => {
      const cit = makeCase("Some Rep.")
      const result = applyFalsePositiveFilters([cit], false)
      expect(result[0].confidence).toBe(0.8)
    })
  })

  describe("remove mode (remove: true)", () => {
    it("removes blocklisted citations", () => {
      const blocked = makeCase("I.C.J.")
      const valid = makeCase("F.2d")
      const result = applyFalsePositiveFilters([blocked, valid], true)
      expect(result).toHaveLength(1)
      expect(result[0].type === "case" && result[0].reporter === "F.2d").toBe(true)
    })

    it("removes year-flagged citations", () => {
      const old = makeCase("Edw.", 1297)
      const modern = makeCase("F.2d", 2020)
      const result = applyFalsePositiveFilters([old, modern], true)
      expect(result).toHaveLength(1)
    })

    it("returns empty array when all filtered", () => {
      const cit = makeCase("I.C.J.")
      const result = applyFalsePositiveFilters([cit], true)
      expect(result).toHaveLength(0)
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/extract/filterFalsePositives.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement filterFalsePositives.ts**

Create `src/extract/filterFalsePositives.ts`:

```typescript
/**
 * False Positive Citation Filtering
 *
 * Flags or removes citations that are likely false positives:
 * - Non-US reporter abbreviations (international, UK, European, historical English)
 * - Citations with years predating US legal reporting (before 1750)
 *
 * Runs as a post-extraction phase (Step 4.9) after string citation grouping.
 * Does not depend on the reporters database — uses a lightweight static blocklist.
 *
 * @module extract/filterFalsePositives
 */

import type { Citation, FullCaseCitation, JournalCitation, Warning } from "@/types/citation"

/** Year threshold: US legal reporting starts ~1790 (Dallas Reports). 1750 gives headroom. */
const MIN_PLAUSIBLE_YEAR = 1750

/** Confidence floor for flagged citations in penalize mode. */
const FLAGGED_CONFIDENCE = 0.1

/**
 * Static blocklist of known non-US reporter abbreviations (lowercase, trimmed).
 *
 * International tribunals/treaties:
 *   I.C.J., U.N.T.S., I.L.M., I.L.R., P.C.I.J.
 * UK reporters:
 *   A.C., W.L.R., All E.R., Q.B., K.B., Ch., Co. Rep.
 * European:
 *   E.C.R., E.H.R.R., C.M.L.R.
 * Historical English:
 *   Edw. (standalone — "Edw. Ch." is a valid US reporter)
 */
const BLOCKED_REPORTERS: ReadonlySet<string> = new Set([
  // International
  "i.c.j.",
  "u.n.t.s.",
  "i.l.m.",
  "i.l.r.",
  "p.c.i.j.",
  // UK
  "a.c.",
  "w.l.r.",
  "all e.r.",
  "q.b.",
  "k.b.",
  "ch.",
  "co. rep.",
  // European
  "e.c.r.",
  "e.h.r.r.",
  "c.m.l.r.",
  // Historical English
  "edw.",
])

/**
 * Get the reporter string to check against the blocklist.
 * Returns undefined for citation types that don't have a reporter.
 */
function getReporter(citation: Citation): string | undefined {
  if (citation.type === "case" || citation.type === "shortFormCase") {
    return (citation as FullCaseCitation).reporter
  }
  if (citation.type === "journal") {
    return (citation as JournalCitation).abbreviation
  }
  return undefined
}

/**
 * Get the year from a citation, if present.
 * Returns undefined for citation types without a year field.
 */
function getYear(citation: Citation): number | undefined {
  switch (citation.type) {
    case "case":
      return (citation as FullCaseCitation).year
    case "journal":
      return (citation as JournalCitation).year
    case "federalRegister":
    case "statutesAtLarge":
      return (citation as { year?: number }).year
    default:
      return undefined
  }
}

/**
 * Check if a citation is a likely false positive.
 * Returns a warning message if flagged, or undefined if clean.
 */
function checkFalsePositive(citation: Citation): string | undefined {
  // Check reporter against blocklist
  const reporter = getReporter(citation)
  if (reporter) {
    const normalized = reporter.toLowerCase().trim()
    if (BLOCKED_REPORTERS.has(normalized)) {
      return `Reporter "${reporter}" is a known non-US source`
    }
  }

  // Check year plausibility
  const year = getYear(citation)
  if (year !== undefined && year < MIN_PLAUSIBLE_YEAR) {
    return `Year ${year} predates US legal reporting (threshold: ${MIN_PLAUSIBLE_YEAR})`
  }

  return undefined
}

/**
 * Apply false positive filters to extracted citations.
 *
 * @param citations - Extracted citations (may be mutated in penalize mode)
 * @param remove - If true, remove flagged citations. If false, penalize confidence + add warning.
 * @returns Filtered array (same reference if remove=false, new array if remove=true and items removed)
 */
export function applyFalsePositiveFilters(citations: Citation[], remove: boolean): Citation[] {
  if (remove) {
    return citations.filter((c) => !checkFalsePositive(c))
  }

  for (const citation of citations) {
    const reason = checkFalsePositive(citation)
    if (reason) {
      citation.confidence = FLAGGED_CONFIDENCE
      const warning: Warning = {
        level: "warning",
        message: reason,
        position: { start: citation.span.originalStart, end: citation.span.originalEnd },
      }
      citation.warnings = [...(citation.warnings || []), warning]
    }
  }

  return citations
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/extract/filterFalsePositives.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Run full test suite**

Run: `pnpm exec vitest run`
Expected: All tests PASS (no regressions).

- [ ] **Step 6: Commit**

```bash
git add src/extract/filterFalsePositives.ts tests/extract/filterFalsePositives.test.ts
git commit -m "feat: add false positive filtering with blocklist and year heuristic (#57, #58)"
```

---

### Task 3: Wire filter into extraction pipeline

**Files:**
- Modify: `src/extract/extractCitations.ts:363-371` (pipeline integration)
- Create: `tests/integration/falsePositives.test.ts`

- [ ] **Step 1: Write failing integration tests**

Create `tests/integration/falsePositives.test.ts`:

```typescript
/**
 * Integration tests for false positive citation filtering.
 * Tests the full pipeline with real false positive inputs.
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"

describe("false positive filtering (integration)", () => {
  describe("default mode (penalize + warn)", () => {
    it("penalizes I.C.J. citation", () => {
      const text = "1986 I.C.J. 14 (June 27)"
      const citations = extractCitations(text)
      expect(citations.length).toBeGreaterThanOrEqual(1)

      const flagged = citations.find((c) => c.confidence <= 0.1)
      expect(flagged).toBeDefined()
      expect(flagged!.warnings).toBeDefined()
      expect(flagged!.warnings!.some((w) => w.message.includes("non-US"))).toBe(true)
    })

    it("penalizes historical citation with old year", () => {
      const text = "3 Edw. 1, ch. 29 (1297)"
      const citations = extractCitations(text)
      // May be flagged by blocklist (Edw.) AND/OR year (1297) — either is fine
      const flagged = citations.find((c) => c.confidence <= 0.1)
      expect(flagged).toBeDefined()
    })

    it("does not penalize valid US citations", () => {
      const text = "Smith v. Jones, 500 F.2d 123 (9th Cir. 2020)"
      const citations = extractCitations(text)
      const caseCite = citations.find((c) => c.type === "case")
      expect(caseCite).toBeDefined()
      expect(caseCite!.confidence).toBeGreaterThan(0.1)
    })
  })

  describe("remove mode (filterFalsePositives: true)", () => {
    it("removes I.C.J. citation entirely", () => {
      const text = "1986 I.C.J. 14 (June 27)"
      const citations = extractCitations(text, { filterFalsePositives: true })
      expect(citations).toHaveLength(0)
    })

    it("removes U.N.T.S. citation entirely", () => {
      const text = "1155 U.N.T.S. 331"
      const citations = extractCitations(text, { filterFalsePositives: true })
      expect(citations).toHaveLength(0)
    })

    it("removes historical citation entirely", () => {
      const text = "8 Co. Rep. 114 (C.P. 1610)"
      const citations = extractCitations(text, { filterFalsePositives: true })
      expect(citations).toHaveLength(0)
    })

    it("keeps valid US citations when filtering", () => {
      const text = "See Smith v. Jones, 500 F.2d 123 (9th Cir. 2020); 1986 I.C.J. 14 (June 27)."
      const citations = extractCitations(text, { filterFalsePositives: true })
      expect(citations.length).toBeGreaterThanOrEqual(1)
      expect(citations.every((c) => c.confidence > 0.1)).toBe(true)
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/integration/falsePositives.test.ts`
Expected: FAIL — filter not yet wired into pipeline.

- [ ] **Step 3: Wire the filter into extractCitations.ts**

In `src/extract/extractCitations.ts`, add the import after the existing `detectStringCitations` import (around line 39):

```typescript
import { applyFalsePositiveFilters } from "./filterFalsePositives"
```

Then add the filter call after the string citation grouping step (after line 364) and before the resolve step (line 366). Replace the block:

```typescript
  // Step 4.75: Detect string citation groups (semicolon-separated)
  detectStringCitations(citations, cleaned)

  // Step 5: Resolve short-form citations if requested
  if (options?.resolve) {
    return resolveCitations(citations, text, options.resolutionOptions)
  }

  return citations
```

With:

```typescript
  // Step 4.75: Detect string citation groups (semicolon-separated)
  detectStringCitations(citations, cleaned)

  // Step 4.9: Apply false positive filters (blocklist + year heuristic)
  const filtered = applyFalsePositiveFilters(citations, options?.filterFalsePositives ?? false)

  // Step 5: Resolve short-form citations if requested
  if (options?.resolve) {
    return resolveCitations(filtered, text, options.resolutionOptions)
  }

  return filtered
```

- [ ] **Step 4: Run integration tests to verify they pass**

Run: `pnpm exec vitest run tests/integration/falsePositives.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Run full test suite**

Run: `pnpm exec vitest run`
Expected: All tests PASS.

- [ ] **Step 6: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: Both PASS.

- [ ] **Step 7: Commit**

```bash
git add src/extract/extractCitations.ts tests/integration/falsePositives.test.ts
git commit -m "feat: wire false positive filtering into extraction pipeline (#57, #58)"
```

---

### Task 4: Enable thorny corpus false positive test cases

**Files:**
- Modify: `tests/fixtures/thorny-corpus.json` (4 entries)
- Modify: `tests/integration/thornyCorpus.test.ts`

- [ ] **Step 1: Remove knownLimitation from thorny corpus entries**

In `tests/fixtures/thorny-corpus.json`, remove the `knownLimitation` field from these 4 entries:

Entry `magna-carta` (around line 384):
Remove: `"knownLimitation": "False positive: historical citation matched as case (#57)",`

Entry `coke-reports` (around line 413):
Remove: `"knownLimitation": "False positive: historical citation matched as journal (#57)",`

Entry `international-icj` (around line 1088):
Remove: `"knownLimitation": "False positive: international citation (#58)",`

Entry `international-treaty` (around line 1103):
Remove: `"knownLimitation": "False positive: international citation (#58)",`

- [ ] **Step 2: Update thornyCorpus.test.ts to use filterFalsePositives**

In `tests/integration/thornyCorpus.test.ts`, find where `extractCitations` is called on each sample (the line that runs the extraction). It should look something like:

```typescript
const citations = extractCitations(sample.text)
```

Change it to pass `filterFalsePositives: true`:

```typescript
const citations = extractCitations(sample.text, { filterFalsePositives: true })
```

This ensures the thorny corpus tests exercise the filtering path, so previously-skipped false positive samples now pass with `expected: []`.

- [ ] **Step 3: Run thorny corpus tests**

Run: `pnpm exec vitest run tests/integration/thornyCorpus.test.ts`
Expected: All tests PASS — the 4 previously-skipped samples now run and pass (0 citations extracted with filtering enabled).

- [ ] **Step 4: Run full test suite**

Run: `pnpm exec vitest run`
Expected: All tests PASS.

- [ ] **Step 5: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: Both PASS.

- [ ] **Step 6: Commit**

```bash
git add tests/fixtures/thorny-corpus.json tests/integration/thornyCorpus.test.ts
git commit -m "test: enable thorny corpus false positive tests (#57, #58)"
```
