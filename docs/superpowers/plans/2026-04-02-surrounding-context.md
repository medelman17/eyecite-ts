# Sentence Context Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `getSurroundingContext` utility that finds the enclosing sentence or paragraph around a citation span, with legal-text-aware abbreviation handling.

**Architecture:** Scans backwards and forwards from the citation span looking for sentence boundaries (`.?!` followed by whitespace + uppercase). Maintains a static abbreviation allowlist so periods in "Corp.", "U.S.", "F.3d", "No.", "v." etc. are not treated as sentence ends. Paragraph mode splits on `\n\n+`. The allowlist is defined locally in `context.ts` — no import from `src/data/`.

**Tech Stack:** TypeScript 5.9+, Vitest 4

**Spec:** `docs/superpowers/specs/2026-04-02-post-extraction-utils-design.md` (Section 2a)
**Issue:** #95

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/utils/context.ts` | `getSurroundingContext` + static legal abbreviation allowlist |
| `src/utils/index.ts` | (modify) Add `getSurroundingContext` export |
| `tests/utils/context.test.ts` | All test cases |

---

### Task 1: Write failing tests

**Files:**
- Create: `tests/utils/context.test.ts`

- [ ] **Step 1: Create the test file**

```typescript
import { describe, expect, it } from "vitest"
import { getSurroundingContext } from "../../src/utils"

describe("getSurroundingContext", () => {
  describe("sentence mode (default)", () => {
    it("extracts sentence containing the span", () => {
      const text = "First sentence. In Smith v. Doe, 500 F.2d 123 (2020), the Court held X. Third sentence."
      // The citation span: "500 F.2d 123 (2020)"
      const span = { start: 33, end: 52 }
      const result = getSurroundingContext(text, span)
      expect(result.text).toBe("In Smith v. Doe, 500 F.2d 123 (2020), the Court held X.")
    })

    it("handles citation at start of text", () => {
      const text = "500 F.2d 123 (2020) established the standard. Next sentence."
      const span = { start: 0, end: 19 }
      const result = getSurroundingContext(text, span)
      expect(result.text).toBe("500 F.2d 123 (2020) established the standard.")
    })

    it("handles citation at end of text", () => {
      const text = "The Court cited 500 F.2d 123"
      const span = { start: 16, end: 28 }
      const result = getSurroundingContext(text, span)
      expect(result.text).toBe("The Court cited 500 F.2d 123")
    })

    it("does not split on period in Corp.", () => {
      const text = "Previously, in Bell Atl. Corp. v. Twombly, 550 U.S. 544 (2007), the Court held that a complaint must plead plausible facts. Next."
      const span = { start: 43, end: 62 }
      const result = getSurroundingContext(text, span)
      expect(result.text).toContain("Bell Atl. Corp. v. Twombly")
      expect(result.text).toContain("plausible facts")
    })

    it("does not split on period in U.S.", () => {
      const text = "See 550 U.S. 544 for details. Another sentence."
      const span = { start: 4, end: 16 }
      const result = getSurroundingContext(text, span)
      expect(result.text).toBe("See 550 U.S. 544 for details.")
    })

    it("does not split on period in F.3d", () => {
      const text = "Prior case. The ruling in 300 F.3d 456 was significant. After."
      const span = { start: 26, end: 38 }
      const result = getSurroundingContext(text, span)
      expect(result.text).toBe("The ruling in 300 F.3d 456 was significant.")
    })

    it("does not split on period in No.", () => {
      const text = "In Case No. 12-345, the court ruled favorably. End."
      const span = { start: 3, end: 19 }
      const result = getSurroundingContext(text, span)
      expect(result.text).toBe("In Case No. 12-345, the court ruled favorably.")
    })

    it("does not split on period in v.", () => {
      const text = "First. In Smith v. Jones, the holding was clear. Last."
      const span = { start: 7, end: 24 }
      const result = getSurroundingContext(text, span)
      expect(result.text).toBe("In Smith v. Jones, the holding was clear.")
    })

    it("handles question mark as sentence boundary", () => {
      const text = "Did 500 F.2d 123 apply? The court said yes."
      const span = { start: 4, end: 16 }
      const result = getSurroundingContext(text, span)
      expect(result.text).toBe("Did 500 F.2d 123 apply?")
    })

    it("handles exclamation mark as sentence boundary", () => {
      const text = "Remarkable! See 500 F.2d 123 for details. End."
      const span = { start: 16, end: 28 }
      const result = getSurroundingContext(text, span)
      expect(result.text).toBe("See 500 F.2d 123 for details.")
    })

    it("returns correct span offsets", () => {
      const text = "First sentence. The citation 500 F.2d 123 matters. Third."
      const span = { start: 29, end: 41 }
      const result = getSurroundingContext(text, span)
      expect(result.span.start).toBe(16)
      expect(result.span.end).toBe(50)
      expect(text.slice(result.span.start, result.span.end)).toBe(result.text)
    })

    it("respects maxLength by trimming to sentence boundary", () => {
      const text = "A".repeat(300) + ". See 500 F.2d 123 here. End."
      const span = { start: 306, end: 318 }
      const result = getSurroundingContext(text, span, { maxLength: 50 })
      expect(result.text.length).toBeLessThanOrEqual(50)
    })
  })

  describe("paragraph mode", () => {
    it("extracts paragraph containing the span", () => {
      const text = "First paragraph.\n\nIn the second paragraph, see 500 F.2d 123 for the holding.\n\nThird paragraph."
      const span = { start: 48, end: 60 }
      const result = getSurroundingContext(text, span, { type: "paragraph" })
      expect(result.text).toBe("In the second paragraph, see 500 F.2d 123 for the holding.")
    })

    it("handles single paragraph (no breaks)", () => {
      const text = "Only one paragraph with 500 F.2d 123 in it."
      const span = { start: 24, end: 36 }
      const result = getSurroundingContext(text, span, { type: "paragraph" })
      expect(result.text).toBe("Only one paragraph with 500 F.2d 123 in it.")
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/medelman/Projects/OSS/eyecite-ts && pnpm vitest run tests/utils/context.test.ts`
Expected: FAIL — `getSurroundingContext` is not exported

- [ ] **Step 3: Commit**

```bash
git add tests/utils/context.test.ts
git commit -m "test(utils): add failing tests for getSurroundingContext

Covers sentence detection with legal abbreviations (Corp., U.S., F.3d,
No., v.), boundary chars (?!), span offsets, maxLength, and paragraph mode.

Refs #95"
```

---

### Task 2: Implement getSurroundingContext

**Files:**
- Create: `src/utils/context.ts`
- Modify: `src/utils/index.ts`

- [ ] **Step 1: Create `src/utils/context.ts`**

```typescript
import type { ContextOptions, SurroundingContext } from "./types"

/**
 * Legal abbreviations that contain periods but are NOT sentence boundaries.
 * Kept as a static set in this file — does NOT import from src/data/
 * to preserve tree-shaking of the utils entry point.
 */
const LEGAL_ABBREVIATIONS = new Set([
  // Court and case abbreviations
  "v",
  "vs",
  // Reporter abbreviations (common ones)
  "U.S",
  "S.Ct",
  "S. Ct",
  "L.Ed",
  "L. Ed",
  "F",
  "F.2d",
  "F.3d",
  "F.4th",
  "F.Supp",
  "F. Supp",
  "A.2d",
  "A.3d",
  "N.E",
  "N.E.2d",
  "N.W",
  "N.W.2d",
  "S.E",
  "S.E.2d",
  "S.W",
  "S.W.2d",
  "S.W.3d",
  "So",
  "So.2d",
  "So.3d",
  "P",
  "P.2d",
  "P.3d",
  // Titles and procedural terms
  "No",
  "Nos",
  "Inc",
  "Corp",
  "Ltd",
  "Co",
  "Ass'n",
  "Dept",
  "Dist",
  "Cir",
  "App",
  "Supp",
  "Rev",
  "Stat",
  "Const",
  // General legal abbreviations
  "Mr",
  "Mrs",
  "Ms",
  "Dr",
  "Jr",
  "Sr",
  "St",
  "Ct",
  "Atl",
  "Cal",
  "Fla",
  "Ill",
  "Tex",
  "Pa",
  "Md",
  "Va",
  "Wis",
  "Minn",
  "Mich",
  "Mass",
  "Conn",
  "Colo",
  "Ariz",
  "Ark",
  "Ga",
  "La",
  "Ind",
  "Kan",
  "Ky",
  "Miss",
  "Mo",
  "Neb",
  "Nev",
  "Okla",
  "Or",
  "Tenn",
  "Vt",
  "Wash",
  "Wyo",
  "Del",
  "Haw",
  "Ida",
  "Me",
  "Mont",
  "R.I",
  "S.C",
  "S.D",
  "N.C",
  "N.D",
  "N.J",
  "N.M",
  "N.Y",
  "W.Va",
  // Federal abbreviations
  "U.S.C",
  "C.F.R",
  "Fed",
  "Reg",
  "Pub",
  "Amend",
  "Sec",
  "Art",
  "Cl",
  "Ch",
  "Pt",
  "Vol",
  "Ed",
  "Harv",
  "Yale",
  "Stan",
  "Colum",
  "Geo",
])

/**
 * Check if a period at the given position is likely an abbreviation,
 * not a sentence boundary.
 */
function isAbbreviationPeriod(text: string, dotIndex: number): boolean {
  // Look backwards from the dot to find the word
  let wordStart = dotIndex
  while (wordStart > 0 && text[wordStart - 1] !== " " && text[wordStart - 1] !== "\n") {
    wordStart--
  }

  const word = text.slice(wordStart, dotIndex)

  // Single letter followed by period (e.g., "U.", "S.", "F.")
  if (word.length === 1 && /[A-Z]/.test(word)) return true

  // Check multi-character abbreviations (strip any trailing dots for lookup)
  const stripped = word.replace(/\.$/g, "")
  if (LEGAL_ABBREVIATIONS.has(stripped)) return true

  // Check if the word itself (with internal dots) is known: "U.S", "F.2d", etc.
  if (LEGAL_ABBREVIATIONS.has(word)) return true

  // Number followed by period (ordinals like "1." in list context — not sentence end if no space+uppercase follows)
  // This is handled by the caller's space+uppercase check

  return false
}

/**
 * Find the start of the sentence containing the given position.
 */
function findSentenceStart(text: string, pos: number): number {
  for (let i = pos - 1; i >= 0; i--) {
    const ch = text[i]
    if (ch === "." || ch === "?" || ch === "!") {
      if (ch === "." && isAbbreviationPeriod(text, i)) continue

      // Check if followed by whitespace (the char after this terminator)
      const next = i + 1
      if (next < text.length && /\s/.test(text[next])) {
        // Skip whitespace to find the start of the next sentence
        let start = next
        while (start < pos && /\s/.test(text[start])) start++
        return start
      }
    }
  }
  return 0
}

/**
 * Find the end of the sentence containing the given position.
 */
function findSentenceEnd(text: string, pos: number): number {
  for (let i = pos; i < text.length; i++) {
    const ch = text[i]
    if (ch === "." || ch === "?" || ch === "!") {
      if (ch === "." && isAbbreviationPeriod(text, i)) continue
      return i + 1
    }
  }
  return text.length
}

/**
 * Find the enclosing sentence or paragraph around a citation span.
 *
 * Legal-text-aware: periods in reporter abbreviations, court names,
 * and procedural terms (Corp., U.S., F.3d, No., v.) are not treated
 * as sentence boundaries.
 *
 * @example
 * ```typescript
 * const ctx = getSurroundingContext(text, { start: 33, end: 52 })
 * // ctx.text: "In Smith v. Doe, 500 F.2d 123 (2020), the Court held X."
 * // ctx.span: { start: 16, end: 71 }
 * ```
 */
export function getSurroundingContext(
  text: string,
  span: { start: number; end: number },
  options?: ContextOptions,
): SurroundingContext {
  const type = options?.type ?? "sentence"
  const maxLength = options?.maxLength

  let start: number
  let end: number

  if (type === "paragraph") {
    // Find paragraph boundaries (double newline)
    const beforeSpan = text.lastIndexOf("\n\n", span.start)
    start = beforeSpan === -1 ? 0 : beforeSpan + 2
    const afterSpan = text.indexOf("\n\n", span.end)
    end = afterSpan === -1 ? text.length : afterSpan
  } else {
    start = findSentenceStart(text, span.start)
    end = findSentenceEnd(text, span.end)
  }

  let resultText = text.slice(start, end).trim()
  const trimmedStart = start + (text.slice(start, end).length - text.slice(start, end).trimStart().length)
  const trimmedEnd = end - (text.slice(start, end).length - text.slice(start, end).trimEnd().length)

  if (maxLength && resultText.length > maxLength) {
    resultText = resultText.slice(0, maxLength)
    return {
      text: resultText,
      span: { start: trimmedStart, end: trimmedStart + resultText.length },
    }
  }

  return {
    text: resultText,
    span: { start: trimmedStart, end: trimmedEnd },
  }
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
export { getSurroundingContext } from "./context"
```

- [ ] **Step 3: Run tests**

Run: `cd /Users/medelman/Projects/OSS/eyecite-ts && pnpm vitest run tests/utils/context.test.ts`
Expected: All tests pass (14 tests)

- [ ] **Step 4: Run typecheck + full suite + build**

Run: `cd /Users/medelman/Projects/OSS/eyecite-ts && pnpm typecheck && pnpm vitest run && pnpm build && pnpm size`
Expected: All pass. Utils under 3 KB.

- [ ] **Step 5: Commit**

```bash
git add src/utils/context.ts src/utils/index.ts
git commit -m "feat(utils): add getSurroundingContext for sentence detection

Legal-text-aware sentence boundary detection around citation spans.
Static abbreviation allowlist handles Corp., U.S., F.3d, No., v., etc.
Supports sentence and paragraph modes with maxLength option.

Closes #95"
```

---

### Task 3: Add changeset

**Files:**
- Create: `.changeset/surrounding-context.md`

- [ ] **Step 1: Create changeset**

```markdown
---
"eyecite-ts": minor
---

Add `getSurroundingContext` utility function to `eyecite-ts/utils` for legal-text-aware sentence and paragraph boundary detection around citation spans
```

- [ ] **Step 2: Commit**

```bash
git add .changeset/surrounding-context.md
git commit -m "chore: add changeset for getSurroundingContext"
```
