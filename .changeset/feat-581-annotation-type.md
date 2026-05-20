---
"eyecite-ts": minor
---

feat(extract): add A.L.R. `annotation` citation type (#581)

Previously, A.L.R. citations like `100 A.L.R.2d 1234` were harvested by
the broad state-reporter regex and emitted as
`{ type: "case", reporter: "A.L.R.2d" }`. The American Law Reports
series is secondary authority (annotations on narrow legal issues), not
case law, so this mis-classification leaked into downstream consumers.

A new `annotation` citation type captures these correctly with
`{ series, volume, page, year? }`. The pattern recognizes the full
A.L.R. series family:

- `A.L.R.` (first series)
- `A.L.R.2d`, `A.L.R.3d`, `A.L.R.4th`, `A.L.R.5th`, `A.L.R.6th`, `A.L.R.7th`
- `A.L.R. Fed.`, `A.L.R. Fed. 2d`, `A.L.R. Fed. 3d`

Pattern priority is set above `casePatterns` so the A.L.R. match wins
overlap dedup against the state-reporter regex; the previous phantom
case citation is no longer emitted.

Public API additions: `AnnotationCitation`, `extractAnnotation`,
`alr-annotation` pattern, `AnnotationComponentSpans`. `"annotation"`
added to `CitationType` and `FullCitationType` unions. `toBluebook`
renders annotations as `<vol> <series> <page>` with optional `(year)`.
