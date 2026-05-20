---
"eyecite-ts": patch
---

fix(resolve): Id. `antecedentIndex` agrees with `resolvedTo` on success path (#508)

After #498 made `resolveId` a single-source-of-truth resolver, the two
pointers were still computed separately: `resolvedTo` from the family/
scope-aware primary chase, `antecedentIndex` from a position-only
`findImmediatePredecessor` walk. The two diverged in ~8% of `Id.`
citations — typically when an intervening statute sat between a
case-style `Id.` and its full case antecedent.

`resolveId` now sets `antecedentIndex` to the primary-chase result on
the success path so consumers see one source of truth.
`findImmediatePredecessor` still drives the pass-2 fallback for chained
unresolved short-forms. Supra and short-form-case resolution paths are
unchanged.

Note: chained `Id. Id.` sequences (`Smith. Id. Id.`) now report
`antecedentIndex = 0` (Smith) on the second `Id.` rather than `1`
(first `Id.`), reflecting the post-#498 invariant that `Id.` anchors
to a specific resolved authority.
