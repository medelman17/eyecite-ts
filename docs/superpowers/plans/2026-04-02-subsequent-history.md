# Subsequent History Signal Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract and normalize subsequent history treatment signals (aff'd, rev'd, cert. denied, etc.) from case citations, with bidirectional linking between parent and child citations.

**Architecture:** Two-phase approach. Phase A extends `collectParentheticals()` to capture signal text (currently skipped), adds signal normalization via a lookup table, and stores raw signal metadata on each citation. Phase B adds a post-extraction linking pass in `extractCitations.ts` that connects parent/child citations using span positions.

**Tech Stack:** TypeScript, Vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/types/citation.ts` | Modify | Add `HistorySignal`, `SubsequentHistoryEntry` types; replace `subsequentHistory?: string` with `subsequentHistoryEntries?` and `subsequentHistoryOf?` |
| `src/types/index.ts` | Modify | Re-export new types |
| `src/index.ts` | Modify | Re-export new types |
| `src/extract/extractCase.ts` | Modify | Extend `collectParentheticals()` return type, add `SIGNAL_TABLE`, `normalizeSignal()`, capture signals in classify loop |
| `src/extract/extractCitations.ts` | Modify | Add post-extraction linking pass |
| `tests/extract/extractCase.test.ts` | Modify | Signal capture tests |
| `tests/integration/subsequentHistory.test.ts` | Create | Linking tests |

---

### Task 1: Add `HistorySignal` and `SubsequentHistoryEntry` types

**Files:**
- Modify: `src/types/citation.ts:162-163`
- Modify: `src/types/index.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Add new types and replace field in `src/types/citation.ts`**

Add before the `FullCaseCitation` interface (after `Parenthetical` interface, after line 115):

```typescript
/**
 * Normalized subsequent history signal classification.
 * Maps variant spellings (aff'd, affirmed) to canonical forms.
 */
export type HistorySignal =
  | "affirmed"
  | "reversed"
  | "cert_denied"
  | "cert_granted"
  | "overruled"
  | "vacated"
  | "remanded"
  | "modified"
  | "abrogated"
  | "superseded"
  | "disapproved"
  | "questioned"
  | "distinguished"
  | "withdrawn"
  | "reinstated"

/**
 * A single subsequent history entry from a case citation.
 *
 * @example
 * ```typescript
 * { signal: "affirmed", rawSignal: "aff'd", signalSpan: { ... }, order: 0 }
 * ```
 */
export interface SubsequentHistoryEntry {
  /** Normalized signal classification */
  signal: HistorySignal
  /** Raw signal text as it appeared in the document */
  rawSignal: string
  /** Position of the signal text in the document */
  signalSpan: Span
  /** Order in the history chain (0-based) */
  order: number
}
```

Then replace line 162-163:
```typescript
  /** Subsequent procedural history (e.g., "aff'd", "rev'd", "cert. denied") */
  subsequentHistory?: string
```
with:
```typescript
  /**
   * Subsequent history entries for this citation.
   * Each entry describes a procedural event (affirmed, reversed, etc.).
   * Only populated on the parent (original) citation.
   * @example [{ signal: "affirmed", rawSignal: "aff'd", signalSpan: {...}, order: 0 }]
   */
  subsequentHistoryEntries?: SubsequentHistoryEntry[]

  /**
   * Back-pointer indicating this citation is a subsequent history citation.
   * Points to the parent citation's index in the results array.
   * @example { index: 0, signal: "affirmed" }
   */
  subsequentHistoryOf?: { index: number; signal: HistorySignal }
```

- [ ] **Step 2: Re-export types from `src/types/index.ts`**

Add `HistorySignal` and `SubsequentHistoryEntry` to the type export list:

```typescript
export type {
  // ... existing exports ...
  HistorySignal,
  SubsequentHistoryEntry,
  // ... rest ...
} from "./citation"
```

- [ ] **Step 3: Re-export types from `src/index.ts`**

Add `HistorySignal` and `SubsequentHistoryEntry` to the type export list:

```typescript
export type {
  // ... existing exports ...
  HistorySignal,
  SubsequentHistoryEntry,
  // ... rest ...
} from "./types"
```

- [ ] **Step 4: Verify types compile**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/types/citation.ts src/types/index.ts src/index.ts
git commit -m "feat(types): add HistorySignal and SubsequentHistoryEntry, replace subsequentHistory field (#73)"
```

---

### Task 2: Add signal table and `normalizeSignal()`

**Files:**
- Modify: `src/extract/extractCase.ts:62`
- Test: `tests/extract/extractCase.test.ts`

- [ ] **Step 1: Write failing tests for signal normalization**

Add a new describe block in `tests/extract/extractCase.test.ts` after the "explanatory parentheticals" block:

```typescript
describe("subsequent history signals (#73)", () => {
  it("captures single affirmed signal", () => {
    const citations = extractCitations(
      "Smith v. Jones, 500 F.2d 123 (2d Cir. 1990), aff'd, 501 U.S. 1 (1991)",
    )
    const parent = citations[0]
    if (parent.type === "case") {
      expect(parent.subsequentHistoryEntries).toBeDefined()
      expect(parent.subsequentHistoryEntries).toHaveLength(1)
      expect(parent.subsequentHistoryEntries![0].signal).toBe("affirmed")
      expect(parent.subsequentHistoryEntries![0].rawSignal).toBe("aff'd")
      expect(parent.subsequentHistoryEntries![0].order).toBe(0)
    }
  })

  it("captures chained history signals with correct order", () => {
    const citations = extractCitations(
      "Smith v. Jones, 500 F.2d 123 (2d Cir. 1990), aff'd, 501 U.S. 1 (1991), cert. denied, 502 U.S. 2 (1992)",
    )
    const parent = citations[0]
    if (parent.type === "case") {
      expect(parent.subsequentHistoryEntries).toHaveLength(2)
      expect(parent.subsequentHistoryEntries![0].signal).toBe("affirmed")
      expect(parent.subsequentHistoryEntries![0].order).toBe(0)
      expect(parent.subsequentHistoryEntries![1].signal).toBe("cert_denied")
      expect(parent.subsequentHistoryEntries![1].order).toBe(1)
    }
  })

  it("normalizes signal variants", () => {
    const variants: Array<[string, string]> = [
      ["aff'd", "affirmed"],
      ["affirmed", "affirmed"],
      ["rev'd", "reversed"],
      ["reversed", "reversed"],
      ["cert. denied", "cert_denied"],
      ["cert. den.", "cert_denied"],
      ["certiorari denied", "cert_denied"],
      ["cert. granted", "cert_granted"],
      ["certiorari granted", "cert_granted"],
      ["overruled by", "overruled"],
      ["overruling", "overruled"],
      ["vacated by", "vacated"],
      ["vacated", "vacated"],
      ["remanded", "remanded"],
      ["modified by", "modified"],
      ["modified", "modified"],
      ["abrogated by", "abrogated"],
      ["abrogated", "abrogated"],
      ["superseded by", "superseded"],
      ["superseded", "superseded"],
      ["disapproved of", "disapproved"],
      ["disapproved", "disapproved"],
      ["questioned by", "questioned"],
      ["questioned", "questioned"],
      ["distinguished by", "distinguished"],
      ["distinguished", "distinguished"],
      ["withdrawn", "withdrawn"],
      ["reinstated", "reinstated"],
    ]
    for (const [raw, expected] of variants) {
      const citations = extractCitations(
        `Smith v. Jones, 500 F.2d 123 (2020), ${raw}, 501 U.S. 1 (2021)`,
      )
      const parent = citations[0]
      if (parent.type === "case") {
        expect(parent.subsequentHistoryEntries?.[0]?.signal, `signal for "${raw}"`).toBe(expected)
      }
    }
  })

  it("no history entries when no signals present", () => {
    const citations = extractCitations("Smith v. Jones, 500 F.2d 123 (9th Cir. 2020)")
    const parent = citations[0]
    if (parent.type === "case") {
      expect(parent.subsequentHistoryEntries).toBeUndefined()
    }
  })

  it("signal span has correct positions", () => {
    const text = "Smith v. Jones, 500 F.2d 123 (2020), aff'd, 501 U.S. 1 (2021)"
    const citations = extractCitations(text)
    const parent = citations[0]
    if (parent.type === "case") {
      const entry = parent.subsequentHistoryEntries![0]
      const signalText = text.substring(entry.signalSpan.originalStart, entry.signalSpan.originalEnd)
      expect(signalText).toBe("aff'd")
    }
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/extract/extractCase.test.ts -t "subsequent history signals"`
Expected: FAIL — `subsequentHistoryEntries` is undefined

- [ ] **Step 3: Add `SIGNAL_TABLE` and `normalizeSignal()` to `extractCase.ts`**

Replace the existing `HISTORY_SIGNAL_REGEX` (line 62):

```typescript
/** Subsequent history signals between parentheticals */
const HISTORY_SIGNAL_REGEX = /^(aff'd|rev'd|cert\.\s*denied|overruled\s+by|vacated\s+by)/i
```

with the full signal table and updated detection regex:

```typescript
/** Normalized subsequent history signal type */
import type { HistorySignal, SubsequentHistoryEntry } from "@/types/citation"

/**
 * Signal normalization table. Longer patterns first so "aff'd on other grounds"
 * matches before "aff'd". Each entry: [regex, normalized HistorySignal].
 */
const SIGNAL_TABLE: ReadonlyArray<readonly [RegExp, HistorySignal]> = [
  // affirmed (longer variants first)
  [/^aff'?d\s+on\s+other\s+grounds\b/i, "affirmed"],
  [/^affirmed\s+on\s+other\s+grounds\b/i, "affirmed"],
  [/^aff'?d\b/i, "affirmed"],
  [/^affirmed\b/i, "affirmed"],
  // reversed
  [/^rev'?d\s+and\s+remanded\b/i, "reversed"],
  [/^rev'?d\s+on\s+other\s+grounds\b/i, "reversed"],
  [/^reversed\s+and\s+remanded\b/i, "reversed"],
  [/^rev'?d\b/i, "reversed"],
  [/^reversed\b/i, "reversed"],
  // cert denied
  [/^certiorari\s+denied\b/i, "cert_denied"],
  [/^cert\.\s*den(ied|\.)\b/i, "cert_denied"],
  // cert granted
  [/^certiorari\s+granted\b/i, "cert_granted"],
  [/^cert\.\s*granted\b/i, "cert_granted"],
  // overruled
  [/^overruled\s+by\b/i, "overruled"],
  [/^overruled\s+in\b/i, "overruled"],
  [/^overruling\b/i, "overruled"],
  [/^overruled\b/i, "overruled"],
  // vacated
  [/^vacated\s+by\b/i, "vacated"],
  [/^vacated\b/i, "vacated"],
  // remanded
  [/^remanded\s+for\s+reconsideration\b/i, "remanded"],
  [/^remanded\b/i, "remanded"],
  // modified
  [/^modified\s+by\b/i, "modified"],
  [/^modified\b/i, "modified"],
  // abrogated
  [/^abrogated\s+by\b/i, "abrogated"],
  [/^abrogated\s+in\b/i, "abrogated"],
  [/^abrogated\b/i, "abrogated"],
  // additional signals
  [/^superseded\s+by\b/i, "superseded"],
  [/^superseded\b/i, "superseded"],
  [/^disapproved\s+of\b/i, "disapproved"],
  [/^disapproved\b/i, "disapproved"],
  [/^questioned\s+by\b/i, "questioned"],
  [/^questioned\b/i, "questioned"],
  [/^distinguished\s+by\b/i, "distinguished"],
  [/^distinguished\b/i, "distinguished"],
  [/^withdrawn\b/i, "withdrawn"],
  [/^reinstated\b/i, "reinstated"],
]

/** Detection regex for all subsequent history signals (used by collectParentheticals) */
const HISTORY_SIGNAL_REGEX = new RegExp(
  `^(${SIGNAL_TABLE.map(([re]) => re.source).join("|")})`,
  "i",
)

/**
 * Normalize a raw signal string to a HistorySignal value.
 * Returns undefined if the string doesn't match any known signal.
 */
function normalizeSignal(raw: string): { signal: HistorySignal; matchLength: number } | undefined {
  for (const [regex, signal] of SIGNAL_TABLE) {
    const match = regex.exec(raw)
    if (match) {
      return { signal, matchLength: match[0].length }
    }
  }
  return undefined
}
```

Also update the import at line 18 to include the new types:

```typescript
import type {
  FullCaseCitation,
  HistorySignal,
  Parenthetical,
  ParentheticalType,
  SubsequentHistoryEntry,
} from "@/types/citation"
```

- [ ] **Step 4: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: No errors (tests still fail — implementation in next steps)

- [ ] **Step 5: Commit**

```bash
git add src/extract/extractCase.ts tests/extract/extractCase.test.ts
git commit -m "feat: add signal normalization table and tests (#73)"
```

---

### Task 3: Extend `collectParentheticals()` to capture signals

**Files:**
- Modify: `src/extract/extractCase.ts:171-249` (types and function)

- [ ] **Step 1: Add `RawSignal` and `CollectedParentheticals` types**

After the `RawParenthetical` interface (after line 179), add:

```typescript
/** A subsequent history signal found between parenthetical groups */
interface RawSignal {
  /** Raw signal text (e.g., "aff'd", "cert. denied") */
  text: string
  /** Position of signal start in the text */
  start: number
  /** Position after signal end (exclusive) */
  end: number
}

/** Result of collecting parentheticals with signal awareness */
interface CollectedParentheticals {
  /** All parenthetical blocks in order */
  parens: RawParenthetical[]
  /** Signals found between groups, each paired with the index of the next paren */
  signals: Array<{ signal: RawSignal; nextParenIndex: number }>
}
```

- [ ] **Step 2: Refactor `collectParentheticals()` to return `CollectedParentheticals`**

Replace the current `collectParentheticals` function (lines 191-249) with:

```typescript
/**
 * Collect all top-level parenthetical blocks starting from a position.
 * Uses depth tracking to handle nested parens. Continues scanning through
 * chained parentheticals and subsequent history signals.
 * Captures signal text and associates it with the next parenthetical.
 *
 * @param text - Full text to scan
 * @param startPos - Position to start scanning (typically after citation core)
 * @param maxLookahead - Maximum characters to scan forward (default 500)
 * @returns Collected parentheticals and signals
 */
function collectParentheticals(
  text: string,
  startPos: number,
  maxLookahead = 500,
): CollectedParentheticals {
  const parens: RawParenthetical[] = []
  const signals: CollectedParentheticals["signals"] = []
  let pos = startPos
  const endLimit = Math.min(text.length, startPos + maxLookahead)
  let pendingSignal: RawSignal | undefined

  while (pos < endLimit) {
    // Skip whitespace and commas between parentheticals
    while (pos < endLimit && PAREN_SKIP_REGEX.test(text[pos])) {
      pos++
    }

    if (pos >= endLimit || text[pos] !== "(") {
      // Check for subsequent history signal before giving up
      const remainingText = text.substring(pos, endLimit)
      const signalMatch = HISTORY_SIGNAL_REGEX.exec(remainingText)
      if (signalMatch) {
        pendingSignal = {
          text: signalMatch[0].replace(/\s+$/, ""),
          start: pos,
          end: pos + signalMatch[0].length,
        }
        pos += signalMatch[0].length
        continue
      }
      break
    }

    // Found opening paren — track depth to find matching close
    const parenStart = pos
    let depth = 0
    const contentStart = pos + 1

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
            parens.push({ text: content, start: parenStart, end: pos })
            // If there was a pending signal, associate it with this paren
            if (pendingSignal) {
              signals.push({ signal: pendingSignal, nextParenIndex: parens.length - 1 })
              pendingSignal = undefined
            }
          }
          break
        }
      }
      pos++
    }

    // If we never closed the paren, stop
    if (depth > 0) break
  }

  // Handle trailing signal with no following paren
  if (pendingSignal) {
    signals.push({ signal: pendingSignal, nextParenIndex: -1 })
  }

  return { parens, signals }
}
```

- [ ] **Step 3: Update all callers to use `result.parens`**

In `extractCase()`, update the classify loop (line 630):

```typescript
// Before:
allParens = collectParentheticals(cleanedText, span.cleanEnd)

// After:
const collected = collectParentheticals(cleanedText, span.cleanEnd)
allParens = collected.parens
```

Also update the fullSpan calculation (line 672-674), which reads `allParens` — no change needed since `allParens` is still assigned.

- [ ] **Step 4: Run existing tests to verify no regressions**

Run: `pnpm exec vitest run tests/extract/extractCase.test.ts`
Expected: All existing tests PASS (new signal tests still fail)

- [ ] **Step 5: Commit**

```bash
git add src/extract/extractCase.ts
git commit -m "refactor: extend collectParentheticals to capture signals (#73)"
```

---

### Task 4: Wire signal capture into `extractCase()` return

**Files:**
- Modify: `src/extract/extractCase.ts:626-654` (classify loop), `src/extract/extractCase.ts:764-796` (return)

- [ ] **Step 1: Capture signals in the classify loop and add to return**

After the classify loop (after line 654), add signal processing:

```typescript
  // Build rawSubsequentHistory from captured signals
  let rawSubsequentHistory: Array<{
    signal: HistorySignal
    rawSignal: string
    signalSpan: Span
    order: number
  }> | undefined

  if (cleanedText && collected) {
    for (let i = 0; i < collected.signals.length; i++) {
      const { signal: rawSig } = collected.signals[i]
      const normalized = normalizeSignal(rawSig.text)
      if (normalized) {
        rawSubsequentHistory ??= []
        const { originalStart: sigOrigStart, originalEnd: sigOrigEnd } = resolveOriginalSpan(
          { cleanStart: rawSig.start, cleanEnd: rawSig.end },
          transformationMap,
        )
        rawSubsequentHistory.push({
          signal: normalized.signal,
          rawSignal: rawSig.text,
          signalSpan: {
            cleanStart: rawSig.start,
            cleanEnd: rawSig.end,
            originalStart: sigOrigStart,
            originalEnd: sigOrigEnd,
          },
          order: i,
        })
      }
    }
  }
```

Note: `collected` needs to be accessible here. The variable declared in the classify block (`const collected = collectParentheticals(...)`) must be hoisted. Change the classify block to declare `collected` outside the `if`:

```typescript
  let parentheticals: Parenthetical[] | undefined
  let allParens: RawParenthetical[] | undefined
  let collected: CollectedParentheticals | undefined
  if (cleanedText) {
    collected = collectParentheticals(cleanedText, span.cleanEnd)
    allParens = collected.parens
    // ... rest of classify loop unchanged ...
  }
```

Then add `subsequentHistoryEntries` to the return object (after `parentheticals` on line 788):

```typescript
    subsequentHistoryEntries: rawSubsequentHistory,
```

- [ ] **Step 2: Run signal capture tests**

Run: `pnpm exec vitest run tests/extract/extractCase.test.ts -t "subsequent history signals"`
Expected: Most tests PASS (linking tests in integration will still fail)

- [ ] **Step 3: Run full extractCase tests for regression**

Run: `pnpm exec vitest run tests/extract/extractCase.test.ts`
Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git add src/extract/extractCase.ts
git commit -m "feat: capture subsequent history signals in extractCase (#73)"
```

---

### Task 5: Add linking pass in `extractCitations.ts`

**Files:**
- Modify: `src/extract/extractCitations.ts:314-316` (after citations array built, before resolve)
- Create: `tests/integration/subsequentHistory.test.ts`

- [ ] **Step 1: Write failing integration tests for linking**

Create `tests/integration/subsequentHistory.test.ts`:

```typescript
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"

describe("subsequent history linking (#73)", () => {
  it("links parent to child with subsequentHistoryOf", () => {
    const citations = extractCitations(
      "Smith v. Jones, 500 F.2d 123 (2d Cir. 1990), aff'd, 501 U.S. 1 (1991)",
    )
    expect(citations.length).toBeGreaterThanOrEqual(2)
    const parent = citations[0]
    const child = citations[1]
    if (parent.type === "case" && child.type === "case") {
      // Parent has entries
      expect(parent.subsequentHistoryEntries).toHaveLength(1)
      expect(parent.subsequentHistoryEntries![0].signal).toBe("affirmed")
      // Child points back to parent
      expect(child.subsequentHistoryOf).toEqual({ index: 0, signal: "affirmed" })
    }
  })

  it("links chained history — all entries on original parent", () => {
    const citations = extractCitations(
      "Smith v. Jones, 500 F.2d 123 (2d Cir. 1990), aff'd, 501 U.S. 1 (1991), cert. denied, 502 U.S. 2 (1992)",
    )
    expect(citations.length).toBeGreaterThanOrEqual(3)
    const parent = citations[0]
    if (parent.type === "case") {
      expect(parent.subsequentHistoryEntries).toHaveLength(2)
      expect(parent.subsequentHistoryEntries![0].signal).toBe("affirmed")
      expect(parent.subsequentHistoryEntries![0].order).toBe(0)
      expect(parent.subsequentHistoryEntries![1].signal).toBe("cert_denied")
      expect(parent.subsequentHistoryEntries![1].order).toBe(1)
    }
    // Both children point back to parent
    if (citations[1].type === "case") {
      expect(citations[1].subsequentHistoryOf).toEqual({ index: 0, signal: "affirmed" })
    }
    if (citations[2].type === "case") {
      expect(citations[2].subsequentHistoryOf).toEqual({ index: 0, signal: "cert_denied" })
    }
  })

  it("citations without history are unaffected", () => {
    const citations = extractCitations(
      "Smith v. Jones, 500 F.2d 123 (2020). Doe v. City, 600 F.3d 456 (2021).",
    )
    for (const c of citations) {
      if (c.type === "case") {
        expect(c.subsequentHistoryEntries).toBeUndefined()
        expect(c.subsequentHistoryOf).toBeUndefined()
      }
    }
  })

  it("child citation retains its own metadata", () => {
    const citations = extractCitations(
      "Smith v. Jones, 500 F.2d 123 (2d Cir. 1990), aff'd, 501 U.S. 1 (1991)",
    )
    if (citations[1]?.type === "case") {
      expect(citations[1].volume).toBe(501)
      expect(citations[1].reporter).toBe("U.S.")
      expect(citations[1].page).toBe(1)
      expect(citations[1].year).toBe(1991)
    }
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/integration/subsequentHistory.test.ts`
Expected: FAIL — `subsequentHistoryOf` is undefined on children

- [ ] **Step 3: Add linking pass to `extractCitations.ts`**

In `extractCitations.ts`, after the citations loop (after line 316, after `citations.push(citation)`) and before the resolve step (before line 318), add:

```typescript
  // Step 4.5: Link subsequent history citations
  // For each parent citation with rawSubsequentHistory, find child citations
  // whose spans fall within the parent's fullSpan region
  for (let i = 0; i < citations.length; i++) {
    const parent = citations[i]
    if (parent.type !== "case" || !parent.subsequentHistoryEntries || !parent.fullSpan) continue

    const entries = parent.subsequentHistoryEntries
    let childIdx = 0
    for (let j = i + 1; j < citations.length && childIdx < entries.length; j++) {
      const child = citations[j]
      if (child.type !== "case") continue

      // Check if child's span falls within parent's fullSpan
      if (child.span.cleanStart >= parent.span.cleanEnd
        && child.span.cleanStart < parent.fullSpan.cleanEnd) {
        child.subsequentHistoryOf = {
          index: i,
          signal: entries[childIdx].signal,
        }
        childIdx++
      }
    }
  }
```

- [ ] **Step 4: Run integration tests**

Run: `pnpm exec vitest run tests/integration/subsequentHistory.test.ts`
Expected: All PASS

- [ ] **Step 5: Run full test suite**

Run: `pnpm exec vitest run`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add src/extract/extractCitations.ts tests/integration/subsequentHistory.test.ts
git commit -m "feat: add subsequent history linking pass (#73)"
```

---

### Task 6: Regression tests and cleanup

**Files:**
- Modify: `tests/extract/extractCase.test.ts`

- [ ] **Step 1: Add regression tests**

Add to the "backward compatibility" describe block:

```typescript
  it("subsequent history does not break fullSpan", () => {
    const text = "Smith v. Jones, 500 F.2d 123 (2d Cir. 1990), aff'd, 501 U.S. 1 (1991)"
    const citations = extractCitations(text)
    if (citations[0].type === "case") {
      expect(citations[0].fullSpan).toBeDefined()
      expect(citations[0].fullSpan!.originalEnd).toBe(text.length)
    }
  })

  it("explanatory parentheticals still work with subsequent history", () => {
    const citations = extractCitations(
      "Smith v. Jones, 500 F.2d 123 (2020) (holding that X), aff'd, 501 U.S. 1 (2021)",
    )
    const parent = citations[0]
    if (parent.type === "case") {
      expect(parent.parentheticals).toEqual([
        { text: "holding that X", type: "holding" },
      ])
      expect(parent.subsequentHistoryEntries).toHaveLength(1)
      expect(parent.subsequentHistoryEntries![0].signal).toBe("affirmed")
    }
  })

  it("disposition still extracted when followed by history", () => {
    const citations = extractCitations(
      "Smith v. Jones, 500 F.2d 123 (9th Cir. 2020) (en banc), aff'd, 501 U.S. 1 (2021)",
    )
    const parent = citations[0]
    if (parent.type === "case") {
      expect(parent.disposition).toBe("en banc")
      expect(parent.subsequentHistoryEntries).toHaveLength(1)
    }
  })
```

- [ ] **Step 2: Run full test suite**

Run: `pnpm exec vitest run`
Expected: All PASS

- [ ] **Step 3: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: No errors (fix formatting with `pnpm format` if needed)

- [ ] **Step 4: Commit**

```bash
git add tests/extract/extractCase.test.ts
git commit -m "test: add regression tests for subsequent history signals (#73)"
```
