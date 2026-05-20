---
"eyecite-ts": patch
---

docs(README): fix Post-Extraction Utilities example to match real signatures (#574)

The example block in "Post-Extraction Utilities" called `groupByCase`, `toReporterKey`, and `getSurroundingContext` with arguments that don't type-check. `groupByCase` requires `ResolvedCitation[]` (so the example now calls `extractCitations(text, { resolve: true })`), `toReporterKey` requires a `FullCaseCitation` (narrowed via `isCaseCitation`), and `getSurroundingContext` takes a `{ start, end }` span plus a `{ maxLength }` option — not the citation itself with `{ chars }`. The example output for `toReporterKey` is also corrected from `"500-F.2d-123"` to `"500 F.2d 123"` to match the real `formatKey` output. No runtime behaviour changes; docs only.
