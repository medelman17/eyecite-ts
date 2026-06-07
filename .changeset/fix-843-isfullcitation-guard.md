---
"eyecite-ts": patch
---

Fix `isFullCitation` silently misclassifying `regulation` and `stateRule` (#843). The guard hand-listed only 18 of the 20 `FullCitationType` members, so any consumer routing on it (e.g. `groupByCase`, custom pipelines) dropped those two types. The guard now reads a runtime inventory (`FULL_CITATION_TYPES`) that the compiler proves is an exact bijection with `FullCitationType` — via a `Record<FullCitationType, true>` map whose keys must list every union member — so the guard can never again omit a full type. Adds an exhaustiveness test asserting `isFullCitation` accepts every `FullCitationType` literal and rejects every `ShortFormCitationType` literal.
