# Explanatory Parenthetical Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract and classify explanatory parentheticals from case citations, populating a new `parentheticals` array field on `FullCaseCitation`.

**Architecture:** Refactor `findParentheticalEnd()` into a `collectParentheticals()` primitive that returns all parenthetical blocks with text and positions. A new `classifyParenthetical()` function categorizes each block as metadata, explanatory, or skipped. The existing chained-disposition regex is replaced by this unified approach.

**Tech Stack:** TypeScript, Vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/types/citation.ts` | Modify | Add `ParentheticalType`, `Parenthetical` types; replace `parenthetical?: string` with `parentheticals?: Parenthetical[]` |
| `src/types/index.ts` | Modify | Re-export new types |
| `src/index.ts` | Modify | Re-export new types |
| `src/extract/extractCase.ts` | Modify | Add `collectParentheticals()`, `classifyParenthetical()`; refactor `findParentheticalEnd()` to wrapper; wire into `extractCase()` |
| `tests/extract/extractCase.test.ts` | Modify | Add explanatory parenthetical tests, regression tests |

---

### Task 1: Add `ParentheticalType` and `Parenthetical` types

**Files:**
- Modify: `src/types/citation.ts:118-119` (replace `parenthetical` field)
- Modify: `src/types/index.ts` (re-export)
- Modify: `src/index.ts` (re-export)

- [ ] **Step 1: Add new types and replace field in `src/types/citation.ts`**

Add before the `FullCaseCitation` interface (after line 78, after `CourtInference`):

```typescript
/**
 * Signal-word classification for explanatory parentheticals.
 * Based on the leading gerund/verb form in the parenthetical text.
 */
export type ParentheticalType =
  | "holding"
  | "finding"
  | "stating"
  | "noting"
  | "explaining"
  | "quoting"
  | "citing"
  | "discussing"
  | "describing"
  | "recognizing"
  | "applying"
  | "rejecting"
  | "adopting"
  | "requiring"
  | "other"

/**
 * An extracted explanatory parenthetical from a case citation.
 *
 * @example
 * ```typescript
 * { text: "holding that X requires Y", type: "holding" }
 * { text: "citing Doe v. City for the same proposition", type: "citing" }
 * ```
 */
export interface Parenthetical {
  /** Full text content between the parentheses (excluding parens themselves) */
  text: string
  /** Signal-word classification based on leading gerund */
  type: ParentheticalType
}
```

Then replace line 118-119:
```typescript
  /** Parenthetical explanation following the citation */
  parenthetical?: string
```
with:
```typescript
  /**
   * Explanatory parentheticals following the citation.
   * Only populated when explanatory content is found (not court/year/disposition).
   * @example [{ text: "holding that X requires Y", type: "holding" }]
   */
  parentheticals?: Parenthetical[]
```

- [ ] **Step 2: Re-export types from `src/types/index.ts`**

Add `Parenthetical` and `ParentheticalType` to the type export list in `src/types/index.ts`:

```typescript
export type {
  // ... existing exports ...
  Parenthetical,
  ParentheticalType,
  // ... rest ...
} from "./citation"
```

- [ ] **Step 3: Re-export types from `src/index.ts`**

Add `Parenthetical` and `ParentheticalType` to the type export list in `src/index.ts`:

```typescript
export type {
  // ... existing exports ...
  Parenthetical,
  ParentheticalType,
  // ... rest ...
} from "./types"
```

- [ ] **Step 4: Verify types compile**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/types/citation.ts src/types/index.ts src/index.ts
git commit -m "feat(types): add Parenthetical and ParentheticalType, replace parenthetical field (#76)"
```

---

### Task 2: Implement `collectParentheticals()` with TDD

**Files:**
- Modify: `src/extract/extractCase.ts:169-224` (refactor `findParentheticalEnd`)
- Modify: `tests/extract/extractCase.test.ts`

- [ ] **Step 1: Write failing tests for `collectParentheticals`**

Since `collectParentheticals` is a module-internal function, test it indirectly through `extractCitations`. Add a new describe block after the "disposition extraction" block (~line 897):

```typescript
describe("explanatory parentheticals (#76)", () => {
  it("extracts single explanatory parenthetical", () => {
    const citations = extractCitations(
      "Smith v. Jones, 500 F.2d 123 (9th Cir. 2020) (holding that X requires Y)",
    )
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].parentheticals).toEqual([
        { text: "holding that X requires Y", type: "holding" },
      ])
    }
  })

  it("extracts multiple chained explanatory parentheticals", () => {
    const citations = extractCitations(
      "Smith v. Jones, 500 F.2d 123 (9th Cir. 2020) (holding that X) (citing Doe v. City)",
    )
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].parentheticals).toEqual([
        { text: "holding that X", type: "holding" },
        { text: "citing Doe v. City", type: "citing" },
      ])
    }
  })

  it("no parentheticals when only court/year paren present", () => {
    const citations = extractCitations("Smith v. Jones, 500 F.2d 123 (9th Cir. 2020)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].parentheticals).toBeUndefined()
    }
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/extract/extractCase.test.ts -t "explanatory parentheticals"`
Expected: FAIL — `parentheticals` is undefined for all cases

- [ ] **Step 3: Define `RawParenthetical` type and implement `collectParentheticals()`**

In `src/extract/extractCase.ts`, add the `RawParenthetical` interface after the regex constants (after line 59), then replace `findParentheticalEnd` (lines 169-224) with two functions:

```typescript
/** A raw parenthetical block extracted from text */
interface RawParenthetical {
  /** Content between the parentheses (excluding parens themselves) */
  text: string
  /** Position of opening '(' in the text */
  start: number
  /** Position after closing ')' in the text (exclusive) */
  end: number
}

/**
 * Collect all top-level parenthetical blocks starting from a position.
 * Uses depth tracking to handle nested parens. Continues scanning through
 * chained parentheticals and subsequent history signals.
 *
 * @param text - Full text to scan
 * @param startPos - Position to start scanning (typically after citation core)
 * @param maxLookahead - Maximum characters to scan forward (default 500)
 * @returns Array of raw parenthetical blocks in order of appearance
 */
function collectParentheticals(
  text: string,
  startPos: number,
  maxLookahead = 500,
): RawParenthetical[] {
  const results: RawParenthetical[] = []
  let pos = startPos
  const endLimit = Math.min(text.length, startPos + maxLookahead)

  while (pos < endLimit) {
    // Skip whitespace and commas between parentheticals
    while (pos < endLimit && /[\s,]/.test(text[pos])) {
      pos++
    }

    if (pos >= endLimit || text[pos] !== "(") {
      // Check for subsequent history signal before giving up
      const remainingText = text.substring(pos, endLimit)
      const historyRegex = /^(aff'd|rev'd|cert\.\s*denied|overruled\s+by|vacated\s+by)/i
      if (historyRegex.test(remainingText)) {
        // Skip past the signal to find its parenthetical
        const signalMatch = historyRegex.exec(remainingText)
        if (signalMatch) {
          pos += signalMatch[0].length
          continue
        }
      }
      break
    }

    // Found opening paren — track depth to find matching close
    const parenStart = pos
    let depth = 0
    let contentStart = pos + 1

    while (pos < endLimit) {
      const char = text[pos]
      if (char === "(") {
        depth++
      } else if (char === ")") {
        depth--
        if (depth === 0) {
          pos++ // move past closing paren
          const content = text.substring(contentStart, pos - 1).trim()
          if (content.length > 0) {
            results.push({
              text: content,
              start: parenStart,
              end: pos,
            })
          }
          break
        }
      }
      pos++
    }

    // If we never closed the paren, stop
    if (depth > 0) break
  }

  return results
}

/**
 * Find the end of parenthetical content, including chained parentheticals and subsequent history.
 * Thin wrapper around collectParentheticals() for backward compatibility.
 *
 * @param cleanedText - Full cleaned text
 * @param searchStart - Position to start searching from (after citation core)
 * @param maxLookahead - Maximum characters to search forward (default 500)
 * @returns Position after final closing paren (exclusive), or searchStart if no parens
 */
function findParentheticalEnd(
  cleanedText: string,
  searchStart: number,
  maxLookahead = 500,
): number {
  const parens = collectParentheticals(cleanedText, searchStart, maxLookahead)
  if (parens.length === 0) return searchStart
  return parens[parens.length - 1].end
}
```

- [ ] **Step 4: Run existing tests to verify `findParentheticalEnd` wrapper works**

Run: `pnpm exec vitest run tests/extract/extractCase.test.ts -t "fullSpan"`
Expected: All existing fullSpan tests PASS (wrapper preserves behavior)

- [ ] **Step 5: Commit**

```bash
git add src/extract/extractCase.ts tests/extract/extractCase.test.ts
git commit -m "refactor: replace findParentheticalEnd with collectParentheticals primitive (#76)"
```

---

### Task 3: Implement `classifyParenthetical()` and wire into extraction

**Files:**
- Modify: `src/extract/extractCase.ts:558-566` (replace chained disposition), `src/extract/extractCase.ts:673-703` (add parentheticals to return)
- Modify: `tests/extract/extractCase.test.ts`

- [ ] **Step 1: Write additional failing tests for classification**

Add to the "explanatory parentheticals" describe block:

```typescript
  it("classifies each signal word type", () => {
    const signals = [
      "holding", "finding", "stating", "noting", "explaining",
      "quoting", "citing", "discussing", "describing", "recognizing",
      "applying", "rejecting", "adopting", "requiring",
    ] as const
    for (const signal of signals) {
      const citations = extractCitations(
        `Smith v. Jones, 500 F.2d 123 (2020) (${signal} that X)`,
      )
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].parentheticals?.[0]?.type).toBe(signal)
      }
    }
  })

  it("classifies unknown signal as other", () => {
    const citations = extractCitations(
      "Smith v. Jones, 500 F.2d 123 (2020) (the court found X)",
    )
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].parentheticals).toEqual([
        { text: "the court found X", type: "other" },
      ])
    }
  })

  it("disposition paren not treated as explanatory", () => {
    const citations = extractCitations(
      "Smith v. Jones, 500 F.2d 123 (9th Cir. 2020) (en banc)",
    )
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].disposition).toBe("en banc")
      expect(citations[0].parentheticals).toBeUndefined()
    }
  })

  it("extracts disposition AND explanatory from mixed chain", () => {
    const citations = extractCitations(
      "Smith v. Jones, 500 F.2d 123 (9th Cir. 2020) (en banc) (holding that X)",
    )
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].disposition).toBe("en banc")
      expect(citations[0].parentheticals).toEqual([
        { text: "holding that X", type: "holding" },
      ])
    }
  })

  it("handles nested parens inside explanatory", () => {
    const citations = extractCitations(
      'Smith v. Jones, 500 F.2d 123 (2020) (holding that (a) X and (b) Y)',
    )
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].parentheticals?.[0]?.text).toBe(
        "holding that (a) X and (b) Y",
      )
      expect(citations[0].parentheticals?.[0]?.type).toBe("holding")
    }
  })

  it("handles quoted text with parens inside explanatory", () => {
    const citations = extractCitations(
      'Smith v. Jones, 500 F.2d 123 (2020) (quoting "the (original) rule")',
    )
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].parentheticals?.[0]?.text).toBe(
        'quoting "the (original) rule"',
      )
      expect(citations[0].parentheticals?.[0]?.type).toBe("quoting")
    }
  })
```

- [ ] **Step 2: Run tests to verify new tests fail**

Run: `pnpm exec vitest run tests/extract/extractCase.test.ts -t "explanatory parentheticals"`
Expected: FAIL

- [ ] **Step 3: Add signal-word regex and `classifyParenthetical()` function**

In `src/extract/extractCase.ts`, add after the `CHAINED_DISPOSITION_REGEX` constant (line 56):

```typescript
/** Signal words that identify explanatory parentheticals (matched at start, case-insensitive) */
const SIGNAL_WORD_REGEX =
  /^(holding|finding|stating|noting|explaining|quoting|citing|discussing|describing|recognizing|applying|rejecting|adopting|requiring)\b/i
```

Add the `classifyParenthetical` function after the `parseParenthetical` function (after line 279):

```typescript
/**
 * Classify a raw parenthetical block as metadata, explanatory, or skipped.
 *
 * @param raw - Raw parenthetical text (content between parens)
 * @returns Classification result
 */
function classifyParenthetical(raw: string): {
  kind: "metadata"
  court?: string
  year?: number
  date?: StructuredDate
  disposition?: string
} | {
  kind: "explanatory"
  text: string
  type: ParentheticalType
} {
  // Try metadata parse first: court, year, date, disposition
  const meta = parseParenthetical(raw)
  if (meta.year || meta.court || meta.date) {
    return { kind: "metadata", ...meta }
  }

  // Check for disposition-only parenthetical
  if (meta.disposition) {
    return { kind: "metadata", disposition: meta.disposition }
  }

  // Classify by signal word
  const signalMatch = SIGNAL_WORD_REGEX.exec(raw)
  const type: ParentheticalType = signalMatch
    ? (signalMatch[1].toLowerCase() as ParentheticalType)
    : "other"

  return { kind: "explanatory", text: raw, type }
}
```

Add the import for the new types at the top of the file (line 18):

```typescript
import type { FullCaseCitation, Parenthetical, ParentheticalType } from "@/types/citation"
```

- [ ] **Step 4: Wire `collectParentheticals` + `classifyParenthetical` into `extractCase()`**

Replace the chained disposition check block (lines 558-566):

```typescript
  // Check for chained parentheticals with disposition (e.g., "(2020) (en banc)")
  if (cleanedText && !disposition) {
    const afterToken = cleanedText.substring(span.cleanEnd)
    // Look for second parenthetical after first one
    const chainedMatch = CHAINED_DISPOSITION_REGEX.exec(afterToken)
    if (chainedMatch) {
      disposition = chainedMatch[1].toLowerCase()
    }
  }
```

with:

```typescript
  // Classify chained parentheticals: extract disposition and explanatory content
  let parentheticals: Parenthetical[] | undefined
  if (cleanedText) {
    const allParens = collectParentheticals(cleanedText, span.cleanEnd)
    // Skip first paren (already parsed above as court/year)
    const remaining = parentheticalContent ? allParens.slice(1) : allParens
    for (const raw of remaining) {
      const classified = classifyParenthetical(raw.text)
      if (classified.kind === "metadata") {
        if (classified.disposition && !disposition) {
          disposition = classified.disposition
        }
      } else {
        parentheticals ??= []
        parentheticals.push({ text: classified.text, type: classified.type })
      }
    }
  }
```

Then add `parentheticals` to the return object (after `disposition` on line 696):

```typescript
    parentheticals,
```

- [ ] **Step 5: Run all explanatory parenthetical tests**

Run: `pnpm exec vitest run tests/extract/extractCase.test.ts -t "explanatory parentheticals"`
Expected: All PASS

- [ ] **Step 6: Run full test suite for regression**

Run: `pnpm exec vitest run tests/extract/extractCase.test.ts`
Expected: All PASS (existing disposition, fullSpan, court/year tests unchanged)

- [ ] **Step 7: Commit**

```bash
git add src/extract/extractCase.ts tests/extract/extractCase.test.ts
git commit -m "feat: extract and classify explanatory parentheticals (#76)"
```

---

### Task 4: Regression tests and cleanup

**Files:**
- Modify: `tests/extract/extractCase.test.ts`

- [ ] **Step 1: Add regression tests to confirm existing behavior preserved**

Add to the "backward compatibility" describe block (~line 899):

```typescript
  it("disposition extraction still works via classify", () => {
    const citations = extractCitations("500 F.2d 123 (9th Cir. 2020) (en banc)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].disposition).toBe("en banc")
      expect(citations[0].parentheticals).toBeUndefined()
    }
  })

  it("per curiam still extracted from chained paren", () => {
    const citations = extractCitations("500 F.2d 123 (9th Cir. 2020) (per curiam)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].disposition).toBe("per curiam")
      expect(citations[0].parentheticals).toBeUndefined()
    }
  })
```

- [ ] **Step 2: Run all tests**

Run: `pnpm exec vitest run`
Expected: All PASS

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 4: Run lint**

Run: `pnpm lint`
Expected: No errors (fix any formatting issues with `pnpm format`)

- [ ] **Step 5: Remove `CHAINED_DISPOSITION_REGEX` if no longer used**

The `CHAINED_DISPOSITION_REGEX` constant (line 56) is no longer needed since classification handles disposition detection. Remove it:

```typescript
// DELETE this line:
const CHAINED_DISPOSITION_REGEX = /\([^)]+\)\s*\((en banc|per curiam)\)/i
```

- [ ] **Step 6: Run tests again after cleanup**

Run: `pnpm exec vitest run && pnpm typecheck && pnpm lint`
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add src/extract/extractCase.ts tests/extract/extractCase.test.ts
git commit -m "test: add regression tests, remove unused CHAINED_DISPOSITION_REGEX (#76)"
```
