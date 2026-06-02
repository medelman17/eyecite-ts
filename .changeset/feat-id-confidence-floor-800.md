---
"eyecite-ts": minor
---

feat(resolve): opt-in `idConfidenceFloor` abstention threshold for `Id.` (#800)

`resolveId` downgrades confidence and warns when the prose before `Id.` names a different case than the chosen antecedent, but always commits — unlike `resolveSupra`, which abstains below `partyMatchThreshold`. New resolution option `idConfidenceFloor` lets callers make `Id.` fail closed: when set and the computed confidence falls below it, `Id.` returns an unresolved result (carrying the existing ambiguity warning and a `failureReason`) instead of committing. Default is unset — behavior is unchanged and non-breaking.
