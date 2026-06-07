---
"eyecite-ts": minor
---

feat(extract): HistoryChain aggregate + id-based subsequent-history reference (#849)

Subsequent-history chains now expose an ordered `historyChain` aggregate (root → latest), shared by every member of the chain and keyed by stable `CitationId` — with new exported types `HistoryChain` / `HistoryLink`. The `subsequentHistoryOf` back-reference additionally carries `priorId` (the parent's stable id) alongside the retained numeric `index`. Built in the consolidated structuring pass (#860), so these relationships survive a consumer `filter`/`sort`/`map` of the result array. Additive — the flat `subsequentHistoryEntries` and `subsequentHistoryOf.index` fields are unchanged.
