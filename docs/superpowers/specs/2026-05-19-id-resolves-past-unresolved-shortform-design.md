# Design: `Id.` Should Cluster With Its Immediately Preceding Citation, Even When the Predecessor Is an Unresolved Short-Form

**Date:** 2026-05-19
**Status:** Approved by user, ready for implementation plan
**Related research:** [`docs/research/2026-05-19-id-unresolved-antecedent.md`](../../research/2026-05-19-id-unresolved-antecedent.md)

## Background

A real legal brief contains this passage:

> Leach v. Anderl, 218 N.J. Super. 18, 30–31 (App. Div. 1987). In *Yellen v. Kassin*, the Appellate Division squarely held that ... *Yellen*, 416 N.J. Super. at 590–91, 3 A.3d at 590–91. The court reversed ... *Id.* at 590.

The writer's intent is unambiguous: `Id. at 590` refers to **Yellen**. Per Bluebook Rule 4.1 / Indigo Book R6.2.2, `Id.` anchors to "the immediately preceding cited authority" — which is the `Yellen, 416 N.J. Super. at 590–91` short-form (or its parallel `3 A.3d at 590–91`).

But `eyecite-ts` currently resolves `Id.` to **Leach** — totally wrong authority.

### Root cause

The case name `Yellen v. Kassin` appears in **prose** ("In *Yellen v. Kassin*..."), not as a structured full citation. eyecite-ts doesn't extract case names from arbitrary prose, so it has no `Yellen` full citation to anchor the `Yellen, 416 N.J. Super. at 590–91` short-form against. Vol+reporter lookup fails → the short-form has `resolution.resolvedTo === undefined`.

Then `resolveId` in `DocumentResolver.ts:462-463` walks backward and explicitly *skips* unresolved short-forms:

```ts
const prev = this.resolutions[i]
if (!prev || prev.resolvedTo === undefined) continue
```

So `Id.` chases past both Yellen short-forms and lands on Leach. The author's intent is lost.

### Why this isn't easy to fix in a one-liner

The current resolution model conflates two questions:

1. **"What's the immediately preceding citation?"** — a positional, sequence-based question.
2. **"What authority does this resolve to?"** — a bibliographic, full-cite lookup question.

Bluebook Rule 4.1 cares about (1). The current model only exposes (2) via `resolvedTo`. The fix has to separate these.

### Research summary

Per [research §"TL;DR"](../../research/2026-05-19-id-unresolved-antecedent.md):

- **Bluebook is purely positional.** Indigo Book R15.3.1 anchors `Id.` to "the immediately preceding cited authority" — no condition on whether that authority has a resolved bibliographic entry.
- **Python `eyecite` has the same bug** and explicitly can't fix it because its `Resolutions = dict[Resource, list[Cite]]` shape structurally can't represent "clustered with no underlying authority."
- **CSL/citeproc separates position from resolution** (pandoc-citeproc evolved its type to `[[(Cite, Maybe Reference)]]` for exactly this reason).
- **In-repo prior art is `pinciteInheritedFrom`** — the chain-pointer field shipped in `0.19.0` for pincite inheritance. Same `number` index shape, same "Records the immediate predecessor; follow transitively" semantic. Adopting the same pattern at the resolution layer is internally consistent.

Recommendation: an additive `antecedentIndex` field on `ResolutionResult`, plus two coordinated changes (prose case-name extraction and quote-zone robustness) so the Yellen example works end-to-end after this PR.

## Architecture

Three coordinated changes:

```
┌─── 1. Backward prose case-name extraction (Section 3) ───┐
│  resolveShortFormCase fallback: when vol+reporter lookup  │
│  fails AND the short-form has partyName, scan ~200 chars  │
│  of preceding prose for "Party v. Party". Enrich the      │
│  short-form with `inferredCaseName` / spans.              │
└──────────────────────────┬────────────────────────────────┘
                           │
┌──────────────────────────▼─ 2. antecedentIndex (Section 2) ─┐
│  New optional field on ResolutionResult. resolveId records  │
│  it for the immediate preceding citation regardless of      │
│  resolution state. resolvedTo contract unchanged (still     │
│  only set for terminal full cite). Mirror shape of          │
│  pinciteInheritedFrom.                                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼─ 3. Quote-zone robustness (Section 4) ─┐
│  detectQuoteZones uses context-based open/close classification    │
│  for ASCII quotes; typographic quotes are unambiguous. Handles    │
│  orphan opens/closes from mid-document pastes without producing   │
│  phantom zones.                                                   │
└────────────────────────────────────────────────────────────────────┘
```

Each section is independently testable. Composing them makes the Yellen fixture pass end-to-end.

## Section 2: `antecedentIndex` (Resolution-Model Fix)

### Type addition (`src/resolve/types.ts`)

```ts
export interface ResolutionResult {
  /**
   * Index of the FULL citation this short-form resolved to. Contract
   * UNCHANGED: only set when a same-authority full citation exists in
   * scope. Consumers can still rely on `resolved[resolvedTo]` being a
   * full citation.
   */
  resolvedTo?: number

  /**
   * NEW. Index of the immediately preceding cited authority in document
   * order, regardless of whether that citation itself resolved to a full
   * cite. Bluebook Rule 4.1 / Indigo Book R6.2.2: `Id.` anchors here.
   *
   * - When the predecessor is a full citation or successfully-resolved
   *   short-form, `antecedentIndex` points one step back.
   * - When the predecessor is an unresolved short-form (e.g. because the
   *   case name appears only in prose), `antecedentIndex` still points
   *   at it; `resolvedTo` stays undefined.
   * - Records the immediate predecessor only; follow transitively via
   *   `resolutions[antecedentIndex].antecedentIndex` for the originator.
   *   Same idiom as `pinciteInheritedFrom`.
   */
  antecedentIndex?: number

  // existing fields unchanged: confidence, failureReason, warnings, features
}
```

### Antecedent semantics — one step back, not transitive

`antecedentIndex` points at the **immediately preceding citation** in document order, after applying the resolver's existing filters (scope, parenthetical children, weak-signal asides, quote-zone respect). It does **not** chase through to the originator.

Examples (assume idx 0 is Smith full case cite):

| Chain | `Id.` resolvedTo | `Id.` antecedentIndex |
|---|---|---|
| `Smith → Id.` | 0 | 0 (Smith is both immediate predecessor and the full cite) |
| `Smith → Smith, 1 U.S. at 115 (resolved) → Id.` | 0 | 1 (immediate predecessor is the resolved short-form at idx 1, not the full cite at 0) |
| `Smith → Id. at 115 → Id.` | 0 | 1 (immediate predecessor is `Id. at 115` at idx 1) |
| `Smith → unresolved short → Id.` | undefined | 1 (the unresolved short-form) |
| `Smith → unresolved short → unresolved parallel → Id.` | undefined | 2 (the parallel short-form, one step back) |
| (no prior citation) `Id.` | undefined | undefined |

### `resolveId` algorithm change

```ts
private resolveId(citation: IdCitation): ResolutionResult | undefined {
  // Pass 1: existing algorithm — find best full-cite candidate
  // (filters: scope, parenthetical, weak-signal, quote-zone, family).
  const fullCandidate = this.findResolvedFullAntecedent(citation)
  if (fullCandidate !== undefined) {
    const antecedentIndex = this.findImmediatePredecessor(citation)
    return {
      resolvedTo: fullCandidate.index,
      antecedentIndex,                 // may equal resolvedTo or point one step back
      confidence: fullCandidate.confidence,  // unchanged from current implementation
      warnings: fullCandidate.warnings,      // unchanged from current implementation
    }
  }

  // Pass 2: NEW — no resolved full cite found, but we may still have an
  // unresolved short-form predecessor. Bluebook-anchor to it.
  const antecedentIndex = this.findImmediatePredecessor(citation)
  if (antecedentIndex !== undefined) {
    return {
      resolvedTo: undefined,
      antecedentIndex,
      confidence: 0.7,
      warnings: [{
        level: "info",
        message: "Id. antecedent has unresolved authority; chained by position only",
        position: { start: citation.span.originalStart, end: citation.span.originalEnd },
      }],
    }
  }

  // Pass 3: existing — no preceding citation at all.
  return this.createFailureResult("No preceding citation found")
}
```

`findImmediatePredecessor` is a new helper that applies the same scope/parenthetical/weak-signal/quote filters as the existing chase, but **accepts unresolved short-forms** as the answer rather than continuing past them.

### `resolveSupra` and `resolveShortFormCase` parity

Both also get `antecedentIndex` populated for consistency. Consumers walking the chain need it regardless of citation type. The change is mechanical: for any successful resolution, record `antecedentIndex` alongside `resolvedTo`.

### Why "one step back" and not transitive

Same reason `pinciteInheritedFrom` is one step back: provenance is more useful than originator-only. A consumer walking the chain can always traverse transitively; one that only sees the originator loses the link history. This is also what citeproc-CSL does (`position=ibid` references the immediately prior cite, not the bibliography entry).

## Section 3: Backward Prose Case-Name Extraction

### When it runs

Inside `resolveShortFormCase`, as a **fallback after vol+reporter lookup fails**. Conceptually a resolution-time enrichment, not a parse-time decision — keeps extraction purely syntactic.

```ts
private resolveShortFormCase(citation: ShortFormCaseCitation): ResolutionResult | undefined {
  // Existing: try vol+reporter match against prior full citations
  const resolved = this.findFullCiteByVolumeReporter(citation)
  if (resolved !== undefined) {
    return {
      resolvedTo: resolved.index,
      antecedentIndex: this.findImmediatePredecessor(citation),
      confidence: resolved.confidence,   // unchanged from current implementation
    }
  }

  // NEW fallback: backward prose scan for "Party v. Party"
  if (citation.partyName) {
    const inferred = this.extractInferredCaseName(citation)
    if (inferred) {
      // Mutate the short-form in place with inferred metadata. No
      // synthetic FullCitation added to the citations array.
      citation.inferredCaseName = inferred.caseName
      citation.inferredCaseNameSpan = inferred.span
      if (inferred.plaintiff) citation.inferredPlaintiff = inferred.plaintiff
      if (inferred.defendant) citation.inferredDefendant = inferred.defendant
    }
  }

  return this.createFailureResult("No matching full case citation found")
}
```

### Why enrich the short-form, not synthesize a full citation

| Path | Pro | Con |
|---|---|---|
| **A. Enrich short-form** (chosen) | Non-invasive; no phantom citations in `citations[]`; consumers walk antecedentIndex to find inferred metadata | Short-form formally "unresolved" (`resolvedTo === undefined`); consumers need `caseName ?? inferredCaseName ?? partyName` fallback |
| B. Synthesize a `FullCaseCitation` | Resolution succeeds end-to-end; uniform output | Phantom citation has no organic `span`/`matchedText`; breaks "extract = parse, resolve = link" invariant; surprises iteration over `citations.length` |

Going with A. Architectural invariant is preserved; cost is a one-line fallback at consumer sites.

### Prose-scan algorithm

Refactor `extractCaseName` (`src/extract/extractCase.ts:~1150`) to expose its bounded-window backward-search for `Party v. Party` patterns as a reusable helper. New method `extractInferredCaseName` on `DocumentResolver` (or extracted to a sibling utility) calls it with:

- **Search window**: ~200 chars before the short-form's `span.cleanStart`.
- **Pattern**: existing `Party v. Party` regex from `extractCase.ts`.
- **Acceptance criteria**:
  1. Match found within the window.
  2. At least one matched party name matches `citation.partyName` (case-insensitive, normalized — reuse the same normalization the resolver uses at `DocumentResolver.ts:809-826`).
  3. Prefer the closest match to the short-form (scan walks backward from the short-form; first matching `Party v. Party` wins).

If no match: return `undefined`. Short-form stays unenriched, resolution still fails, but `antecedentIndex` from Section 2 still does its work.

### New optional fields on `ShortFormCaseCitation` and `SupraCitation`

```ts
/**
 * Case name inferred from prose preceding this short-form when no full
 * citation in `citations[]` matched its vol+reporter. Populated by the
 * resolver fallback for the "In Smith v. Jones... Smith, 100 F.2d at 200"
 * pattern. Consumers: prefer `caseName ?? inferredCaseName ?? partyName`.
 */
inferredCaseName?: string
/** Plaintiff side of the inferred case name. */
inferredPlaintiff?: string
/** Defendant side. */
inferredDefendant?: string
/** Span in original text where the inferred case name was found. */
inferredCaseNameSpan?: Span
```

`SupraCitation` gets the same four fields — `Yellen, supra` also benefits from prose inference.

### Composition with Section 2

For the Yellen scenario after both Sections 2 and 3 land:

| idx | citation | resolvedTo | antecedentIndex | inferredCaseName |
|---|---|---|---|---|
| 0 | Leach (full) | (n/a) | (n/a) | (n/a) |
| 1 | Yellen, 416 N.J. Super. at 590–91 | undefined | undefined | `"Yellen v. Kassin"` |
| 2 | 3 A.3d at 590–91 (parallel, no party) | undefined | 1 | undefined |
| 3 | Id. at 590 | undefined | 2 | undefined |

Consumer walks: `cites[3].resolution.antecedentIndex → cites[2] → antecedentIndex → cites[1] → inferredCaseName === "Yellen v. Kassin"` ✓

## Section 4: Quote-Zone Robustness

### Current bug

`detectQuoteZones` (`DocumentResolver.ts:109+`) pairs `"` characters greedily — first becomes open, next becomes close, etc. Orphan-close at start (e.g. `use." ...`) gets treated as open and mispairs with the next real-open, creating a phantom zone that engulfs surrounding citations and breaks `Id.`'s quote-boundary check.

### Fix: context-based open/close classification

Replace greedy pair-as-you-go with two-step:

1. **Classify** each `"` as open / close / ambiguous based on neighboring characters.
2. **Match** opens to closes with a stack, skipping ambiguous quotes and orphans.

Classification rules (English typographic conventions):

| `"` neighbors | Classification |
|---|---|
| **prev**: start-of-text \| whitespace \| `(` \| `[` \| `—`<br>**next**: letter or `(` | **open** |
| **prev**: letter \| digit \| `?` \| `!` \| `.` \| `,` \| `)` \| `]`<br>**next**: end-of-text \| whitespace \| `.` \| `,` \| `;` \| `:` \| `)` \| `—` | **close** |
| Otherwise | **ambiguous** (skip) |

### Pairing algorithm

```ts
opens: number[] = []
zones: Array<{ start: number; end: number }> = []

for (let i = 0; i < text.length; i++) {
  if (text[i] !== '"' && text[i] !== '“' && text[i] !== '”') continue

  // Typographic quotes are unambiguous.
  if (text[i] === '“') { opens.push(i); continue }
  if (text[i] === '”') {
    if (opens.length === 0) continue  // orphan close
    const openPos = opens.pop()!
    if (i - openPos <= MAX_INLINE_QUOTE_LEN) zones.push({ start: openPos, end: i + 1 })
    continue
  }

  // ASCII straight quote — classify by context.
  const cls = classifyAsciiQuote(text, i)
  if (cls === 'open') {
    opens.push(i)
  } else if (cls === 'close') {
    if (opens.length === 0) continue  // orphan close (e.g. mid-doc paste)
    const openPos = opens.pop()!
    if (i - openPos <= MAX_INLINE_QUOTE_LEN) zones.push({ start: openPos, end: i + 1 })
  }
  // ambiguous → skip
}
```

Apostrophes (`'`) are not double-quotes; ignored by this algorithm regardless. Nested single-quoted text inside double quotes works correctly.

### Why context-classifier, not parity-from-start

The standard "count `"` from start, parity says open/close" approach (used by several legal-text quote detectors) works for well-formed text starting from byte 0, but has the **same orphan-quote bug** when given mid-document input. eyecite-ts's input contract is "arbitrary text snippets" — not "full briefs only" — so parity-from-start is unreliable.

### Markdown block-quotes (lines starting with `>`)

Left unchanged. The existing line-based logic is already correct and unambiguous.

### Bug A vs Bug B priority

This fix targets Bug A (phantom quote zone from orphan quotes) — likely a test-artifact / direct-snippet issue rather than production. Bug B (Section 2: chase-past-unresolved) is the user-visible failure in real briefs. Including Bug A in this PR is defensive — costs are low, robustness gain is real.

## Files Modified

| File | Change |
|---|---|
| `src/resolve/types.ts` | Add `antecedentIndex?: number` to `ResolutionResult` |
| `src/resolve/DocumentResolver.ts` | (a) Replace `detectQuoteZones` algorithm with context-classifier. (b) Add `findImmediatePredecessor` helper. (c) Modify `resolveId` to two-pass: try full-cite first, fall back to antecedentIndex-only on failure. (d) Add `antecedentIndex` writes to `resolveSupra` and `resolveShortFormCase` for consistency. (e) Add `extractInferredCaseName` method, called as fallback in `resolveShortFormCase`. |
| `src/extract/extractCase.ts` | Refactor `extractCaseName` to expose its bounded-window backward `Party v. Party` matching as a reusable helper for `extractInferredCaseName`. (Alternative: copy the regex into the resolver helper without refactoring `extractCaseName` — pick during implementation based on how cleanly the existing function decomposes.) |
| `src/types/citation.ts` | Add `inferredCaseName?`, `inferredPlaintiff?`, `inferredDefendant?`, `inferredCaseNameSpan?` to `ShortFormCaseCitation` and `SupraCitation` |
| `tests/resolve/idWalksToUnresolvedAntecedent.test.ts` | NEW — Section 2 cases |
| `tests/resolve/shortFormProseNameFallback.test.ts` | NEW — Section 3 cases |
| `tests/resolve/quoteZoneRobustness.test.ts` | NEW — Section 4 cases |
| `tests/resolve/yellenFixture.test.ts` | NEW — end-to-end Yellen fixture verifying all three sections compose |
| `.changeset/id-clusters-with-unresolved-antecedent.md` | NEW — minor bump |

No changes to `src/index.ts` (all new types are properties on already-exported interfaces or are on the existing `ResolutionResult`).

## Testing

### Section 2 — `antecedentIndex`

`tests/resolve/idWalksToUnresolvedAntecedent.test.ts`:

- Direct: `Smith → unresolved Yellen short-form → Id.` — `Id.antecedentIndex === Yellen short-form index`; `Id.resolvedTo === undefined`; warning present.
- Chain: `Smith → unresolved short-form → unresolved short-form → Id.` — `Id.antecedentIndex === most-recent short-form` (one step back, not transitive).
- Both paths work together: `Smith → Id. → Id.` — both Id.s have `resolvedTo === 0` AND `antecedentIndex` set correctly (idx 0 for first Id., idx 1 for second).
- Transitive walk: consumer follows `antecedentIndex` chain until hitting a citation with `resolvedTo` set, OR `antecedentIndex === undefined`.

### Section 3 — Prose case-name extraction

`tests/resolve/shortFormProseNameFallback.test.ts`:

- Inferred from explicit `Party v. Party` in prose ≤200 chars back.
- Skipped when short-form has no `partyName`.
- Skipped when `partyName` doesn't match prose match.
- Window-bounded: prose mention >200 chars back not picked up.
- Inferred metadata reachable via `antecedentIndex` walk from a subsequent `Id.`.

### Section 4 — Quote-zone robustness

`tests/resolve/quoteZoneRobustness.test.ts`:

- Mid-doc paste with leading orphan close (`use." Smith, 1 U.S. 1. Id.`) — no phantom zone; citations resolve normally.
- Mid-doc paste with trailing orphan open (`Smith, 1 U.S. 1 "and so on`) — no phantom zone.
- Typographic quotes always pair correctly (`U+201C` / `U+201D`).
- Standard ASCII quotes pair correctly when well-formed.
- Apostrophes ignored.
- Markdown block-quote (`> ...`) lines still detected.

### End-to-end fixture

`tests/resolve/yellenFixture.test.ts`:

- Literal Leach / Yellen brief excerpt from the bug report.
- `Id. at 590` clusters with the Yellen parallel short-form (`antecedentIndex` walk reaches Yellen short-form).
- Yellen short-form has `inferredCaseName === "Yellen v. Kassin"`.
- `Id.` does **not** resolve to Leach.

### Regression

Run the existing 2975 tests — none should break. Each section is additive or strictly improves correctness on input shapes existing tests don't cover.

## Non-Goals

- **Synthesizing a `FullCaseCitation` from prose mentions.** We enrich the existing short-form rather than insert a phantom citation. If a future change wants to expose prose mentions as first-class extractable citations, that's a separate design.
- **Transitive `antecedentIndex` walk by the resolver.** The resolver records one-step-back only; transitive traversal is the consumer's responsibility. Matches `pinciteInheritedFrom` convention.
- **`clusterId` field for UI grouping.** A `clusterId` answers a different question (set membership without direction). Worth having on its own merits but out of scope here — `antecedentIndex` already supports the cluster question via transitive walk.
- **String-cite handling for prose extraction.** If the prose match itself is inside a string-cite (rare), we don't try to disambiguate — first matching `Party v. Party` wins.
- **Foreign-language prose patterns.** English `v.` / `v` only. Matches existing extractCaseName scope.
- **Parity-from-start quote algorithm.** Considered (used elsewhere in the broader legal-text ecosystem) but ruled out for eyecite-ts because the input contract permits arbitrary text snippets.

## Open Questions

None outstanding. Algorithm validated against Bluebook Rule 4.1 / Indigo R15.3.1 (research §1), Python eyecite reference (research §2), CSL/citeproc precedent (research §4), and in-codebase prior art `pinciteInheritedFrom` (research §5). Approach approved by user.

## Migration Notes (for the eventual changeset)

- **No breaking changes.** All new fields are optional. `resolvedTo` semantics unchanged.
- **New behavior — `Id.` after unresolved short-form** now clusters with that short-form (via `antecedentIndex`) instead of chasing past to the previous full cite. This is a correctness fix per Bluebook Rule 4.1; consumers reading `resolvedTo` see no change (it stays `undefined` for these chains), but consumers reading `antecedentIndex` see the new clustering.
- **New behavior — short-forms with prose-introduced authority** now carry `inferredCaseName` when a `Party v. Party` pattern appears in nearby prose. `resolvedTo` still `undefined` for these.
- **New behavior — orphan-quote inputs** no longer produce phantom quote zones. May change `Id.`/short-form resolution outcomes for tests or production inputs that started mid-document with a stray `"`. Expected impact: previously-failing resolutions now succeed.
- **For consumers walking provenance:** `resolution.antecedentIndex` is the new chain pointer. Walk transitively: `let cur = id.resolution.antecedentIndex; while (cur !== undefined && cites[cur].resolution.resolvedTo === undefined) cur = cites[cur].resolution.antecedentIndex`. Hits a `resolvedTo`-set citation or runs out.
