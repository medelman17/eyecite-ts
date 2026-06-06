# Case Parenthetical AST Spike

## Overview

Refactor case-citation parenthetical parsing behind an internal AST boundary.
The public `FullCaseCitation` shape stays unchanged, but `extractCase.ts` stops
treating parenthetical collection, metadata parsing, explanatory classification,
and history-signal handling as one large inline concern.

This is an experiment branch, so the goal is not a full parser rewrite. The goal
is to prove that the existing behavior can be represented as a small grammar
model, then adapted back into the current citation fields without changing
callers.

## Grammar

```ebnf
CaseParentheticalChain =
  (Parenthetical | HistorySignal)*

Parenthetical =
  MetadataParenthetical
  | ExplanatoryParenthetical

MetadataParenthetical =
  Court? Date? Disposition? JusticeAttribution? InternalHistory?

ExplanatoryParenthetical =
  SignalWord Text
  | OtherText

HistorySignal =
  ProceduralSignal
```

The chain is an island grammar: the scanner starts after a case-citation core
and consumes only balanced parentheticals and recognized subsequent-history
signals. Everything else remains surrounding prose.

## Internal Model

Add `src/extract/caseParentheticals.ts` with internal exported types and parser
helpers. These are implementation types, not public package API.

```typescript
interface RawSpan {
  start: number
  end: number
}

type CaseParentheticalNode =
  | MetadataParentheticalNode
  | ExplanatoryParentheticalNode
  | HistorySignalNode

interface MetadataParentheticalNode {
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

interface ExplanatoryParentheticalNode {
  kind: "explanatory"
  text: string
  span: RawSpan
  type: ParentheticalType
}

interface HistorySignalNode {
  kind: "historySignal"
  rawSignal: string
  signal: HistorySignal
  span: RawSpan
  nextParentheticalIndex?: number
}
```

The AST uses raw cleaned-text spans. `extractCase.ts` remains responsible for
mapping those spans through `TransformationMap` into public `Span` values.

## Parser Boundary

Move these responsibilities out of `extractCase.ts`:

- balanced parenthetical collection with the existing soft lookahead and hard
  close-paren ceiling;
- subsequent-history signal detection between parentheticals;
- court/year/date/disposition/justice parsing for metadata parentheticals;
- explanatory parenthetical classification by signal word;
- Texas internal writ/petition history recognition inside metadata
  parentheticals.

Keep these responsibilities in `extractCase.ts`:

- citation-core parsing;
- pincite extraction;
- parallel-chain post-start calculation;
- public `FullCaseCitation` assembly;
- component-span projection into original coordinates;
- `fullSpan` calculation;
- durable-locator compatibility through stable public spans.

The new module should expose a small surface:

```typescript
parseParenthetical(content: string): MetadataParentheticalNode
parseCaseParentheticalChain(text: string, startPos: number): CaseParentheticalNode[]
classifyCaseParenthetical(raw: { text: string; span: RawSpan }): CaseParentheticalNode
```

If implementation proves cleaner, the names can change, but the boundary should
stay grammar-shaped: chain parser returns nodes, extractor adapts nodes.

## Adapter Back to Current Citation Fields

`extractCase.ts` walks the node list and preserves existing field semantics:

- first metadata node can populate `court`, `year`, `date`, `disposition`,
  `justices`, and `scope`;
- later metadata nodes can fill missing metadata, matching current behavior for
  chains like `(en banc) (9th Cir. 2021)`;
- explanatory nodes become `parentheticals?: Parenthetical[]` with public
  original/clean spans;
- history-signal nodes become `subsequentHistoryEntries`;
- metadata nodes with `internalHistory` also become `subsequentHistoryEntries`
  at the same order as today;
- `componentSpans.metadataParenthetical`, `componentSpans.court`, and
  `componentSpans.year` still derive from the metadata node that supplied
  metadata.

No public citation type changes are required for the spike.

## Durable Locator Constraint

The durable-locator branch is part of this spike's base. Parenthetical AST work
must not degrade locator behavior:

- `citation.span` remains citation-core-only for compatibility;
- `fullSpan` continues to cover case name through the final relevant
  parenthetical/history chain where existing behavior does so;
- explanatory parenthetical spans remain accurate in original and clean
  coordinates;
- `toDurableLocator(..., { fullSpan: true })` must keep using the same
  full-reference text for existing cases.

This spec does not attach AST nodes to public citation results. Durable locators
consume public spans only.

## Testing

Add direct tests for the internal AST module before changing the adapter:

- metadata parenthetical: `(9th Cir. 2020)`;
- full date parenthetical: `(2d Cir. Jan. 15, 2020)`;
- disposition parenthetical: `(en banc)` / `(per curiam)`;
- explanatory parenthetical: `(holding that X)` and unknown text as `other`;
- nested explanatory parenthetical: `(holding that (a) X and (b) Y)`;
- chained metadata/explanatory parentheticals;
- subsequent-history signal between parentheticals;
- Texas internal history: `(Tex. App.---Dallas 2010, no pet.)`.

Then run focused existing tests:

```bash
pnpm exec vitest run tests/extract/extractCase.test.ts
pnpm exec vitest run tests/extract/issue522NestedParenYear.test.ts tests/extract/issue527ChainedHistory.test.ts tests/extract/issue528MaxLookahead.test.ts tests/extract/issue634CalCourtParentheticalPollution.test.ts
pnpm exec vitest run tests/utils/durableLocator.test.ts tests/utils/durableLocator.entry.test.ts
```

Before considering the spike viable, run the full suite outside the sandbox if
the published-tarball test hits the known `tsx` IPC permission issue.

## Non-Goals

- No public API change.
- No parser generator.
- No broad rewrite of `extractCase.ts`.
- No changes to resolution behavior.
- No durable-locator resolver.
- No changeset unless the spike turns into a public API change later.

