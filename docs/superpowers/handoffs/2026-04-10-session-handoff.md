# Session Handoff — 2026-04-10

## What Was Done This Session

### 1. Built an interactive playground (`playground.html`)
- Single-file HTML that loads eyecite-ts from esm.sh CDN
- Paste legal text → auto-extract → color-coded syntax highlighting by citation type
- Citation detail cards, resolution display, fullSpan toggle, copy JSON, 4 sample texts
- Opened it, found bugs, filed issues

### 2. Filed 5 GitHub Issues
| # | Title | Status |
|---|-------|--------|
| 168 | extractCaseName backward search doesn't detect text/paragraph boundaries | **Closed** via #175 |
| 169 | V_CASE_NAME_REGEX plaintiff capture group too permissive | **Closed** via #175 |
| 170 | Id. resolution ignores preceding short-form citations | **Closed** via #173 |
| 171 | Add signalSpan to CitationBase for signal word position tracking | Open (superseded by #172) |
| 172 | Add granular spans for all citation components | **Open — next up** |

### 3. Fixed #170: Id. Resolution (PR #173, merged)
- **Branch:** `fix/170-id-resolution-short-form`
- **What:** Replaced backward search in `resolveId` with a forward-tracking `lastResolvedIndex` pointer that updates after every successfully resolved citation
- **Key files:** `src/resolve/DocumentResolver.ts`, `src/resolve/types.ts`
- **Design spec:** `docs/superpowers/specs/2026-04-10-id-resolution-fix-design.md`
- **Plan:** `docs/superpowers/plans/2026-04-10-id-resolution-fix.md`
- **Tests:** 5 new tests in `tests/integration/resolution.test.ts` under "Id. Resolution Through Short-Form Citations (#170)"
- **Removed dead code:** `lastFullCitation` field from `ResolutionContext` (was set but never read)

### 4. Fixed #168 + #169: Case Name Extraction (PR #175, merged)
- **Branch:** `fix/168-169-case-name-extraction`
- **What:** Added `isLikelyPartyName` post-match validation to `extractCaseName`. Party names must consist of capitalized words and legal connectors. When sentence context is detected, trims from the left. Preserves signal word prefixes for downstream `extractPartyNames`.
- **Key file:** `src/extract/extractCase.ts` (added `PARTY_NAME_CONNECTORS`, `isLikelyPartyName`, updated V_CASE_NAME_REGEX block in `extractCaseName`)
- **Plan:** `docs/superpowers/plans/2026-04-10-case-name-extraction-fix.md`
- **Tests:** 9 new tests in `tests/extract/extractCase.test.ts` under "sentence context trimming (#168, #169)"

## What's Next: #172 — Granular Component Spans

This is the next prioritized item. It's an enhancement (not a bug fix) and the largest piece of remaining work.

### The Problem
Citations extract fields like `volume`, `reporter`, `page`, `court`, `year` — but only provide position data for the citation as a whole (`span`, `fullSpan`). Consumers who want per-component highlighting have no position data.

### The Proposed Design
Add an optional `spans` record to each citation type:

```typescript
interface FullCaseCitation extends CitationBase {
  spans?: {
    caseName?: Span
    volume?: Span
    reporter?: Span
    page?: Span
    pincite?: Span
    court?: Span
    year?: Span
    signal?: Span
    // etc.
  }
}
```

Each citation type gets its own `spans` shape matching its fields. Opt-in via `ExtractOptions.includeComponentSpans?: boolean` to keep default payload lean.

### Key Design Decisions Still Needed
1. **Opt-in mechanism:** `ExtractOptions.includeComponentSpans` flag, or always include? The issue suggests opt-in.
2. **Type design:** Per-type `spans` shape (discriminated by citation type), or a generic `Record<string, Span>`?
3. **Implementation strategy:** Most positions are already computed during extraction (regex match groups have offsets). The work is threading them through to output rather than new parsing.
4. **Subsumes #171:** Signal spans become one entry in the `spans` record. Close #171 when #172 ships.

### Implementation Hints
- Regex match groups in the tokenizer already have offset data (via `RegExp.exec` + `index`)
- `extractCase.ts` already computes positions for case name, parentheticals, subsequent history — needs to thread them to output
- `extractStatute.ts`, `extractConstitutional.ts`, etc. similarly have regex groups with position info
- The `TransformationMap` converts clean→original positions — component spans need the same mapping
- Start with `FullCaseCitation` (most fields), then extend to other types

### Suggested Approach
1. Brainstorm the type design first (which fields get spans, per-type vs generic)
2. Start with case citations (most complex, most fields)
3. TDD: write tests for expected spans on known inputs
4. Thread positions through extractCase.ts
5. Extend to other citation types
6. Add opt-in flag to ExtractOptions

## Other Open Issues (lower priority)

| # | Title | Type |
|---|-------|------|
| 171 | Add signalSpan to CitationBase | Enhancement (superseded by #172) |
| 19 | Support California-style citations | Feature |
| 13 | Support "infra" citations | Feature |
| 10 | Support custom/context-sensitive reporters | Feature |
| 7 | Handle statutory short cites | Feature |

## Also Created This Session

- **`playground.html`** — Interactive eyecite-ts playground (not committed to repo, in working directory). Loads from esm.sh CDN, 4 sample texts, color-coded syntax highlighting, citation detail cards.
- **`llms.txt`** — Also in working directory, not committed.

## Code Review Findings Worth Noting

- **`allowNestedResolution` option is now dead code** in `DocumentResolver.ts` — the new `lastResolvedIndex` pointer makes it irrelevant. Could be cleaned up in a future PR.
- The `indexOf` in the plaintiff trimming loop (`extractCase.ts`) has a theoretical edge case with duplicate words, but it's unreachable with real legal text.
