---
"eyecite-ts": minor
---

Extract and normalize subsequent history signals: new `subsequentHistoryEntries` and `subsequentHistoryOf` fields on `FullCaseCitation` with 36 pattern variants normalized to 15 canonical `HistorySignal` values. Bidirectional parent-child linking with chained history aggregation. Replaces unused `subsequentHistory?: string` field.
