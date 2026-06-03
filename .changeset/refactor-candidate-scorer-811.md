---
"eyecite-ts": patch
---

refactor(resolve): route `Id.` antecedent selection through a candidate-list scorer seam (#811)

`resolveId`'s inline `preferred ?? candidates[0]` (family-preference + recency) pick is now expressed as an explicit `scoreAntecedentCandidates` / `selectAntecedent` step — the deterministic seam for a future feature-based learning-to-rank model, swappable without changing callers. **No behavior change**: the scorer reproduces the prior selection exactly (all existing resolutions identical). `supra` (similarity-ranked) and short-form-case (party-name overlap) selection route through the same seam in a follow-up, since they weight different features.
