# Design: Parallel Citation Detection Across Pincite-Between Gaps

**Date:** 2026-05-19
**Status:** Approved by user, ready for implementation plan
**Related research:** [`docs/research/2026-05-19-parallel-citation-detection.md`](../../research/2026-05-19-parallel-citation-detection.md)

## Background

A real legal brief passage:

> Randolph Town Ctr., L.P. v. County of Morris, **374 N.J. Super. 448**, 453–55, **864 A.2d 1191** (App. Div. 2005), aff'd in part, **186 N.J. 78**, **891 A.2d 1202** (2006); see also Yellen v. Kassin, **416 N.J. Super. 113**, 120, **3 A.3d 584** (App. Div. 2010).

Contains three logical authorities, each with parallel cites:
- Randolph App. Div. 2005: `374 N.J. Super. 448` + `864 A.2d 1191`
- Randolph N.J. 2006 (affirmance): `186 N.J. 78` + `891 A.2d 1202`
- Yellen App. Div. 2010: `416 N.J. Super. 113` + `3 A.3d 584`

### The bug

`eyecite-ts@0.20.0` detects only **one** of the three pairs — the Randolph affirmance (`186 N.J. 78` + `891 A.2d 1202`), where no pincite sits between primary and secondary. The other two pairs go undetected.

The cause is in `src/extract/detectParallel.ts`. The gap text between two case-shape tokens must satisfy:

```ts
const MAX_PROXIMITY = 5  // chars after the comma to the next citation
// ...
const distanceAfterComma = gapText.length - commaIndex - 1
if (distanceAfterComma > MAX_PROXIMITY) break
```

For `374 N.J. Super. 448, 453–55, 864 A.2d 1191`, the gap text `, 453–55, ` is 10 chars — fails the 5-char check. The presence of a pincite between primary and secondary breaks detection.

### Why this matters

Per the **Indigo Book R12.3** (verified in [research §1](../../research/2026-05-19-parallel-citation-detection.md)), pincite-between is the **canonical Bluebook form**, not an edge case:

> 261 Ill. App. 3d 443, 633 N.E.2d 764 (1993)

is the standard pattern. The current detection only catches the *less common* no-pincite variant. Most real-world parallel citations are missed.

### Why we're choosing reuse over rewrite

The research surveyed Python eyecite, CourtListener, Westlaw, Lexis+, LawCite, and CSL-M. Findings:

- **Python eyecite has the same bug class** ([open PR #288](https://github.com/freelawproject/eyecite/pull/288), debate going back to [issue #76](https://github.com/freelawproject/eyecite/issues/76) since May 2021).
- **eyecite-ts's data model is already richer** than upstream's — we have `groupId` + `parallelCitations[]` + `groupByCase()` utility. Both per-reporter and per-case views are supported today.
- **Industry convention is "fold at the cluster boundary, not the parser."** Westlaw, Lexis+, CourtListener, etc. all expose per-reporter spans from extraction and consolidate downstream. No reason to change the data model.

So the fix is narrow: extend the gap classifier in `detectParallel.ts` to also accept pincite-between text, reusing the existing `parsePincite` helper.

## Algorithm

In `src/extract/detectParallel.ts`, replace the `MAX_PROXIMITY` check with a structural classifier that accepts two gap shapes:

```ts
const gapText = cleanedText.substring(gapStart, gapEnd)

// Case A: tight comma — canonical Bluebook with no pincite between cites.
const tight = /^,\s*$/.test(gapText)

// Case B: pincite-between — comma-separated pincite list bracketed by commas.
// Strip leading `,\s*` and trailing `\s*,\s*`, split inner on commas, require
// every segment to parse as a pincite via the existing parsePincite helper.
let pinciteBetween = false
if (!tight) {
  const inner = gapText.match(/^,\s*(.+?)\s*,\s*$/)
  if (inner) {
    const segments = inner[1].split(/\s*,\s*/)
    pinciteBetween = segments.length > 0 && segments.every((s) => parsePincite(s) !== null)
  }
}

if (!tight && !pinciteBetween) break  // gap isn't a recognized shape
```

### Replaced check

The existing block (after the bracket-form check):

```ts
// Bluebook requires comma separator for parallel citations
if (!gapText.includes(",")) {
  break // No comma = not parallel, stop looking
}

// Check proximity: distance from comma to next citation start
// MAX_PROXIMITY enforces tight spacing: "A, B" not "A,      B"
const commaIndex = gapText.indexOf(",")
const distanceAfterComma = gapText.length - commaIndex - 1
if (distanceAfterComma > MAX_PROXIMITY) {
  break // Too far apart, stop looking
}
```

is replaced by the tight/pinciteBetween block above.

### Key invariants

- **Tight case unchanged**: `, ` between cites still works exactly as before. No regression.
- **Pincite-between case accepted**: `, NNN, `, `, NNN-NN, `, `, NNN, NNN, `, `, *NNN, `, `, ¶ N, `, `, NNN n.N, ` — anything `parsePincite()` accepts as a single pincite, in a comma-separated list.
- **`parsePincite` is single source of truth** for "is this a pincite." All current and future pincite shapes (page/range/star/¶/footnote/etc.) are accepted automatically.
- **Defense in depth via shared parenthetical**: the existing `hasSharedParenthetical` check on the secondary still gates final acceptance — both cites must close into the same `(year)`. So a comma-separated digit sequence that doesn't have a shared paren is still rejected.

### `MAX_GAP_FOR_PARALLEL` adjustment

Current `MAX_GAP_FOR_PARALLEL = 20` is too narrow for realistic pincite gaps like `, 410-13 nn. 5-10, ` (~17 chars; `, 453-55, 460, ` is 14). Widen to **80** to comfortably cover real-world cases without enabling pathological scans. The pincite-validation gate inside the loop is the real false-positive defense; the outer cap is just an early-exit performance optimization.

### `MAX_PROXIMITY` constant

Remove. The check it enabled is now replaced by the structural classifier. No callers outside `detectParallel.ts`.

### Why the alternatives were rejected (per research §6)

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **A. Widen `MAX_PROXIMITY` to ~30** | One-line change | Tolerates random text like `, see also, ` | Rejected — too permissive |
| **B. Hand-rolled regex for pincite shapes** | No dependency on `parsePincite` | Re-implements page/range/star/¶/footnote variants; drift risk; future pincite improvements don't propagate | Rejected — duplicate work |
| **C. Reuse `parsePincite` (chosen)** | Single source of truth; auto-covers all pincite forms; small change | Slightly more code than A | Chosen |

## Files Modified

| File | Change |
|---|---|
| `src/extract/detectParallel.ts` | Replace `MAX_PROXIMITY` check with structural tight-or-pincite-between classifier. Import `parsePincite`. Widen `MAX_GAP_FOR_PARALLEL` to 80. Remove `MAX_PROXIMITY` constant. |
| `tests/extract/detectParallelPinciteBetween.test.ts` | NEW — focused unit tests for the new gap shapes (page, range, multi-pincite, star, paragraph, footnote, negative cases) |
| `tests/extract/randolphFixture.test.ts` | NEW — end-to-end fixture from the bug report; asserts all three parallel pairs detected + string-cite anomaly auto-resolves |
| `.changeset/parallel-cites-pincite-between.md` | NEW — patch bump describing the detection fix |

No type changes; no consumer-facing API changes. Output shape unchanged: `groupId` and `parallelCitations[]` get populated correctly for more inputs.

## Testing

### Unit tests for the new gap shapes

`tests/extract/detectParallelPinciteBetween.test.ts` covers:

- `", NNN, "` (single page pincite between)
- `", NNN-NN, "` (page range)
- `", NNN, NNN, "` (multi-pincite list, per `parsePincite.additionalPincites`)
- `", *N, "` (star pagination)
- `", ¶ N, "` (paragraph pincite, per #204)
- `", NNN n.N, "` (footnote pincite)
- **Negative**: `", see also, "` — gap with prose text → no parallel detected.
- **Negative**: `", page 453 of, "` — mixed prose and digits → no parallel detected.

### End-to-end fixture

`tests/extract/randolphFixture.test.ts` — the full Randolph passage:

```
Randolph Town Ctr., L.P. v. County of Morris, 374 N.J. Super. 448,
453–55, 864 A.2d 1191 (App. Div. 2005), aff'd in part,
186 N.J. 78, 891 A.2d 1202 (2006); see also Yellen v. Kassin,
416 N.J. Super. 113, 120, 3 A.3d 584 (App. Div. 2010).
```

Asserts:

1. **All three parallel pairs detected** — six case citations form three distinct `groupId`s, with the right `parallelCitations[]` on each primary.
2. **String-cite anomaly auto-resolves** — `891 A.2d 1202` (Randolph affirmance secondary) no longer shares a `stringCitationGroupId` with `416 N.J. Super. 113` (Yellen primary). The string-cite walker now correctly pairs the Yellen primary with the Randolph N.J. 78 primary (or doesn't pair them — whichever the corrected behavior is; verify empirically).

### Regression coverage

Run the full ~2995-test suite. Tests likely affected:

- `tests/extract/extractCase.test.ts` — has parallel-cite coverage; existing tests that exercised pre-fix detection should still pass.
- `tests/extract/parallel*.test.ts` if any exist — verify alignment.
- `tests/integration/realWorldCorpusFixtures.test.ts` — fixture counts may shift (some previously-unpaired cites now pair into groups).
- `tests/integration/resolution.test.ts` — indirect impact if parallel cites affect resolver behavior.

If anything regresses, **surface as a concern; don't silently flip assertions**. Most likely regression: a fixture that counted `unique authorities` may now report fewer (because parallels collapse via `groupByCase`), which is the correct new behavior. Adjust the count and document.

## Non-Goals

- **Data-model change** (one entity per case vs. N entities linked by `groupId`). Research confirms current model is industry-correct and consumer-side dedupe via `groupByCase()` is the right pattern.
- **String-cite algorithm rewrite** (`detectStringCites.ts`). The existing logic becomes correct once parallel detection improves. No code change to that file. Regression test in the Randolph fixture verifies.
- **Python-eyecite-style `full_span_start` detection** — restructuring case-name backward search to derive parallel groups. Bigger refactor; not required when reusing `parsePincite` works.
- **Subsequent-history clause handling** (`aff'd in part, ...`). Existing subsequent-history detection in `extractCase.ts` separately tags these via `subsequentHistoryOf`. Out of scope; verified working in the Randolph fixture pre-fix (idx 3 has `subHistOf: 1`).

## Open Questions

None outstanding. Research validated against Indigo Book R12.3, Python eyecite, and industry tools.

## Migration Notes (for the changeset)

- **Patch bump** — bug fix, no API or output-shape change. Existing consumers see strictly more `groupId`/`parallelCitations[]` populations on already-extracted citations.
- **Behavior change** — `detectParallel` now accepts parallel citations separated by a pincite (`vol rep page, pincite, vol rep page`). This is the canonical Bluebook form per Indigo Book R12.3; the previous behavior was incomplete. Consumers calling `groupByCase()` will see fewer logical groups when input contains this form (each pair collapses from two groups into one — correct behavior).
- **Indirect string-cite improvement** — when parallel detection succeeds on a pair, `stringCitationGroupId` no longer cross-groups the parallel's secondary with an unrelated cite after a `;` separator.
- **No new fields, no new types.** Existing `groupId`, `parallelCitations[]`, `groupByCase()` work unchanged.
