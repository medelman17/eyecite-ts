# Footnote-Aware Citation Extraction — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect footnote zones in legal documents (HTML and plain text), annotate citations with footnote metadata, and make the `"footnote"` scope strategy functional in the resolver.

**Architecture:** Two-phase detection (HTML structural scan, plain-text heuristic fallback) produces a `FootnoteMap` of zones. The extraction pipeline maps zones through `TransformationMap`, tags citations via span lookup, and passes the map to the resolver. The `"footnote"` scope strategy assigns citations to zone IDs (body=0, footnote N=N) and enforces cross-zone rules (Id. strict, supra/shortFormCase can reach body from footnotes).

**Tech Stack:** TypeScript, Vitest, zero runtime dependencies

**Spec:** `docs/superpowers/specs/2026-04-03-footnote-aware-extraction-design.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/footnotes/types.ts` | `FootnoteZone` interface, `FootnoteMap` type |
| `src/footnotes/htmlDetector.ts` | State-machine HTML parser for footnote elements |
| `src/footnotes/textDetector.ts` | Plain-text heuristic footnote detection |
| `src/footnotes/detectFootnotes.ts` | Strategy selector: HTML or text, public API |
| `src/footnotes/index.ts` | Barrel export |
| `src/types/citation.ts` | Add `inFootnote?`, `footnoteNumber?` to `CitationBase` |
| `src/extract/extractCitations.ts` | Wire detection, coordinate mapping, citation tagging |
| `src/resolve/types.ts` | Add `footnoteMap?` to `ResolutionOptions` |
| `src/resolve/scopeBoundary.ts` | Add `buildFootnoteScopes()`, update `isWithinBoundary()` |
| `src/resolve/DocumentResolver.ts` | Use footnote zones, cross-zone rules for supra/shortFormCase |
| `src/index.ts` | Export new types and `detectFootnotes` |
| `tests/footnotes/types.test.ts` | Type sanity checks |
| `tests/footnotes/htmlDetector.test.ts` | HTML detection unit tests |
| `tests/footnotes/textDetector.test.ts` | Plain-text detection unit tests |
| `tests/footnotes/detectFootnotes.test.ts` | Strategy selection tests |
| `tests/footnotes/tagging.test.ts` | Citation footnote tagging tests |
| `tests/footnotes/resolution.test.ts` | Footnote-aware scope resolution tests |
| `tests/integration/footnotes.test.ts` | Full pipeline integration tests |

---

### Task 1: Footnote Types

**Files:**
- Create: `src/footnotes/types.ts`
- Create: `tests/footnotes/types.test.ts`

- [ ] **Step 1: Write the type definition test**

```typescript
// tests/footnotes/types.test.ts
import { describe, expect, it } from "vitest"
import type { FootnoteMap, FootnoteZone } from "@/footnotes/types"

describe("FootnoteZone type", () => {
  it("satisfies the FootnoteZone interface", () => {
    const zone: FootnoteZone = {
      start: 100,
      end: 200,
      footnoteNumber: 1,
    }
    expect(zone.start).toBe(100)
    expect(zone.end).toBe(200)
    expect(zone.footnoteNumber).toBe(1)
  })

  it("FootnoteMap is an array of FootnoteZone", () => {
    const map: FootnoteMap = [
      { start: 0, end: 50, footnoteNumber: 1 },
      { start: 60, end: 120, footnoteNumber: 2 },
    ]
    expect(map).toHaveLength(2)
    expect(map[0].footnoteNumber).toBe(1)
    expect(map[1].footnoteNumber).toBe(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/footnotes/types.test.ts`
Expected: FAIL — cannot resolve `@/footnotes/types`

- [ ] **Step 3: Write the types**

```typescript
// src/footnotes/types.ts
/**
 * A detected footnote zone in the text.
 * Positions are in input-text (raw) coordinates.
 */
export interface FootnoteZone {
  /** Start position in input-text coordinates */
  start: number
  /** End position in input-text coordinates */
  end: number
  /** Footnote number (1, 2, 3...) */
  footnoteNumber: number
}

/**
 * Result of footnote detection — sorted by start position.
 */
export type FootnoteMap = FootnoteZone[]
```

- [ ] **Step 4: Create barrel export**

```typescript
// src/footnotes/index.ts
export type { FootnoteMap, FootnoteZone } from "./types"
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm exec vitest run tests/footnotes/types.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/footnotes/types.ts src/footnotes/index.ts tests/footnotes/types.test.ts
git commit -m "feat(footnotes): add FootnoteZone and FootnoteMap types"
```

---

### Task 2: HTML Footnote Detector

**Files:**
- Create: `src/footnotes/htmlDetector.ts`
- Create: `tests/footnotes/htmlDetector.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/footnotes/htmlDetector.test.ts
import { describe, expect, it } from "vitest"
import { detectHtmlFootnotes } from "@/footnotes/htmlDetector"

describe("detectHtmlFootnotes", () => {
  it("returns empty array for plain text", () => {
    expect(detectHtmlFootnotes("No HTML here.")).toEqual([])
  })

  it("returns empty array for HTML without footnotes", () => {
    expect(detectHtmlFootnotes("<p>Hello <b>world</b></p>")).toEqual([])
  })

  it("detects <footnote> elements", () => {
    const html = 'Body text.<footnote label="1">See Smith v. Jones, 500 F.2d 123.</footnote>'
    const zones = detectHtmlFootnotes(html)
    expect(zones).toHaveLength(1)
    expect(zones[0].footnoteNumber).toBe(1)
    expect(html.slice(zones[0].start, zones[0].end)).toContain("Smith v. Jones")
  })

  it("detects <fn> elements", () => {
    const html = "Body.<fn>1. Citation here, 200 U.S. 100.</fn>"
    const zones = detectHtmlFootnotes(html)
    expect(zones).toHaveLength(1)
    expect(zones[0].footnoteNumber).toBe(1)
  })

  it("detects elements with class='footnote'", () => {
    const html = '<p>Body.</p><div class="footnote"><p>1. See 42 U.S.C. § 1983.</p></div>'
    const zones = detectHtmlFootnotes(html)
    expect(zones).toHaveLength(1)
    expect(zones[0].footnoteNumber).toBe(1)
  })

  it("detects elements with id starting with 'fn' or 'footnote'", () => {
    const html = '<p>Body.</p><div id="fn1"><p>Citation text.</p></div>'
    const zones = detectHtmlFootnotes(html)
    expect(zones).toHaveLength(1)
    expect(zones[0].footnoteNumber).toBe(1)
  })

  it("detects multiple footnotes in order", () => {
    const html =
      '<p>Body.</p><footnote label="1">First note.</footnote><footnote label="2">Second note.</footnote>'
    const zones = detectHtmlFootnotes(html)
    expect(zones).toHaveLength(2)
    expect(zones[0].footnoteNumber).toBe(1)
    expect(zones[1].footnoteNumber).toBe(2)
    expect(zones[0].start).toBeLessThan(zones[1].start)
  })

  it("extracts footnote number from label attribute", () => {
    const html = '<footnote label="3">Note content.</footnote>'
    const zones = detectHtmlFootnotes(html)
    expect(zones[0].footnoteNumber).toBe(3)
  })

  it("extracts footnote number from id attribute", () => {
    const html = '<div id="fn7"><p>Note content.</p></div>'
    const zones = detectHtmlFootnotes(html)
    expect(zones[0].footnoteNumber).toBe(7)
  })

  it("extracts footnote number from leading digit in content", () => {
    const html = '<div class="footnote">5. Some citation text.</div>'
    const zones = detectHtmlFootnotes(html)
    expect(zones[0].footnoteNumber).toBe(5)
  })

  it("handles self-closing tags inside footnotes", () => {
    const html = '<footnote label="1">See <br/>Smith v. Jones, 500 F.2d 123.</footnote>'
    const zones = detectHtmlFootnotes(html)
    expect(zones).toHaveLength(1)
    expect(html.slice(zones[0].start, zones[0].end)).toContain("Smith v. Jones")
  })

  it("handles nested elements inside footnotes", () => {
    const html =
      '<footnote label="1"><p><em>See</em> Smith v. Jones, 500 F.2d 123.</p></footnote>'
    const zones = detectHtmlFootnotes(html)
    expect(zones).toHaveLength(1)
  })

  it("does not treat bare <sup> in body as footnotes", () => {
    const html = "<p>The 2<sup>nd</sup> Circuit held that...</p>"
    const zones = detectHtmlFootnotes(html)
    expect(zones).toEqual([])
  })

  it("detects <sup> inside a footnote container", () => {
    const html = '<div class="footnote"><sup>1</sup> See 500 F.2d 123.</div>'
    const zones = detectHtmlFootnotes(html)
    expect(zones).toHaveLength(1)
    expect(zones[0].footnoteNumber).toBe(1)
  })

  it("assigns sequential number when no number can be extracted", () => {
    const html = '<div class="footnote">Some note without a number.</div>'
    const zones = detectHtmlFootnotes(html)
    expect(zones).toHaveLength(1)
    expect(zones[0].footnoteNumber).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/footnotes/htmlDetector.test.ts`
Expected: FAIL — cannot resolve `@/footnotes/htmlDetector`

- [ ] **Step 3: Implement the HTML detector**

```typescript
// src/footnotes/htmlDetector.ts
import type { FootnoteMap, FootnoteZone } from "./types"

/**
 * Regex matching opening tags for footnote container elements.
 * Matches: <footnote ...>, <fn ...>, <div class="footnote" ...>,
 * <div id="fn1" ...>, <aside class="footnote" ...>, etc.
 */
const FOOTNOTE_OPEN_RE =
  /<(footnote|fn)\b[^>]*>|<(div|aside|section|p|span)\b[^>]*(?:class\s*=\s*["'][^"']*\bfootnote\b[^"']*["']|id\s*=\s*["'](?:fn|footnote)\d*["'])[^>]*>/gi

/**
 * Extract a footnote number from an HTML tag's attributes or from leading content.
 *
 * Priority: label attr > id digits > content leading digits > sequential fallback.
 */
function extractFootnoteNumber(tag: string, content: string, sequentialIndex: number): number {
  // Try label="N" attribute
  const labelMatch = /\blabel\s*=\s*["'](\d+)["']/.exec(tag)
  if (labelMatch) return Number.parseInt(labelMatch[1], 10)

  // Try id="fn3" or id="footnote3" attribute
  const idMatch = /\bid\s*=\s*["'](?:fn|footnote)(\d+)["']/.exec(tag)
  if (idMatch) return Number.parseInt(idMatch[1], 10)

  // Try leading digit in content
  const contentMatch = /^\s*(\d+)[.\s):]/.exec(content)
  if (contentMatch) return Number.parseInt(contentMatch[1], 10)

  // Fallback: sequential
  return sequentialIndex + 1
}

/**
 * Find the matching closing tag for a given element, handling nesting.
 *
 * @returns Index of the character after the closing tag, or -1 if not found.
 */
function findClosingTag(html: string, tagName: string, startAfterOpen: number): number {
  const openPattern = new RegExp(`<${tagName}\\b[^>]*>`, "gi")
  const closePattern = new RegExp(`</${tagName}\\s*>`, "gi")

  openPattern.lastIndex = startAfterOpen
  closePattern.lastIndex = startAfterOpen

  let depth = 1

  // Interleave searching for open and close tags
  while (depth > 0) {
    const nextOpen = openPattern.exec(html)
    const nextClose = closePattern.exec(html)

    if (!nextClose) return -1 // Unmatched tag

    if (nextOpen && nextOpen.index < nextClose.index) {
      depth++
      closePattern.lastIndex = nextOpen.index + nextOpen[0].length
    } else {
      depth--
      if (depth === 0) {
        return nextClose.index + nextClose[0].length
      }
      openPattern.lastIndex = nextClose.index + nextClose[0].length
    }
  }

  return -1
}

/**
 * Detect footnote zones from HTML structural elements.
 *
 * Uses regex-based tag scanning (no DOM dependency) to find footnote
 * containers and record their content ranges.
 *
 * @param html - Raw HTML text
 * @returns FootnoteMap with zones in raw-text coordinates, sorted by start position
 */
export function detectHtmlFootnotes(html: string): FootnoteMap {
  const zones: FootnoteZone[] = []
  let match: RegExpExecArray | null

  // Reset regex state
  FOOTNOTE_OPEN_RE.lastIndex = 0

  while ((match = FOOTNOTE_OPEN_RE.exec(html)) !== null) {
    const openTag = match[0]
    const openTagStart = match.index
    const contentStart = openTagStart + openTag.length

    // Determine the element tag name for finding the closing tag
    const tagName = match[1] || match[2]

    // Find the closing tag
    const closingEnd = findClosingTag(html, tagName, contentStart)
    if (closingEnd === -1) continue // Skip unmatched tags

    // Content is between opening tag end and closing tag start
    const closingTagStart = html.lastIndexOf(`</${tagName}`, closingEnd)
    const content = html.slice(contentStart, closingTagStart > contentStart ? closingTagStart : closingEnd)

    const footnoteNumber = extractFootnoteNumber(openTag, content, zones.length)

    zones.push({
      start: contentStart,
      end: closingTagStart > contentStart ? closingTagStart : closingEnd,
      footnoteNumber,
    })

    // Advance past this footnote to avoid re-matching nested elements
    FOOTNOTE_OPEN_RE.lastIndex = closingEnd
  }

  return zones.sort((a, b) => a.start - b.start)
}
```

- [ ] **Step 4: Export from barrel**

Add to `src/footnotes/index.ts`:

```typescript
export { detectHtmlFootnotes } from "./htmlDetector"
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/footnotes/htmlDetector.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/footnotes/htmlDetector.ts src/footnotes/index.ts tests/footnotes/htmlDetector.test.ts
git commit -m "feat(footnotes): add HTML footnote zone detector"
```

---

### Task 3: Plain-Text Footnote Detector

**Files:**
- Create: `src/footnotes/textDetector.ts`
- Create: `tests/footnotes/textDetector.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/footnotes/textDetector.test.ts
import { describe, expect, it } from "vitest"
import { detectTextFootnotes } from "@/footnotes/textDetector"

describe("detectTextFootnotes", () => {
  it("returns empty array for text without footnotes", () => {
    expect(detectTextFootnotes("Just a regular paragraph.")).toEqual([])
  })

  it("detects footnotes after separator line (dashes)", () => {
    const text = [
      "Body text with a citation.",
      "",
      "----------",
      "1. See Smith v. Jones, 500 F.2d 123.",
      "2. See Doe v. Roe, 300 U.S. 45.",
    ].join("\n")
    const zones = detectTextFootnotes(text)
    expect(zones).toHaveLength(2)
    expect(zones[0].footnoteNumber).toBe(1)
    expect(zones[1].footnoteNumber).toBe(2)
    expect(text.slice(zones[0].start, zones[0].end)).toContain("Smith v. Jones")
    expect(text.slice(zones[1].start, zones[1].end)).toContain("Doe v. Roe")
  })

  it("detects footnotes after separator line (underscores)", () => {
    const text = [
      "Body text.",
      "",
      "__________",
      "1. First footnote.",
    ].join("\n")
    const zones = detectTextFootnotes(text)
    expect(zones).toHaveLength(1)
    expect(zones[0].footnoteNumber).toBe(1)
  })

  it("detects FN-style markers", () => {
    const text = [
      "Body text.",
      "",
      "___________",
      "FN1. See 42 U.S.C. § 1983.",
      "FN2. See 28 U.S.C. § 1331.",
    ].join("\n")
    const zones = detectTextFootnotes(text)
    expect(zones).toHaveLength(2)
    expect(zones[0].footnoteNumber).toBe(1)
    expect(zones[1].footnoteNumber).toBe(2)
  })

  it("detects bracket-style markers", () => {
    const text = [
      "Body text.",
      "",
      "----------",
      "[1] See Smith v. Jones, 500 F.2d 123.",
      "[2] See Doe v. Roe, 300 U.S. 45.",
    ].join("\n")
    const zones = detectTextFootnotes(text)
    expect(zones).toHaveLength(2)
    expect(zones[0].footnoteNumber).toBe(1)
    expect(zones[1].footnoteNumber).toBe(2)
  })

  it("detects n.-style markers", () => {
    const text = [
      "Body text.",
      "",
      "----------",
      "n.1 See Smith v. Jones, 500 F.2d 123.",
      "n.2 See Doe v. Roe, 300 U.S. 45.",
    ].join("\n")
    const zones = detectTextFootnotes(text)
    expect(zones).toHaveLength(2)
    expect(zones[0].footnoteNumber).toBe(1)
    expect(zones[1].footnoteNumber).toBe(2)
  })

  it("each zone extends from marker to next marker", () => {
    const text = [
      "Body.",
      "",
      "----------",
      "1. First footnote content.",
      "Some continuation.",
      "2. Second footnote content.",
    ].join("\n")
    const zones = detectTextFootnotes(text)
    expect(zones).toHaveLength(2)
    // First zone should include "Some continuation."
    expect(text.slice(zones[0].start, zones[0].end)).toContain("Some continuation.")
    // Second zone should not include "Some continuation."
    expect(text.slice(zones[1].start, zones[1].end)).not.toContain("Some continuation.")
  })

  it("last zone extends to end of text", () => {
    const text = [
      "Body.",
      "",
      "----------",
      "1. Only footnote with trailing text.",
    ].join("\n")
    const zones = detectTextFootnotes(text)
    expect(zones).toHaveLength(1)
    expect(zones[0].end).toBe(text.length)
  })

  it("does not detect numbered lists in body text (no separator)", () => {
    const text = [
      "The court considered:",
      "1. The first factor.",
      "2. The second factor.",
      "3. The third factor.",
    ].join("\n")
    const zones = detectTextFootnotes(text)
    expect(zones).toEqual([])
  })

  it("handles mixed marker styles after separator", () => {
    const text = [
      "Body.",
      "",
      "----------",
      "FN1. First footnote.",
      "FN2. Second footnote.",
    ].join("\n")
    const zones = detectTextFootnotes(text)
    expect(zones).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/footnotes/textDetector.test.ts`
Expected: FAIL — cannot resolve `@/footnotes/textDetector`

- [ ] **Step 3: Implement the plain-text detector**

```typescript
// src/footnotes/textDetector.ts
import type { FootnoteMap, FootnoteZone } from "./types"

/**
 * Separator line pattern: 5+ dashes or underscores on their own line.
 */
const SEPARATOR_RE = /^\s*[-_]{5,}\s*$/m

/**
 * Footnote marker patterns at start of a line.
 * Each captures the footnote number in group 1.
 */
const MARKER_PATTERNS: RegExp[] = [
  /^\s*FN\s*(\d+)[.\s:)]/im, // FN1. or FN 1.
  /^\s*\[(\d+)\]\s/m, // [1]
  /^\s*n\.\s*(\d+)\s/im, // n.1
  /^\s*(\d+)\.\s/m, // 1.
]

/**
 * Build a global regex that matches any footnote marker at line start.
 * Captures the footnote number.
 */
const GLOBAL_MARKER_RE =
  /^\s*(?:FN\s*(\d+)[.\s:)]|\[(\d+)\]\s|n\.\s*(\d+)\s|(\d+)\.\s)/gm

/**
 * Detect footnote zones in plain text using separator + marker heuristics.
 *
 * Strategy: find a separator line, then parse numbered markers in the text
 * that follows. Each footnote zone extends from its marker to the start
 * of the next marker (or end of text).
 *
 * @param text - Raw text (not cleaned — needs newlines intact)
 * @returns FootnoteMap with zones in input-text coordinates, sorted by start position
 */
export function detectTextFootnotes(text: string): FootnoteMap {
  // Phase 1: Find the separator line
  const sepMatch = SEPARATOR_RE.exec(text)
  if (!sepMatch) return []

  // The footnote section starts after the separator line
  const footnoteSection = text.slice(sepMatch.index + sepMatch[0].length)
  const sectionOffset = sepMatch.index + sepMatch[0].length

  // Phase 2: Find all markers in the footnote section
  GLOBAL_MARKER_RE.lastIndex = 0
  const markers: { index: number; footnoteNumber: number }[] = []
  let match: RegExpExecArray | null

  while ((match = GLOBAL_MARKER_RE.exec(footnoteSection)) !== null) {
    // Extract footnote number from whichever capture group matched
    const numStr = match[1] || match[2] || match[3] || match[4]
    if (!numStr) continue
    markers.push({
      index: match.index + sectionOffset,
      footnoteNumber: Number.parseInt(numStr, 10),
    })
  }

  if (markers.length === 0) return []

  // Phase 3: Build zones — each extends from marker to next marker (or end)
  const zones: FootnoteZone[] = []
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index
    const end = i + 1 < markers.length ? markers[i + 1].index : text.length

    zones.push({
      start,
      end,
      footnoteNumber: markers[i].footnoteNumber,
    })
  }

  return zones
}
```

- [ ] **Step 4: Export from barrel**

Add to `src/footnotes/index.ts`:

```typescript
export { detectTextFootnotes } from "./textDetector"
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/footnotes/textDetector.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/footnotes/textDetector.ts src/footnotes/index.ts tests/footnotes/textDetector.test.ts
git commit -m "feat(footnotes): add plain-text footnote zone detector"
```

---

### Task 4: Strategy Selector (detectFootnotes)

**Files:**
- Create: `src/footnotes/detectFootnotes.ts`
- Create: `tests/footnotes/detectFootnotes.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/footnotes/detectFootnotes.test.ts
import { describe, expect, it } from "vitest"
import { detectFootnotes } from "@/footnotes/detectFootnotes"

describe("detectFootnotes", () => {
  it("returns empty array for text with no footnotes", () => {
    expect(detectFootnotes("No footnotes here.")).toEqual([])
  })

  it("uses HTML detection when input contains HTML tags", () => {
    const html =
      '<p>Body text.</p><footnote label="1">See Smith v. Jones, 500 F.2d 123.</footnote>'
    const zones = detectFootnotes(html)
    expect(zones).toHaveLength(1)
    expect(zones[0].footnoteNumber).toBe(1)
  })

  it("uses plain-text detection when input has no HTML tags", () => {
    const text = ["Body.", "", "----------", "1. See 500 F.2d 123."].join("\n")
    const zones = detectFootnotes(text)
    expect(zones).toHaveLength(1)
    expect(zones[0].footnoteNumber).toBe(1)
  })

  it("falls back to plain-text when HTML has no footnote elements", () => {
    const text = [
      "<p>Body text.</p>",
      "",
      "----------",
      "1. See 500 F.2d 123.",
    ].join("\n")
    const zones = detectFootnotes(text)
    expect(zones).toHaveLength(1)
    expect(zones[0].footnoteNumber).toBe(1)
  })

  it("prefers HTML detection over plain-text when both could match", () => {
    const html = [
      '<p>Body.</p><footnote label="1">HTML footnote.</footnote>',
      "",
      "----------",
      "1. Text footnote.",
    ].join("\n")
    const zones = detectFootnotes(html)
    // Should use HTML detection (found 1 zone), not text detection
    expect(zones).toHaveLength(1)
    expect(html.slice(zones[0].start, zones[0].end)).toContain("HTML footnote")
  })

  it("returns zones sorted by start position", () => {
    const html = [
      '<footnote label="2">Second.</footnote>',
      '<footnote label="1">First.</footnote>',
    ].join("")
    const zones = detectFootnotes(html)
    expect(zones[0].start).toBeLessThan(zones[1].start)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/footnotes/detectFootnotes.test.ts`
Expected: FAIL — cannot resolve `@/footnotes/detectFootnotes`

- [ ] **Step 3: Implement the strategy selector**

```typescript
// src/footnotes/detectFootnotes.ts
import { detectHtmlFootnotes } from "./htmlDetector"
import { detectTextFootnotes } from "./textDetector"
import type { FootnoteMap } from "./types"

/** Quick check for whether input contains HTML tags */
const HAS_HTML_RE = /<[^>]+>/

/**
 * Detect footnote zones in text (HTML or plain text).
 *
 * Strategy: if the input contains HTML tags, try HTML structural detection
 * first. If that yields no results (HTML without footnote elements), fall
 * back to plain-text heuristic detection. For non-HTML input, use plain-text
 * detection directly.
 *
 * @param text - Raw input text (HTML or plain text)
 * @returns FootnoteMap with zones in input-text coordinates, sorted by start
 */
export function detectFootnotes(text: string): FootnoteMap {
  if (HAS_HTML_RE.test(text)) {
    const htmlZones = detectHtmlFootnotes(text)
    if (htmlZones.length > 0) return htmlZones
  }

  return detectTextFootnotes(text)
}
```

- [ ] **Step 4: Export from barrel**

Update `src/footnotes/index.ts` to:

```typescript
export type { FootnoteMap, FootnoteZone } from "./types"
export { detectHtmlFootnotes } from "./htmlDetector"
export { detectTextFootnotes } from "./textDetector"
export { detectFootnotes } from "./detectFootnotes"
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/footnotes/detectFootnotes.test.ts`
Expected: PASS

- [ ] **Step 6: Run all footnote tests together**

Run: `pnpm exec vitest run tests/footnotes/`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add src/footnotes/detectFootnotes.ts src/footnotes/index.ts tests/footnotes/detectFootnotes.test.ts
git commit -m "feat(footnotes): add strategy selector for footnote detection"
```

---

### Task 5: Add CitationBase Footnote Fields

**Files:**
- Modify: `src/types/citation.ts:51-90` (CitationBase interface)

- [ ] **Step 1: Add fields to CitationBase**

In `src/types/citation.ts`, add two fields to the `CitationBase` interface after the existing `stringCitationGroupSize` field (around line 88):

```typescript
  /** Whether this citation appears in a footnote (only populated when detectFootnotes enabled) */
  inFootnote?: boolean

  /** Footnote number, if applicable (only populated when detectFootnotes enabled) */
  footnoteNumber?: number
```

- [ ] **Step 2: Run existing tests to verify no breakage**

Run: `pnpm exec vitest run`
Expected: ALL PASS (fields are optional, no existing code sets them)

- [ ] **Step 3: Commit**

```bash
git add src/types/citation.ts
git commit -m "feat(footnotes): add inFootnote and footnoteNumber to CitationBase"
```

---

### Task 6: Citation Tagging Logic

**Files:**
- Create: `tests/footnotes/tagging.test.ts`

This task tests the tagging logic that will be wired into `extractCitations` in Task 8. We write the tests now against a standalone helper function to verify the logic before integrating.

- [ ] **Step 1: Write failing tests**

```typescript
// tests/footnotes/tagging.test.ts
import { describe, expect, it } from "vitest"
import { tagCitationsWithFootnotes } from "@/footnotes/tagging"
import type { Citation } from "@/types/citation"
import type { FootnoteMap } from "@/footnotes/types"

function mockCitation(cleanStart: number, cleanEnd: number): Citation {
  return {
    type: "case",
    text: "cite",
    span: { cleanStart, cleanEnd, originalStart: cleanStart, originalEnd: cleanEnd },
    matchedText: "cite",
    confidence: 1.0,
    processTimeMs: 0,
    patternsChecked: 0,
    volume: 100,
    reporter: "F.2d",
    page: 100,
  } as Citation
}

describe("tagCitationsWithFootnotes", () => {
  it("does nothing when footnoteMap is empty", () => {
    const citations = [mockCitation(10, 20)]
    tagCitationsWithFootnotes(citations, [])
    expect(citations[0].inFootnote).toBeUndefined()
    expect(citations[0].footnoteNumber).toBeUndefined()
  })

  it("tags citation inside a footnote zone", () => {
    const zones: FootnoteMap = [{ start: 100, end: 200, footnoteNumber: 1 }]
    const citations = [mockCitation(120, 150)]
    tagCitationsWithFootnotes(citations, zones)
    expect(citations[0].inFootnote).toBe(true)
    expect(citations[0].footnoteNumber).toBe(1)
  })

  it("does not tag citation outside all footnote zones", () => {
    const zones: FootnoteMap = [{ start: 100, end: 200, footnoteNumber: 1 }]
    const citations = [mockCitation(10, 50)]
    tagCitationsWithFootnotes(citations, zones)
    expect(citations[0].inFootnote).toBeUndefined()
    expect(citations[0].footnoteNumber).toBeUndefined()
  })

  it("assigns correct footnote number from multiple zones", () => {
    const zones: FootnoteMap = [
      { start: 100, end: 200, footnoteNumber: 1 },
      { start: 300, end: 400, footnoteNumber: 2 },
    ]
    const citations = [mockCitation(50, 80), mockCitation(150, 180), mockCitation(350, 380)]
    tagCitationsWithFootnotes(citations, zones)

    expect(citations[0].inFootnote).toBeUndefined()
    expect(citations[1].inFootnote).toBe(true)
    expect(citations[1].footnoteNumber).toBe(1)
    expect(citations[2].inFootnote).toBe(true)
    expect(citations[2].footnoteNumber).toBe(2)
  })

  it("handles citation at exact zone boundary (start inclusive)", () => {
    const zones: FootnoteMap = [{ start: 100, end: 200, footnoteNumber: 1 }]
    const citations = [mockCitation(100, 120)]
    tagCitationsWithFootnotes(citations, zones)
    expect(citations[0].inFootnote).toBe(true)
  })

  it("handles citation at exact zone boundary (end exclusive)", () => {
    const zones: FootnoteMap = [{ start: 100, end: 200, footnoteNumber: 1 }]
    const citations = [mockCitation(200, 220)]
    tagCitationsWithFootnotes(citations, zones)
    expect(citations[0].inFootnote).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/footnotes/tagging.test.ts`
Expected: FAIL — cannot resolve `@/footnotes/tagging`

- [ ] **Step 3: Implement the tagging function**

```typescript
// src/footnotes/tagging.ts
import type { Citation } from "@/types/citation"
import type { FootnoteMap } from "./types"

/**
 * Tag citations with footnote metadata by looking up each citation's
 * clean-text span position in the footnote zone map.
 *
 * Uses binary search on the sorted FootnoteMap for O(log n) lookup per citation.
 * Mutates citations in place.
 *
 * @param citations - Citations to tag (mutated in place)
 * @param footnoteMap - Footnote zones in clean-text coordinates, sorted by start
 */
export function tagCitationsWithFootnotes(
  citations: Citation[],
  footnoteMap: FootnoteMap,
): void {
  if (footnoteMap.length === 0) return

  for (const citation of citations) {
    const pos = citation.span.cleanStart

    // Binary search for the zone containing this position
    let lo = 0
    let hi = footnoteMap.length - 1

    while (lo <= hi) {
      const mid = (lo + hi) >>> 1
      const zone = footnoteMap[mid]

      if (pos < zone.start) {
        hi = mid - 1
      } else if (pos >= zone.end) {
        lo = mid + 1
      } else {
        // pos >= zone.start && pos < zone.end — inside this zone
        citation.inFootnote = true
        citation.footnoteNumber = zone.footnoteNumber
        break
      }
    }
  }
}
```

- [ ] **Step 4: Export from barrel**

Add to `src/footnotes/index.ts`:

```typescript
export { tagCitationsWithFootnotes } from "./tagging"
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/footnotes/tagging.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/footnotes/tagging.ts src/footnotes/index.ts tests/footnotes/tagging.test.ts
git commit -m "feat(footnotes): add citation tagging via footnote zone lookup"
```

---

### Task 7: Coordinate Mapping Helper

**Files:**
- Create: `src/footnotes/mapZones.ts`
- Create: `tests/footnotes/mapZones.test.ts`

This translates `FootnoteMap` zones from raw-text to clean-text coordinates using the `TransformationMap`.

- [ ] **Step 1: Write failing tests**

```typescript
// tests/footnotes/mapZones.test.ts
import { describe, expect, it } from "vitest"
import { mapFootnoteZones } from "@/footnotes/mapZones"
import type { FootnoteMap } from "@/footnotes/types"
import type { TransformationMap } from "@/types/span"

/** Build an identity TransformationMap (no position shifts) */
function identityMap(length: number): TransformationMap {
  const cleanToOriginal = new Map<number, number>()
  const originalToClean = new Map<number, number>()
  for (let i = 0; i <= length; i++) {
    cleanToOriginal.set(i, i)
    originalToClean.set(i, i)
  }
  return { cleanToOriginal, originalToClean }
}

/** Build a TransformationMap with a fixed offset (simulating removal of N chars at start) */
function offsetMap(length: number, offset: number): TransformationMap {
  const cleanToOriginal = new Map<number, number>()
  const originalToClean = new Map<number, number>()
  for (let i = 0; i <= length; i++) {
    cleanToOriginal.set(i, i + offset)
    originalToClean.set(i + offset, i)
  }
  return { cleanToOriginal, originalToClean }
}

describe("mapFootnoteZones", () => {
  it("returns same zones when transformation is identity", () => {
    const zones: FootnoteMap = [{ start: 10, end: 50, footnoteNumber: 1 }]
    const mapped = mapFootnoteZones(zones, identityMap(100))
    expect(mapped).toEqual([{ start: 10, end: 50, footnoteNumber: 1 }])
  })

  it("translates zones through offset transformation", () => {
    const zones: FootnoteMap = [{ start: 20, end: 40, footnoteNumber: 1 }]
    const mapped = mapFootnoteZones(zones, offsetMap(50, 10))
    // originalToClean maps 20 -> 10, 40 -> 30
    expect(mapped[0].start).toBe(10)
    expect(mapped[0].end).toBe(30)
    expect(mapped[0].footnoteNumber).toBe(1)
  })

  it("preserves multiple zones and their order", () => {
    const zones: FootnoteMap = [
      { start: 10, end: 30, footnoteNumber: 1 },
      { start: 50, end: 70, footnoteNumber: 2 },
    ]
    const mapped = mapFootnoteZones(zones, identityMap(100))
    expect(mapped).toHaveLength(2)
    expect(mapped[0].start).toBeLessThan(mapped[1].start)
  })

  it("returns empty array for empty input", () => {
    expect(mapFootnoteZones([], identityMap(10))).toEqual([])
  })

  it("falls back to original positions when mapping entry is missing", () => {
    const zones: FootnoteMap = [{ start: 999, end: 1000, footnoteNumber: 1 }]
    const mapped = mapFootnoteZones(zones, identityMap(10))
    // Position 999 not in map — falls back to 999
    expect(mapped[0].start).toBe(999)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/footnotes/mapZones.test.ts`
Expected: FAIL — cannot resolve `@/footnotes/mapZones`

- [ ] **Step 3: Implement the mapping function**

```typescript
// src/footnotes/mapZones.ts
import type { TransformationMap } from "@/types/span"
import type { FootnoteMap } from "./types"

/**
 * Map FootnoteMap zones from raw-text coordinates to clean-text coordinates.
 *
 * Uses TransformationMap.originalToClean to translate each zone's start/end.
 * Falls back to original positions when a mapping entry doesn't exist.
 *
 * @param zones - FootnoteMap in raw-text coordinates
 * @param map - TransformationMap from cleanText()
 * @returns FootnoteMap in clean-text coordinates
 */
export function mapFootnoteZones(zones: FootnoteMap, map: TransformationMap): FootnoteMap {
  if (zones.length === 0) return []

  return zones.map((zone) => ({
    start: map.originalToClean.get(zone.start) ?? zone.start,
    end: map.originalToClean.get(zone.end) ?? zone.end,
    footnoteNumber: zone.footnoteNumber,
  }))
}
```

- [ ] **Step 4: Export from barrel**

Add to `src/footnotes/index.ts`:

```typescript
export { mapFootnoteZones } from "./mapZones"
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/footnotes/mapZones.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/footnotes/mapZones.ts src/footnotes/index.ts tests/footnotes/mapZones.test.ts
git commit -m "feat(footnotes): add coordinate mapping for footnote zones"
```

---

### Task 8: Wire Footnote Detection into extractCitations

**Files:**
- Modify: `src/extract/extractCitations.ts`

- [ ] **Step 1: Add `detectFootnotes` to ExtractOptions**

In `src/extract/extractCitations.ts`, add to the `ExtractOptions` interface (after `filterFalsePositives`):

```typescript
  /** Detect footnote zones and annotate citations with inFootnote/footnoteNumber (default: false) */
  detectFootnotes?: boolean
```

- [ ] **Step 2: Add imports at top of file**

Add these imports to `src/extract/extractCitations.ts`:

```typescript
import { detectFootnotes } from "@/footnotes/detectFootnotes"
import { mapFootnoteZones } from "@/footnotes/mapZones"
import { tagCitationsWithFootnotes } from "@/footnotes/tagging"
import type { FootnoteMap } from "@/footnotes/types"
```

- [ ] **Step 3: Wire detection into the pipeline**

In the `extractCitations` function body, after the `cleanText` call (line 205) and before tokenization (line 217), add footnote detection:

```typescript
  // Step 1.5: Detect footnote zones (opt-in)
  let cleanFootnoteMap: FootnoteMap | undefined
  if (options?.detectFootnotes) {
    const rawZones = detectFootnotes(text)
    if (rawZones.length > 0) {
      cleanFootnoteMap = mapFootnoteZones(rawZones, transformationMap)
    }
  }
```

After false positive filtering (line 386, `const filtered = ...`) and before the resolve step (line 389), add citation tagging:

```typescript
  // Step 4.95: Tag citations with footnote metadata
  if (cleanFootnoteMap) {
    tagCitationsWithFootnotes(filtered, cleanFootnoteMap)
  }
```

Pass the footnote map to the resolver. Change the resolve block (lines 389-391) from:

```typescript
  if (options?.resolve) {
    return resolveCitations(filtered, text, options.resolutionOptions)
  }
```

to:

```typescript
  if (options?.resolve) {
    const resolutionOpts = cleanFootnoteMap
      ? { ...options.resolutionOptions, footnoteMap: cleanFootnoteMap }
      : options.resolutionOptions
    return resolveCitations(filtered, text, resolutionOpts)
  }
```

- [ ] **Step 4: Run existing tests to verify no breakage**

Run: `pnpm exec vitest run`
Expected: ALL PASS (detectFootnotes defaults to false, no existing behavior changes)

- [ ] **Step 5: Commit**

```bash
git add src/extract/extractCitations.ts
git commit -m "feat(footnotes): wire detection into extractCitations pipeline"
```

---

### Task 9: Footnote-Aware Scope Resolution

**Files:**
- Modify: `src/resolve/types.ts`
- Modify: `src/resolve/scopeBoundary.ts`
- Modify: `src/resolve/DocumentResolver.ts`
- Create: `tests/footnotes/resolution.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/footnotes/resolution.test.ts
import { describe, expect, it } from "vitest"
import { DocumentResolver } from "@/resolve/DocumentResolver"
import type { Citation } from "@/types/citation"
import type { FootnoteMap } from "@/footnotes/types"
import type { ResolvedCitation } from "@/resolve/types"

/** Helper to build a mock case citation at a given position */
function mockCase(start: number, end: number, overrides: Record<string, unknown> = {}): Citation {
  return {
    type: "case",
    text: `cite-${start}`,
    span: { cleanStart: start, cleanEnd: end, originalStart: start, originalEnd: end },
    matchedText: `cite-${start}`,
    confidence: 1.0,
    processTimeMs: 0,
    patternsChecked: 0,
    volume: 500,
    reporter: "F.2d",
    page: 123,
    ...overrides,
  } as Citation
}

function mockId(start: number, end: number): Citation {
  return {
    type: "id",
    text: "Id.",
    span: { cleanStart: start, cleanEnd: end, originalStart: start, originalEnd: end },
    matchedText: "Id.",
    confidence: 1.0,
    processTimeMs: 0,
    patternsChecked: 0,
  } as Citation
}

function mockSupra(start: number, end: number, partyName: string): Citation {
  return {
    type: "supra",
    text: `${partyName}, supra`,
    span: { cleanStart: start, cleanEnd: end, originalStart: start, originalEnd: end },
    matchedText: `${partyName}, supra`,
    confidence: 1.0,
    processTimeMs: 0,
    patternsChecked: 0,
    partyName,
  } as Citation
}

describe("Footnote-aware resolution", () => {
  // Body: 0-99, Footnote 1: 100-199, Footnote 2: 200-299
  const footnoteMap: FootnoteMap = [
    { start: 100, end: 200, footnoteNumber: 1 },
    { start: 200, end: 300, footnoteNumber: 2 },
  ]

  const text = "x".repeat(300) // Dummy text, positions are what matter

  describe("Id. resolution with footnote scope", () => {
    it("Id. in footnote 1 resolves to case in same footnote", () => {
      const citations = [mockCase(110, 140), mockId(160, 163)]
      const resolver = new DocumentResolver(citations, text, {
        scopeStrategy: "footnote",
        footnoteMap,
        autoDetectParagraphs: false,
      })
      const resolved = resolver.resolve()
      expect(resolved[1].resolution?.resolvedTo).toBe(0)
    })

    it("Id. in footnote 1 does NOT resolve to case in body", () => {
      const citations = [mockCase(10, 40), mockId(160, 163)]
      const resolver = new DocumentResolver(citations, text, {
        scopeStrategy: "footnote",
        footnoteMap,
        autoDetectParagraphs: false,
      })
      const resolved = resolver.resolve()
      expect(resolved[1].resolution?.resolvedTo).toBeUndefined()
    })

    it("Id. in footnote 1 does NOT resolve to case in footnote 2", () => {
      const citations = [mockCase(210, 240), mockId(160, 163)]
      const resolver = new DocumentResolver(citations, text, {
        scopeStrategy: "footnote",
        footnoteMap,
        autoDetectParagraphs: false,
      })
      const resolved = resolver.resolve()
      expect(resolved[1].resolution?.resolvedTo).toBeUndefined()
    })

    it("Id. in body resolves to case in body", () => {
      const citations = [mockCase(10, 40), mockId(50, 53)]
      const resolver = new DocumentResolver(citations, text, {
        scopeStrategy: "footnote",
        footnoteMap,
        autoDetectParagraphs: false,
      })
      const resolved = resolver.resolve()
      expect(resolved[1].resolution?.resolvedTo).toBe(0)
    })
  })

  describe("supra resolution with footnote scope", () => {
    it("supra in footnote resolves to case in body (cross-zone allowed)", () => {
      const citations = [
        mockCase(10, 40, { defendant: "Jones", defendantNormalized: "jones" }),
        mockSupra(160, 175, "Jones"),
      ]
      const resolver = new DocumentResolver(citations, text, {
        scopeStrategy: "footnote",
        footnoteMap,
        autoDetectParagraphs: false,
      })
      const resolved = resolver.resolve()
      expect(resolved[1].resolution?.resolvedTo).toBe(0)
    })

    it("supra in footnote 1 does NOT resolve to case in footnote 2", () => {
      const citations = [
        mockCase(210, 240, { defendant: "Jones", defendantNormalized: "jones" }),
        mockSupra(160, 175, "Jones"),
      ]
      const resolver = new DocumentResolver(citations, text, {
        scopeStrategy: "footnote",
        footnoteMap,
        autoDetectParagraphs: false,
      })
      const resolved = resolver.resolve()
      expect(resolved[1].resolution?.resolvedTo).toBeUndefined()
    })
  })

  describe("fallback behavior", () => {
    it("falls back to paragraph scope when footnoteMap is not provided", () => {
      const longText = "Paragraph 1.\n\nParagraph 2."
      const citations = [
        mockCase(0, 10),
        mockId(15, 18), // In paragraph 2 after "\n\n"
      ]
      const resolver = new DocumentResolver(citations, longText, {
        scopeStrategy: "footnote",
        // No footnoteMap — should fall back to paragraph behavior
      })
      const resolved = resolver.resolve()
      // Should use paragraph scoping — Id. in paragraph 2 can't reach case in paragraph 1
      expect(resolved[1].resolution?.resolvedTo).toBeUndefined()
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/footnotes/resolution.test.ts`
Expected: FAIL — `footnoteMap` not recognized in `ResolutionOptions`

- [ ] **Step 3: Add `footnoteMap` to ResolutionOptions**

In `src/resolve/types.ts`, add to the `ResolutionOptions` interface (after `reportUnresolved`):

```typescript
  /**
   * Footnote zone map for footnote-aware scoping.
   * When scopeStrategy is "footnote" and this is provided, citations are
   * scoped by footnote zones instead of paragraphs.
   */
  footnoteMap?: FootnoteMap
```

Add the import at the top of `src/resolve/types.ts`:

```typescript
import type { FootnoteMap } from "../footnotes/types"
```

- [ ] **Step 4: Add `buildFootnoteScopes` to scopeBoundary.ts**

In `src/resolve/scopeBoundary.ts`, add this function after the existing `isWithinBoundary`:

```typescript
import type { FootnoteMap } from "../footnotes/types"

/**
 * Build a scope map from footnote zones.
 *
 * Assigns each citation a zone ID:
 * - 0 for body text (not in any footnote)
 * - N for footnote number N
 *
 * @param citations - Extracted citations
 * @param footnoteMap - Detected footnote zones (in original-text coordinates)
 * @returns Map of citation index to zone ID
 */
export function buildFootnoteScopes(
  citations: Citation[],
  footnoteMap: FootnoteMap,
): Map<number, number> {
  const scopeMap = new Map<number, number>()

  for (let i = 0; i < citations.length; i++) {
    const pos = citations[i].span.originalStart

    // Binary search for the zone containing this position
    let zoneId = 0 // Default: body
    let lo = 0
    let hi = footnoteMap.length - 1

    while (lo <= hi) {
      const mid = (lo + hi) >>> 1
      const zone = footnoteMap[mid]

      if (pos < zone.start) {
        hi = mid - 1
      } else if (pos >= zone.end) {
        lo = mid + 1
      } else {
        zoneId = zone.footnoteNumber
        break
      }
    }

    scopeMap.set(i, zoneId)
  }

  return scopeMap
}
```

- [ ] **Step 5: Update `isWithinBoundary` for footnote cross-zone rules**

Replace the `isWithinBoundary` function in `src/resolve/scopeBoundary.ts` with:

```typescript
/**
 * Checks if an antecedent citation is within resolution scope.
 *
 * For "footnote" strategy with cross-zone support:
 * - Same zone: always allowed
 * - Body (zone 0) to footnote: not allowed (footnotes can't pull body-scoped Id.)
 * - Footnote to body (zone 0): allowed only for supra/shortFormCase (via allowCrossZone)
 * - Footnote to different footnote: not allowed
 *
 * @param antecedentIndex - Index of the antecedent citation
 * @param currentIndex - Index of current citation being resolved
 * @param paragraphMap - Map of citation index to scope ID (paragraph or footnote zone)
 * @param strategy - Scope boundary strategy
 * @param allowCrossZone - If true, allow resolving from footnote to body (for supra/shortFormCase)
 * @returns true if antecedent is within scope, false otherwise
 */
export function isWithinBoundary(
  antecedentIndex: number,
  currentIndex: number,
  paragraphMap: Map<number, number>,
  strategy: ScopeStrategy,
  allowCrossZone = false,
): boolean {
  if (strategy === "none") {
    return true
  }

  const antecedentScope = paragraphMap.get(antecedentIndex)
  const currentScope = paragraphMap.get(currentIndex)

  if (antecedentScope === undefined || currentScope === undefined) {
    return true
  }

  // Same scope: always allowed
  if (antecedentScope === currentScope) {
    return true
  }

  // Cross-zone: only for footnote strategy with allowCrossZone
  if (strategy === "footnote" && allowCrossZone && antecedentScope === 0) {
    // Current is in a footnote, antecedent is in body — allowed for supra/shortFormCase
    return true
  }

  return false
}
```

- [ ] **Step 6: Update DocumentResolver to use footnote scopes**

In `src/resolve/DocumentResolver.ts`, make these changes:

**Add import:**

```typescript
import { buildFootnoteScopes, detectParagraphBoundaries, isWithinBoundary } from "./scopeBoundary"
```

**Update constructor** — after the paragraph boundary detection block (lines 72-78), add footnote scope handling:

```typescript
    // Detect paragraph boundaries if enabled
    if (this.options.autoDetectParagraphs) {
      this.context.paragraphMap = detectParagraphBoundaries(
        text,
        citations,
        this.options.paragraphBoundaryPattern,
      )
    }

    // Override with footnote scopes when available
    if (this.options.scopeStrategy === "footnote" && this.options.footnoteMap) {
      this.context.paragraphMap = buildFootnoteScopes(citations, this.options.footnoteMap)
    }
```

**Add `footnoteMap` to defaults** — in the constructor options defaults block (around line 52-60), add after `reportUnresolved`:

```typescript
      footnoteMap: options.footnoteMap,
```

**Update the `options` type** — the `DocumentResolver` declares `private readonly options: Required<ResolutionOptions>`. Since `footnoteMap` is intentionally optional (undefined means "not provided"), change the type to:

```typescript
  private readonly options: Required<Omit<ResolutionOptions, "footnoteMap">> & Pick<ResolutionOptions, "footnoteMap">
```

Alternatively, keep `Required<ResolutionOptions>` and set the default to `undefined`:

```typescript
      footnoteMap: options.footnoteMap ?? undefined,
```

Use the simpler approach (explicit `undefined` default) since `Required<T>` allows `undefined` as a value when the property is typed as `T | undefined`.

**Update `isWithinScope`** — replace the private method:

```typescript
  private isWithinScope(
    antecedentIndex: number,
    currentIndex: number,
    allowCrossZone = false,
  ): boolean {
    return isWithinBoundary(
      antecedentIndex,
      currentIndex,
      this.context.paragraphMap,
      this.options.scopeStrategy,
      allowCrossZone,
    )
  }
```

**Update `resolveSupra`** — change the scope check call (line 170):

```typescript
      if (!this.isWithinScope(citationIndex, currentIndex, true)) {
```

**Update `resolveShortFormCase`** — change the scope check call (line 228):

```typescript
        if (!this.isWithinScope(i, currentIndex, true)) {
```

**Keep `resolveId` unchanged** — it calls `this.isWithinScope(antecedentIndex, currentIndex)` with default `allowCrossZone = false`, which is exactly the strict scoping we want for Id.

- [ ] **Step 7: Run footnote resolution tests**

Run: `pnpm exec vitest run tests/footnotes/resolution.test.ts`
Expected: PASS

- [ ] **Step 8: Run all tests to verify no breakage**

Run: `pnpm exec vitest run`
Expected: ALL PASS

- [ ] **Step 9: Commit**

```bash
git add src/resolve/types.ts src/resolve/scopeBoundary.ts src/resolve/DocumentResolver.ts tests/footnotes/resolution.test.ts
git commit -m "feat(footnotes): implement footnote-aware scope resolution"
```

---

### Task 10: Export Public API

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Add footnote exports to src/index.ts**

Add a new section after the Resolution exports:

```typescript
// ============================================================================
// Footnote Detection
// ============================================================================

export { detectFootnotes } from "./footnotes"
export type { FootnoteMap, FootnoteZone } from "./footnotes"
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Run all tests**

Run: `pnpm exec vitest run`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat(footnotes): export detectFootnotes, FootnoteMap, FootnoteZone from public API"
```

---

### Task 11: Integration Tests

**Files:**
- Create: `tests/integration/footnotes.test.ts`

- [ ] **Step 1: Write integration tests**

```typescript
// tests/integration/footnotes.test.ts
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import { detectFootnotes } from "@/footnotes/detectFootnotes"
import type { ResolvedCitation } from "@/resolve/types"

describe("Footnote Integration Tests", () => {
  describe("HTML input", () => {
    it("detects footnotes and tags citations in HTML", () => {
      const html = [
        "<p>The Court held in Smith v. Jones, 500 F.2d 123 (2d Cir. 2020) that the statute applies.</p>",
        '<footnote label="1">See also Doe v. Roe, 300 U.S. 45 (1990).</footnote>',
      ].join("")

      const citations = extractCitations(html, { detectFootnotes: true })
      expect(citations).toHaveLength(2)

      // First citation is in body
      expect(citations[0].type).toBe("case")
      expect(citations[0].inFootnote).toBeUndefined()

      // Second citation is in footnote
      expect(citations[1].type).toBe("case")
      expect(citations[1].inFootnote).toBe(true)
      expect(citations[1].footnoteNumber).toBe(1)
    })

    it("multiple footnotes with separate citations", () => {
      const html = [
        "<p>Body citation: 500 F.2d 123 (2d Cir. 2020).</p>",
        '<footnote label="1">200 U.S. 45 (1990).</footnote>',
        '<footnote label="2">300 F.3d 789 (9th Cir. 2005).</footnote>',
      ].join("")

      const citations = extractCitations(html, { detectFootnotes: true })
      const inFootnote = citations.filter((c) => c.inFootnote)
      expect(inFootnote).toHaveLength(2)
      expect(inFootnote[0].footnoteNumber).toBe(1)
      expect(inFootnote[1].footnoteNumber).toBe(2)
    })
  })

  describe("plain text input", () => {
    it("detects footnotes after separator line", () => {
      const text = [
        "The Court in Smith v. Jones, 500 F.2d 123 (2d Cir. 2020) held...",
        "",
        "----------",
        "1. See Doe v. Roe, 300 U.S. 45 (1990).",
      ].join("\n")

      const citations = extractCitations(text, { detectFootnotes: true })
      const bodyCites = citations.filter((c) => !c.inFootnote)
      const footnoteCites = citations.filter((c) => c.inFootnote)

      expect(bodyCites.length).toBeGreaterThanOrEqual(1)
      expect(footnoteCites.length).toBeGreaterThanOrEqual(1)
      expect(footnoteCites[0].footnoteNumber).toBe(1)
    })
  })

  describe("opt-in behavior", () => {
    it("does not annotate when detectFootnotes is false (default)", () => {
      const html =
        '<p>500 F.2d 123 (2020).</p><footnote label="1">300 U.S. 45 (1990).</footnote>'

      const citations = extractCitations(html)
      for (const c of citations) {
        expect(c.inFootnote).toBeUndefined()
        expect(c.footnoteNumber).toBeUndefined()
      }
    })
  })

  describe("standalone detectFootnotes", () => {
    it("returns zones from HTML without running full pipeline", () => {
      const html =
        '<p>Body.</p><footnote label="1">Note 1.</footnote><footnote label="2">Note 2.</footnote>'
      const zones = detectFootnotes(html)
      expect(zones).toHaveLength(2)
      expect(zones[0].footnoteNumber).toBe(1)
      expect(zones[1].footnoteNumber).toBe(2)
    })

    it("returns zones from plain text", () => {
      const text = ["Body.", "", "----------", "1. Note 1.", "2. Note 2."].join("\n")
      const zones = detectFootnotes(text)
      expect(zones).toHaveLength(2)
    })
  })

  describe("footnote-aware resolution", () => {
    it("Id. in footnote resolves within same footnote only", () => {
      const html = [
        "<p>See Smith v. Jones, 500 F.2d 123 (2d Cir. 2020).</p>",
        '<footnote label="1">',
        "See Doe v. Roe, 300 U.S. 45 (1990). Id. at 50.",
        "</footnote>",
      ].join("")

      const citations = extractCitations(html, {
        detectFootnotes: true,
        resolve: true,
        resolutionOptions: { scopeStrategy: "footnote" },
      }) as ResolvedCitation[]

      // Find the Id. citation
      const idCite = citations.find((c) => c.type === "id")
      expect(idCite).toBeDefined()
      expect(idCite!.inFootnote).toBe(true)

      // It should resolve to Doe v. Roe (in same footnote), not Smith v. Jones (in body)
      if (idCite!.resolution?.resolvedTo !== undefined) {
        const resolved = citations[idCite!.resolution.resolvedTo]
        expect(resolved.inFootnote).toBe(true)
      }
    })
  })
})
```

- [ ] **Step 2: Run integration tests**

Run: `pnpm exec vitest run tests/integration/footnotes.test.ts`
Expected: PASS

- [ ] **Step 3: Run full test suite**

Run: `pnpm exec vitest run`
Expected: ALL PASS

- [ ] **Step 4: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/integration/footnotes.test.ts
git commit -m "test(footnotes): add integration tests for full pipeline"
```

---

### Task 12: Build Verification

- [ ] **Step 1: Run build**

Run: `pnpm build`
Expected: PASS — ESM + CJS + DTS all generated

- [ ] **Step 2: Run size check**

Run: `pnpm size`
Expected: PASS — within bundle size limits

- [ ] **Step 3: Verify exports are accessible**

Run:
```bash
node -e "const m = require('./dist/index.cjs'); console.log(typeof m.detectFootnotes, typeof m.extractCitations)"
```
Expected: `function function`

- [ ] **Step 4: Final full test suite**

Run: `pnpm exec vitest run`
Expected: ALL PASS

- [ ] **Step 5: Commit any remaining fixes, if needed**
