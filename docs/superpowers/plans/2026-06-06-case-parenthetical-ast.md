# Case Parenthetical AST Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce an internal AST boundary for case-citation parenthetical chains while preserving the existing public `FullCaseCitation` output shape.

**Architecture:** Add `src/extract/caseParentheticals.ts` as the grammar-shaped parser/model boundary for parenthetical chains. `extractCase.ts` remains the citation extractor and adapts AST nodes back into today’s public fields, spans, and history entries.

**Tech Stack:** TypeScript, Vitest 4, Biome, existing eyecite-ts extraction pipeline, no new runtime dependencies.

---

## File Structure

- Create `src/extract/caseParentheticals.ts`
  - Owns parenthetical chain AST types, signal normalization, metadata parsing, explanatory classification, and balanced parenthetical scanning.
- Create `tests/extract/caseParentheticals.test.ts`
  - Direct module tests for AST nodes before changing `extractCase.ts`.
- Modify `src/extract/extractCase.ts`
  - Import parser helpers/types from `caseParentheticals.ts`.
  - Remove the duplicated inline parenthetical model/parser functions after the adapter is in place.
  - Keep citation-core parsing, pincites, case-name scan, full-span assembly, and public span projection here.
- Modify no public package exports.
  - `caseParentheticals.ts` is an internal source import only.
- Existing regression tests to run:
  - `tests/extract/extractCase.test.ts`
  - `tests/extract/issue522NestedParenYear.test.ts`
  - `tests/extract/issue527ChainedHistory.test.ts`
  - `tests/extract/issue528MaxLookahead.test.ts`
  - `tests/extract/issue634CalCourtParentheticalPollution.test.ts`
  - `tests/utils/durableLocator.test.ts`
  - `tests/utils/durableLocator.entry.test.ts`

## Task 1: Add Failing AST Module Tests

**Files:**
- Create: `tests/extract/caseParentheticals.test.ts`
- Read: `src/extract/extractCase.ts:2324-2765`

- [ ] **Step 1: Write direct tests for the new internal AST module**

Create `tests/extract/caseParentheticals.test.ts`:

```typescript
import { describe, expect, it } from "vitest"
import {
  classifyCaseParenthetical,
  parseCaseParentheticalChain,
  parseParenthetical,
} from "@/extract/caseParentheticals"

describe("case parenthetical AST parser", () => {
  it("parses metadata court and year", () => {
    const node = parseParenthetical("9th Cir. 2020")

    expect(node).toMatchObject({
      kind: "metadata",
      text: "9th Cir. 2020",
      court: "9th Cir.",
      year: 2020,
      date: { iso: "2020", parsed: { year: 2020 } },
      courtStart: 0,
      courtEnd: 8,
      yearStart: 9,
      yearEnd: 13,
    })
  })

  it("parses metadata full date", () => {
    const node = parseParenthetical("2d Cir. Jan. 15, 2020")

    expect(node.kind).toBe("metadata")
    expect(node.court).toBe("2d Cir.")
    expect(node.year).toBe(2020)
    expect(node.date?.iso).toBe("2020-01-15")
    expect(node.date?.parsed).toEqual({ year: 2020, month: 1, day: 15 })
  })

  it("parses disposition parentheticals as metadata nodes", () => {
    const enBanc = parseParenthetical("en banc")
    const perCuriam = parseParenthetical("per curiam")

    expect(enBanc).toMatchObject({
      kind: "metadata",
      text: "en banc",
      disposition: "en banc",
    })
    expect(enBanc.court).toBeUndefined()
    expect(perCuriam).toMatchObject({
      kind: "metadata",
      text: "per curiam",
      disposition: "per curiam",
    })
    expect(perCuriam.court).toBeUndefined()
  })

  it("classifies signal-word explanatory parentheticals", () => {
    const node = classifyCaseParenthetical({
      text: "holding that X",
      span: { start: 25, end: 41 },
    })

    expect(node).toEqual({
      kind: "explanatory",
      text: "holding that X",
      type: "holding",
      span: { start: 25, end: 41 },
    })
  })

  it("classifies unknown non-metadata parentheticals as other", () => {
    const node = classifyCaseParenthetical({
      text: "the court found X",
      span: { start: 25, end: 44 },
    })

    expect(node).toEqual({
      kind: "explanatory",
      text: "the court found X",
      type: "other",
      span: { start: 25, end: 44 },
    })
  })

  it("keeps nested explanatory parenthetical text intact", () => {
    const text = "500 F.2d 123 (2020) (holding that (a) X and (b) Y)"
    const nodes = parseCaseParentheticalChain(text, "500 F.2d 123".length)

    expect(nodes).toMatchObject([
      { kind: "metadata", text: "2020", span: { start: 13, end: 19 }, year: 2020 },
      {
        kind: "explanatory",
        text: "holding that (a) X and (b) Y",
        span: { start: 20, end: text.length },
        type: "holding",
      },
    ])
  })

  it("parses chained metadata and explanatory parentheticals", () => {
    const text = "500 F.2d 123 (en banc) (9th Cir. 2021) (holding that X)"
    const nodes = parseCaseParentheticalChain(text, "500 F.2d 123".length)

    expect(nodes).toMatchObject([
      { kind: "metadata", text: "en banc", disposition: "en banc" },
      { kind: "metadata", text: "9th Cir. 2021", court: "9th Cir.", year: 2021 },
      { kind: "explanatory", text: "holding that X", type: "holding" },
    ])
  })

  it("emits history signal nodes between parentheticals", () => {
    const text = "500 F.2d 123 (2020), aff'd, 501 U.S. 1 (2021)"
    const nodes = parseCaseParentheticalChain(text, "500 F.2d 123".length)

    expect(nodes).toMatchObject([
      { kind: "metadata", text: "2020", year: 2020 },
      {
        kind: "historySignal",
        rawSignal: "aff'd",
        signal: "affirmed",
        span: { start: 21, end: 26 },
      },
    ])
  })

  it("parses Texas internal writ and petition history", () => {
    const node = parseParenthetical("Tex. App.---Dallas 2010, no pet.")

    expect(node).toMatchObject({
      kind: "metadata",
      text: "Tex. App.---Dallas 2010, no pet.",
      court: "Tex. App.---Dallas",
      year: 2010,
      internalHistory: {
        kind: "historySignal",
        rawSignal: "no pet.",
        signal: "no_pet",
      },
    })
    expect(node.internalHistory?.span).toEqual({ start: 25, end: 32 })
  })
})
```

- [ ] **Step 2: Run the direct tests and verify they fail because the module does not exist**

Run:

```bash
pnpm exec vitest run tests/extract/caseParentheticals.test.ts
```

Expected: FAIL with an import/module-resolution error for `@/extract/caseParentheticals`.

- [ ] **Step 3: Commit the failing tests**

```bash
git add tests/extract/caseParentheticals.test.ts
git commit -m "test(extract): specify case parenthetical AST"
```

## Task 2: Create the Case Parenthetical AST Module

**Files:**
- Create: `src/extract/caseParentheticals.ts`
- Modify: `src/extract/extractCase.ts`
- Test: `tests/extract/caseParentheticals.test.ts`

- [ ] **Step 1: Add the module shell and AST types**

Create `src/extract/caseParentheticals.ts` with imports and type definitions:

```typescript
import type {
  HistorySignal,
  ParentheticalType,
} from "@/types/citation"
import { levenshteinDistance } from "@/resolve/levenshtein"
import { isPlausibleYear, parseDate, type StructuredDate } from "./dates"

export interface RawSpan {
  start: number
  end: number
}

export interface HistorySignalNode {
  kind: "historySignal"
  rawSignal: string
  signal: HistorySignal
  span: RawSpan
  nextParentheticalIndex?: number
}

export interface MetadataParentheticalNode {
  kind: "metadata"
  text: string
  span: RawSpan
  court?: string
  year?: number
  date?: StructuredDate
  disposition?: string
  justices?: string[]
  scope?: string
  courtStart?: number
  courtEnd?: number
  yearStart?: number
  yearEnd?: number
  internalHistory?: HistorySignalNode
}

export interface ExplanatoryParentheticalNode {
  kind: "explanatory"
  text: string
  span: RawSpan
  type: ParentheticalType
}

export type ParentheticalNode = MetadataParentheticalNode | ExplanatoryParentheticalNode
export type CaseParentheticalNode = ParentheticalNode | HistorySignalNode

interface RawParenthetical {
  text: string
  start: number
  end: number
}

interface RawSignal {
  text: string
  normalized: HistorySignal
  start: number
  end: number
}

interface CollectedParentheticals {
  parens: RawParenthetical[]
  signals: Array<{ signal: RawSignal; nextParenIndex: number }>
}
```

- [ ] **Step 2: Move signal and explanatory-word helpers**

Copy these declarations from `src/extract/extractCase.ts` into `caseParentheticals.ts`:

- `SIGNAL_TABLE`
- `normalizeSignal`
- `SIGNAL_WORDS`
- `isSignalWord`
- `LEADING_WORD_REGEX`

Change `normalizeSignal` to return `HistorySignalNode` data only indirectly; keep its current private return shape:

```typescript
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

- [ ] **Step 3: Move metadata parsing helpers**

Copy these declarations from `extractCase.ts` into `caseParentheticals.ts`:

- `MONTH_PATTERN`
- `MONTH_NAMES`
- `NO_STRIP_TRAILING`
- `stripMisspelledTrailingMonth`
- `isNonMetadataParenContent`
- `stripDateFromCourt`
- `clearCourtIfDisposition`

Export `isNonMetadataParenContent` because `extractCase.ts` still gates the token-text and lookahead metadata probes with it:

```typescript
export function isNonMetadataParenContent(content: string): boolean {
  // Move the existing implementation unchanged.
}
```

- [ ] **Step 4: Move and adapt `parseParenthetical`**

Move the existing `parseParenthetical` implementation into `caseParentheticals.ts`.
Change its return type and initialize `result` with `kind`, `text`, and a content-local span:

```typescript
export function parseParenthetical(content: string): MetadataParentheticalNode {
  const result: MetadataParentheticalNode = {
    kind: "metadata",
    text: content,
    span: { start: 0, end: content.length },
  }

  // Keep the existing parseDate, Texas internal history, stripDateFromCourt,
  // justice-attribution, disposition, and clearCourtIfDisposition logic.
  // When setting internalHistory, emit a HistorySignalNode:
  //
  // result.internalHistory = {
  //   kind: "historySignal",
  //   rawSignal,
  //   signal: normalized.signal,
  //   span: { start: sigOffset, end: sigOffset + rawSignal.length },
  // }

  return result
}
```

- [ ] **Step 5: Move and adapt `classifyParenthetical`**

Replace the old private union result with the AST node:

```typescript
export function classifyCaseParenthetical(raw: {
  text: string
  span: RawSpan
}): ParentheticalNode {
  const leadingMatch = LEADING_WORD_REGEX.exec(raw.text)
  if (leadingMatch) {
    const candidate = leadingMatch[1].toLowerCase()
    if (isSignalWord(candidate)) {
      return {
        kind: "explanatory",
        text: raw.text,
        type: candidate,
        span: raw.span,
      }
    }
  }

  if (isNonMetadataParenContent(raw.text)) {
    return {
      kind: "explanatory",
      text: raw.text,
      type: "other",
      span: raw.span,
    }
  }

  const meta = parseParenthetical(raw.text)
  if (meta.year || meta.date || meta.disposition || meta.justices) {
    return { ...meta, span: raw.span }
  }

  return {
    kind: "explanatory",
    text: raw.text,
    type: "other",
    span: raw.span,
  }
}
```

- [ ] **Step 6: Move and adapt parenthetical collection**

Copy these declarations from `extractCase.ts`:

- `PAREN_SKIP_REGEX`
- `PINCITE_SKIP_REGEX`
- `PAREN_CLOSE_HARD_CEILING`
- `collectParentheticals`

Keep `collectParentheticals` private. Add exported `parseCaseParentheticalChain`:

```typescript
export function parseCaseParentheticalChain(
  text: string,
  startPos: number,
  maxLookahead = 2000,
): CaseParentheticalNode[] {
  const collected = collectParentheticals(text, startPos, maxLookahead)
  const nodes: CaseParentheticalNode[] = collected.parens.map((raw) =>
    classifyCaseParenthetical({
      text: raw.text,
      span: { start: raw.start, end: raw.end },
    }),
  )

  for (const { signal, nextParenIndex } of collected.signals) {
    nodes.push({
      kind: "historySignal",
      rawSignal: signal.text,
      signal: signal.normalized,
      span: { start: signal.start, end: signal.end },
      ...(nextParenIndex >= 0 ? { nextParentheticalIndex: nextParenIndex } : {}),
    })
  }

  return nodes.sort((a, b) => a.span.start - b.span.start)
}
```

- [ ] **Step 7: Re-export moved parser functions from `extractCase.ts` for compatibility**

At the top of `src/extract/extractCase.ts`, add:

```typescript
import {
  isNonMetadataParenContent,
  parseParenthetical,
} from "./caseParentheticals"

export { parseParenthetical } from "./caseParentheticals"
```

Remove the local `parseParenthetical` and `isNonMetadataParenContent` functions
after imports are in place. Leave other local functions temporarily if still
referenced; this task is only green when direct AST tests pass.

- [ ] **Step 8: Run the new direct tests**

Run:

```bash
pnpm exec vitest run tests/extract/caseParentheticals.test.ts
```

Expected: PASS.

- [ ] **Step 9: Run typecheck for import/export mistakes**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 10: Commit the AST module**

```bash
git add src/extract/caseParentheticals.ts src/extract/extractCase.ts
git commit -m "refactor(extract): add case parenthetical AST module"
```

## Task 3: Adapt `extractCase.ts` to Consume AST Nodes

**Files:**
- Modify: `src/extract/extractCase.ts:3160-3465`
- Test: `tests/extract/extractCase.test.ts`

- [ ] **Step 1: Add chain-parser imports**

Extend the existing `./caseParentheticals` import in `src/extract/extractCase.ts`:

```typescript
import {
  isNonMetadataParenContent,
  parseCaseParentheticalChain,
  parseParenthetical,
  type CaseParentheticalNode,
  type ExplanatoryParentheticalNode,
  type HistorySignalNode,
  type MetadataParentheticalNode,
} from "./caseParentheticals"
```

- [ ] **Step 2: Replace `CollectedParentheticals` state with AST node state**

In `extractCase.ts`, replace:

```typescript
let allParens: RawParenthetical[] | undefined
let collected: CollectedParentheticals | undefined
```

with:

```typescript
let parentheticalNodes: CaseParentheticalNode[] | undefined
let allParentheticalNodes: Array<MetadataParentheticalNode | ExplanatoryParentheticalNode> | undefined
```

- [ ] **Step 3: Build nodes from the parser module**

Replace the `collectParentheticals(cleanedText, postChainStart)` block with:

```typescript
parentheticalNodes = parseCaseParentheticalChain(cleanedText, postChainStart)
allParentheticalNodes = parentheticalNodes.filter(
  (node): node is MetadataParentheticalNode | ExplanatoryParentheticalNode =>
    node.kind === "metadata" || node.kind === "explanatory",
)
```

- [ ] **Step 4: Preserve first-metadata skip semantics**

Replace the `remaining` calculation with:

```typescript
const firstParenIsMetadata =
  parentheticalContent &&
  (year !== undefined ||
    court !== undefined ||
    disposition !== undefined ||
    justices !== undefined ||
    scope !== undefined)

const remaining = firstParenIsMetadata
  ? allParentheticalNodes.slice(1)
  : allParentheticalNodes
```

- [ ] **Step 5: Adapt metadata and explanatory nodes back into existing fields**

Replace the old `for (const raw of remaining)` classification loop with:

```typescript
for (const node of remaining) {
  if (node.kind === "metadata") {
    if (node.court && (!court || court === disposition)) {
      court = node.court
    }
    if (node.year && !year) {
      year = node.year
      date = node.date
    }
    if (node.disposition && !disposition) {
      disposition = node.disposition
    }
    if (node.justices && !justices) {
      justices = node.justices
    }
    if (node.scope && !scope) {
      scope = node.scope
    }
    continue
  }

  parentheticals ??= []
  const parenOrig = resolveOriginalSpan(
    { cleanStart: node.span.start, cleanEnd: node.span.end },
    transformationMap,
  )
  parentheticals.push({
    text: node.text,
    type: node.type,
    span: {
      cleanStart: node.span.start,
      cleanEnd: node.span.end,
      originalStart: parenOrig.originalStart,
      originalEnd: parenOrig.originalEnd,
    },
  })
}
```

- [ ] **Step 6: Update metadata parenthetical span selection**

Replace uses of `allParens[0]` in the metadata span block with the first metadata node that matches `parentheticalContent`:

```typescript
const metaParen = parentheticalContent
  ? allParentheticalNodes?.find(
      (node): node is MetadataParentheticalNode =>
        node.kind === "metadata" && node.text === parentheticalContent,
    )
  : undefined
```

Then update span field reads:

```typescript
cleanStart: metaParen.span.start
cleanEnd: metaParen.span.end
```

And content offset:

```typescript
const contentStart = metaParen.span.start + 1
```

- [ ] **Step 7: Update internal-history adaptation**

Replace the current `metaParenResult?.internalHistory && allParens` block with:

```typescript
if (cleanedText && metaParenResult?.internalHistory && allParentheticalNodes) {
  const metaParen = parentheticalContent
    ? allParentheticalNodes.find(
        (node): node is MetadataParentheticalNode =>
          node.kind === "metadata" && node.text === parentheticalContent,
      )
    : undefined

  if (metaParen) {
    const contentStart = metaParen.span.start + 1
    const ih = metaParenResult.internalHistory
    const sigCleanStart = contentStart + ih.span.start
    const sigCleanEnd = contentStart + ih.span.end
    const { originalStart: sigOrigStart, originalEnd: sigOrigEnd } =
      resolveOriginalSpan(
        { cleanStart: sigCleanStart, cleanEnd: sigCleanEnd },
        transformationMap,
      )
    subsequentHistoryEntries ??= []
    subsequentHistoryEntries.push({
      signal: ih.signal,
      rawSignal: ih.rawSignal,
      signalSpan: {
        cleanStart: sigCleanStart,
        cleanEnd: sigCleanEnd,
        originalStart: sigOrigStart,
        originalEnd: sigOrigEnd,
      },
      order: 0,
    })
  }
}
```

- [ ] **Step 8: Update between-parenthetical history adaptation**

Replace `collected.signals` usage with AST history nodes:

```typescript
const historyNodes =
  parentheticalNodes?.filter((node): node is HistorySignalNode => node.kind === "historySignal") ?? []

for (const node of historyNodes) {
  subsequentHistoryEntries ??= []
  const { originalStart: sigOrigStart, originalEnd: sigOrigEnd } =
    resolveOriginalSpan(
      { cleanStart: node.span.start, cleanEnd: node.span.end },
      transformationMap,
    )
  subsequentHistoryEntries.push({
    signal: node.signal,
    rawSignal: node.rawSignal,
    signalSpan: {
      cleanStart: node.span.start,
      cleanEnd: node.span.end,
      originalStart: sigOrigStart,
      originalEnd: sigOrigEnd,
    },
    order: subsequentHistoryEntries.length,
  })
}
```

- [ ] **Step 9: Run focused case tests**

Run:

```bash
pnpm exec vitest run tests/extract/extractCase.test.ts
```

Expected: PASS.

- [ ] **Step 10: Commit the adapter**

```bash
git add src/extract/extractCase.ts
git commit -m "refactor(extract): adapt case extraction to parenthetical AST"
```

## Task 4: Remove Dead Inline Parser Code and Verify Regression Coverage

**Files:**
- Modify: `src/extract/extractCase.ts`
- Test: focused regressions and durable-locator tests

- [ ] **Step 1: Remove moved declarations from `extractCase.ts`**

Delete these local declarations if they are no longer referenced in `extractCase.ts`:

- `MONTH_PATTERN`
- `MONTH_NAMES`
- `NO_STRIP_TRAILING`
- `stripMisspelledTrailingMonth`
- `PAREN_SKIP_REGEX`
- `PINCITE_SKIP_REGEX`
- `SIGNAL_TABLE`
- `normalizeSignal`
- `SIGNAL_WORDS`
- `isSignalWord`
- `LEADING_WORD_REGEX`
- `isNonMetadataParenContent`
- `stripDateFromCourt`
- `RawParenthetical`
- `RawSignal`
- `CollectedParentheticals`
- `PAREN_CLOSE_HARD_CEILING`
- `collectParentheticals`
- `clearCourtIfDisposition`
- `classifyParenthetical`

Keep these in `extractCase.ts` because they still belong to citation-core extraction:

- `PAREN_REGEX`
- `LOOKAHEAD_PAREN_REGEX`
- `LOOKAHEAD_PINCITE_REGEX`
- `ADDITIONAL_PINCITE_REGEX`
- `PINCITE_REGEX`
- `CHAIN_BRIDGE_REGEX` local to the parallel-chain loop

- [ ] **Step 2: Run a dead-reference scan**

Run:

```bash
rg -n "RawParenthetical|CollectedParentheticals|classifyParenthetical|collectParentheticals|normalizeSignal\\(" src/extract/extractCase.ts
```

Expected: no output.

- [ ] **Step 3: Run focused regression tests**

Run:

```bash
pnpm exec vitest run tests/extract/caseParentheticals.test.ts tests/extract/extractCase.test.ts tests/extract/issue522NestedParenYear.test.ts tests/extract/issue527ChainedHistory.test.ts tests/extract/issue528MaxLookahead.test.ts tests/extract/issue634CalCourtParentheticalPollution.test.ts
```

Expected: PASS.

- [ ] **Step 4: Run durable-locator compatibility tests**

Run:

```bash
pnpm exec vitest run tests/utils/durableLocator.test.ts tests/utils/durableLocator.entry.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit cleanup**

```bash
git add src/extract/extractCase.ts
git commit -m "refactor(extract): remove inline case parenthetical parser"
```

## Task 5: Final Verification and Formatting

**Files:**
- Modify only if format/typecheck reports issues.

- [ ] **Step 1: Run formatter/linter**

Run:

```bash
pnpm lint
```

Expected: PASS. If Biome reports formatting issues, run:

```bash
pnpm format
pnpm lint
```

Then stage and commit formatting-only edits:

```bash
git add src/extract/caseParentheticals.ts src/extract/extractCase.ts tests/extract/caseParentheticals.test.ts
git commit -m "style: format case parenthetical AST refactor"
```

- [ ] **Step 2: Run typecheck**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 3: Run full test suite**

Run:

```bash
pnpm exec vitest run
```

Expected: PASS.

If the published-tarball test fails inside the managed sandbox with `listen EPERM`
from `tsx`, rerun the same command with normal permissions. The known baseline
on this branch passes outside the sandbox.

- [ ] **Step 4: Inspect final diff**

Run:

```bash
git status --short
git diff --stat feat/citation-durable-locator..HEAD
git diff -- src/extract/caseParentheticals.ts src/extract/extractCase.ts tests/extract/caseParentheticals.test.ts
```

Expected:

- Working tree is clean except for any intentionally uncommitted plan/spec edits.
- Diffs are limited to the AST module, adapter changes, direct tests, and docs.
- No public package export or public citation type changed.

- [ ] **Step 5: Final commit if verification produced fixes**

If Task 5 changed files, commit them with the narrowest accurate message:

```bash
git add <changed-files>
git commit -m "fix(extract): stabilize case parenthetical AST refactor"
```

If Task 5 made no changes, do not create an empty commit.
