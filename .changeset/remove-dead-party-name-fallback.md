---
"eyecite-ts": patch
---

refactor(resolve): remove the dead pre-Phase-7 party-name prose fallback (#876)

The resolver's `extractPartyName` — a "pre-Phase 7 compatibility" fallback that scanned ~100 chars of raw prose backward for a `Party v. Party,` caption when extraction hadn't attached party names — is dead code: extraction's structured `plaintiffNormalized` / `defendantNormalized` subsume it, and the full suite stays green with it disabled. Removing it also retired the resolver's last original-text read, so the write-only `text` field went with it (the `text` constructor argument is retained — it still backs the `cleanedText` fallback).

One of the three resolver prose-re-parsing sites in #876 is thus eliminated (not relocated); behavior-preserving. The remaining two — the `Id.` antecedent-mismatch window and the `extractInferredCaseName` lookback — scan free prose for case names that aren't extracted citations, so they belong with the bare-party-reference work (#439) rather than a standalone relocation.
