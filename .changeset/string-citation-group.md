---
"eyecite-ts": minor
---

feat(extract): StringCitationGroup aggregate (#857)

String citations (citations chained for one proposition, `See A; B; C`) now expose a `stringCitationGroup` aggregate (new exported `StringCitationGroup` type) listing every member — including itself — by stable `CitationId` in document order, plus the group's leading signal. Built in the consolidated structuring pass (#860), so it survives a consumer `filter`/`sort`/`map`. Additive — the flat `stringCitationGroupId` / `stringCitationIndex` / `stringCitationGroupSize` fields are unchanged. Completes the inter-citation aggregates alongside HistoryChain (#849) and ParallelGroup (#850).
