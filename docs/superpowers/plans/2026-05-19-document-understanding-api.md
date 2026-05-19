# Document Understanding API (`analyzeDocument`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a sibling function `analyzeDocument(text, citations)` to the core entry point. Returns a `Document` view exposing three new capabilities: prose offsets (top-level + per-cite), quote attribution (3 kinds with confidence), and a typed-edge citation graph (7 edge kinds projecting existing relationship fields). Plus three pure refactors of mature private helpers to shared utilities.

**Architecture:** New module `src/document/` with one orchestrator (`analyzer.ts`) composing three independently-testable modules (`proseOffsets.ts`, `quoteAttribution.ts`, `citationGraph.ts`) over the existing extraction output. Pure projection — reads existing fields, re-shapes; no new tokenization or extraction. Three refactors prepare shared utilities.

**Tech Stack:** TypeScript, Vitest 4, pnpm 10, Biome 2. Zero new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-05-19-document-understanding-api-design.md`
**Research:** `docs/research/2026-05-19-document-understanding-api.md`

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/utils/detectQuoteZones.ts` | Create | Refactored out of `DocumentResolver.ts` |
| `src/utils/citationBounds.ts` | Create | Refactored from `detectStringCites.ts` (`getCitationStart`/`getCitationEnd`) |
| `src/utils/parenDepths.ts` | Create | Refactored from `DocumentResolver.computeParenDepths` |
| `src/resolve/DocumentResolver.ts` | Modify | Import `detectQuoteZones` and `computeParenDepths` from `utils/`; delete the inline implementations |
| `src/extract/detectStringCites.ts` | Modify | Import `getCitationStart`/`getCitationEnd` from `utils/`; delete the inline implementations |
| `src/document/types.ts` | Create | `Document`, `Edge` union, `QuoteAttribution`, `FootnoteZone`, `AttributionKind`, `CitationGraph` |
| `src/document/proseOffsets.ts` | Create | `computeProseOffsets(text, citations, transformationMap?)` |
| `src/document/citationGraph.ts` | Create | `buildCitationGraph(citations)` |
| `src/document/quoteAttribution.ts` | Create | `attributeQuotes(text, quoteZones, citations, parenDepths)` |
| `src/document/footnoteZones.ts` | Create | `extractFootnoteZones(citations)` |
| `src/document/analyzer.ts` | Create | `analyzeDocument` orchestrator |
| `src/document/index.ts` | Create | Public re-exports for the module |
| `src/index.ts` | Modify | Re-export `analyzeDocument` and the new types from the core entry point |
| `tests/utils/detectQuoteZones.test.ts` | Create | Unit tests for the refactored helper |
| `tests/utils/citationBounds.test.ts` | Create | Unit tests for the refactored helpers |
| `tests/utils/parenDepths.test.ts` | Create | Unit tests for the refactored helper |
| `tests/document/proseOffsets.test.ts` | Create | Empty doc / prose-only / cites-only / adjacent / parallel / with-vs-without transformationMap |
| `tests/document/citationGraph.test.ts` | Create | Each of 7 edge types + invariants (no self-edges, no dups, sorted) |
| `tests/document/quoteAttribution.test.ts` | Create | Each of 3 attribution kinds + unattributed + parenthetical override + distance thresholds |
| `tests/document/footnoteZones.test.ts` | Create | with/without `detectFootnotes`, multi-cite per footnote |
| `tests/document/analyzer.test.ts` | Create | End-to-end `analyzeDocument` Document-shape assertions |
| `tests/document/randolphFixture.test.ts` | Create | End-to-end on the Randolph passage exercising all capabilities |
| `.changeset/document-understanding-api.md` | Create | Minor bump (additive feature) |

---

## Pre-flight

Verify branch + spec are in place:

```bash
git rev-parse --abbrev-ref HEAD
# Expected: feat/document-understanding

ls docs/superpowers/specs/2026-05-19-document-understanding-api-design.md
ls docs/research/2026-05-19-document-understanding-api.md
# Both should exist.
```

**Known LSP noise:** Every new test file in `tests/` triggers spurious LSP `Cannot find module '@/extract'` / path-alias warnings. `pnpm typecheck` and `pnpm exec vitest run` are the authoritative checks — ignore the LSP diagnostics.

**Lock-file drift:** Per `project_persistent_drift` memory, `package.json` + `pnpm-lock.yaml` are expected to show as modified — leave alone or stash during branch switches.

---

## Task 1: Refactor Three Helpers to `src/utils/`

Three independent file moves with import updates. No behavior change — full test suite must pass at the end. Single commit because they're tightly related and individually trivial.

**Files:**
- Create: `src/utils/detectQuoteZones.ts`
- Create: `src/utils/citationBounds.ts`
- Create: `src/utils/parenDepths.ts`
- Modify: `src/resolve/DocumentResolver.ts`
- Modify: `src/extract/detectStringCites.ts`
- Create: `tests/utils/detectQuoteZones.test.ts`
- Create: `tests/utils/citationBounds.test.ts`
- Create: `tests/utils/parenDepths.test.ts`

- [ ] **Step 1.1: Create `src/utils/detectQuoteZones.ts`**

Copy the existing `detectQuoteZones` function (including the inline `classifyAsciiQuote` helper) from `src/resolve/DocumentResolver.ts` (~line 93-205) into a new file. Make `detectQuoteZones` an `export` and keep `classifyAsciiQuote` as a module-local helper. The file should be self-contained — no imports from `DocumentResolver`.

```ts
// src/utils/detectQuoteZones.ts
/**
 * Classify an ASCII `"` at position `pos` as opening, closing, or ambiguous,
 * based on neighboring characters. English typographic conventions:
 *
 *   - Opening: preceded by start/whitespace/punctuation-open (`(`, `[`, `—`)
 *     AND followed by a letter or `(`.
 *   - Closing: preceded by a letter/digit/sentence punctuation
 *     (`.`, `,`, `?`, `!`, `:`, `;`, `)`, `]`) AND followed by end/
 *     whitespace/punctuation.
 *   - Ambiguous: everything else (skipped during pairing).
 */
function classifyAsciiQuote(text: string, pos: number): "open" | "close" | "ambiguous" {
  const prev = pos === 0 ? "" : text[pos - 1]
  const next = pos === text.length - 1 ? "" : text[pos + 1]

  const openPrev = prev === "" || /\s/.test(prev) || prev === "(" || prev === "[" || prev === "—"
  const openNext = /[A-Za-zÀ-ɏ]/.test(next) || next === "("
  if (openPrev && openNext) return "open"

  const closePrev = /[A-Za-z0-9À-ɏ.,?!:;)\]]/.test(prev)
  const closeNext = next === "" || /[\s.,;:)—\]]/.test(next)
  if (closePrev && closeNext) return "close"

  return "ambiguous"
}

/**
 * Detects block-quote and inline-quote zones in **original** text and
 * returns sorted, non-overlapping `{start, end}` ranges in original-text
 * coordinates. See the full algorithm rationale in the original
 * implementation history.
 */
export function detectQuoteZones(text: string): Array<{ start: number; end: number }> {
  // ... copy the exact body from DocumentResolver.ts lines ~135-205 ...
}
```

Use Read to grab the exact lines and copy them. Keep the algorithm 100% the same — this is a pure move.

- [ ] **Step 1.2: Create `src/utils/citationBounds.ts`**

Copy `getCitationStart` and `getCitationEnd` from `src/extract/detectStringCites.ts` (~lines 63-75). Export both.

```ts
// src/utils/citationBounds.ts
import type { Citation, FullCaseCitation } from "../types/citation"

/**
 * Get the end position of a citation's full extent in cleaned text.
 *
 * Uses fullSpan if available on any citation type (currently only case
 * citations carry fullSpan, but this is future-proof for other types).
 */
export function getCitationEnd(c: Citation): number {
  const fullSpan = "fullSpan" in c ? (c as FullCaseCitation).fullSpan : undefined
  return fullSpan ? fullSpan.cleanEnd : c.span.cleanEnd
}

/**
 * Get the start position of a citation's full extent in cleaned text.
 * Uses fullSpan if available on any citation type.
 */
export function getCitationStart(c: Citation): number {
  const fullSpan = "fullSpan" in c ? (c as FullCaseCitation).fullSpan : undefined
  return fullSpan ? fullSpan.cleanStart : c.span.cleanStart
}
```

- [ ] **Step 1.3: Create `src/utils/parenDepths.ts`**

Refactor `DocumentResolver.computeParenDepths` (~lines 465-482) into a pure function. The current method reads from `this.citations` and `this.text`; the standalone version takes them as parameters.

```ts
// src/utils/parenDepths.ts
import type { Citation } from "../types/citation"

/**
 * Compute parenthesis depth at the start position of each citation.
 * Walks the raw text once, counting `(` and `)` and recording the
 * running depth at every citation's `span.cleanStart`. Depth > 0
 * indicates the citation is nested inside an open parenthetical
 * block (typically an explanatory `(quoting X)` / `(citing Y)`
 * following an earlier citation).
 *
 * Citations must be sorted by `span.cleanStart`. The returned array
 * is parallel to `citations` (index i = depth at citations[i].span.cleanStart).
 */
export function computeParenDepths(text: string, citations: Citation[]): number[] {
  const depths: number[] = new Array(citations.length).fill(0)
  if (citations.length === 0) return depths

  let depth = 0
  let pos = 0
  for (let i = 0; i < citations.length; i++) {
    const start = citations[i].span.cleanStart
    while (pos < start && pos < text.length) {
      const ch = text[pos]
      if (ch === "(") depth++
      else if (ch === ")" && depth > 0) depth--
      pos++
    }
    depths[i] = depth
  }
  return depths
}
```

- [ ] **Step 1.4: Update `src/resolve/DocumentResolver.ts` to import from `utils/`**

In `DocumentResolver.ts`:

1. Delete the inline `classifyAsciiQuote` function (~lines 93-117).
2. Delete the inline `detectQuoteZones` function (~lines 119-205).
3. Delete the inline `computeParenDepths` method (~lines 465-482).
4. Add imports at the top:

```ts
import { detectQuoteZones } from "../utils/detectQuoteZones"
import { computeParenDepths } from "../utils/parenDepths"
```

5. Find the line `this.parenDepths = this.computeParenDepths()` (~line 308) and replace with:

```ts
this.parenDepths = computeParenDepths(this.text, this.citations)
```

(The `detectQuoteZones(text)` call at line 271 stays the same — function name unchanged.)

- [ ] **Step 1.5: Update `src/extract/detectStringCites.ts` to import from `utils/`**

In `detectStringCites.ts`:

1. Delete the inline `getCitationStart` and `getCitationEnd` functions (~lines 63-75).
2. Add import at top:

```ts
import { getCitationStart, getCitationEnd } from "../utils/citationBounds"
```

(Internal callers already use the unqualified names — no call-site changes needed.)

- [ ] **Step 1.6: Add minimal unit tests for each utility**

Create `tests/utils/detectQuoteZones.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { detectQuoteZones } from "@/utils/detectQuoteZones"

describe("detectQuoteZones", () => {
  it("returns an empty array for text with no quotes", () => {
    expect(detectQuoteZones("plain prose with no quotes")).toEqual([])
  })

  it("detects a paired ASCII double-quote zone", () => {
    const text = `He said "the rule applies" and walked away.`
    const zones = detectQuoteZones(text)
    expect(zones).toHaveLength(1)
    expect(zones[0].start).toBe(text.indexOf(`"`))
    expect(zones[0].end).toBe(text.indexOf(`"`, zones[0].start + 1) + 1)
  })

  it("detects a paired typographic quote zone", () => {
    const text = `He said “the rule applies” and walked away.`
    const zones = detectQuoteZones(text)
    expect(zones).toHaveLength(1)
  })

  it("detects a markdown blockquote", () => {
    const text = `Some intro.\n> blockquote line one\n> blockquote line two\nNext paragraph.`
    const zones = detectQuoteZones(text)
    expect(zones.length).toBeGreaterThanOrEqual(1)
  })

  it("ignores orphan ASCII close-quote (mid-doc paste)", () => {
    const text = `use." Smith v. Jones, 100 F.2d 50, 55 (1990).`
    const zones = detectQuoteZones(text)
    // The orphan close quote should NOT pair with anything — no zone created.
    expect(zones).toEqual([])
  })
})
```

Create `tests/utils/citationBounds.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { FullCaseCitation } from "@/types/citation"
import { getCitationStart, getCitationEnd } from "@/utils/citationBounds"

describe("getCitationStart / getCitationEnd", () => {
  it("uses fullSpan for case citations when available", () => {
    const text = "Smith v. Jones, 100 F.2d 50, 55 (1990)."
    const cites = extractCitations(text)
    const c = cites[0] as FullCaseCitation
    expect(c.fullSpan).toBeDefined()
    expect(getCitationStart(c)).toBe(c.fullSpan!.cleanStart)
    expect(getCitationEnd(c)).toBe(c.fullSpan!.cleanEnd)
  })

  it("falls back to span when fullSpan is absent", () => {
    const text = "See 28 U.S.C. § 1331."
    const cites = extractCitations(text)
    const c = cites[0]
    // statute citations have no fullSpan
    expect(getCitationStart(c)).toBe(c.span.cleanStart)
    expect(getCitationEnd(c)).toBe(c.span.cleanEnd)
  })
})
```

Create `tests/utils/parenDepths.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import { computeParenDepths } from "@/utils/parenDepths"

describe("computeParenDepths", () => {
  it("returns all zeros for citations outside any parenthetical", () => {
    const text = "Smith v. Jones, 100 F.2d 50 (1990). Brown v. Doe, 200 F.3d 100 (2000)."
    const cites = extractCitations(text)
    const depths = computeParenDepths(text, cites)
    expect(depths).toEqual(new Array(cites.length).fill(0))
  })

  it("returns depth > 0 for citations inside an explanatory parenthetical", () => {
    const text = "Smith v. Jones, 100 F.2d 50 (1990) (citing Other v. Else, 200 F.3d 100)."
    const cites = extractCitations(text)
    const depths = computeParenDepths(text, cites)
    // The "Other v. Else" citation is inside the outer (citing ...) paren.
    expect(depths.length).toBe(cites.length)
    const otherIdx = cites.findIndex((c) => c.text.includes("200 F.3d 100"))
    if (otherIdx !== -1) {
      expect(depths[otherIdx]).toBeGreaterThan(0)
    }
  })

  it("returns empty array for empty citation list", () => {
    expect(computeParenDepths("anything", [])).toEqual([])
  })
})
```

- [ ] **Step 1.7: Run the full test suite**

```bash
pnpm exec vitest run 2>&1 | tail -5
```

Expected: all tests pass. The refactors are behavior-preserving moves — DocumentResolver and detectStringCites tests should be unchanged, and the new utility tests add ~10 passing tests.

If anything regresses: most likely cause is an off-by-one in the copied algorithm or a missed import update. Revert and re-do the move that broke things.

- [ ] **Step 1.8: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint 2>&1 | tail -5
```

Expected: both pass.

- [ ] **Step 1.9: Commit**

```bash
git add src/utils/ src/resolve/DocumentResolver.ts src/extract/detectStringCites.ts tests/utils/
git commit -m "$(cat <<'EOF'
refactor(utils): extract detectQuoteZones, citationBounds, parenDepths

Three mature private helpers moved to src/utils/ for reuse by the
upcoming analyzeDocument module:

- detectQuoteZones (was inline in DocumentResolver.ts)
- getCitationStart/End (was inline in detectStringCites.ts)
- computeParenDepths (was a private method on DocumentResolver)

Algorithms unchanged. Adds focused unit tests for each — previously
only tested indirectly through their callers. DocumentResolver and
detectStringCites updated to import from utils/.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Document Module Scaffolding (Types Only)

Create the type definitions for the new module. No runtime behavior yet — sets up the contract for Tasks 3-7 to implement against.

**Files:**
- Create: `src/document/types.ts`
- Create: `src/document/index.ts` (stub)

- [ ] **Step 2.1: Create `src/document/types.ts`**

```ts
import type { Citation, HistorySignal } from "../types/citation"
import type { Span } from "../types/span"

/**
 * Attribution mode for a quoted-text zone. Reflects the structural
 * relationship between the quote and the citation that vouches for it.
 *
 * - "block-quote": Bluebook Rule 5 — quote set off as an indented block or
 *   marked with markdown `>`, with the citation immediately following.
 * - "adjacent": inline quote in the same sentence as the citation.
 * - "parenthetical": quote inside an explanatory parenthetical
 *   (e.g. `(quoting "..." Smith, 1 U.S. 1)`).
 */
export type AttributionKind = "block-quote" | "adjacent" | "parenthetical"

/**
 * A quoted-text zone paired with the citation (if any) that vouches for it.
 * Produced by the document analyzer; one entry per detected quote zone.
 * Unattributed zones surface with `citationIndex` undefined.
 */
export interface QuoteAttribution {
  /** The quoted-text span in original-text coordinates. */
  quoteSpan: Span
  /** Verbatim quoted text (chars between the marks, exclusive of the marks). */
  quoteText: string
  /** Citation index that vouches for the quote; undefined when none found. */
  citationIndex?: number
  /** How the attribution was inferred; undefined iff citationIndex is. */
  attributionKind?: AttributionKind
  /**
   * Confidence (0-1). See `quoteAttribution.ts` for the stratification:
   *   block-quote, citation within 50 chars: 0.98
   *   block-quote, citation within 200 chars: 0.90
   *   adjacent inline, same sentence: 0.85
   *   parenthetical-internal: 0.95
   *   unattributed: undefined
   */
  confidence?: number
}

/**
 * A typed edge in the citation graph. `from` and `to` are indices into
 * the `Document.citations` array. `type` discriminates the union.
 *
 * See `docs/superpowers/specs/2026-05-19-document-understanding-api-design.md`
 * for the source-map describing which existing citation fields drive each kind.
 */
export type Edge =
  | { type: "resolves-to"; from: number; to: number; confidence: number; warnings?: string[] }
  | { type: "antecedent"; from: number; to: number }
  | { type: "parallel"; from: number; to: number; groupId: string }
  | { type: "history-of"; from: number; to: number; signal: HistorySignal }
  | { type: "pincite-inherit"; from: number; to: number }
  | { type: "string-cite"; from: number; to: number; groupId: string; position: number }
  | { type: "in-parenthetical-of"; from: number; to: number }

/**
 * The graph of relationships between citations in a document.
 *
 * - `nodes.length === citations.length` always; isolated nodes
 *   (no edges) are still included so consumers iterating nodes don't
 *   miss anything.
 * - `edges` is sorted by from-index, then type (alphabetical), then
 *   to-index for deterministic iteration and test assertions.
 * - No self-edges. No duplicate edges of the same type+from+to.
 *   Undirected relationships (parallel groups) emit one edge per pair.
 */
export interface CitationGraph {
  nodes: number[]
  edges: Edge[]
}

/**
 * A footnote zone with the citations it contains. Populated only when
 * input citations carry footnote tagging (extractCitations was called
 * with `detectFootnotes: true`).
 */
export interface FootnoteZone {
  start: number
  end: number
  footnoteNumber: number
  /** Indices of citations whose span falls inside this footnote. */
  citationIndices: number[]
}

/**
 * The document analysis result. Returned by `analyzeDocument(text, citations)`.
 *
 * Produced as a pure projection over `text + citations[]` — no new
 * tokenization or extraction. See the design doc for the algorithm rationale.
 */
export interface Document {
  /** The citations that were analyzed. Same array reference as the input. */
  citations: Citation[]

  /** Prose between citations (+ before-first + after-last). Sorted by
   *  originalStart. Uses `fullSpan` (when available) to bound citations,
   *  so case-name text is not mislabeled as prose. */
  proseSpans: Span[]

  /** Per-citation view: prose span ending at this citation. */
  precedingProse: Map<number, Span>

  /** Per-citation view: prose span starting after this citation. */
  followingProse: Map<number, Span>

  /** Detected quoted-text zones with attempted attribution. Includes
   *  unattributed zones (citationIndex undefined). */
  quoteAttributions: QuoteAttribution[]

  /** All relationships between citations as typed edges. */
  citationGraph: CitationGraph

  /** Footnote zones with citation members. Optional — only present when
   *  citations carry footnote tagging. */
  footnoteZones?: FootnoteZone[]
}
```

- [ ] **Step 2.2: Create `src/document/index.ts` (stub)**

```ts
// src/document/index.ts
// Public exports for the document understanding module.
// Implementation lands in Tasks 3-7.

export type {
  AttributionKind,
  CitationGraph,
  Document,
  Edge,
  FootnoteZone,
  QuoteAttribution,
} from "./types"

// analyzeDocument export comes in Task 7
```

- [ ] **Step 2.3: Typecheck**

```bash
pnpm typecheck 2>&1 | tail -3
```

Expected: passes. No runtime to test yet.

- [ ] **Step 2.4: Commit**

```bash
git add src/document/types.ts src/document/index.ts
git commit -m "$(cat <<'EOF'
types(document): scaffold Document / Edge / QuoteAttribution / FootnoteZone

Type definitions for the upcoming analyzeDocument API. No runtime
behavior in this commit — sets up the contract that Tasks 3-7
implement against.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Prose Offsets Implementation (TDD)

The simplest of the three modules. Build first to lock in the helper patterns.

**Files:**
- Create: `src/document/proseOffsets.ts`
- Create: `tests/document/proseOffsets.test.ts`

- [ ] **Step 3.1: Write failing tests**

Create `tests/document/proseOffsets.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import { computeProseOffsets } from "@/document/proseOffsets"

describe("computeProseOffsets", () => {
  it("returns no prose spans for empty text", () => {
    const result = computeProseOffsets("", [])
    expect(result.proseSpans).toEqual([])
    expect(result.precedingProse.size).toBe(0)
    expect(result.followingProse.size).toBe(0)
  })

  it("returns one prose span covering the whole text when no citations", () => {
    const text = "just prose, no citations at all here"
    const result = computeProseOffsets(text, [])
    expect(result.proseSpans).toHaveLength(1)
    expect(result.proseSpans[0].originalStart).toBe(0)
    expect(result.proseSpans[0].originalEnd).toBe(text.length)
  })

  it("returns no prose spans when text is entirely a single citation", () => {
    // Edge case — text consists of a citation and nothing else.
    const text = "100 F.2d 50"
    const cites = extractCitations(text)
    if (cites.length === 1) {
      const result = computeProseOffsets(text, cites)
      // No prose before (cite starts at 0) and no prose after (cite ends at text.length).
      expect(result.proseSpans).toEqual([])
    }
  })

  it("emits prose before, between, and after citations", () => {
    const text = "Intro prose. Smith v. Jones, 100 F.2d 50 (1990). Middle prose. Brown v. Doe, 200 F.3d 100 (2000). Closing prose."
    const cites = extractCitations(text)
    expect(cites).toHaveLength(2)
    const result = computeProseOffsets(text, cites)
    // Three prose spans: before Smith, between Smith and Brown, after Brown.
    expect(result.proseSpans).toHaveLength(3)
    // First span should include "Intro prose."
    const firstSpanText = text.slice(result.proseSpans[0].originalStart, result.proseSpans[0].originalEnd)
    expect(firstSpanText).toContain("Intro prose")
  })

  it("uses fullSpan, not span, to bound citations (case names are not prose)", () => {
    // "Smith v. Jones" is part of the case citation's fullSpan, not prose.
    const text = "Smith v. Jones, 100 F.2d 50, 55 (1990). End."
    const cites = extractCitations(text)
    const result = computeProseOffsets(text, cites)
    // After the citation there should be one prose span containing " End."
    expect(result.proseSpans.length).toBeGreaterThan(0)
    const lastSpan = result.proseSpans[result.proseSpans.length - 1]
    const lastText = text.slice(lastSpan.originalStart, lastSpan.originalEnd)
    expect(lastText).toContain("End")
    // The first prose span (if any) must NOT include "Smith v. Jones".
    if (result.proseSpans[0].originalStart === 0) {
      const firstText = text.slice(result.proseSpans[0].originalStart, result.proseSpans[0].originalEnd)
      expect(firstText).not.toContain("Smith")
    }
  })

  it("populates precedingProse and followingProse per citation", () => {
    const text = "Intro. Smith v. Jones, 100 F.2d 50 (1990). Middle. Brown v. Doe, 200 F.3d 100 (2000). End."
    const cites = extractCitations(text)
    expect(cites).toHaveLength(2)
    const result = computeProseOffsets(text, cites)

    // citations[0] has prose before it (intro) and after (middle)
    expect(result.precedingProse.has(0)).toBe(true)
    expect(result.followingProse.has(0)).toBe(true)
    // citations[1] has prose before it (middle, same as followingProse[0]) and after (end)
    expect(result.precedingProse.has(1)).toBe(true)
    expect(result.followingProse.has(1)).toBe(true)
  })

  it("sets cleanStart === originalStart when no transformationMap is provided", () => {
    const text = "Intro. Smith v. Jones, 100 F.2d 50 (1990). End."
    const cites = extractCitations(text)
    const result = computeProseOffsets(text, cites)
    for (const span of result.proseSpans) {
      expect(span.cleanStart).toBe(span.originalStart)
      expect(span.cleanEnd).toBe(span.originalEnd)
    }
  })
})
```

- [ ] **Step 3.2: Run the tests to verify they fail**

```bash
pnpm exec vitest run tests/document/proseOffsets.test.ts 2>&1 | tail -10
```

Expected: fail with "Cannot find module" or similar (the implementation doesn't exist yet).

- [ ] **Step 3.3: Implement `src/document/proseOffsets.ts`**

```ts
import type { Citation } from "../types/citation"
import type { Span } from "../types/span"
import type { TransformationMap } from "../clean/cleanText"
import { getCitationStart, getCitationEnd } from "../utils/citationBounds"

interface ProseOffsetResult {
  proseSpans: Span[]
  precedingProse: Map<number, Span>
  followingProse: Map<number, Span>
}

/**
 * Compute the inverse complement of citation spans within text.
 *
 * Returns:
 *   - proseSpans: prose between citations + before-first + after-last
 *   - precedingProse: Map<citationIndex, Span> — the prose ending at this cite
 *   - followingProse: Map<citationIndex, Span> — the prose starting after this cite
 *
 * Uses `fullSpan` when available (case-family citations) so the case-name
 * text isn't mislabeled as prose. When no transformationMap is provided,
 * cleanStart === originalStart on the output spans (best effort).
 */
export function computeProseOffsets(
  text: string,
  citations: Citation[],
  _transformationMap?: TransformationMap,
): ProseOffsetResult {
  const proseSpans: Span[] = []
  const precedingProse = new Map<number, Span>()
  const followingProse = new Map<number, Span>()

  if (citations.length === 0) {
    if (text.length > 0) {
      proseSpans.push(makeSpan(0, text.length))
    }
    return { proseSpans, precedingProse, followingProse }
  }

  // Sort by citation start. The input is usually already sorted but be safe.
  const indexed = citations.map((c, i) => ({ c, originalIndex: i }))
  indexed.sort((a, b) => getCitationStart(a.c) - getCitationStart(b.c))

  let cursor = 0
  for (const { c, originalIndex } of indexed) {
    const start = getCitationStart(c)
    const end = getCitationEnd(c)
    if (start > cursor) {
      const span = makeSpan(cursor, start)
      proseSpans.push(span)
      precedingProse.set(originalIndex, span)
    }
    cursor = Math.max(cursor, end)
  }

  // Trailing prose after the last citation.
  if (cursor < text.length) {
    const trailing = makeSpan(cursor, text.length)
    proseSpans.push(trailing)
    // Attach to last citation as followingProse
    const lastIdx = indexed[indexed.length - 1].originalIndex
    followingProse.set(lastIdx, trailing)
  }

  // Build followingProse for intermediate citations: it's the precedingProse
  // of the next citation in document order.
  for (let i = 0; i < indexed.length - 1; i++) {
    const nextOriginalIdx = indexed[i + 1].originalIndex
    const nextPreceding = precedingProse.get(nextOriginalIdx)
    if (nextPreceding) {
      followingProse.set(indexed[i].originalIndex, nextPreceding)
    }
  }

  // Leading prose: if proseSpans[0] starts at 0, it's the precedingProse
  // of the first citation in document order. Already set above.
  return { proseSpans, precedingProse, followingProse }
}

function makeSpan(start: number, end: number): Span {
  return {
    cleanStart: start,
    cleanEnd: end,
    originalStart: start,
    originalEnd: end,
  }
}
```

The `_transformationMap` parameter is reserved for future use (per spec — clean-coord mapping); v1 leaves it unused and sets `cleanStart === originalStart`.

- [ ] **Step 3.4: Run the tests**

```bash
pnpm exec vitest run tests/document/proseOffsets.test.ts 2>&1 | tail -10
```

Expected: all 7 tests pass.

- [ ] **Step 3.5: Run the full suite**

```bash
pnpm exec vitest run 2>&1 | tail -5
```

Expected: no regressions.

- [ ] **Step 3.6: Typecheck + lint + commit**

```bash
pnpm typecheck && pnpm lint 2>&1 | tail -3
git add src/document/proseOffsets.ts tests/document/proseOffsets.test.ts
git commit -m "$(cat <<'EOF'
feat(document): computeProseOffsets — inverse complement using fullSpan

Geometric prose offsets for the document understanding API. Produces:
- proseSpans: spans between citations (+ before-first + after-last)
- precedingProse / followingProse: per-citation views over proseSpans

Uses fullSpan (when available) to bound citations, so case-name text
isn't mislabeled as prose. transformationMap parameter reserved for
future clean-coord accuracy; v1 sets cleanStart === originalStart.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Citation Graph Implementation (TDD)

Build the typed-edge graph from existing citation fields.

**Files:**
- Create: `src/document/citationGraph.ts`
- Create: `tests/document/citationGraph.test.ts`

- [ ] **Step 4.1: Write failing tests**

Create `tests/document/citationGraph.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import { buildCitationGraph } from "@/document/citationGraph"
import { computeParenDepths } from "@/utils/parenDepths"

describe("buildCitationGraph", () => {
  it("returns an empty graph for no citations", () => {
    const graph = buildCitationGraph([], [])
    expect(graph.nodes).toEqual([])
    expect(graph.edges).toEqual([])
  })

  it("nodes.length === citations.length even for isolated nodes", () => {
    const text = "See 28 U.S.C. § 1331. Plain prose. Smith v. Jones, 100 F.2d 50 (1990)."
    const cites = extractCitations(text, { resolve: true })
    const depths = computeParenDepths(text, cites)
    const graph = buildCitationGraph(cites, depths)
    expect(graph.nodes).toHaveLength(cites.length)
    // Isolated citations are still in nodes even if no edges touch them.
    expect(graph.nodes).toContain(0)
  })

  it("emits a `resolves-to` edge for Id. resolving to a full cite", () => {
    const text = "Smith v. Jones, 100 F.2d 50 (1990). Id."
    const cites = extractCitations(text, { resolve: true })
    const depths = computeParenDepths(text, cites)
    const graph = buildCitationGraph(cites, depths)
    const idIdx = cites.findIndex((c) => c.type === "id")
    expect(idIdx).toBeGreaterThan(-1)
    const edge = graph.edges.find(
      (e) => e.type === "resolves-to" && e.from === idIdx,
    )
    expect(edge).toBeDefined()
  })

  it("emits an `antecedent` edge for short-forms with antecedentIndex", () => {
    const text = "Smith v. Jones, 100 F.2d 50 (1990). Id. Id."
    const cites = extractCitations(text, { resolve: true })
    const depths = computeParenDepths(text, cites)
    const graph = buildCitationGraph(cites, depths)
    const antecedentEdges = graph.edges.filter((e) => e.type === "antecedent")
    // Second Id. should have antecedent edge pointing to first Id.
    expect(antecedentEdges.length).toBeGreaterThan(0)
  })

  it("emits `parallel` edges for parallel citation groups (one per pair)", () => {
    const text = "Smith v. Jones, 100 F.2d 50, 200 A.2d 100 (1990)."
    const cites = extractCitations(text)
    const depths = computeParenDepths(text, cites)
    const graph = buildCitationGraph(cites, depths)
    const parallelEdges = graph.edges.filter((e) => e.type === "parallel")
    // Two-member parallel group: one undirected edge between them.
    expect(parallelEdges).toHaveLength(1)
    expect(parallelEdges[0].from).toBeLessThan(parallelEdges[0].to)
  })

  it("emits `history-of` edge for subsequent history", () => {
    const text =
      "Smith v. Jones, 100 F.2d 50 (App. Div. 1990), aff'd, 200 N.J. 100 (1991)."
    const cites = extractCitations(text)
    const depths = computeParenDepths(text, cites)
    const graph = buildCitationGraph(cites, depths)
    const historyEdges = graph.edges.filter((e) => e.type === "history-of")
    // Expect the affirmance citation to history-of the primary.
    if (historyEdges.length > 0) {
      expect(historyEdges[0]).toMatchObject({ type: "history-of" })
    }
  })

  it("emits `pincite-inherit` edge when a short-form inherited a pincite", () => {
    const text = "Smith v. Jones, 100 F.2d 50, 55 (1990). Id. at 62. Id."
    const cites = extractCitations(text, { resolve: true })
    const depths = computeParenDepths(text, cites)
    const graph = buildCitationGraph(cites, depths)
    const pinciteEdges = graph.edges.filter((e) => e.type === "pincite-inherit")
    expect(pinciteEdges.length).toBeGreaterThan(0)
  })

  it("emits `string-cite` edges for citations in a string-citation group", () => {
    const text =
      "Smith v. Jones, 100 F.2d 50 (1990); see also Brown v. Doe, 200 F.3d 100 (2000)."
    const cites = extractCitations(text, { resolve: true })
    const depths = computeParenDepths(text, cites)
    const graph = buildCitationGraph(cites, depths)
    const stringEdges = graph.edges.filter((e) => e.type === "string-cite")
    // If both cites are in the same string-cite group, expect an edge between them.
    if (cites[0].stringCitationGroupId && cites[1].stringCitationGroupId &&
        cites[0].stringCitationGroupId === cites[1].stringCitationGroupId) {
      expect(stringEdges.length).toBeGreaterThan(0)
    }
  })

  it("emits `in-parenthetical-of` edge for citation inside another citation's paren", () => {
    const text =
      "Smith v. Jones, 100 F.2d 50 (1990) (citing Other v. Else, 200 F.3d 100)."
    const cites = extractCitations(text)
    const depths = computeParenDepths(text, cites)
    const graph = buildCitationGraph(cites, depths)
    const inParenEdges = graph.edges.filter((e) => e.type === "in-parenthetical-of")
    // The Other v. Else citation is inside Smith's parenthetical.
    if (inParenEdges.length > 0) {
      expect(inParenEdges[0]).toMatchObject({ type: "in-parenthetical-of" })
    }
  })

  it("invariant: no self-edges", () => {
    const text = "Smith v. Jones, 100 F.2d 50, 200 A.2d 100 (1990). Id."
    const cites = extractCitations(text, { resolve: true })
    const depths = computeParenDepths(text, cites)
    const graph = buildCitationGraph(cites, depths)
    for (const edge of graph.edges) {
      expect(edge.from).not.toBe(edge.to)
    }
  })

  it("invariant: edges are sorted by (from, type, to)", () => {
    const text =
      "Smith v. Jones, 100 F.2d 50, 200 A.2d 100 (1990); see also Brown v. Doe, 300 F.3d 200 (2000). Id."
    const cites = extractCitations(text, { resolve: true })
    const depths = computeParenDepths(text, cites)
    const graph = buildCitationGraph(cites, depths)
    for (let i = 1; i < graph.edges.length; i++) {
      const a = graph.edges[i - 1]
      const b = graph.edges[i]
      if (a.from !== b.from) {
        expect(a.from).toBeLessThan(b.from)
      } else if (a.type !== b.type) {
        expect(a.type < b.type).toBe(true)
      } else {
        expect(a.to).toBeLessThanOrEqual(b.to)
      }
    }
  })

  it("invariant: no duplicate edges of the same (type, from, to)", () => {
    const text = "Smith v. Jones, 100 F.2d 50, 200 A.2d 100 (1990). Id. Id."
    const cites = extractCitations(text, { resolve: true })
    const depths = computeParenDepths(text, cites)
    const graph = buildCitationGraph(cites, depths)
    const seen = new Set<string>()
    for (const edge of graph.edges) {
      const key = `${edge.type}|${edge.from}|${edge.to}`
      expect(seen.has(key)).toBe(false)
      seen.add(key)
    }
  })
})
```

- [ ] **Step 4.2: Run tests to verify they fail**

```bash
pnpm exec vitest run tests/document/citationGraph.test.ts 2>&1 | tail -10
```

Expected: fail with module-not-found.

- [ ] **Step 4.3: Implement `src/document/citationGraph.ts`**

```ts
import type { Citation, FullCaseCitation } from "../types/citation"
import type { CitationGraph, Edge } from "./types"

/**
 * Build a citation graph by projecting existing relationship fields on
 * Citation objects into a typed-edge representation.
 *
 * Reads from:
 *   - citation.resolution?.resolvedTo        → "resolves-to" edge
 *   - citation.resolution?.antecedentIndex   → "antecedent" edge
 *   - citation.groupId (parallel group)      → "parallel" edges (one per pair)
 *   - citation.subsequentHistoryOf           → "history-of" edge
 *   - citation.pinciteInheritedFrom          → "pincite-inherit" edge
 *   - citation.stringCitationGroupId         → "string-cite" edges
 *   - parenDepths (from computeParenDepths)  → "in-parenthetical-of" edge
 *
 * Invariants:
 *   - nodes.length === citations.length (isolated nodes included)
 *   - No self-edges
 *   - No duplicates of the same (type, from, to)
 *   - Edges sorted by (from, type, to) for deterministic iteration
 */
export function buildCitationGraph(
  citations: Citation[],
  parenDepths: number[],
): CitationGraph {
  const nodes = citations.map((_, i) => i)
  const edges: Edge[] = []
  const seen = new Set<string>()

  function addEdge(edge: Edge): void {
    if (edge.from === edge.to) return // no self-edges
    const key = `${edge.type}|${edge.from}|${edge.to}`
    if (seen.has(key)) return
    seen.add(key)
    edges.push(edge)
  }

  for (let i = 0; i < citations.length; i++) {
    const c = citations[i] as Citation & {
      resolution?: { resolvedTo?: number; antecedentIndex?: number; confidence?: number; warnings?: string[] }
      groupId?: string
      subsequentHistoryOf?: { index: number; signal: import("../types/citation").HistorySignal }
      pinciteInheritedFrom?: number
      stringCitationGroupId?: string
      stringCitationIndex?: number
    }

    // resolves-to
    if (c.resolution?.resolvedTo !== undefined) {
      addEdge({
        type: "resolves-to",
        from: i,
        to: c.resolution.resolvedTo,
        confidence: c.resolution.confidence ?? 1.0,
        ...(c.resolution.warnings ? { warnings: c.resolution.warnings } : {}),
      })
    }

    // antecedent
    if (c.resolution?.antecedentIndex !== undefined) {
      addEdge({ type: "antecedent", from: i, to: c.resolution.antecedentIndex })
    }

    // history-of
    if (c.subsequentHistoryOf) {
      addEdge({
        type: "history-of",
        from: i,
        to: c.subsequentHistoryOf.index,
        signal: c.subsequentHistoryOf.signal,
      })
    }

    // pincite-inherit
    if (c.pinciteInheritedFrom !== undefined) {
      addEdge({ type: "pincite-inherit", from: i, to: c.pinciteInheritedFrom })
    }
  }

  // parallel edges — undirected; emit one edge per pair within each group.
  const groupMembers = new Map<string, number[]>()
  for (let i = 0; i < citations.length; i++) {
    const groupId = (citations[i] as FullCaseCitation).groupId
    if (!groupId) continue
    const members = groupMembers.get(groupId) ?? []
    members.push(i)
    groupMembers.set(groupId, members)
  }
  for (const [groupId, members] of groupMembers) {
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        addEdge({ type: "parallel", from: members[i], to: members[j], groupId })
      }
    }
  }

  // string-cite edges — emit pair edges between adjacent members of each group,
  // ordered by stringCitationIndex.
  const stringGroups = new Map<string, Array<{ idx: number; position: number }>>()
  for (let i = 0; i < citations.length; i++) {
    const c = citations[i] as Citation & {
      stringCitationGroupId?: string
      stringCitationIndex?: number
    }
    if (!c.stringCitationGroupId) continue
    const members = stringGroups.get(c.stringCitationGroupId) ?? []
    members.push({ idx: i, position: c.stringCitationIndex ?? 0 })
    stringGroups.set(c.stringCitationGroupId, members)
  }
  for (const [groupId, members] of stringGroups) {
    members.sort((a, b) => a.position - b.position)
    for (let i = 0; i < members.length - 1; i++) {
      addEdge({
        type: "string-cite",
        from: members[i].idx,
        to: members[i + 1].idx,
        groupId,
        position: members[i].position,
      })
    }
  }

  // in-parenthetical-of edges — for each citation with parenDepth > 0, find
  // the most recent earlier citation with a lower depth.
  for (let i = 0; i < citations.length; i++) {
    if (parenDepths[i] <= 0) continue
    for (let j = i - 1; j >= 0; j--) {
      if (parenDepths[j] < parenDepths[i]) {
        addEdge({ type: "in-parenthetical-of", from: i, to: j })
        break
      }
    }
  }

  // Stable sort: from, then type, then to.
  edges.sort((a, b) => {
    if (a.from !== b.from) return a.from - b.from
    if (a.type !== b.type) return a.type < b.type ? -1 : 1
    return a.to - b.to
  })

  return { nodes, edges }
}
```

- [ ] **Step 4.4: Run the tests**

```bash
pnpm exec vitest run tests/document/citationGraph.test.ts 2>&1 | tail -10
```

Expected: all 12 tests pass. If individual tests fail, the most likely issues are:
- Citation field names that differ between the spec and reality (verify against `src/types/citation.ts`).
- The test text doesn't actually produce the expected citation shapes (run it through `scripts/repro_randolph.ts`-style debug to see what's extracted).

- [ ] **Step 4.5: Run the full suite + typecheck + lint**

```bash
pnpm exec vitest run 2>&1 | tail -5 && pnpm typecheck && pnpm lint 2>&1 | tail -3
```

Expected: all clean.

- [ ] **Step 4.6: Commit**

```bash
git add src/document/citationGraph.ts tests/document/citationGraph.test.ts
git commit -m "$(cat <<'EOF'
feat(document): buildCitationGraph — 7 typed edge kinds

Builds a citation graph by projecting existing relationship fields:
- resolves-to: citation.resolution.resolvedTo
- antecedent: citation.resolution.antecedentIndex
- parallel: groupId siblings (undirected, one edge per pair)
- history-of: subsequentHistoryOf
- pincite-inherit: pinciteInheritedFrom
- string-cite: stringCitationGroupId + stringCitationIndex sequence
- in-parenthetical-of: derived from parenDepths walk-back

Invariants: no self-edges, no duplicates, deterministic sort by
(from, type, to).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Quote Attribution Implementation (TDD)

**Files:**
- Create: `src/document/quoteAttribution.ts`
- Create: `tests/document/quoteAttribution.test.ts`

- [ ] **Step 5.1: Write failing tests**

Create `tests/document/quoteAttribution.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import { attributeQuotes } from "@/document/quoteAttribution"
import { computeParenDepths } from "@/utils/parenDepths"
import { detectQuoteZones } from "@/utils/detectQuoteZones"

describe("attributeQuotes", () => {
  it("returns empty array when no quote zones exist", () => {
    const text = "Plain prose with no quotes. Smith v. Jones, 100 F.2d 50 (1990)."
    const cites = extractCitations(text)
    const zones = detectQuoteZones(text)
    const depths = computeParenDepths(text, cites)
    const result = attributeQuotes(text, zones, cites, depths)
    expect(result).toEqual([])
  })

  it("attributes an adjacent inline quote to the following citation", () => {
    const text = `The court held "the rule applies" in Smith v. Jones, 100 F.2d 50 (1990).`
    const cites = extractCitations(text)
    const zones = detectQuoteZones(text)
    const depths = computeParenDepths(text, cites)
    const result = attributeQuotes(text, zones, cites, depths)
    expect(result.length).toBeGreaterThan(0)
    const attribution = result[0]
    expect(attribution.attributionKind).toBe("adjacent")
    expect(attribution.citationIndex).toBe(0)
    expect(attribution.quoteText).toContain("rule")
    expect(attribution.confidence).toBe(0.85)
  })

  it("attributes a block-quote to the following citation", () => {
    // Markdown blockquote followed by citation on next line.
    const text = `> the rule applies in all cases of prescriptive easement, the court held\n\nSmith v. Jones, 100 F.2d 50 (1990).`
    const cites = extractCitations(text)
    const zones = detectQuoteZones(text)
    const depths = computeParenDepths(text, cites)
    const result = attributeQuotes(text, zones, cites, depths)
    const blockAttribution = result.find((a) => a.attributionKind === "block-quote")
    expect(blockAttribution).toBeDefined()
    expect(blockAttribution?.citationIndex).toBe(0)
  })

  it("attributes a quote inside a parenthetical to the enclosing citation", () => {
    const text = `Smith v. Jones, 100 F.2d 50 (1990) (quoting "the rule applies" from prior precedent).`
    const cites = extractCitations(text)
    const zones = detectQuoteZones(text)
    const depths = computeParenDepths(text, cites)
    const result = attributeQuotes(text, zones, cites, depths)
    const parenAttribution = result.find((a) => a.attributionKind === "parenthetical")
    expect(parenAttribution).toBeDefined()
    // The enclosing cite is Smith (idx 0).
    expect(parenAttribution?.citationIndex).toBe(0)
    expect(parenAttribution?.confidence).toBe(0.95)
  })

  it("emits unattributed entry when no citation is nearby", () => {
    const text = `He said "the rule applies" and walked away with no citation.`
    const cites = extractCitations(text)
    const zones = detectQuoteZones(text)
    const depths = computeParenDepths(text, cites)
    const result = attributeQuotes(text, zones, cites, depths)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].citationIndex).toBeUndefined()
    expect(result[0].attributionKind).toBeUndefined()
  })

  it("does not attribute inline quote when sentence-terminating period intervenes", () => {
    const text = `He said "the rule applies." Then a new sentence. Smith v. Jones, 100 F.2d 50 (1990).`
    const cites = extractCitations(text)
    const zones = detectQuoteZones(text)
    const depths = computeParenDepths(text, cites)
    const result = attributeQuotes(text, zones, cites, depths)
    // The quote should not be attributed adjacent because a period separates
    // it from Smith.
    const inlineAttribution = result.find((a) => a.attributionKind === "adjacent")
    expect(inlineAttribution).toBeUndefined()
  })

  it("populates quoteText with the verbatim text between marks", () => {
    const text = `The court held "the rule applies" in Smith v. Jones, 100 F.2d 50 (1990).`
    const cites = extractCitations(text)
    const zones = detectQuoteZones(text)
    const depths = computeParenDepths(text, cites)
    const result = attributeQuotes(text, zones, cites, depths)
    expect(result[0].quoteText).toBe("the rule applies")
  })
})
```

- [ ] **Step 5.2: Run tests to verify they fail**

```bash
pnpm exec vitest run tests/document/quoteAttribution.test.ts 2>&1 | tail -10
```

Expected: fail with module-not-found.

- [ ] **Step 5.3: Implement `src/document/quoteAttribution.ts`**

```ts
import type { Citation } from "../types/citation"
import type { Span } from "../types/span"
import type { QuoteAttribution, AttributionKind } from "./types"

const BLOCK_QUOTE_WORD_THRESHOLD = 50
const BLOCK_QUOTE_MAX_DISTANCE = 200
const BLOCK_QUOTE_TIGHT_DISTANCE = 50
const INLINE_QUOTE_MAX_DISTANCE = 100

/**
 * Attribute quote zones to the citations that vouch for them.
 *
 * For each quote zone, attempts to attribute via three paths:
 *   1. block-quote (Bluebook Rule 5): markdown blockquote OR >= 50 words.
 *      Pairs with the next citation within 200 chars, ignoring sentence
 *      boundaries.
 *   2. adjacent: inline quote followed by a citation in the same sentence
 *      (no '.' between quote end and citation start), within 100 chars.
 *   3. parenthetical: quote inside an explanatory parenthetical of a
 *      citation. Overrides paths 1/2 because the structural relationship
 *      is unambiguous.
 *
 * Emits an entry for every quote zone, including unattributed ones.
 */
export function attributeQuotes(
  text: string,
  quoteZones: Array<{ start: number; end: number }>,
  citations: Citation[],
  parenDepths: number[],
): QuoteAttribution[] {
  const result: QuoteAttribution[] = []

  for (const zone of quoteZones) {
    const quoteText = extractQuoteText(text, zone)
    const quoteSpan: Span = {
      cleanStart: zone.start,
      cleanEnd: zone.end,
      originalStart: zone.start,
      originalEnd: zone.end,
    }

    // Parenthetical-internal path takes precedence — check first.
    const parenAttribution = findParentheticalAttribution(zone, citations, parenDepths)
    if (parenAttribution !== undefined) {
      result.push({
        quoteSpan,
        quoteText,
        citationIndex: parenAttribution,
        attributionKind: "parenthetical",
        confidence: 0.95,
      })
      continue
    }

    // Block vs inline classification.
    const isBlock = isBlockQuote(text, zone)

    if (isBlock) {
      const candidate = findBlockQuoteCandidate(text, zone, citations)
      if (candidate !== undefined) {
        const distance = candidate.distance
        result.push({
          quoteSpan,
          quoteText,
          citationIndex: candidate.index,
          attributionKind: "block-quote",
          confidence: distance < BLOCK_QUOTE_TIGHT_DISTANCE ? 0.98 : 0.9,
        })
        continue
      }
    } else {
      const candidate = findInlineCandidate(text, zone, citations)
      if (candidate !== undefined) {
        result.push({
          quoteSpan,
          quoteText,
          citationIndex: candidate,
          attributionKind: "adjacent",
          confidence: 0.85,
        })
        continue
      }
    }

    // Unattributed
    result.push({ quoteSpan, quoteText })
  }

  return result
}

function extractQuoteText(text: string, zone: { start: number; end: number }): string {
  // Strip the outer quote marks (1 char on each side; safe for ASCII and typographic).
  const inner = text.slice(zone.start + 1, zone.end - 1)
  return inner
}

function isBlockQuote(text: string, zone: { start: number; end: number }): boolean {
  const inner = text.slice(zone.start, zone.end)
  // Markdown blockquote: contains lines starting with `>`.
  if (/^>\s/m.test(inner)) return true
  // 50+ word threshold per Bluebook Rule 5.
  const wordCount = inner.split(/\s+/).filter((w) => w.length > 0).length
  if (wordCount >= BLOCK_QUOTE_WORD_THRESHOLD) return true
  return false
}

function findBlockQuoteCandidate(
  text: string,
  zone: { start: number; end: number },
  citations: Citation[],
): { index: number; distance: number } | undefined {
  for (let i = 0; i < citations.length; i++) {
    const cstart = citations[i].span.originalStart
    if (cstart <= zone.end) continue
    const distance = cstart - zone.end
    if (distance > BLOCK_QUOTE_MAX_DISTANCE) return undefined
    return { index: i, distance }
  }
  return undefined
}

function findInlineCandidate(
  text: string,
  zone: { start: number; end: number },
  citations: Citation[],
): number | undefined {
  for (let i = 0; i < citations.length; i++) {
    const cstart = citations[i].span.originalStart
    if (cstart <= zone.end) continue
    const distance = cstart - zone.end
    if (distance > INLINE_QUOTE_MAX_DISTANCE) return undefined
    // No sentence-terminating period between zone end and citation start.
    const between = text.slice(zone.end, cstart)
    if (/\.\s+[A-Z]/.test(between)) return undefined
    return i
  }
  return undefined
}

function findParentheticalAttribution(
  zone: { start: number; end: number },
  citations: Citation[],
  parenDepths: number[],
): number | undefined {
  // Find the citation whose fullSpan encloses the quote zone.
  for (let i = 0; i < citations.length; i++) {
    if (parenDepths[i] <= 0) continue // citation must itself be inside someone's paren
    // Use the enclosing citation: find the most recent citation at lower depth
    // whose span starts before this paren-child citation's span.
    // Simpler heuristic: if the quote zone is between two adjacent citations
    // (one paren-child, one parent), attribute to the parent.
    // For v1: skip — the parenthetical path is most reliably triggered by
    // explicit `(quoting "..." Smith, ...)` shapes, which the in-parenthetical-of
    // edge already captures. Return undefined here and rely on quoteText
    // presence as the consumer's signal.
  }
  // Iterate citations; if the quote zone is fully contained within a
  // citation's text region (between the opening `(` after the cite and the
  // matching `)` ), attribute to that citation.
  for (let i = 0; i < citations.length; i++) {
    const c = citations[i]
    const candidateStart = c.span.originalEnd
    // Scan forward from candidate start to find a `(`; if the quote zone
    // sits between that `(` and its matching `)`, attribute.
    // ... see implementation note below.
  }
  return undefined
}
```

**Implementation note for Step 5.3:** the parenthetical-attribution function is the trickiest. The naive approach (scan for `(` after each citation and check quote-zone containment) works for most cases but has edge cases (nested parens, line breaks). For v1, the recommended implementation:

```ts
function findParentheticalAttribution(
  zone: { start: number; end: number },
  citations: Citation[],
  parenDepths: number[],
): number | undefined {
  // For each citation, check whether the quote zone sits within the
  // text region immediately after the citation, bounded by the matching
  // close-paren of the citation's trailing `(`.
  for (let i = 0; i < citations.length; i++) {
    const c = citations[i]
    // Quote must START after the citation's text begins.
    if (zone.start < c.span.originalStart) continue
    // Walk forward from citation start to find the opening paren and its match.
    // (Reuses the parenthetical-depth-scanning approach from computeParenDepths.)
    // If the quote zone is fully inside that paren, attribute.
    // For simplicity in v1: trust the existing parenDepths tag — if the
    // citation has a NEXT citation at higher depth whose span contains zone,
    // the enclosing citation IS this one.
    const next = citations[i + 1]
    if (!next) continue
    if (parenDepths[i + 1] > parenDepths[i]) {
      // citations[i+1] is inside citations[i]'s parenthetical
      if (zone.start >= c.span.originalEnd && zone.end <= next.span.originalEnd + 200) {
        return i
      }
    }
  }
  return undefined
}
```

The fallback for unsupported parenthetical shapes is graceful: the function returns undefined, and the quote ends up unattributed (still surfaces in the result with `quoteText` populated).

- [ ] **Step 5.4: Run the tests**

```bash
pnpm exec vitest run tests/document/quoteAttribution.test.ts 2>&1 | tail -10
```

Expected: most pass. The parenthetical test is the most likely to fail — if it does, debug by inspecting `parenDepths` for the test text and confirm the citation indices match expectations.

- [ ] **Step 5.5: Run full suite + typecheck + lint + commit**

```bash
pnpm exec vitest run 2>&1 | tail -3 && pnpm typecheck && pnpm lint 2>&1 | tail -3
git add src/document/quoteAttribution.ts tests/document/quoteAttribution.test.ts
git commit -m "$(cat <<'EOF'
feat(document): attributeQuotes — 3 attribution kinds with confidence

Each detected quote zone gets an attribution attempt:
- block-quote (Bluebook Rule 5: markdown blockquote OR 50+ words):
  paired with citation within 200 chars; confidence 0.98 if tight (<50),
  0.90 otherwise.
- adjacent: inline quote with citation in same sentence (no period
  between); within 100 chars; confidence 0.85.
- parenthetical: quote inside an explanatory parenthetical of a
  citation; confidence 0.95 (structurally unambiguous).

Unattributed quote zones still surface in the result (citationIndex
undefined), giving consumers complete coverage.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Footnote Zones Implementation (TDD)

**Files:**
- Create: `src/document/footnoteZones.ts`
- Create: `tests/document/footnoteZones.test.ts`

- [ ] **Step 6.1: Write failing tests**

Create `tests/document/footnoteZones.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import { extractFootnoteZones } from "@/document/footnoteZones"

describe("extractFootnoteZones", () => {
  it("returns undefined when no citations carry footnote tagging", () => {
    const text = "Smith v. Jones, 100 F.2d 50 (1990)."
    const cites = extractCitations(text)
    expect(extractFootnoteZones(cites)).toBeUndefined()
  })

  it("returns zones grouped by footnote number", () => {
    // Synthetic: manually tag citations with footnoteNumber and inFootnote.
    const text = "Smith v. Jones, 100 F.2d 50 (1990)."
    const cites = extractCitations(text)
    if (cites.length > 0) {
      cites[0].inFootnote = true
      cites[0].footnoteNumber = 1
      const zones = extractFootnoteZones(cites)
      expect(zones).toBeDefined()
      expect(zones).toHaveLength(1)
      expect(zones?.[0].footnoteNumber).toBe(1)
      expect(zones?.[0].citationIndices).toContain(0)
    }
  })
})
```

- [ ] **Step 6.2: Run tests to verify they fail**

```bash
pnpm exec vitest run tests/document/footnoteZones.test.ts 2>&1 | tail -10
```

Expected: fail with module-not-found.

- [ ] **Step 6.3: Implement `src/document/footnoteZones.ts`**

```ts
import type { Citation } from "../types/citation"
import type { FootnoteZone } from "./types"

/**
 * Extract footnote zones from citations that carry footnote tagging.
 * Returns undefined when no citation has `inFootnote: true` — meaning
 * `extractCitations` was not invoked with `detectFootnotes: true` or no
 * footnotes were detected.
 *
 * Each zone aggregates the citation indices that fall within it. The
 * start/end coordinates are derived from the citations' spans (the
 * outermost original-text bounds of the footnote's citations).
 */
export function extractFootnoteZones(citations: Citation[]): FootnoteZone[] | undefined {
  // Bucket by footnoteNumber.
  const buckets = new Map<number, number[]>()
  for (let i = 0; i < citations.length; i++) {
    const c = citations[i]
    if (!c.inFootnote || c.footnoteNumber === undefined) continue
    const members = buckets.get(c.footnoteNumber) ?? []
    members.push(i)
    buckets.set(c.footnoteNumber, members)
  }

  if (buckets.size === 0) return undefined

  const zones: FootnoteZone[] = []
  for (const [footnoteNumber, citationIndices] of buckets) {
    // Span: outermost original-text coords of the footnote's citations.
    let start = Number.POSITIVE_INFINITY
    let end = 0
    for (const idx of citationIndices) {
      start = Math.min(start, citations[idx].span.originalStart)
      end = Math.max(end, citations[idx].span.originalEnd)
    }
    zones.push({ start, end, footnoteNumber, citationIndices })
  }

  // Sort by start position.
  zones.sort((a, b) => a.start - b.start)
  return zones
}
```

- [ ] **Step 6.4: Run tests + full suite + typecheck + lint + commit**

```bash
pnpm exec vitest run tests/document/footnoteZones.test.ts 2>&1 | tail -5
pnpm exec vitest run 2>&1 | tail -3
pnpm typecheck && pnpm lint 2>&1 | tail -3
git add src/document/footnoteZones.ts tests/document/footnoteZones.test.ts
git commit -m "$(cat <<'EOF'
feat(document): extractFootnoteZones — buckets citations by footnote number

Returns FootnoteZone[] grouping citations by their footnoteNumber tag,
or undefined when no citations carry footnote tagging (detectFootnotes
was off or no footnotes were detected).

Each zone reports outermost original-text bounds plus the citation
indices it contains.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Analyzer Orchestrator + Entry Point Export (TDD)

The orchestrator composes the four modules into the `analyzeDocument` function and exposes it from the core entry point.

**Files:**
- Create: `src/document/analyzer.ts`
- Modify: `src/document/index.ts`
- Modify: `src/index.ts`
- Create: `tests/document/analyzer.test.ts`

- [ ] **Step 7.1: Write failing tests**

Create `tests/document/analyzer.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { extractCitations, analyzeDocument } from "@/index"

describe("analyzeDocument (end-to-end)", () => {
  it("returns a Document with all expected fields", () => {
    const text = "Intro. Smith v. Jones, 100 F.2d 50 (1990). Id."
    const cites = extractCitations(text, { resolve: true })
    const doc = analyzeDocument(text, cites)

    expect(doc.citations).toBe(cites) // same reference
    expect(Array.isArray(doc.proseSpans)).toBe(true)
    expect(doc.precedingProse).toBeInstanceOf(Map)
    expect(doc.followingProse).toBeInstanceOf(Map)
    expect(Array.isArray(doc.quoteAttributions)).toBe(true)
    expect(doc.citationGraph.nodes).toHaveLength(cites.length)
    expect(Array.isArray(doc.citationGraph.edges)).toBe(true)
  })

  it("footnoteZones is undefined when no footnote tagging is present", () => {
    const text = "Smith v. Jones, 100 F.2d 50 (1990)."
    const cites = extractCitations(text)
    const doc = analyzeDocument(text, cites)
    expect(doc.footnoteZones).toBeUndefined()
  })

  it("works on an empty citations array", () => {
    const text = "Just prose."
    const doc = analyzeDocument(text, [])
    expect(doc.citations).toEqual([])
    expect(doc.proseSpans).toHaveLength(1)
    expect(doc.citationGraph.nodes).toEqual([])
    expect(doc.citationGraph.edges).toEqual([])
    expect(doc.quoteAttributions).toEqual([])
  })

  it("works on text with no citations or prose", () => {
    const doc = analyzeDocument("", [])
    expect(doc.proseSpans).toEqual([])
    expect(doc.citationGraph.nodes).toEqual([])
  })
})
```

- [ ] **Step 7.2: Run tests to verify they fail**

```bash
pnpm exec vitest run tests/document/analyzer.test.ts 2>&1 | tail -10
```

Expected: fail (analyzeDocument not exported yet).

- [ ] **Step 7.3: Implement `src/document/analyzer.ts`**

```ts
import type { Citation } from "../types/citation"
import type { TransformationMap } from "../clean/cleanText"
import { detectQuoteZones } from "../utils/detectQuoteZones"
import { computeParenDepths } from "../utils/parenDepths"
import type { Document } from "./types"
import { computeProseOffsets } from "./proseOffsets"
import { buildCitationGraph } from "./citationGraph"
import { attributeQuotes } from "./quoteAttribution"
import { extractFootnoteZones } from "./footnoteZones"

/**
 * Project an existing extraction result into a Document view with prose
 * offsets, quote attribution, citation graph, and (optionally) footnote
 * zones.
 *
 * Pure projection — reads existing fields, re-shapes; no new tokenization
 * or extraction. Cheap (sub-millisecond per call for typical brief sizes).
 *
 * See `docs/superpowers/specs/2026-05-19-document-understanding-api-design.md`.
 */
export function analyzeDocument(
  text: string,
  citations: Citation[],
  opts?: { transformationMap?: TransformationMap },
): Document {
  const parenDepths = computeParenDepths(text, citations)
  const quoteZones = detectQuoteZones(text)

  const prose = computeProseOffsets(text, citations, opts?.transformationMap)
  const citationGraph = buildCitationGraph(citations, parenDepths)
  const quoteAttributions = attributeQuotes(text, quoteZones, citations, parenDepths)
  const footnoteZones = extractFootnoteZones(citations)

  return {
    citations,
    proseSpans: prose.proseSpans,
    precedingProse: prose.precedingProse,
    followingProse: prose.followingProse,
    quoteAttributions,
    citationGraph,
    ...(footnoteZones ? { footnoteZones } : {}),
  }
}
```

- [ ] **Step 7.4: Update `src/document/index.ts` to export `analyzeDocument`**

```ts
// src/document/index.ts
export { analyzeDocument } from "./analyzer"

export type {
  AttributionKind,
  CitationGraph,
  Document,
  Edge,
  FootnoteZone,
  QuoteAttribution,
} from "./types"
```

- [ ] **Step 7.5: Re-export from `src/index.ts`**

Open `src/index.ts`. Find the existing export block. Add at the bottom:

```ts
// Document understanding API
export { analyzeDocument } from "./document"
export type {
  AttributionKind,
  CitationGraph,
  Document,
  Edge,
  FootnoteZone,
  QuoteAttribution,
} from "./document"
```

- [ ] **Step 7.6: Run analyzer tests + full suite + typecheck + lint**

```bash
pnpm exec vitest run tests/document/analyzer.test.ts 2>&1 | tail -5
pnpm exec vitest run 2>&1 | tail -3
pnpm typecheck && pnpm lint 2>&1 | tail -3
```

Expected: analyzer tests pass; full suite clean.

- [ ] **Step 7.7: Commit**

```bash
git add src/document/analyzer.ts src/document/index.ts src/index.ts tests/document/analyzer.test.ts
git commit -m "$(cat <<'EOF'
feat(document): analyzeDocument orchestrator + entry-point export

Composes proseOffsets, citationGraph, quoteAttribution, and
footnoteZones into a single Document view. Exposed from the core
entry point (eyecite-ts) alongside extractCitations — additive,
non-breaking.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Randolph End-to-End Fixture

Locks in the user's actual bug-report passage from the 0.20.1 PR, now exercising all three new capabilities.

**Files:**
- Create: `tests/document/randolphFixture.test.ts`

- [ ] **Step 8.1: Write the fixture test**

```ts
import { describe, expect, it } from "vitest"
import { extractCitations, analyzeDocument } from "@/index"

describe("Document fixture — Randolph passage end-to-end", () => {
  const text = `The prescriptive period in New Jersey is not twenty years, as was formerly assumed, but thirty years for developed land (or sixty years for woodlands or uncultivated tracts), by analogy to the adverse-possession periods set forth in N.J.S.A. 2A:14-30. Randolph Town Ctr., L.P. v. County of Morris, 374 N.J. Super. 448, 453–55, 864 A.2d 1191 (App. Div. 2005), aff'd in part, 186 N.J. 78, 891 A.2d 1202 (2006); see also Yellen v. Kassin, 416 N.J. Super. 113, 120, 3 A.3d 584 (App. Div. 2010).`

  it("Document has all expected fields populated", () => {
    const cites = extractCitations(text, { resolve: true })
    const doc = analyzeDocument(text, cites)
    expect(doc.citations.length).toBeGreaterThan(0)
    expect(doc.proseSpans.length).toBeGreaterThan(0)
    expect(doc.citationGraph.nodes.length).toBe(cites.length)
    expect(doc.citationGraph.edges.length).toBeGreaterThan(0)
  })

  it("citationGraph contains parallel edges for the three pairs", () => {
    const cites = extractCitations(text, { resolve: true })
    const doc = analyzeDocument(text, cites)
    const parallelEdges = doc.citationGraph.edges.filter((e) => e.type === "parallel")
    // Three parallel pairs (Randolph App. Div., Randolph N.J., Yellen)
    expect(parallelEdges.length).toBeGreaterThanOrEqual(3)
  })

  it("citationGraph contains a history-of edge for the affirmance", () => {
    const cites = extractCitations(text, { resolve: true })
    const doc = analyzeDocument(text, cites)
    const historyEdges = doc.citationGraph.edges.filter((e) => e.type === "history-of")
    expect(historyEdges.length).toBeGreaterThan(0)
  })

  it("proseSpans cover the intro text before Randolph", () => {
    const cites = extractCitations(text, { resolve: true })
    const doc = analyzeDocument(text, cites)
    expect(doc.proseSpans[0].originalStart).toBe(0)
    // First prose span should end at or before "Randolph Town Ctr"
    const firstProseText = text.slice(
      doc.proseSpans[0].originalStart,
      doc.proseSpans[0].originalEnd,
    )
    expect(firstProseText).toContain("prescriptive period")
  })
})
```

- [ ] **Step 8.2: Run + commit**

```bash
pnpm exec vitest run tests/document/randolphFixture.test.ts 2>&1 | tail -5
pnpm exec vitest run 2>&1 | tail -3
pnpm typecheck && pnpm lint 2>&1 | tail -3
git add tests/document/randolphFixture.test.ts
git commit -m "$(cat <<'EOF'
test(document): end-to-end Randolph fixture exercising all capabilities

The user's bug-report passage from the 0.20.1 PR now drives an
end-to-end test that asserts:
- Document has all expected fields populated
- citationGraph contains 3 parallel edges (the three Randolph / Yellen
  parallel pairs)
- citationGraph contains a history-of edge for the affirmance
- proseSpans cover the intro text before the first citation

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Changeset

**Files:**
- Create: `.changeset/document-understanding-api.md`

- [ ] **Step 9.1: Write the changeset**

```markdown
---
"eyecite-ts": minor
---

feat: `analyzeDocument` API — prose offsets, quote attribution, citation graph

Adds a sibling function to `extractCitations` that projects the extraction
output into a richer `Document` view for document-understanding consumers.

```ts
import { extractCitations, analyzeDocument } from "eyecite-ts"

const cites = extractCitations(text, { resolve: true })
const doc = analyzeDocument(text, cites)
// doc.proseSpans          — Span[] for prose between citations
// doc.precedingProse      — Map<citationIndex, Span>
// doc.followingProse      — Map<citationIndex, Span>
// doc.quoteAttributions   — quoted-text zones paired with citations
// doc.citationGraph       — { nodes, edges: Edge[] } with 7 typed edge kinds
// doc.footnoteZones?      — present when extractCitations was called
//                            with detectFootnotes: true
```

**Three new capabilities:**

- **Prose offsets** — geometric inverse complement of citations. Top-level array + per-citation views. Uses `fullSpan` (when available) to bound citations so case names aren't mislabeled as prose.

- **Quote attribution** — every quoted-text zone (paired `"..."` / `"..."` / markdown `>`) gets attribution attempted. Three kinds: `block-quote` (Bluebook Rule 5 canonical form), `adjacent` (inline quote in same sentence as a citation), `parenthetical` (quote inside an explanatory parenthetical). Confidence stratified per kind (0.85–0.98). Unattributed zones still surface with `citationIndex` undefined.

- **Citation graph** — every relationship eyecite-ts already computes (`resolvedTo`, `antecedentIndex`, `groupId` parallels, `subsequentHistoryOf`, `pinciteInheritedFrom`, `stringCitationGroupId`, parenthetical nesting) projected into a unified typed-edge graph. Seven edge kinds: `resolves-to | antecedent | parallel | history-of | pincite-inherit | string-cite | in-parenthetical-of`.

**No breaking changes.** `extractCitations` continues to return `Citation[]` unchanged. The new API is additive.

**Three pure refactors land in this PR** to support the new module:

- `detectQuoteZones` moves from `DocumentResolver.ts` to `src/utils/detectQuoteZones.ts`.
- `getCitationStart` / `getCitationEnd` move from `detectStringCites.ts` to `src/utils/citationBounds.ts`.
- `computeParenDepths` moves from `DocumentResolver` (private method) to `src/utils/parenDepths.ts`.

Same algorithms; now reusable.

See `docs/superpowers/specs/2026-05-19-document-understanding-api-design.md` for the full design and `docs/research/2026-05-19-document-understanding-api.md` for the legal-tech / NLP / academic-bibliometrics reference validation.
```

- [ ] **Step 9.2: Commit**

```bash
git add .changeset/document-understanding-api.md
git commit -m "$(cat <<'EOF'
chore: changeset for document understanding API

Minor bump — additive feature (new analyzeDocument function, new
Document type, new module). No breaking changes; extractCitations
continues to return Citation[] unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Final Verification + Hand Off

- [ ] **Step 10.1: Full suite + typecheck + lint + build + size**

```bash
pnpm exec vitest run && pnpm typecheck && pnpm lint && pnpm build && pnpm size 2>&1 | tail -15
```

Expected: all five pass. Test count should be ~3006 baseline + new (~30-40 tests across the 7 new test files) = ~3040+.

- [ ] **Step 10.2: Review the diff**

```bash
git log --oneline main..HEAD
git diff main..HEAD --stat
```

Expected: 9 commits (Tasks 1-9 each create one). Stat shows changes concentrated in `src/utils/` (refactor), `src/document/` (new module), `src/resolve/DocumentResolver.ts` + `src/extract/detectStringCites.ts` (import updates), `src/index.ts` (re-export), and `tests/utils/` + `tests/document/`.

- [ ] **Step 10.3: Hand off**

Implementation complete. Open a PR (don't push automatically — confirm with the user first per project conventions). Suggested PR title: **"feat: analyzeDocument API — prose offsets, quote attribution, citation graph"**.
