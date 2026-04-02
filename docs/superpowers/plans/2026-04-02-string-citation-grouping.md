# String Citation Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect semicolon-separated string citations and group them with shared group IDs, per-citation signals, and index tracking.

**Architecture:** A new post-extract phase (`detectStringCitations`) walks adjacent citations in document order, examines gap text for semicolons and signal words, and assigns grouping metadata. Signal words are also captured during case name extraction in `extractCase.ts`. All new fields live on `CitationBase` so every citation type participates.

**Tech Stack:** TypeScript, Vitest, Biome

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/types/citation.ts` | Add `CitationSignal` type, string cite fields to `CitationBase`, move `signal` from `FullCaseCitation` |
| Modify | `src/index.ts` | Export `CitationSignal` type |
| Create | `src/extract/detectStringCites.ts` | Post-extract detection of semicolon-separated string citation groups |
| Modify | `src/extract/extractCase.ts` | Capture signal word during party name extraction, populate `signal` field |
| Modify | `src/extract/extractCitations.ts` | Wire `detectStringCitations` as Phase 4.75 (after subsequent history, before resolve) |
| Create | `tests/extract/detectStringCites.test.ts` | Unit tests for string citation grouping |

---

### Task 1: Add CitationSignal type and new fields to CitationBase

**Files:**
- Modify: `src/types/citation.ts:36-63` (CitationBase), `src/types/citation.ts:192-193` (signal on FullCaseCitation)
- Modify: `src/index.ts:28-57` (type exports)

- [ ] **Step 1: Add CitationSignal type and update CitationBase**

In `src/types/citation.ts`, add the `CitationSignal` type after the `Warning` interface (after line 31), and add new fields to `CitationBase`:

```typescript
/**
 * Introductory signal word classification for citation support level.
 * Based on Bluebook signal categories (Rule 1.2).
 */
export type CitationSignal =
  | "see"
  | "see also"
  | "see generally"
  | "cf"
  | "but see"
  | "but cf"
  | "compare"
  | "accord"
  | "contra"
```

Add these fields at the end of `CitationBase` (before the closing `}`):

```typescript
  /** Introductory signal word (e.g., "see", "see also", "but see") */
  signal?: CitationSignal

  /** Group ID for string citations sharing the same proposition */
  stringCitationGroupId?: string

  /** Position within the string citation group (0-indexed) */
  stringCitationIndex?: number

  /** Total number of citations in this string citation group */
  stringCitationGroupSize?: number

  /** Text the string citation group supports (future enhancement, not yet populated) */
  propositionText?: string
```

- [ ] **Step 2: Remove signal from FullCaseCitation**

In `src/types/citation.ts`, remove the `signal` field from `FullCaseCitation` (line 192-193):

```typescript
  // DELETE these two lines from FullCaseCitation:
  /** Citation signal (introductory phrase) */
  signal?: "see" | "see also" | "cf" | "but see" | "compare"
```

The field is now inherited from `CitationBase` with the broader `CitationSignal` type.

- [ ] **Step 3: Export CitationSignal from index.ts**

In `src/index.ts`, add `CitationSignal` to the type export block (around line 28):

```typescript
export type {
  Citation,
  CitationBase,
  CitationOfType,
  CitationSignal,   // <-- ADD THIS
  CitationType,
  // ... rest unchanged
```

- [ ] **Step 4: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS (no code reads `signal` from `FullCaseCitation` specifically)

- [ ] **Step 5: Run tests**

Run: `pnpm exec vitest run`
Expected: All existing tests pass — this is a purely additive type change.

- [ ] **Step 6: Commit**

```bash
git add src/types/citation.ts src/index.ts
git commit -m "feat(types): add CitationSignal type and string cite fields to CitationBase (#77)"
```

---

### Task 2: Create detectStringCites.ts with basic grouping tests

**Files:**
- Create: `src/extract/detectStringCites.ts`
- Create: `tests/extract/detectStringCites.test.ts`

- [ ] **Step 1: Write failing tests for basic semicolon grouping**

Create `tests/extract/detectStringCites.test.ts`:

```typescript
/**
 * Tests for string citation grouping (semicolon-separated citations).
 *
 * String citations group multiple authorities supporting the same proposition.
 * Detection runs as a post-extract phase on the Citation[] array.
 */

import { describe, expect, it } from "vitest"
import { detectStringCitations } from "@/extract/detectStringCites"
import type { Citation, FullCaseCitation } from "@/types/citation"
import type { Span } from "@/types/span"

/** Helper to create a minimal case citation for testing */
function makeCase(overrides: {
  cleanStart: number
  cleanEnd: number
  fullSpanStart?: number
  fullSpanEnd?: number
  subsequentHistoryOf?: { index: number; signal: "affirmed" }
}): FullCaseCitation {
  const span: Span = {
    cleanStart: overrides.cleanStart,
    cleanEnd: overrides.cleanEnd,
    originalStart: overrides.cleanStart,
    originalEnd: overrides.cleanEnd,
  }
  const fullSpan = overrides.fullSpanStart !== undefined
    ? {
        cleanStart: overrides.fullSpanStart,
        cleanEnd: overrides.fullSpanEnd ?? overrides.cleanEnd,
        originalStart: overrides.fullSpanStart,
        originalEnd: overrides.fullSpanEnd ?? overrides.cleanEnd,
      }
    : undefined
  return {
    type: "case",
    text: "",
    span,
    confidence: 0.8,
    matchedText: "",
    processTimeMs: 0,
    patternsChecked: 1,
    volume: 500,
    reporter: "F.2d",
    page: 123,
    fullSpan,
    subsequentHistoryOf: overrides.subsequentHistoryOf,
  }
}

describe("detectStringCitations", () => {
  describe("basic grouping", () => {
    it("groups two case citations separated by semicolon", () => {
      //   "Smith v. Jones, 500 F.2d 123 (2020); Doe v. Green, 600 F.3d 456 (2021)."
      const cleaned =
        "Smith v. Jones, 500 F.2d 123 (2020); Doe v. Green, 600 F.3d 456 (2021)."
      const cit1 = makeCase({
        cleanStart: 16, cleanEnd: 28,
        fullSpanStart: 0, fullSpanEnd: 35,
      })
      const cit2 = makeCase({
        cleanStart: 53, cleanEnd: 65,
        fullSpanStart: 37, fullSpanEnd: 71,
      })
      const citations: Citation[] = [cit1, cit2]

      detectStringCitations(citations, cleaned)

      expect(cit1.stringCitationGroupId).toBeDefined()
      expect(cit2.stringCitationGroupId).toBe(cit1.stringCitationGroupId)
      expect(cit1.stringCitationIndex).toBe(0)
      expect(cit2.stringCitationIndex).toBe(1)
      expect(cit1.stringCitationGroupSize).toBe(2)
      expect(cit2.stringCitationGroupSize).toBe(2)
    })

    it("groups three citations in a chain", () => {
      const cleaned = "A, 500 F.2d 1 (2020); B, 600 F.3d 2 (2021); C, 700 F.4th 3 (2022)."
      const cit1 = makeCase({
        cleanStart: 3, cleanEnd: 14,
        fullSpanStart: 0, fullSpanEnd: 20,
      })
      const cit2 = makeCase({
        cleanStart: 25, cleanEnd: 36,
        fullSpanStart: 22, fullSpanEnd: 42,
      })
      const cit3 = makeCase({
        cleanStart: 47, cleanEnd: 59,
        fullSpanStart: 44, fullSpanEnd: 65,
      })
      const citations: Citation[] = [cit1, cit2, cit3]

      detectStringCitations(citations, cleaned)

      expect(cit1.stringCitationGroupId).toBeDefined()
      expect(cit2.stringCitationGroupId).toBe(cit1.stringCitationGroupId)
      expect(cit3.stringCitationGroupId).toBe(cit1.stringCitationGroupId)
      expect(cit1.stringCitationIndex).toBe(0)
      expect(cit2.stringCitationIndex).toBe(1)
      expect(cit3.stringCitationIndex).toBe(2)
      expect(cit1.stringCitationGroupSize).toBe(3)
      expect(cit2.stringCitationGroupSize).toBe(3)
      expect(cit3.stringCitationGroupSize).toBe(3)
    })

    it("does not group citations separated by period + prose", () => {
      const cleaned =
        "Smith v. Jones, 500 F.2d 123 (2020). The court noted Doe v. Green, 600 F.3d 456 (2021)."
      const cit1 = makeCase({
        cleanStart: 16, cleanEnd: 28,
        fullSpanStart: 0, fullSpanEnd: 35,
      })
      const cit2 = makeCase({
        cleanStart: 70, cleanEnd: 82,
        fullSpanStart: 53, fullSpanEnd: 88,
      })
      const citations: Citation[] = [cit1, cit2]

      detectStringCitations(citations, cleaned)

      expect(cit1.stringCitationGroupId).toBeUndefined()
      expect(cit2.stringCitationGroupId).toBeUndefined()
    })

    it("does not group when no semicolon in gap", () => {
      const cleaned = "Smith v. Jones, 500 F.2d 123 (2020), Doe v. Green, 600 F.3d 456 (2021)."
      const cit1 = makeCase({
        cleanStart: 16, cleanEnd: 28,
        fullSpanStart: 0, fullSpanEnd: 35,
      })
      const cit2 = makeCase({
        cleanStart: 54, cleanEnd: 66,
        fullSpanStart: 38, fullSpanEnd: 72,
      })
      const citations: Citation[] = [cit1, cit2]

      detectStringCitations(citations, cleaned)

      expect(cit1.stringCitationGroupId).toBeUndefined()
      expect(cit2.stringCitationGroupId).toBeUndefined()
    })

    it("excludes subsequent history citations from grouping", () => {
      const cleaned =
        "Smith v. Jones, 500 F.2d 123 (2020), aff'd, 600 F.3d 456 (2021)."
      const cit1 = makeCase({
        cleanStart: 16, cleanEnd: 28,
        fullSpanStart: 0, fullSpanEnd: 35,
      })
      const cit2 = makeCase({
        cleanStart: 45, cleanEnd: 57,
        fullSpanStart: 45, fullSpanEnd: 63,
        subsequentHistoryOf: { index: 0, signal: "affirmed" },
      })
      const citations: Citation[] = [cit1, cit2]

      detectStringCitations(citations, cleaned)

      expect(cit1.stringCitationGroupId).toBeUndefined()
      expect(cit2.stringCitationGroupId).toBeUndefined()
    })

    it("handles single citation (no groups)", () => {
      const cleaned = "Smith v. Jones, 500 F.2d 123 (2020)."
      const cit1 = makeCase({
        cleanStart: 16, cleanEnd: 28,
        fullSpanStart: 0, fullSpanEnd: 35,
      })
      const citations: Citation[] = [cit1]

      detectStringCitations(citations, cleaned)

      expect(cit1.stringCitationGroupId).toBeUndefined()
    })

    it("handles empty citation array", () => {
      const citations: Citation[] = []
      detectStringCitations(citations, "some text")
      expect(citations.length).toBe(0)
    })

    it("assigns unique group IDs for separate groups", () => {
      // Group 1: A; B.  Group 2: C; D.
      const cleaned =
        "A, 100 F.2d 1 (2020); B, 200 F.3d 2 (2021). C, 300 F.4th 3 (2022); D, 400 F.4th 4 (2023)."
      const cit1 = makeCase({ cleanStart: 3, cleanEnd: 14, fullSpanStart: 0, fullSpanEnd: 20 })
      const cit2 = makeCase({ cleanStart: 25, cleanEnd: 36, fullSpanStart: 22, fullSpanEnd: 42 })
      const cit3 = makeCase({ cleanStart: 47, cleanEnd: 60, fullSpanStart: 44, fullSpanEnd: 66 })
      const cit4 = makeCase({ cleanStart: 71, cleanEnd: 84, fullSpanStart: 68, fullSpanEnd: 90 })
      const citations: Citation[] = [cit1, cit2, cit3, cit4]

      detectStringCitations(citations, cleaned)

      expect(cit1.stringCitationGroupId).toBeDefined()
      expect(cit2.stringCitationGroupId).toBe(cit1.stringCitationGroupId)
      expect(cit3.stringCitationGroupId).toBeDefined()
      expect(cit4.stringCitationGroupId).toBe(cit3.stringCitationGroupId)
      expect(cit1.stringCitationGroupId).not.toBe(cit3.stringCitationGroupId)
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/extract/detectStringCites.test.ts`
Expected: FAIL — `detectStringCites` module does not exist yet.

- [ ] **Step 3: Implement detectStringCitations**

Create `src/extract/detectStringCites.ts`:

```typescript
/**
 * String Citation Detection
 *
 * Detects semicolon-separated string citation groups (multiple authorities
 * supporting the same proposition). Runs as a post-extract phase after
 * individual citation extraction and subsequent history linking.
 *
 * @module extract/detectStringCites
 */

import type { Citation, CitationSignal, FullCaseCitation } from "@/types/citation"

/**
 * Signal words recognized between string citation members (case-insensitive).
 * Longer patterns first so "see also" matches before "see".
 */
const SIGNAL_PATTERNS: ReadonlyArray<{ regex: RegExp; signal: CitationSignal }> = [
  { regex: /^see\s+generally\b/i, signal: "see generally" },
  { regex: /^see\s+also\b/i, signal: "see also" },
  { regex: /^but\s+see\b/i, signal: "but see" },
  { regex: /^but\s+cf\.?\b/i, signal: "but cf" },
  { regex: /^compare\b/i, signal: "compare" },
  { regex: /^accord\b/i, signal: "accord" },
  { regex: /^contra\b/i, signal: "contra" },
  { regex: /^see\b/i, signal: "see" },
  { regex: /^cf\.?\b/i, signal: "cf" },
]

/**
 * Get the end position of a citation's full extent in cleaned text.
 * Uses fullSpan if available (case citations with parentheticals),
 * otherwise falls back to the core span.
 */
function getCitationEnd(c: Citation): number {
  if (c.type === "case" && (c as FullCaseCitation).fullSpan) {
    return (c as FullCaseCitation).fullSpan!.cleanEnd
  }
  return c.span.cleanEnd
}

/**
 * Get the start position of a citation's full extent in cleaned text.
 * Uses fullSpan if available, otherwise falls back to core span.
 */
function getCitationStart(c: Citation): number {
  if (c.type === "case" && (c as FullCaseCitation).fullSpan) {
    return (c as FullCaseCitation).fullSpan!.cleanStart
  }
  return c.span.cleanStart
}

/**
 * Parse a recognized signal word from text.
 * Returns the normalized signal and the length of the match, or undefined.
 */
function parseSignal(text: string): { signal: CitationSignal; length: number } | undefined {
  const trimmed = text.trimStart()
  for (const { regex, signal } of SIGNAL_PATTERNS) {
    const match = regex.exec(trimmed)
    if (match) {
      return { signal, length: match[0].length }
    }
  }
  return undefined
}

/**
 * Check if the gap text between two citations is a valid string cite separator.
 *
 * Valid gaps contain only: whitespace, a single semicolon, and optionally a
 * recognized signal word. Returns the parsed signal if present.
 *
 * @returns Object with `valid` flag and optional `signal` if a mid-group signal was found
 */
function analyzeGap(gapText: string): { valid: boolean; signal?: CitationSignal } {
  // Must contain a semicolon
  const semiIndex = gapText.indexOf(";")
  if (semiIndex === -1) return { valid: false }

  // Text before semicolon must be only whitespace
  const before = gapText.substring(0, semiIndex).trim()
  if (before !== "") return { valid: false }

  // Text after semicolon: optional whitespace + optional signal word + optional whitespace
  const after = gapText.substring(semiIndex + 1).trim()

  // Empty after semicolon (just whitespace) — valid, no signal
  if (after === "") return { valid: true }

  // Try to parse a signal word
  const signalResult = parseSignal(after)
  if (signalResult) {
    // Everything after the signal must be whitespace
    const remainder = after.substring(signalResult.length).trim()
    if (remainder === "") return { valid: true, signal: signalResult.signal }
  }

  // Non-signal text after semicolon — not a valid string cite gap
  return { valid: false }
}

/**
 * Detect string citation groups from extracted citations.
 *
 * Walks adjacent citations in document order, examines the gap text between
 * them, and groups citations separated by semicolons (with optional signal
 * words). Mutates citations in place to set grouping fields.
 *
 * Must run AFTER subsequent history linking (needs `subsequentHistoryOf` to
 * exclude history citations) and AFTER parallel detection.
 *
 * @param citations - Extracted citations sorted by span.cleanStart (document order)
 * @param cleanedText - Cleaned text used for gap analysis
 */
export function detectStringCitations(citations: Citation[], cleanedText: string): void {
  if (citations.length < 2) return

  // Build groups as arrays of citation indices
  const groups: number[][] = []
  let currentGroup: number[] = []

  for (let i = 0; i < citations.length - 1; i++) {
    const current = citations[i]
    const next = citations[i + 1]

    // Skip if next citation is a subsequent history entry
    if (next.type === "case" && (next as FullCaseCitation).subsequentHistoryOf) {
      // If we had a group building, finalize it
      if (currentGroup.length > 0) {
        currentGroup.push(i)
        groups.push(currentGroup)
        currentGroup = []
      }
      continue
    }

    // Skip if current citation is a subsequent history entry
    if (current.type === "case" && (current as FullCaseCitation).subsequentHistoryOf) {
      continue
    }

    // Extract gap text between end of current's full extent and start of next's full extent
    const gapStart = getCitationEnd(current)
    const gapEnd = getCitationStart(next)

    // Guard against overlapping or adjacent spans with no gap
    if (gapEnd <= gapStart) {
      if (currentGroup.length > 0) {
        currentGroup.push(i)
        groups.push(currentGroup)
        currentGroup = []
      }
      continue
    }

    const gapText = cleanedText.substring(gapStart, gapEnd)
    const analysis = analyzeGap(gapText)

    if (analysis.valid) {
      // Start or continue a group
      if (currentGroup.length === 0) {
        currentGroup.push(i)
      }
      // Set mid-group signal on next citation if found and not already set
      if (analysis.signal && !next.signal) {
        ;(next as { signal?: CitationSignal }).signal = analysis.signal
      }
    } else {
      // Group breaks — finalize current group if any
      if (currentGroup.length > 0) {
        currentGroup.push(i)
        groups.push(currentGroup)
        currentGroup = []
      }
    }
  }

  // Handle the last pair: if we're still building a group, include the last citation
  if (currentGroup.length > 0) {
    currentGroup.push(citations.length - 1)
    groups.push(currentGroup)
  }

  // Assign group metadata
  for (let g = 0; g < groups.length; g++) {
    const group = groups[g]
    if (group.length < 2) continue

    const groupId = `sc-${g}`
    for (let idx = 0; idx < group.length; idx++) {
      const citIndex = group[idx]
      const cit = citations[citIndex]
      cit.stringCitationGroupId = groupId
      cit.stringCitationIndex = idx
      cit.stringCitationGroupSize = group.length
    }
  }

  // Detect leading signal for first member of each group (non-case citations only,
  // since case citations get their signal from extractCase party name stripping)
  for (const group of groups) {
    if (group.length < 2) continue
    const first = citations[group[0]]
    if (first.signal) continue // Already set (e.g., by extractCase)

    // Look backward from citation start for a signal word
    const searchStart = Math.max(0, getCitationStart(first) - 30)
    const precedingText = cleanedText.substring(searchStart, getCitationStart(first)).trim()

    // Check if preceding text ends with a signal word
    // Try each signal pattern against the end of the preceding text
    for (const { regex, signal } of SIGNAL_PATTERNS) {
      // Build a regex that matches the signal at the end of the string
      const endPattern = new RegExp(
        regex.source.replace(/^\^/, "") + "\\s*$",
        regex.flags,
      )
      if (endPattern.test(precedingText)) {
        ;(first as { signal?: CitationSignal }).signal = signal
        break
      }
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/extract/detectStringCites.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Run full test suite**

Run: `pnpm exec vitest run`
Expected: All tests PASS (no regressions).

- [ ] **Step 6: Commit**

```bash
git add src/extract/detectStringCites.ts tests/extract/detectStringCites.test.ts
git commit -m "feat: add detectStringCitations for semicolon-separated grouping (#77)"
```

---

### Task 3: Add signal capture to extractCase.ts

**Files:**
- Modify: `src/extract/extractCase.ts:577-596` (extractPartyNames), `src/extract/extractCase.ts:896-928` (return object)
- Modify: `tests/extract/extractCase.test.ts`

- [ ] **Step 1: Write failing tests for signal population**

Add to `tests/extract/extractCase.test.ts`, inside the top-level `describe`:

```typescript
describe("signal word extraction", () => {
  it("captures 'see' signal from case citation", () => {
    const text = "See Smith v. Jones, 500 F.2d 123 (9th Cir. 2020)"
    const citations = extractCitations(text)
    const caseCite = citations.find((c) => c.type === "case")
    expect(caseCite?.signal).toBe("see")
  })

  it("captures 'see also' signal", () => {
    const text = "See also Smith v. Jones, 500 F.2d 123 (9th Cir. 2020)"
    const citations = extractCitations(text)
    const caseCite = citations.find((c) => c.type === "case")
    expect(caseCite?.signal).toBe("see also")
  })

  it("captures 'cf' signal (with period)", () => {
    const text = "Cf. Smith v. Jones, 500 F.2d 123 (9th Cir. 2020)"
    const citations = extractCitations(text)
    const caseCite = citations.find((c) => c.type === "case")
    expect(caseCite?.signal).toBe("cf")
  })

  it("captures 'but see' signal", () => {
    const text = "But see Smith v. Jones, 500 F.2d 123 (9th Cir. 2020)"
    const citations = extractCitations(text)
    const caseCite = citations.find((c) => c.type === "case")
    expect(caseCite?.signal).toBe("but see")
  })

  it("captures 'compare' signal", () => {
    const text = "Compare Smith v. Jones, 500 F.2d 123 (9th Cir. 2020)"
    const citations = extractCitations(text)
    const caseCite = citations.find((c) => c.type === "case")
    expect(caseCite?.signal).toBe("compare")
  })

  it("does not set signal when none present", () => {
    const text = "Smith v. Jones, 500 F.2d 123 (9th Cir. 2020)"
    const citations = extractCitations(text)
    const caseCite = citations.find((c) => c.type === "case")
    expect(caseCite?.signal).toBeUndefined()
  })

  it("strips signal from plaintiff name", () => {
    const text = "See Smith v. Jones, 500 F.2d 123 (9th Cir. 2020)"
    const citations = extractCitations(text)
    const caseCite = citations.find((c) => c.type === "case") as FullCaseCitation | undefined
    expect(caseCite?.plaintiff).toBe("Smith")
    expect(caseCite?.signal).toBe("see")
  })
})
```

Note: The test file will need `import { extractCitations } from "@/extract/extractCitations"` and `import type { FullCaseCitation } from "@/types/citation"`. Add these to the existing imports if not already present.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/extract/extractCase.test.ts -t "signal word"`
Expected: FAIL — `signal` is undefined on case citations (not yet populated).

- [ ] **Step 3: Modify extractPartyNames to return signal**

In `src/extract/extractCase.ts`, the `extractPartyNames` function (around line 500) currently returns an object with party name fields. Modify it to also return the stripped signal word.

First, update the signal stripping regex (around line 584-588) to capture the matched signal:

Replace the current signal-stripping block:

```typescript
    // Strip signal words from plaintiff (e.g., "In Smith" → "Smith", "See Jones" → "Jones")
    // Preserve "In re" which is a procedural prefix, not a signal word
    plaintiff = plaintiff
      .replace(/^(?:In(?!\s+re\b)|See(?:\s+[Aa]lso)?|Compare|But(?:\s+[Ss]ee)?|Cf\.?|Also)\s+/i, "")
      .trim()
```

With:

```typescript
    // Strip signal words from plaintiff (e.g., "In Smith" → "Smith", "See Jones" → "Jones")
    // Preserve "In re" which is a procedural prefix, not a signal word
    // Capture the signal for the citation's signal field
    const signalMatch = plaintiff.match(
      /^(See\s+[Aa]lso|See\s+[Gg]enerally|But\s+[Ss]ee|But\s+[Cc]f\.?|Compare|Accord|Contra|See|Cf\.?|Also|In(?!\s+re\b))\s+/i,
    )
    if (signalMatch) {
      const raw = signalMatch[1].toLowerCase().replace(/\.$/, "")
      if (raw !== "in" && raw !== "also") {
        signal = raw as CitationSignal
      }
      plaintiff = plaintiff.substring(signalMatch[0].length).trim()
    }
```

This requires a `signal` variable in the function. Update the function return type and declaration. The function should be updated from:

```typescript
function extractPartyNames(caseName: string): {
  plaintiff?: string
  plaintiffNormalized?: string
  defendant?: string
  defendantNormalized?: string
  proceduralPrefix?: string
}
```

To:

```typescript
function extractPartyNames(caseName: string): {
  plaintiff?: string
  plaintiffNormalized?: string
  defendant?: string
  defendantNormalized?: string
  proceduralPrefix?: string
  signal?: CitationSignal
}
```

Add `let signal: CitationSignal | undefined` at the top of the `extractPartyNames` function body. Include `signal` in both return statements of the "v." branch (the one that does the signal stripping, line 590-595, and the fallback at line 591).

Add the import for `CitationSignal` at the top of the file (line 18-24):

```typescript
import type {
  CitationSignal,       // <-- ADD THIS
  FullCaseCitation,
  HistorySignal,
  Parenthetical,
  ParentheticalType,
  SubsequentHistoryEntry,
} from "@/types/citation"
```

- [ ] **Step 4: Populate signal on the returned citation**

In `extractCase` function, where `extractPartyNames` is called (around line 832):

Replace:

```typescript
  if (caseName) {
    const partyResult = extractPartyNames(caseName)
    plaintiff = partyResult.plaintiff
    plaintiffNormalized = partyResult.plaintiffNormalized
    defendant = partyResult.defendant
    defendantNormalized = partyResult.defendantNormalized
    proceduralPrefix = partyResult.proceduralPrefix
  }
```

With:

```typescript
  let signal: CitationSignal | undefined
  if (caseName) {
    const partyResult = extractPartyNames(caseName)
    plaintiff = partyResult.plaintiff
    plaintiffNormalized = partyResult.plaintiffNormalized
    defendant = partyResult.defendant
    defendantNormalized = partyResult.defendantNormalized
    proceduralPrefix = partyResult.proceduralPrefix
    signal = partyResult.signal
  }
```

Then add `signal` to the return object (around line 896-928). Add it after `inferredCourt`:

```typescript
    inferredCourt,
    signal,     // <-- ADD THIS
  }
```

Note: TypeScript will not include `signal` in the output object if it's `undefined` since we're using shorthand property syntax and the field is optional on `FullCaseCitation` (inherited from `CitationBase`). This preserves backward compatibility.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/extract/extractCase.test.ts -t "signal word"`
Expected: All signal tests PASS.

- [ ] **Step 6: Run full test suite**

Run: `pnpm exec vitest run`
Expected: All tests PASS (existing party name stripping behavior is preserved).

- [ ] **Step 7: Commit**

```bash
git add src/extract/extractCase.ts tests/extract/extractCase.test.ts
git commit -m "feat: capture citation signal words during case name extraction (#77)"
```

---

### Task 4: Add signal detection tests for detectStringCites

**Files:**
- Modify: `tests/extract/detectStringCites.test.ts`

- [ ] **Step 1: Add mid-group signal tests**

Add a new `describe` block to `tests/extract/detectStringCites.test.ts`:

```typescript
  describe("mid-group signal detection", () => {
    it("captures mid-group 'see also' signal", () => {
      const cleaned =
        "A, 500 F.2d 123 (2020); see also B, 600 F.3d 456 (2021)."
      const cit1 = makeCase({
        cleanStart: 3, cleanEnd: 14,
        fullSpanStart: 0, fullSpanEnd: 20,
      })
      const cit2 = makeCase({
        cleanStart: 38, cleanEnd: 49,
        fullSpanStart: 33, fullSpanEnd: 55,
      })
      const citations: Citation[] = [cit1, cit2]

      detectStringCitations(citations, cleaned)

      expect(cit1.stringCitationGroupId).toBeDefined()
      expect(cit2.stringCitationGroupId).toBe(cit1.stringCitationGroupId)
      expect(cit2.signal).toBe("see also")
    })

    it("captures mid-group 'but see' signal", () => {
      const cleaned =
        "A, 500 F.2d 123 (2020); but see B, 600 F.3d 456 (2021)."
      const cit1 = makeCase({
        cleanStart: 3, cleanEnd: 14,
        fullSpanStart: 0, fullSpanEnd: 20,
      })
      const cit2 = makeCase({
        cleanStart: 37, cleanEnd: 48,
        fullSpanStart: 32, fullSpanEnd: 54,
      })
      const citations: Citation[] = [cit1, cit2]

      detectStringCitations(citations, cleaned)

      expect(cit2.signal).toBe("but see")
    })

    it("does not overwrite signal already set by extractCase", () => {
      const cleaned =
        "A, 500 F.2d 123 (2020); see also B, 600 F.3d 456 (2021)."
      const cit1 = makeCase({
        cleanStart: 3, cleanEnd: 14,
        fullSpanStart: 0, fullSpanEnd: 20,
      })
      const cit2 = makeCase({
        cleanStart: 38, cleanEnd: 49,
        fullSpanStart: 33, fullSpanEnd: 55,
      })
      // Simulate extractCase having already set the signal
      cit2.signal = "cf"
      const citations: Citation[] = [cit1, cit2]

      detectStringCitations(citations, cleaned)

      expect(cit2.signal).toBe("cf") // Not overwritten
    })
  })

  describe("leading signal detection for non-case citations", () => {
    it("detects leading signal for statute as first group member", () => {
      const cleaned = "See 42 U.S.C. 1983; Smith v. Jones, 500 F.2d 123 (2020)."
      const statute: Citation = {
        type: "statute",
        text: "42 U.S.C. 1983",
        span: { cleanStart: 4, cleanEnd: 18, originalStart: 4, originalEnd: 18 },
        confidence: 0.8,
        matchedText: "42 U.S.C. 1983",
        processTimeMs: 0,
        patternsChecked: 1,
        code: "U.S.C.",
        section: "1983",
      }
      const caseCite = makeCase({
        cleanStart: 36, cleanEnd: 48,
        fullSpanStart: 20, fullSpanEnd: 56,
      })
      const citations: Citation[] = [statute, caseCite]

      detectStringCitations(citations, cleaned)

      expect(statute.signal).toBe("see")
      expect(statute.stringCitationGroupId).toBeDefined()
    })
  })
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/extract/detectStringCites.test.ts`
Expected: All tests PASS (the implementation from Task 2 already handles signals).

- [ ] **Step 3: Commit**

```bash
git add tests/extract/detectStringCites.test.ts
git commit -m "test: add signal detection tests for string citation grouping (#77)"
```

---

### Task 5: Wire detectStringCitations into the extraction pipeline

**Files:**
- Modify: `src/extract/extractCitations.ts:36-39` (imports), `src/extract/extractCitations.ts:360-361` (new phase)
- Create or modify: `tests/integration/stringCites.test.ts`

- [ ] **Step 1: Write failing integration test**

Create `tests/integration/stringCites.test.ts`:

```typescript
/**
 * Integration tests for string citation grouping.
 * Tests the full pipeline: text → clean → tokenize → extract → group.
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import type { FullCaseCitation } from "@/types/citation"

describe("string citation grouping (integration)", () => {
  it("groups semicolon-separated case citations", () => {
    const text =
      "See Smith v. Jones, 500 F.2d 123 (9th Cir. 2020); Doe v. Green, 600 F.3d 456 (2d Cir. 2021)."
    const citations = extractCitations(text)

    const caseCites = citations.filter((c) => c.type === "case")
    expect(caseCites.length).toBeGreaterThanOrEqual(2)

    // Both should be in same string cite group
    expect(caseCites[0].stringCitationGroupId).toBeDefined()
    expect(caseCites[1].stringCitationGroupId).toBe(caseCites[0].stringCitationGroupId)
    expect(caseCites[0].stringCitationIndex).toBe(0)
    expect(caseCites[1].stringCitationIndex).toBe(1)
    expect(caseCites[0].stringCitationGroupSize).toBe(2)

    // First citation should have leading signal from extractCase
    expect(caseCites[0].signal).toBe("see")
  })

  it("groups with mid-group signal words", () => {
    const text =
      "Smith v. Jones, 500 F.2d 123 (9th Cir. 2020); see also Doe v. Green, 600 F.3d 456 (2d Cir. 2021)."
    const citations = extractCitations(text)

    const caseCites = citations.filter((c) => c.type === "case")
    expect(caseCites.length).toBeGreaterThanOrEqual(2)

    expect(caseCites[0].stringCitationGroupId).toBeDefined()
    expect(caseCites[1].stringCitationGroupId).toBe(caseCites[0].stringCitationGroupId)
    expect(caseCites[1].signal).toBe("see also")
  })

  it("does not group citations separated by prose", () => {
    const text =
      "In Smith v. Jones, 500 F.2d 123 (9th Cir. 2020), the court agreed. Later, in Doe v. Green, 600 F.3d 456 (2d Cir. 2021), the court disagreed."
    const citations = extractCitations(text)

    const caseCites = citations.filter((c) => c.type === "case")
    expect(caseCites.length).toBeGreaterThanOrEqual(2)

    // Should NOT be grouped
    expect(caseCites[0].stringCitationGroupId).toBeUndefined()
    expect(caseCites[1].stringCitationGroupId).toBeUndefined()
  })

  it("works with resolution enabled", () => {
    const text =
      "See Smith v. Jones, 500 F.2d 123 (9th Cir. 2020); Doe v. Green, 600 F.3d 456 (2d Cir. 2021). Id. at 460."
    const resolved = extractCitations(text, { resolve: true })

    // String cite group should still be present on resolved citations
    const caseCites = resolved.filter((c) => c.type === "case")
    expect(caseCites[0].stringCitationGroupId).toBeDefined()
    expect(caseCites[1].stringCitationGroupId).toBe(caseCites[0].stringCitationGroupId)
  })

  it("groups three citations in a chain", () => {
    const text =
      "See Smith v. Jones, 500 F.2d 123 (9th Cir. 2020); Doe v. Green, 600 F.3d 456 (2d Cir. 2021); Black v. White, 700 F.4th 789 (D.C. Cir. 2022)."
    const citations = extractCitations(text)

    const caseCites = citations.filter((c) => c.type === "case")
    expect(caseCites.length).toBeGreaterThanOrEqual(3)

    const groupId = caseCites[0].stringCitationGroupId
    expect(groupId).toBeDefined()
    expect(caseCites[1].stringCitationGroupId).toBe(groupId)
    expect(caseCites[2].stringCitationGroupId).toBe(groupId)
    expect(caseCites[0].stringCitationIndex).toBe(0)
    expect(caseCites[1].stringCitationIndex).toBe(1)
    expect(caseCites[2].stringCitationIndex).toBe(2)
    expect(caseCites[0].stringCitationGroupSize).toBe(3)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/integration/stringCites.test.ts`
Expected: FAIL — `detectStringCitations` is not yet called in the pipeline, so no grouping metadata is set.

- [ ] **Step 3: Wire detectStringCitations into extractCitations.ts**

In `src/extract/extractCitations.ts`, add the import (around line 38):

```typescript
import { detectStringCitations } from "./detectStringCites"
```

Then add the new phase after the subsequent history linking block (after line 360, before the resolve step at line 362). Insert:

```typescript
  // Step 4.75: Detect string citation groups (semicolon-separated)
  detectStringCitations(citations, cleaned)
```

The full context around the insertion point:

```typescript
        entryIdx++
      }
    }
  }

  // Step 4.75: Detect string citation groups (semicolon-separated)
  detectStringCitations(citations, cleaned)

  // Step 5: Resolve short-form citations if requested
  if (options?.resolve) {
```

- [ ] **Step 4: Run integration tests to verify they pass**

Run: `pnpm exec vitest run tests/integration/stringCites.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Run full test suite**

Run: `pnpm exec vitest run`
Expected: All tests PASS.

- [ ] **Step 6: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Run lint**

Run: `pnpm lint`
Expected: PASS (or fix any issues with `pnpm format`).

- [ ] **Step 8: Commit**

```bash
git add src/extract/extractCitations.ts tests/integration/stringCites.test.ts
git commit -m "feat: wire string citation grouping into extraction pipeline (#77)"
```

---

### Task 6: Edge case tests and cleanup

**Files:**
- Modify: `tests/extract/detectStringCites.test.ts`
- Modify: `tests/integration/stringCites.test.ts`

- [ ] **Step 1: Add mixed citation type integration test**

Add to `tests/integration/stringCites.test.ts`:

```typescript
  it("groups mixed citation types (case + statute)", () => {
    const text =
      "See 42 U.S.C. § 1983; Smith v. Jones, 500 F.2d 123 (9th Cir. 2020)."
    const citations = extractCitations(text)

    expect(citations.length).toBeGreaterThanOrEqual(2)

    const groupId = citations[0].stringCitationGroupId
    expect(groupId).toBeDefined()
    expect(citations[1].stringCitationGroupId).toBe(groupId)
    expect(citations[0].stringCitationIndex).toBe(0)
    expect(citations[1].stringCitationIndex).toBe(1)
  })
```

- [ ] **Step 2: Add parallel + string cite orthogonality test**

Add to `tests/integration/stringCites.test.ts`:

```typescript
  it("parallel cites and string cites coexist", () => {
    const text =
      "Smith v. Jones, 500 F.2d 123, 50 U.S. 456 (2020); Doe v. Green, 600 F.3d 789 (2d Cir. 2021)."
    const citations = extractCitations(text)

    const caseCites = citations.filter((c) => c.type === "case") as FullCaseCitation[]
    // First two should be parallel (comma-separated, same case)
    // The primary parallel cite and the third cite should be in a string group

    // At least verify string grouping is present
    const groupedCites = caseCites.filter((c) => c.stringCitationGroupId)
    expect(groupedCites.length).toBeGreaterThanOrEqual(2)
  })
```

- [ ] **Step 3: Run all tests**

Run: `pnpm exec vitest run`
Expected: All tests PASS.

- [ ] **Step 4: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: Both PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/extract/detectStringCites.test.ts tests/integration/stringCites.test.ts
git commit -m "test: add edge case tests for mixed types and parallel cite orthogonality (#77)"
```
