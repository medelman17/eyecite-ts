---
"eyecite-ts": minor
---

feat(types): add a stable `CitationId` to every citation (#856)

`extractCitations()` now stamps each result citation with a stable `id` (`c0`, `c1`, … in document order) on `CitationBase`, and exports a `byId(citations)` helper mapping ids to citations. The id is stable **within a single result set** — it survives consumer `filter`/`sort`/`map`, unlike array position — and is the identity basis for the forthcoming inter-citation aggregates (parallel groups, history chains, short-form references). It is **not** durable across runs; use `toDurableLocator()` for cross-run identity. Additive and non-breaking: `id` is optional and is always populated by `extractCitations()`.
