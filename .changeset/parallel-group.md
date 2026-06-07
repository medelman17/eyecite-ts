---
"eyecite-ts": minor
---

feat(extract): ParallelGroup aggregate (#850)

Parallel citations (the same case reported in multiple reporters) now expose a `parallelGroup` aggregate (new exported `ParallelGroup` type) listing every member — including itself — by stable `CitationId` in document order. Combined with `byId()`, this resolves the full sibling citations rather than the lossy `{ volume, reporter, page }` value-copies on `parallelCitations`. Built in the consolidated structuring pass (#860), so it survives a consumer `filter`/`sort`/`map`. Additive — the flat `groupId` label and `parallelCitations` array are unchanged.
