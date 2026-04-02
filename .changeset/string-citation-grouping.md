---
"eyecite-ts": minor
---

Add string citation grouping to detect semicolon-separated citations supporting the same legal proposition. Citations in a group share a `stringCitationGroupId`, with `stringCitationIndex` and `stringCitationGroupSize` for position tracking. Introductory signal words (see, see also, cf., but see, etc.) are now captured on the `signal` field of all citation types via the new `CitationSignal` type.
