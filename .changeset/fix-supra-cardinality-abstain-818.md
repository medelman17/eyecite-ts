---
"eyecite-ts": patch
---

fix(resolve): `supra` abstains / degrades on non-unique party-name keys (#818)

`resolveSupra` silently committed to one authority at confidence 1.0 when a
`supra`'s party-name key matched **>1 distinct in-scope authority** (the
name-keyed history collapsed them via last-write-wins, hiding the ambiguity).
`fullCitationHistory` is now a `Map<string, number[]>`, and `resolveSupra` applies
a hybrid policy: exactly one authority resolves as before; a **true tie** (same
name + same year, indistinguishable by the key) **abstains**; otherwise it picks
the most-recent-within-name but **caps confidence and warns**, with
`idConfidenceFloor` able to fail it closed — mirroring the `Id.` path (#800/#820).
Parallel-cite siblings and re-citations (shared `groupId`, or volume-reporter-page)
collapse to a single authority, so they never trigger false ambiguity.
