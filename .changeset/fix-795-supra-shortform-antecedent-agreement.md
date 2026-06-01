---
"eyecite-ts": patch
---

fix(resolve): supra/shortFormCase `antecedentIndex` agrees with `resolvedTo` on success path (#795)

#508 established that a resolved short-form's `antecedentIndex` mirrors
`resolvedTo` on the success path so consumers have one source of truth, but
applied the fix only to the `Id.` resolver. The supra and short-form-case
success paths still computed `antecedentIndex` from a position-only
`findImmediatePredecessor` walk, so when an intervening citation of a
different case sat between the resolved antecedent and the short form, the
two pointers disagreed: `resolvedTo` pointed at the resolved antecedent
while `antecedentIndex` pointed at the intervening cite.

The three success paths now mirror `resolvedTo`:
`createSupraSuccess`, the short-form-case party-name match, and the
short-form-case recency fallback. `findImmediatePredecessor` remains the
fallback only for the unresolved/positional path, where `resolvedTo` is
undefined (e.g. the case name appears only in prose) and a subsequent `Id.`
still needs to cluster with the short form.

Example: `Brown ... Mapp ... Brown, supra` now reports
`antecedentIndex = resolvedTo` (Brown) instead of pointing at the
intervening Mapp.
