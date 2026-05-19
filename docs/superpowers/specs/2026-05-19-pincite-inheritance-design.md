# Design: Pincite Inheritance for Short-Form Citations

**Date:** 2026-05-19
**Status:** Approved by user, ready for implementation plan
**Related research:** [`docs/research/2026-05-19-pincite-inheritance.md`](../../research/2026-05-19-pincite-inheritance.md)

## Background

Bluebook Rule 4.1 says a bare `Id.` (no explicit `at NNN`) refers to "the same source and same page as the immediately preceding citation." When the preceding citation is itself an `Id. at X`, the bare `Id.` inherits `X`. Today, `eyecite-ts` does **not** propagate pincites correctly through chains that contain intermediate pincite changes.

### The bug

`DocumentResolver.ts:285-302` already inherits pincite when `Id.` has none — but only from the citation at `resolution.resolvedTo`. Because `resolvedTo` is **flat** (every short-form points directly to the terminal full citation, never to an intermediate), the inheritance silently misses any pincite introduced mid-chain:

| Input | Expected (Bluebook) | Current behavior |
|---|---|---|
| `Smith, 1 U.S. 1, 100 → Id. at 115 → Id.` | bare Id. pincite = `115` | bare Id. pincite = `undefined` (chases past `Id. at 115` to `Smith`, which has its own `100`, not `115`) |
| `Smith → Jones → Smith, supra, at 50 → Id.` | bare Id. pincite = `50` | bare Id. pincite = `undefined` (chases past `supra` to `Smith`) |

The bug doesn't affect the simple case `Smith, at 100 → Id. → Id.`, because both Id.s correctly resolve to `Smith` and inherit `Smith.pincite = 100`.

### Why this hasn't been done upstream

The Python `eyecite` reference does no inheritance at all — it stores whatever pincite the `Id.` token captured and validates it against the full citation's page range (see [research §2](../../research/2026-05-19-pincite-inheritance.md)). `eyecite-ts` already exceeds upstream by propagating pincite from the terminal antecedent; this work extends that propagation to the Bluebook-correct intermediate antecedent.

## Algorithm

After the main `resolve()` loop has populated `resolutions[]` and built `resolved[]`, run a **single post-resolution pass** that walks each short-form citation's predecessors and inherits the first eligible pincite.

```
for each i in 0..resolved.length-1:
  cit = resolved[i]
  if !isShortFormCitation(cit): continue
  if resolutions[i]?.resolvedTo === undefined: continue
  if cit.pincite !== undefined || cit.pinciteInfo !== undefined: continue

  targetPrimary = resolutions[i].resolvedTo
  currentParenDepth = parenDepths[i]

  for j from i-1 down to 0:
    cand = resolved[j]

    // Bluebook 4.1 explicit exception: parenthetical-nested cites
    // are NOT intervening authorities.
    if parenDepths[j] > currentParenDepth: continue

    candPrimary = isFullCitation(cand) ? j : resolutions[j]?.resolvedTo
    if candPrimary !== targetPrimary: break   // authority boundary

    if cand.pincite !== undefined:
      if !pinciteTypeCompatible(cit, cand): break       // numeric ↔ string mismatch
      if !pinciteWithinRange(targetPrimary, cand.pincite): break  // MAX_OPINION_PAGE_COUNT

      cit.pincite              = cand.pincite
      cit.pinciteInfo          = cand.pinciteInfo
      cit.pinciteInherited     = true
      cit.pinciteInheritedFrom = j
      break
```

### Key invariants

- **Single left-to-right pass.** Each citation only inherits from prior indices, so one pass suffices — no fixpoint iteration.
- **Operates on `resolved`, not `this.citations`.** Earlier iterations' inherited pincites are visible to later iterations, which is required for chains like `Smith → Id. at 115 → Id. → Id.` (last Id. inherits from the middle Id., which was itself inherited).
- **Provenance = immediate predecessor.** `pinciteInheritedFrom` records the citation index the pincite was copied *from*, not the chain's originator. Consumers wanting the originator transitively follow `pinciteInheritedFrom` until they hit a citation where `pinciteInherited` is false.
- **Walks backward, stops at boundaries.** Stops on (a) authority mismatch (different `resolvedTo`), (b) successful inheritance, (c) reaching index `-1`. Bounded; no cycles possible.
- **Parenthetical-depth skip.** Mirrors Bluebook Rule 4.1's explicit exclusion of explanatory-parenthetical cites from the "intervening authority" rule. Uses existing `DocumentResolver.parenDepths[]`.
- **Type compatibility gate.** Mirrors the existing inline block's `typeof antecedent.pincite === "number"` check — a numeric pincite never propagates to a statute, a string section never propagates to a case.
- **MAX_OPINION_PAGE_COUNT validation.** Inherited pincite must fall within `[fullPage, fullPage + MAX_OPINION_PAGE_COUNT)` of the terminal full citation. Default `150`, matches Python eyecite. Configurable via resolver options for long opinions (cf. eyecite issue #104).

## Type Changes

Add two optional fields to `IdCitation`, `SupraCitation`, and `ShortFormCaseCitation` in `src/types/citation.ts`. Parallel additions — these three interfaces don't share a discriminated subtype below `CitationBase`, and the fields don't belong on `CitationBase` (full citations never inherit pincites).

```ts
export interface IdCitation extends CitationBase {
  // ...existing fields...

  /**
   * True if `pincite` was inherited from a preceding same-authority citation
   * per Bluebook Rule 4.1. Absent (undefined) when pincite was extracted
   * directly from this citation's text or when no pincite was set.
   */
  pinciteInherited?: boolean

  /**
   * Array index (in the resolved-citations output) of the citation from
   * which `pincite` was inherited. Set only when `pinciteInherited` is true.
   * Records the immediate predecessor; follow transitively for the originator.
   */
  pinciteInheritedFrom?: number
}
```

Same two fields repeated on `SupraCitation` and `ShortFormCaseCitation`.

**Spans:** `spans.pincite` is **not** set on inheriting citations. The inherited pincite has no text span in the descendant's own text; the span belongs to the citation referenced by `pinciteInheritedFrom`.

**No new exports.** Both fields are optional properties on already-exported interfaces.

## Pipeline Placement

A new private method on `DocumentResolver`:

```ts
private inheritPincites(resolved: ResolvedCitation[]): void { ... }
```

Called once at the end of `resolve()`, after the main loop builds `resolved[]`, before returning:

```ts
resolve(citations: Citation[]): ResolvedCitation[] {
  // ... existing setup: parenDepths, scope, etc.
  const resolved: ResolvedCitation[] = []
  for (let i = 0; i < citations.length; i++) {
    // resolve antecedent, build resolutions[i], push to resolved[]
  }

  this.inheritPincites(resolved)   // NEW
  return resolved
}
```

### What changes in the existing main-loop inheritance block

`DocumentResolver.ts:285-302` (the existing inline inheritance block) is split:

- **Removed:** the pincite/pinciteInfo propagation (lines 290-303). Replaced by `inheritPincites`.
- **Kept:** the case-name/plaintiff/defendant/proceduralPrefix propagation (lines 305-313). Case names belong to the *terminal authority*, not to intermediate Id.s, so the existing `antecedent = this.citations[resolution.resolvedTo]` lookup remains correct.
- **Kept:** the re-scoring via `scoreCitation` (lines 322-338). The new pass does **not** re-score — pincite presence isn't an input to current confidence axes. If a future change makes scoring pincite-sensitive, a re-score call gets added in a follow-up PR.

### What `inheritPincites` reads

- `resolved` (input/output, mutated in place) — used for both the walk and `isFullCitation` checks. Resolved entries preserve the `type` discriminant, so no need to cross-reference `this.citations`.
- `this.resolutions[]` — for `candPrimary` lookup when a walked predecessor is a short-form.
- `this.parenDepths[]` — for the parenthetical-exception check.
- A small helper to fetch the terminal full citation given `resolvedTo` (for `pinciteWithinRange`).

## Testing

**Extend the existing test file:** `tests/resolve/idInheritsPincite.test.ts` already covers single-hop inheritance (cases that work today via the inline block). The new chained/intermediate/supra/statute cases get added as new `describe` blocks in that file. Same convention, single source of truth for pincite-inheritance tests.

Tests use `extractCitations(text, { resolve: true })` end-to-end (the existing pattern).

### Test groups

```
describe("pincite inheritance — basic")
  Case 1:  Smith, 1 U.S. 1, 100 → Id.                     → 100
  Case 2:  Smith → Id. at 115 → Id.                        → 115  (regression)
  Negative: Id. at 42 after anything                       → 42, pinciteInherited undefined
  Negative: bare Id. after cite with no pincite            → undefined, no inheritance

describe("pincite inheritance — chains")
  Case 3:  Smith → Id. at 115 → Id. at 200 → Id.          → 200
  Case 4:  Smith, at 100 → Id. at 115 → Id. → Id.         → both inherit 115
  Provenance: last Id. in case 4 has pinciteInheritedFrom = index of middle Id.

describe("pincite inheritance — authority boundaries")
  Case 5:  Smith → Id. at 115 → Jones, at 50 → Id.        → 50
  Case 6:  Smith → Id. at 115 → Id. → Jones → Id.         → undefined (Jones has no pincite)

describe("pincite inheritance — parenthetical exception")
  Case 7:  Smith, at 100 (citing Other, at 5) → Id.       → 100  (skips parenthetical)
  Case 14: Smith → Id. at 115 → Id. (citing Other) → Id.  → 115 for both bare Id.s

describe("pincite inheritance — short-form & supra intermediates")
  Case 8:  Smith → Smith, 1 U.S. at 115 → Id.             → 115
  Case 9:  Smith → Jones → Smith, supra, at 50 → Id.      → 50

describe("pincite inheritance — statute (section-style)")
  Case 10: 42 U.S.C. § 1983 → Id. § 1983(c) → Id.         → § 1983(c)  (preserves pinciteInfo)

describe("pincite inheritance — signals don't break chains")
  Case 11: Smith → see also Id. at 115 → see Id.          → 115

describe("pincite inheritance — footnotes")
  Case 12: fn1: Smith, at 100. fn2: Id. at 115. fn3: Id.  → 115
           (respects existing "footnote" scope strategy)

describe("pincite inheritance — validation guard")
  Case 13: Smith, 1 U.S. 1 → Id. at 9999                  → 9999 rejected on
           the explicit Id. (existing behavior); subsequent bare Id. → undefined
```

### Assertion shape

```ts
const cites = extractCitations(text, { resolve: true })
const idCit = cites[N]   // or use a `findId(cites)` helper as the existing file does
expect(idCit.type).toBe("id")
expect(idCit.pincite).toBe(115)
expect(idCit.pinciteInherited).toBe(true)
expect(idCit.pinciteInheritedFrom).toBe(M)
```

### What is NOT tested in this PR

- **Fixture-level integration regression.** Unit-style tests above cover the algorithm. If a regression surfaces in eval scripts later, we add a fixture case then.
- **Cycle guard.** The walk is bounded (`j >= 0`, strictly decreasing); cycles aren't representable. A code comment notes the invariant — no test needed.
- **Pincite-affected confidence scoring.** This PR does not change scoring inputs; no rescore tests required.

## Files Modified

| File | Change |
|---|---|
| `src/types/citation.ts` | Add `pinciteInherited?: boolean` and `pinciteInheritedFrom?: number` to `IdCitation`, `SupraCitation`, `ShortFormCaseCitation` |
| `src/resolve/DocumentResolver.ts` | Remove pincite-inheritance lines from the existing inline block (~lines 290-303). Add `private inheritPincites(resolved)` method. Call it once at end of `resolve()`. |
| `tests/resolve/idInheritsPincite.test.ts` | **Extend** with the new chained/intermediate/parenthetical/supra/statute test groups. Existing single-hop tests stay (and continue to pass under the new pass). |
| `.changeset/<random>.md` | New changeset describing the inheritance fix (minor bump — new optional fields, behavior change for short-form pincites) |

No changes needed to `src/index.ts` (the new fields are properties on already-exported interfaces).

## Non-Goals

- **Re-scoring inheriting citations.** Out of scope until a confidence axis depends on pincite.
- **Case-name inheritance for `Supra` and `ShortFormCaseCitation`.** Currently only `Id.` gets case-name inheritance. Expanding that is a separate concern.
- **Removing the MAX_OPINION_PAGE_COUNT validation entirely.** Default stays at 150, configurable; making it dynamic per-volume is a separate ticket.
- **Validating pincite type compatibility for *all* cross-type chains.** The gate is "don't propagate a numeric to a statute and vice versa." Finer distinctions (e.g., page vs. paragraph vs. star-pagination within case-family) are not in scope; they share `PinciteInfo` shape.

## Open Questions

None outstanding. Algorithm validated against Bluebook Rule 4.1 (research §1) and Python eyecite reference (research §2); approach approved by user.

## Migration Notes (for the eventual changeset)

- **Behavior change — `Id.`:** `Id.` already inherited pincite from its terminal antecedent (the full citation at `resolvedTo`). It now *additionally* inherits from intermediate `Id. at X` and `supra, at X` predecessors when they share the same authority. This is the Bluebook-correct semantic and fixes a real bug — see the spec body for the failure modes.
- **Behavior change — `Supra` and `ShortFormCaseCitation`:** these gain pincite inheritance for the first time. Previously, bare `supra` (no `at NNN`) and bare short-form-case never inherited; they now do, scoped to the same authority chain.
- **New fields:** `pinciteInherited` and `pinciteInheritedFrom` are optional. Consumers reading `pincite` without checking provenance see the inherited value as if it were extracted directly — which is the Bluebook-correct semantic.
- **Provenance:** consumers wanting to distinguish "writer explicitly wrote `at NNN`" from "inherited per Rule 4.1" should branch on `pinciteInherited`. Consumers wanting the originating citation should follow `pinciteInheritedFrom` transitively until they hit a citation where `pinciteInherited` is false/undefined.
