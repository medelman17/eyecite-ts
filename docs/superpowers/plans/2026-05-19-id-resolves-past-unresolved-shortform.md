# `Id.` Clusters With Unresolved Short-Form Predecessor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the resolver bug where `Id.` chases past an unresolved short-form (like `Yellen, 416 N.J. Super. at 590-91` whose case name appears only in prose) to the previous full citation (Leach), instead of clustering with the immediately preceding citation per Bluebook Rule 4.1 / Indigo Book R6.2.2.

**Architecture:** Three coordinated changes. (1) Add an additive `antecedentIndex` field on `ResolutionResult` — same chain-pointer shape as the existing `pinciteInheritedFrom`. (2) Make `resolveShortFormCase` enrich short-forms with `inferredCaseName` via backward prose scan when vol+reporter lookup fails. (3) Replace the greedy quote-pairing in `detectQuoteZones` with a context-based open/close classifier so mid-document text snippets don't produce phantom zones.

**Tech Stack:** TypeScript, Vitest 4, pnpm 10, Biome 2. Zero new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-05-19-id-resolves-past-unresolved-shortform-design.md`
**Research:** `docs/research/2026-05-19-id-unresolved-antecedent.md`

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/resolve/types.ts` | Modify | Add `antecedentIndex?: number` to `ResolutionResult` |
| `src/types/citation.ts` | Modify | Add `inferredCaseName?`, `inferredPlaintiff?`, `inferredDefendant?`, `inferredCaseNameSpan?` to `ShortFormCaseCitation` and `SupraCitation` |
| `src/resolve/DocumentResolver.ts` | Modify | (a) Rewrite `detectQuoteZones` with context classifier. (b) Add `findImmediatePredecessor` helper. (c) Modify `resolveId` to two-pass. (d) Populate `antecedentIndex` in `resolveSupra` and `resolveShortFormCase`. (e) Add `extractInferredCaseName` fallback inside `resolveShortFormCase`. |
| `tests/resolve/quoteZoneRobustness.test.ts` | Create | Quote-zone classifier tests (Section 4 of spec) |
| `tests/resolve/idWalksToUnresolvedAntecedent.test.ts` | Create | `antecedentIndex` chain tests (Section 2 of spec) |
| `tests/resolve/shortFormProseNameFallback.test.ts` | Create | Backward prose extraction tests (Section 3 of spec) |
| `tests/resolve/yellenFixture.test.ts` | Create | End-to-end fixture from bug report |
| `.changeset/id-clusters-with-unresolved-antecedent.md` | Create | Minor bump |

---

## Pre-flight

Verify you're on the right branch with the spec/research already present:

```bash
git rev-parse --abbrev-ref HEAD
# Expected: fix/id-resolves-past-unresolved-shortform

ls docs/superpowers/specs/2026-05-19-id-resolves-past-unresolved-shortform-design.md
ls docs/research/2026-05-19-id-unresolved-antecedent.md
# Both should exist.
```

If you're elsewhere, switch back and pop any lock-file stash (per `project_persistent_drift` memory: `package.json` + `pnpm-lock.yaml` are expected to show as modified — leave alone or stash during branch switches).

---

## Task 1: Type Additions

Pure type changes. Nothing runtime in this task.

**Files:**
- Modify: `src/resolve/types.ts` (~line 72, `ResolutionResult` interface)
- Modify: `src/types/citation.ts` (~line 787 for `ShortFormCaseCitation`, ~line 763 for `SupraCitation`)

- [ ] **Step 1.1: Add `antecedentIndex` to `ResolutionResult`**

Open `src/resolve/types.ts`. Find the `export interface ResolutionResult {` block. After the existing `resolvedTo?: number` declaration (and its JSDoc), insert this field declaration immediately before `failureReason`:

```ts
  /**
   * Index of the immediately preceding cited authority in document order,
   * regardless of whether *that* citation itself resolved to a full cite.
   * Bluebook Rule 4.1 / Indigo Book R6.2.2: `Id.` anchors here.
   *
   * - When the predecessor is a full citation or successfully-resolved
   *   short-form, this points one step back (may equal `resolvedTo`).
   * - When the predecessor is an unresolved short-form (e.g. because the
   *   case name appears only in prose), this still points at it; the
   *   `resolvedTo` field stays undefined.
   * - Records the immediate predecessor only; follow transitively via
   *   `resolutions[antecedentIndex].antecedentIndex` for the originator.
   *   Same idiom as `ShortFormCaseCitation.pinciteInheritedFrom`.
   */
  antecedentIndex?: number
```

- [ ] **Step 1.2: Add inferred-case-name fields to `ShortFormCaseCitation`**

Open `src/types/citation.ts`. Find `export interface ShortFormCaseCitation extends CitationBase {` (~line 787). After the existing `pinciteInheritedFrom?: number` declaration (added in 0.19.0; should be present), insert these four fields:

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
  /** Defendant side of the inferred case name. */
  inferredDefendant?: string
  /** Span in original text where the inferred case name was found. */
  inferredCaseNameSpan?: Span
```

- [ ] **Step 1.3: Add the same four fields to `SupraCitation`**

Find `export interface SupraCitation extends CitationBase {` (~line 763). After its existing `pinciteInheritedFrom?: number`, insert the same four field declarations (copy verbatim from Step 1.2 — the JSDoc applies identically).

- [ ] **Step 1.4: Verify the `Span` type is already imported**

In `src/types/citation.ts`, look at the imports at the top of the file. `Span` should already be imported from `./span` (used elsewhere in the file). No new import needed.

- [ ] **Step 1.5: Typecheck**

```bash
pnpm typecheck
```

Expected: passes with zero errors.

- [ ] **Step 1.6: Commit**

```bash
git add src/resolve/types.ts src/types/citation.ts
git commit -m "$(cat <<'EOF'
types: add antecedentIndex + inferredCaseName for Rule 4.1 clustering

Adds:
- ResolutionResult.antecedentIndex — chain pointer to the immediately
  preceding citation, regardless of resolution state. Same shape as the
  existing pinciteInheritedFrom field from 0.19.0.
- ShortFormCaseCitation/SupraCitation.inferredCaseName + plaintiff/
  defendant/span — for short-forms whose case name was extracted from
  preceding prose rather than from a structured full citation.

No runtime change in this commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Quote-Zone Robustness Fix

Replace the greedy ASCII-quote pairing with a context-based open/close classifier. Includes typographic-quote (U+201C / U+201D) unambiguous pairing.

**Files:**
- Modify: `src/resolve/DocumentResolver.ts` (`detectQuoteZones` function at ~line 109)
- Create: `tests/resolve/quoteZoneRobustness.test.ts`

- [ ] **Step 2.1: Write failing tests**

Create `tests/resolve/quoteZoneRobustness.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { IdCitation } from "@/types/citation"

describe("quote-zone robustness — orphan ASCII quotes", () => {
  it("orphan leading close-quote (mid-doc paste) does not create phantom zone", () => {
    // The leading `use."` is a mid-document orphan close. Without the fix,
    // the existing greedy pairing turns it into a phantom open and engulfs
    // Smith into a quote zone, which then rejects Smith as Id.'s antecedent.
    const text = `use." Smith v. Jones, 100 F.2d 50, 55 (1990). Id.`
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c): c is IdCitation => c.type === "id")
    expect(id?.resolution?.resolvedTo).toBeDefined()
    // Resolved to Smith (idx 0).
    expect(cites[id!.resolution!.resolvedTo!].type).toBe("case")
  })

  it("orphan trailing open-quote does not create phantom zone", () => {
    // Trailing orphan open at end-of-text.
    const text = `Smith v. Jones, 100 F.2d 50, 55 (1990). Id. "and so on`
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c): c is IdCitation => c.type === "id")
    expect(id?.resolution?.resolvedTo).toBeDefined()
  })
})

describe("quote-zone robustness — typographic quotes unambiguous", () => {
  it("curly quotes pair unambiguously even with adjacent orphan ASCII quote", () => {
    // Mix: curly quotes around the actual quoted text, plus an orphan ASCII
    // quote elsewhere. The curly pair should always be a zone; the ASCII
    // orphan should be ignored.
    const text = `He said "the rule is clear." use." Smith v. Jones, 100 F.2d 50, 55 (1990). Id.`
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c): c is IdCitation => c.type === "id")
    expect(id?.resolution?.resolvedTo).toBeDefined()
  })
})

describe("quote-zone robustness — well-formed ASCII still works", () => {
  it("standard balanced ASCII quotes around a quoted passage do not break resolution", () => {
    const text = `Smith v. Jones, 100 F.2d 50, 55 (1990). The court held "the rule applies." Id.`
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c): c is IdCitation => c.type === "id")
    expect(id?.resolution?.resolvedTo).toBeDefined()
  })

  it("apostrophes (single quotes) do not affect double-quote pairing", () => {
    const text = `Smith's case, 100 F.2d 50, 55 (1990). The court said "it's the rule." Id.`
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c): c is IdCitation => c.type === "id")
    expect(id?.resolution?.resolvedTo).toBeDefined()
  })
})
```

- [ ] **Step 2.2: Run tests to verify they fail (or pass for the wrong reason)**

```bash
pnpm exec vitest run tests/resolve/quoteZoneRobustness.test.ts 2>&1 | tail -20
```

Expected: The "orphan leading close-quote" test FAILS (this is the user-visible bug). Other tests may pass with current code (well-formed text already works). Note the failing assertion before proceeding.

- [ ] **Step 2.3: Replace the inline-quote loop in `detectQuoteZones`**

Open `src/resolve/DocumentResolver.ts`. Find the `detectQuoteZones` function (~line 109). Replace the entire **inline paired double-quotes** section (the comment "Inline paired double-quotes." through its loop) with the context-classifier-based algorithm. Keep the markdown blockquote scan (the `>` lines section) unchanged.

The new section (replace from `// Inline paired double-quotes.` through the closing of the for loop and the `openPos = -1` line):

```ts
  // Inline paired quotes. Two-step:
  //   1. Classify each quote-character as open / close / ambiguous based on
  //      neighboring characters (typographic conventions).
  //   2. Match opens to closes with a stack, skipping orphans and ambiguous.
  //
  // Why not greedy "first quote = open, next = close"? That mispairs when
  // input starts mid-document with an orphan close (e.g. `use." Smith...`),
  // creating a phantom zone that engulfs unrelated citations and breaks
  // Id. resolution. The classifier handles arbitrary text snippets
  // robustly. Typographic quotes (U+201C / U+201D) are unambiguous and
  // pair directly.
  const MAX_INLINE_QUOTE_LEN = 600
  const opens: number[] = []
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    // Typographic quotes: unambiguous.
    if (ch === "“") {
      opens.push(i)
      continue
    }
    if (ch === "”") {
      if (opens.length === 0) continue // orphan close
      const openPos = opens.pop()!
      if (i - openPos + 1 <= MAX_INLINE_QUOTE_LEN) {
        zones.push({ start: openPos, end: i + 1 })
      }
      continue
    }

    // ASCII straight double-quote: classify by neighbors.
    if (ch !== '"') continue
    const cls = classifyAsciiQuote(text, i)
    if (cls === "open") {
      opens.push(i)
    } else if (cls === "close") {
      if (opens.length === 0) continue // orphan close — discard
      const openPos = opens.pop()!
      if (i - openPos + 1 <= MAX_INLINE_QUOTE_LEN) {
        zones.push({ start: openPos, end: i + 1 })
      }
    }
    // ambiguous → skip
  }
```

Right before the existing `function detectQuoteZones(...)` declaration, add the classifier helper as a module-level function:

```ts
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

  const openPrev =
    prev === "" || /\s/.test(prev) || prev === "(" || prev === "[" || prev === "—"
  const openNext = /[A-Za-zÀ-ɏ]/.test(next) || next === "("
  if (openPrev && openNext) return "open"

  const closePrev = /[A-Za-z0-9À-ɏ.,?!:;)\]]/.test(prev)
  const closeNext = next === "" || /[\s.,;:)—\]]/.test(next)
  if (closePrev && closeNext) return "close"

  return "ambiguous"
}
```

- [ ] **Step 2.4: Run the new tests**

```bash
pnpm exec vitest run tests/resolve/quoteZoneRobustness.test.ts 2>&1 | tail -10
```

Expected: all 5 tests pass.

- [ ] **Step 2.5: Run the full test suite for regressions**

```bash
pnpm exec vitest run 2>&1 | tail -5
```

Expected: ALL tests pass. If any pre-existing quote-zone test fails, investigate — the change should preserve behavior for well-formed text. Most likely failure mode is that a test was relying on the orphan-pairing behavior; flip its assertion to match the new (correct) behavior and document the change in the commit.

- [ ] **Step 2.6: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint 2>&1 | tail -5
```

Expected: both pass.

- [ ] **Step 2.7: Commit**

```bash
git add src/resolve/DocumentResolver.ts tests/resolve/quoteZoneRobustness.test.ts
git commit -m "$(cat <<'EOF'
fix(resolve): context-based ASCII quote classifier in detectQuoteZones

Replaces greedy "first quote = open, next = close" pairing with a
context-based open/close classifier (English typographic conventions:
preceded by whitespace/punctuation-open vs letter/punctuation-close).
Typographic quotes (U+201C / U+201D) pair unambiguously.

The greedy algorithm produced phantom quote zones when given mid-
document text snippets (e.g. `use." Smith v. Jones... Id.`), causing
Id. resolution to fail because Smith was incorrectly placed inside a
phantom quote zone different from Id.'s.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `antecedentIndex` Population

Add the `findImmediatePredecessor` helper. Modify `resolveId` to fall back to `antecedentIndex`-only when no resolved full-cite candidate exists. Populate `antecedentIndex` in `resolveSupra` and `resolveShortFormCase` for consistency.

**Files:**
- Modify: `src/resolve/DocumentResolver.ts`
- Create: `tests/resolve/idWalksToUnresolvedAntecedent.test.ts`

- [ ] **Step 3.1: Write failing tests for `antecedentIndex` chain**

Create `tests/resolve/idWalksToUnresolvedAntecedent.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { Citation, IdCitation } from "@/types/citation"

describe("antecedentIndex — Id. clusters with unresolved short-form (Bluebook 4.1)", () => {
  it("Id. after unresolved Yellen short-form: antecedentIndex points at it, resolvedTo undefined", () => {
    // Yellen, 416 N.J. Super. at 590 is a shortFormCase. Vol+reporter
    // (416 N.J. Super.) has no match anywhere in this text → unresolved.
    // Id. that follows should anchor to the Yellen short-form
    // (antecedentIndex), NOT chase past it to Smith.
    const text =
      "Smith v. Jones, 100 F.2d 50, 55 (1990). Yellen, 416 N.J. Super. at 590. Id."
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c): c is IdCitation => c.type === "id")
    expect(id).toBeDefined()
    expect(id?.resolution?.resolvedTo).toBeUndefined()
    // Antecedent is the Yellen short-form (idx 1).
    expect(id?.resolution?.antecedentIndex).toBe(1)
  })

  it("antecedentIndex set even when resolvedTo is also set (one step back)", () => {
    // Smith full at idx 0, Id. at idx 1, second Id. at idx 2.
    // The second Id. resolves to Smith (resolvedTo=0) AND has
    // antecedentIndex=1 (one step back, the first Id.).
    const text = "Smith v. Jones, 100 F.2d 50, 55 (1990). Id. Id."
    const cites = extractCitations(text, { resolve: true })
    const ids = cites.filter((c): c is IdCitation => c.type === "id")
    expect(ids).toHaveLength(2)
    expect(ids[1].resolution?.resolvedTo).toBe(0)
    expect(ids[1].resolution?.antecedentIndex).toBe(1)
  })

  it("Id. immediately after a full cite: antecedentIndex equals resolvedTo", () => {
    const text = "Smith v. Jones, 100 F.2d 50, 55 (1990). Id."
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c): c is IdCitation => c.type === "id")
    expect(id?.resolution?.resolvedTo).toBe(0)
    expect(id?.resolution?.antecedentIndex).toBe(0)
  })

  it("chain via antecedentIndex: parallel unresolved short-forms cluster", () => {
    // Yellen short-form (idx 1) and 3 A.3d parallel (idx 2) both fail
    // vol+reporter lookup. The parallel's antecedentIndex points at the
    // Yellen short-form. Id. (idx 3) clusters with the parallel.
    const text =
      "Smith v. Jones, 100 F.2d 50, 55 (1990). Yellen, 416 N.J. Super. at 590, 3 A.3d at 590. Id."
    const cites = extractCitations(text, { resolve: true })
    expect(cites).toHaveLength(4)
    const shortFormCaseCount = cites.filter(
      (c: Citation) => c.type === "shortFormCase",
    ).length
    expect(shortFormCaseCount).toBe(2)

    // Walk: Id (3).antecedentIndex → 2 → antecedentIndex → 1.
    const id = cites[3] as IdCitation
    expect(id.type).toBe("id")
    expect(id.resolution?.antecedentIndex).toBe(2)
    expect(id.resolution?.resolvedTo).toBeUndefined()

    const parallel = cites[2]
    expect(parallel.type).toBe("shortFormCase")
    expect(
      (parallel as { resolution?: { antecedentIndex?: number } }).resolution
        ?.antecedentIndex,
    ).toBe(1)
  })

  it("no prior citation: antecedentIndex undefined", () => {
    const text = "Id. at 100."
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c): c is IdCitation => c.type === "id")
    expect(id?.resolution?.antecedentIndex).toBeUndefined()
    expect(id?.resolution?.resolvedTo).toBeUndefined()
  })
})
```

- [ ] **Step 3.2: Run tests to verify they fail**

```bash
pnpm exec vitest run tests/resolve/idWalksToUnresolvedAntecedent.test.ts 2>&1 | tail -20
```

Expected: tests FAIL — the `antecedentIndex` field is on the type but never populated by any resolver.

- [ ] **Step 3.3: Add `findImmediatePredecessor` helper**

Open `src/resolve/DocumentResolver.ts`. Inside the `DocumentResolver` class, near `resolveId` (~line 439), add this private method. Place it immediately *before* `resolveId`:

```ts
  /**
   * Find the immediate-preceding citation index for `antecedentIndex`
   * purposes. Bluebook Rule 4.1: `Id.` anchors to "the immediately
   * preceding cited authority" — unlike `resolveId`'s primary chase
   * (which only accepts resolved full antecedents), this lookup accepts
   * any prior citation that passes the existing scope / parenthetical /
   * weak-signal / quote-zone filters, regardless of resolution state.
   *
   * Returns the index of the immediately-preceding eligible citation,
   * or `undefined` if none.
   */
  private findImmediatePredecessor(citation: IdCitation): number | undefined {
    const currentIndex = this.context.citationIndex
    const citationZone = isInZone(citation.span.originalStart, this.quoteZones)

    for (let i = currentIndex - 1; i >= 0; i--) {
      // Apply the same filters as resolveId's main chase.
      if (this.isParentheticalChild(i)) continue
      if (!this.isWithinScope(i, currentIndex)) continue
      const candidateZone = isInZone(this.citations[i].span.originalStart, this.quoteZones)
      if (candidateZone && candidateZone !== citationZone) continue
      // Accept regardless of resolution state.
      return i
    }
    return undefined
  }
```

The signature uses `IdCitation` but the same logic is needed for `supra` and `shortFormCase`. Generalize the parameter type so it can be called from those resolvers too. Change the signature to:

```ts
  private findImmediatePredecessor(
    citation: IdCitation | SupraCitation | ShortFormCaseCitation,
  ): number | undefined {
```

The body is unchanged.

- [ ] **Step 3.4: Modify `resolveId` to two-pass**

Open `src/resolve/DocumentResolver.ts`. Find the existing `resolveId` method (~line 439). At the point in the function where it currently returns `this.createFailureResult("Antecedent citation outside scope boundary")` (when `candidates.length === 0`, ~line 491), insert a fallback pass before the failure return. Find this block:

```ts
    if (candidates.length === 0) {
      // Diagnose: did we have any preceding citation at all? If not, the
      // legacy failure message helps consumers debug "Id. before any cite".
      const anyPrior = currentIndex > 0
      return this.createFailureResult(
        anyPrior ? "Antecedent citation outside scope boundary" : "No preceding citation found",
      )
    }
```

Replace with:

```ts
    if (candidates.length === 0) {
      // No resolved full-cite candidate. Pass 2: try the immediate
      // predecessor regardless of resolution state — Bluebook Rule 4.1
      // anchors `Id.` to the immediately preceding cited authority, not
      // just to resolved ones. The chain pointer is recorded in
      // `antecedentIndex`; `resolvedTo` stays undefined.
      const antecedentIndex = this.findImmediatePredecessor(citation)
      if (antecedentIndex !== undefined) {
        return {
          resolvedTo: undefined,
          antecedentIndex,
          confidence: 0.7,
          warnings: [
            "Id. antecedent has unresolved authority; chained by position only",
          ],
        }
      }
      const anyPrior = currentIndex > 0
      return this.createFailureResult(
        anyPrior ? "Antecedent citation outside scope boundary" : "No preceding citation found",
      )
    }
```

Then find the successful-resolution return at the bottom of `resolveId` (~line 521-527):

```ts
    // Case-name window check: ...
    const { confidence, warnings } = this.applyCaseNameWindowCheck(best.index, citation)

    return {
      resolvedTo: best.index,
      confidence,
      warnings,
    }
```

Add `antecedentIndex` to the return:

```ts
    return {
      resolvedTo: best.index,
      antecedentIndex: this.findImmediatePredecessor(citation),
      confidence,
      warnings,
    }
```

- [ ] **Step 3.5: Populate `antecedentIndex` in `resolveSupra`**

Find `resolveSupra` (~line 700+). Find its successful return path (`return { resolvedTo: ..., confidence: ... }`) and add `antecedentIndex: this.findImmediatePredecessor(citation),` to the return object. Do not modify failure paths.

- [ ] **Step 3.6: Populate `antecedentIndex` in `resolveShortFormCase`**

Find `resolveShortFormCase` (~line 770+). Find its successful return path and add `antecedentIndex: this.findImmediatePredecessor(citation),`. Also add to the FAILURE return path — when vol+reporter lookup fails, we still want to record the immediate predecessor for chain walks. So both returns get `antecedentIndex`.

For the failure return specifically, replace:

```ts
      return this.createFailureResult("No matching full case citation found")
```

with:

```ts
      const antecedentIndex = this.findImmediatePredecessor(citation)
      if (antecedentIndex !== undefined) {
        return {
          resolvedTo: undefined,
          antecedentIndex,
          confidence: 0.5,
          warnings: ["No matching full case citation found; chained by position only"],
        }
      }
      return this.createFailureResult("No matching full case citation found")
```

- [ ] **Step 3.7: Run the antecedentIndex tests**

```bash
pnpm exec vitest run tests/resolve/idWalksToUnresolvedAntecedent.test.ts 2>&1 | tail -10
```

Expected: ALL 5 tests pass.

- [ ] **Step 3.8: Run the full test suite for regressions**

```bash
pnpm exec vitest run 2>&1 | tail -5
```

Expected: ALL tests pass. The `antecedentIndex` additions are purely additive on `ResolutionResult`; existing consumers don't read the new field.

- [ ] **Step 3.9: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint 2>&1 | tail -5
```

Expected: both pass.

- [ ] **Step 3.10: Commit**

```bash
git add src/resolve/DocumentResolver.ts tests/resolve/idWalksToUnresolvedAntecedent.test.ts
git commit -m "$(cat <<'EOF'
fix(resolve): populate antecedentIndex per Bluebook Rule 4.1

Adds findImmediatePredecessor helper that walks back applying the
existing scope / parenthetical / weak-signal / quote-zone filters
but accepts citations regardless of resolution state.

resolveId now has a two-pass structure: try the existing resolved-
full-cite chase first, then fall back to antecedentIndex-only when
no resolved candidate exists. This fixes the bug where Id. chased
past an unresolved short-form (case name in prose) to the previous
full citation — wrong authority.

resolveSupra and resolveShortFormCase populate antecedentIndex for
consistency, so consumers can walk the chain regardless of citation
type. shortFormCase also records antecedentIndex on failed lookups
so subsequent Id. can cluster with the unresolved short-form.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Backward Prose Case-Name Extraction

Add `extractInferredCaseName` method on `DocumentResolver`. Wire it into `resolveShortFormCase` as a fallback when vol+reporter lookup fails.

**Files:**
- Modify: `src/resolve/DocumentResolver.ts`
- Create: `tests/resolve/shortFormProseNameFallback.test.ts`

- [ ] **Step 4.1: Write failing tests**

Create `tests/resolve/shortFormProseNameFallback.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { Citation, ShortFormCaseCitation } from "@/types/citation"

describe("backward prose case-name extraction", () => {
  it("extracts case name from prose preceding a short-form when vol+reporter has no full match", () => {
    // "In Yellen v. Kassin" is the prose mention; the short-form has
    // partyName="Yellen". Vol+reporter (416 N.J. Super.) has no full match.
    // After this PR, the short-form should be enriched with inferredCaseName.
    const text =
      "Smith v. Jones, 100 F.2d 50, 55 (1990). In Yellen v. Kassin, the court held. Yellen, 416 N.J. Super. at 590."
    const cites = extractCitations(text, { resolve: true })
    const yellenShort = cites.find(
      (c): c is ShortFormCaseCitation =>
        c.type === "shortFormCase" && c.partyName === "Yellen",
    )
    expect(yellenShort).toBeDefined()
    expect(yellenShort?.inferredCaseName).toBe("Yellen v. Kassin")
    expect(yellenShort?.inferredPlaintiff?.toLowerCase()).toContain("yellen")
    expect(yellenShort?.inferredDefendant?.toLowerCase()).toContain("kassin")
  })

  it("does not infer when short-form has no partyName", () => {
    // Bare short-form `416 N.J. Super. at 590` — no party prefix.
    const text =
      "Smith v. Jones, 100 F.2d 50, 55 (1990). In Yellen v. Kassin, the court held. 416 N.J. Super. at 590."
    const cites = extractCitations(text, { resolve: true })
    const bareShort = cites.find(
      (c): c is ShortFormCaseCitation =>
        c.type === "shortFormCase" && !c.partyName,
    )
    expect(bareShort).toBeDefined()
    expect(bareShort?.inferredCaseName).toBeUndefined()
  })

  it("does not infer when prose case name does not match partyName", () => {
    // Prose mentions Smith v. Jones, but the short-form's partyName is
    // Yellen. No match → no inference.
    const text =
      "In Smith v. Jones, the court held. Yellen, 416 N.J. Super. at 590."
    const cites = extractCitations(text, { resolve: true })
    const yellenShort = cites.find(
      (c): c is ShortFormCaseCitation => c.type === "shortFormCase",
    )
    expect(yellenShort).toBeDefined()
    expect(yellenShort?.inferredCaseName).toBeUndefined()
  })

  it("vol+reporter match still wins over prose inference (no fallback when resolved)", () => {
    // Provide a full Yellen citation, then a short-form. Resolution
    // succeeds via vol+reporter; the prose-extraction fallback never runs.
    const text =
      "Yellen v. Kassin, 416 N.J. Super. 580 (App. Div. 2009). Yellen, 416 N.J. Super. at 590."
    const cites = extractCitations(text, { resolve: true })
    const yellenShort = cites.find(
      (c): c is ShortFormCaseCitation =>
        c.type === "shortFormCase" && c.partyName === "Yellen",
    )
    expect(yellenShort).toBeDefined()
    expect(yellenShort?.resolution?.resolvedTo).toBeDefined()
    expect(yellenShort?.inferredCaseName).toBeUndefined()
  })
})
```

- [ ] **Step 4.2: Run tests to verify they fail**

```bash
pnpm exec vitest run tests/resolve/shortFormProseNameFallback.test.ts 2>&1 | tail -20
```

Expected: tests FAIL — `inferredCaseName` is never populated.

- [ ] **Step 4.3: Add `extractInferredCaseName` method**

Open `src/resolve/DocumentResolver.ts`. Add this import at the top alongside other extract imports (find any existing `from "../extract/..."` import; if none, add a new one):

```ts
import { extractCaseName } from "../extract/extractCase"
```

Add this private method on `DocumentResolver`. Place it near `resolveShortFormCase` for proximity:

```ts
  /**
   * Backward prose scan for "Party v. Party" patterns preceding a
   * short-form citation whose vol+reporter lookup failed. Used to recover
   * a case name when the author introduced the authority in prose (e.g.
   * "In Yellen v. Kassin, ...") and used a short-form that didn't carry
   * an extractable full citation.
   *
   * Returns the inferred case name + spans, or `undefined` if no
   * acceptable match is found within `LOOKBACK` chars.
   */
  private extractInferredCaseName(
    citation: ShortFormCaseCitation,
  ):
    | {
        caseName: string
        plaintiff: string
        defendant: string
        span: Span
      }
    | undefined {
    const LOOKBACK = 200
    if (!citation.partyName) return undefined

    const result = extractCaseName(this.text, citation.span.cleanStart, LOOKBACK)
    if (!result) return undefined

    // Parse the case name into plaintiff/defendant via " v. " split.
    const vMatch = result.caseName.match(/^(.+?)\s+v\.\s+(.+)$/i)
    if (!vMatch) return undefined
    const plaintiff = vMatch[1].trim()
    const defendant = vMatch[2].trim()

    // Require the short-form's partyName to match one side (case-insensitive).
    const shortName = this.normalizePartyName(citation.partyName)
    const plaintiffNorm = this.normalizePartyName(plaintiff)
    const defendantNorm = this.normalizePartyName(defendant)
    if (shortName !== plaintiffNorm && shortName !== defendantNorm) return undefined

    return {
      caseName: result.caseName,
      plaintiff,
      defendant,
      // Span covers the case name in clean coordinates; map to original via
      // the citation's existing transformation. For now, store the clean
      // span shape; consumers can use it as an offset reference.
      span: {
        cleanStart: result.nameStart,
        cleanEnd: result.nameStart + result.caseName.length,
        originalStart: result.nameStart,
        originalEnd: result.nameStart + result.caseName.length,
      },
    }
  }
```

- [ ] **Step 4.4: Wire the fallback into `resolveShortFormCase`**

Find `resolveShortFormCase`. Locate the existing failure branch — where vol+reporter lookup fails. In Task 3, this branch was modified to populate `antecedentIndex`. Now also call `extractInferredCaseName` and mutate the citation before returning.

Find the failure return added in Task 3.6:

```ts
      const antecedentIndex = this.findImmediatePredecessor(citation)
      if (antecedentIndex !== undefined) {
        return {
          resolvedTo: undefined,
          antecedentIndex,
          confidence: 0.5,
          warnings: ["No matching full case citation found; chained by position only"],
        }
      }
      return this.createFailureResult("No matching full case citation found")
```

Insert the prose-extraction call BEFORE the antecedentIndex check (so the enrichment happens regardless of whether an antecedent exists). Replace the block with:

```ts
      // Backward prose scan: try to recover case name from preceding prose.
      const inferred = this.extractInferredCaseName(citation)
      if (inferred) {
        citation.inferredCaseName = inferred.caseName
        citation.inferredPlaintiff = inferred.plaintiff
        citation.inferredDefendant = inferred.defendant
        citation.inferredCaseNameSpan = inferred.span
      }

      const antecedentIndex = this.findImmediatePredecessor(citation)
      if (antecedentIndex !== undefined) {
        return {
          resolvedTo: undefined,
          antecedentIndex,
          confidence: 0.5,
          warnings: ["No matching full case citation found; chained by position only"],
        }
      }
      return this.createFailureResult("No matching full case citation found")
```

- [ ] **Step 4.5: Verify `Span` is imported into DocumentResolver**

Check the imports at the top of `src/resolve/DocumentResolver.ts`. `Span` should already be imported (used by other code). If not, add `import type { Span } from "../types/span"`.

- [ ] **Step 4.6: Run the prose-extraction tests**

```bash
pnpm exec vitest run tests/resolve/shortFormProseNameFallback.test.ts 2>&1 | tail -15
```

Expected: 4 tests PASS. If the test "extracts case name from prose..." fails with `inferredCaseName === undefined`, debug:
- Add a `console.log("extractCaseName result:", result)` temporarily inside `extractInferredCaseName` to see what `extractCaseName` returns for the Yellen text.
- The most likely cause: `extractCaseName` walks back from the short-form and may not pick up "Yellen v. Kassin" because that case name is too far back (more than 200 chars) or the function's internal boundary logic excludes it.
- If the function's defaults don't cover this case, increase `LOOKBACK` to 250 or 300 and retry. The spec specifies "~200 chars" as guidance, not strict.

- [ ] **Step 4.7: Run the full test suite**

```bash
pnpm exec vitest run 2>&1 | tail -5
```

Expected: all tests pass. The prose-extraction fallback only fires when vol+reporter lookup fails; successful resolutions are unchanged.

- [ ] **Step 4.8: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint 2>&1 | tail -5
```

Expected: both pass.

- [ ] **Step 4.9: Commit**

```bash
git add src/resolve/DocumentResolver.ts tests/resolve/shortFormProseNameFallback.test.ts
git commit -m "$(cat <<'EOF'
fix(resolve): backward prose extraction for short-form case names

When a ShortFormCaseCitation's vol+reporter lookup fails AND the
short-form carries a partyName, scan ~200 chars of preceding text for
a "Party v. Party" pattern via the existing extractCaseName helper.
If found AND one of the matched parties matches the short-form's
partyName, enrich the short-form with inferredCaseName / inferred
Plaintiff / inferredDefendant / inferredCaseNameSpan.

This recovers the case name for short-forms whose authority was
introduced in prose rather than as a structured full citation —
e.g. "In Yellen v. Kassin, ... Yellen, 416 N.J. Super. at 590" now
populates inferredCaseName = "Yellen v. Kassin" on the short-form.

No phantom full citation added to citations[]; resolvedTo stays
undefined for these chains. Consumers walking antecedentIndex from
a subsequent Id. can reach the enriched short-form to render the
case name. Consumers preferring caseName: try `caseName ?? inferred
CaseName ?? partyName`.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: End-to-End Yellen Fixture

The bug report's exact text, now exercising all three sections together.

**Files:**
- Create: `tests/resolve/yellenFixture.test.ts`

- [ ] **Step 5.1: Write the end-to-end fixture test**

Create `tests/resolve/yellenFixture.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { Citation, IdCitation, ShortFormCaseCitation } from "@/types/citation"

describe("Yellen / Leach end-to-end (bug report 2026-05-19)", () => {
  // The actual passage from the user's brief (HOA-adverse-possession context).
  const text = `Leach v. Anderl, 218 N.J. Super. 18, 30–31 (App. Div. 1987). In Yellen v. Kassin, the Appellate Division squarely held that where neighbors shared a driveway traversing both properties without objection, the use was "not recognized by the law as hostile to the property rights of the other, but [was] at all times permissive in character and subject to alteration as the needs of both neighbors changed over time." Yellen, 416 N.J. Super. at 590–91, 3 A.3d at 590–91. The court reversed the trial court's finding of mutual prescriptive easements, holding that the evidence "does not establish that the use of the driveways was hostile in the sense that either party considered use of the other's driveway under a claim of right with the intent to claim an interest in the other's property." Id. at 590.`

  it("Id. at 590 does NOT resolve to Leach (the user-reported bug)", () => {
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c): c is IdCitation => c.type === "id")
    expect(id).toBeDefined()
    // The bug: id.resolution.resolvedTo used to point at Leach (idx 0).
    // After this PR, resolvedTo is undefined (no full Yellen citation
    // in the array — Yellen's name lives in prose).
    expect(id?.resolution?.resolvedTo).toBeUndefined()
  })

  it("Yellen short-form has inferredCaseName from prose", () => {
    const cites = extractCitations(text, { resolve: true })
    const yellenShort = cites.find(
      (c): c is ShortFormCaseCitation =>
        c.type === "shortFormCase" && c.partyName === "Yellen",
    )
    expect(yellenShort).toBeDefined()
    expect(yellenShort?.inferredCaseName).toBe("Yellen v. Kassin")
  })

  it("Id. clusters with the parallel short-form via antecedentIndex", () => {
    const cites = extractCitations(text, { resolve: true })
    const id = cites.find((c): c is IdCitation => c.type === "id")
    expect(id?.resolution?.antecedentIndex).toBeDefined()

    // Walk: Id → parallel (3 A.3d) → Yellen short → ... → eventually
    // reaches the enriched short-form with inferredCaseName.
    let cur: number | undefined = id?.resolution?.antecedentIndex
    let foundInferred: string | undefined
    const visited = new Set<number>()
    while (cur !== undefined && !visited.has(cur)) {
      visited.add(cur)
      const c = cites[cur] as Citation & {
        resolution?: { antecedentIndex?: number }
        inferredCaseName?: string
      }
      if (c.inferredCaseName) {
        foundInferred = c.inferredCaseName
        break
      }
      cur = c.resolution?.antecedentIndex
    }
    expect(foundInferred).toBe("Yellen v. Kassin")
  })
})
```

- [ ] **Step 5.2: Run the fixture test**

```bash
pnpm exec vitest run tests/resolve/yellenFixture.test.ts 2>&1 | tail -15
```

Expected: ALL 3 tests pass.

If a test fails:
- "Id. at 590 does NOT resolve to Leach" failing means Tasks 2 or 3 didn't fully land. Verify by inspecting `id.resolution?.resolvedTo` in a console.log added temporarily.
- "Yellen short-form has inferredCaseName from prose" failing means Task 4 didn't fully land. Verify by inspecting `yellenShort?.inferredCaseName`.
- "Id. clusters via antecedentIndex" failing usually means the chain doesn't terminate at the inferred-name citation. Add a console.log to print the walk.

- [ ] **Step 5.3: Run the full test suite for sanity**

```bash
pnpm exec vitest run 2>&1 | tail -5
```

Expected: all tests pass.

- [ ] **Step 5.4: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint 2>&1 | tail -5
```

Expected: both pass.

- [ ] **Step 5.5: Commit**

```bash
git add tests/resolve/yellenFixture.test.ts
git commit -m "$(cat <<'EOF'
test(resolve): end-to-end Yellen fixture from bug report 2026-05-19

Locks in the user-reported scenario: real legal brief passage with
"Leach v. Anderl..." full cite, "In Yellen v. Kassin..." prose
mention, "Yellen, 416 N.J. Super. at 590-91" short-form (vol+reporter
unresolvable), parallel "3 A.3d at 590-91", and trailing "Id. at 590".

Before this PR's fixes, Id. at 590 resolved to Leach (wrong authority).
After: Id. has resolvedTo undefined, antecedentIndex pointing into the
chain, and transitive walk reaches the Yellen short-form with
inferredCaseName = "Yellen v. Kassin".

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Changeset

**Files:**
- Create: `.changeset/id-clusters-with-unresolved-antecedent.md`

- [ ] **Step 6.1: Write the changeset**

Create the file with this content:

```markdown
---
"eyecite-ts": minor
---

fix(resolve): Id. clusters with immediately preceding citation per Bluebook Rule 4.1, even when predecessor is an unresolved short-form

Three coordinated fixes resolve a class of bugs where `Id.` referred to the wrong authority when the immediately preceding short-form had no extractable full-citation antecedent (typically because the author introduced the case name in prose rather than as a structured citation).

**Behavior changes:**

- **`Id.` now clusters with the immediately preceding citation regardless of resolution state** (Bluebook Rule 4.1 / Indigo Book R6.2.2). Previously, `Id.` would chase past an unresolved short-form to the previous full citation — wrong authority. The bug surfaced in passages like `Leach v. Anderl, 218 N.J. Super. 18 (1987). In Yellen v. Kassin, ... Yellen, 416 N.J. Super. at 590-91, 3 A.3d at 590-91. ... Id. at 590.` where `Id. at 590` now correctly clusters with the Yellen short-form (whose case name was inferred from the prose mention) rather than resolving to Leach.
- **Short-form citations now carry `inferredCaseName`** when their case name was found in preceding prose (within ~200 chars) and their vol+reporter has no full-citation match in the array. The short-form remains formally unresolved (`resolvedTo` undefined), but consumers can render the case name via `caseName ?? inferredCaseName ?? partyName`.
- **Quote-zone detection is more robust** for mid-document text inputs. The previous greedy ASCII-quote pairing mistook orphan close-quotes (from snippets starting mid-sentence) for opens, creating phantom zones that broke `Id.` resolution. The new context-based classifier handles both typographic (`"` `"`) and ASCII (`"`) quotes correctly.

**New optional fields:**

- `ResolutionResult.antecedentIndex?: number` — chain pointer to the immediately preceding cited authority, regardless of resolution state. Same shape as the existing `ShortFormCaseCitation.pinciteInheritedFrom` from 0.19.0. Walk transitively for the chain's originator.
- `ShortFormCaseCitation.inferredCaseName?: string` — case name recovered from preceding prose when vol+reporter lookup fails.
- `ShortFormCaseCitation.inferredPlaintiff?: string`, `inferredDefendant?: string`, `inferredCaseNameSpan?: Span` — supporting fields for the inferred name.
- Same four `inferred*` fields on `SupraCitation`.

**Migration:**

- No breaking changes. All new fields are optional; `resolvedTo` semantics unchanged.
- Consumers wanting to follow the new chain pointer use `let cur = id.resolution.antecedentIndex; while (cur !== undefined) { /* inspect cites[cur]; advance cur = cites[cur].resolution?.antecedentIndex */ }`.
- Consumers rendering case names should fall back: `caseName ?? inferredCaseName ?? partyName`.
- The `Id.` resolution outcome for the unresolved-short-form-predecessor scenario changes from "resolves to previous full cite" (incorrect) to "antecedentIndex set, resolvedTo undefined" (Bluebook-correct). If any test was relying on the previous behavior, update it to use `antecedentIndex` for the chain walk.

See `docs/superpowers/specs/2026-05-19-id-resolves-past-unresolved-shortform-design.md` for the full design and `docs/research/2026-05-19-id-unresolved-antecedent.md` for the Bluebook + Python eyecite + CSL/citeproc reference validation.
```

- [ ] **Step 6.2: Commit**

```bash
git add .changeset/id-clusters-with-unresolved-antecedent.md
git commit -m "$(cat <<'EOF'
chore: changeset for Id. clustering with unresolved short-form

Minor bump — adds antecedentIndex on ResolutionResult, inferred case-
name fields on ShortFormCaseCitation/SupraCitation, and corrects Id.
resolution per Bluebook Rule 4.1 when predecessor is an unresolved
short-form.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Final Verification

- [ ] **Step 7.1: Full test suite + typecheck + lint + build**

```bash
pnpm exec vitest run && pnpm typecheck && pnpm lint && pnpm build 2>&1 | tail -10
```

Expected: all four pass. Tests should show approximately 2975 + ~15 new = ~2990 passing.

- [ ] **Step 7.2: Bundle size check**

```bash
pnpm size 2>&1 | tail -10
```

Expected: within budget (main: 36-37 / 50 kB, utils: 1.8 / 3 kB). The new code is small (~80 lines added to `DocumentResolver.ts`, ~4 fields on types); should not move the size needle significantly.

- [ ] **Step 7.3: Review the diff**

```bash
git log --oneline main..HEAD
git diff main..HEAD --stat
```

Expected: 6 commits (Tasks 1, 2, 3, 4, 5, 6) plus the spec + research docs already on the branch. Stat should show changes concentrated in `src/resolve/`, `src/types/`, `tests/resolve/`, plus the changeset.

- [ ] **Step 7.4: Hand off**

Implementation complete. Open a PR (don't push automatically — confirm with the user first per project conventions). Suggested PR title: **"fix(resolve): Id. clusters with immediately preceding citation per Bluebook Rule 4.1"**.
