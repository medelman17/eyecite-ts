---
"eyecite-ts": minor
---

feat(resolve)+refactor(extract): consolidated structuring pass + id-based resolution references (#860)

The cross-citation linking passes — subsequent-history chains, parallel-caption propagation, string-cite grouping, and leading-signal detection — now run in a single `runStructuringPass` **after** `assignCitationIds` and on the final filtered array, so the relationships they build are keyed by stable `CitationId` rather than array position (and `subsequentHistoryOf.index` is no longer stale when false-positive filtering drops a citation). Set-changing passes (synthesis + filtering) continue to run before id-assignment.

Additively, resolution now exposes **id-based references** alongside the existing numeric indices: `ResolutionResult.resolvedToId` / `antecedentId`, and `pinciteInheritedFromId` on `Id.`/`supra`/short-form-case citations. These survive a consumer `filter`/`sort`/`map` of the result array, unlike the positional indices. Behavior-preserving for existing fields; the new id fields are additive. Unblocks the inter-citation aggregate slices (#849/#850/#857).
