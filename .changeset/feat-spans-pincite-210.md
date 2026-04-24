---
"eyecite-ts": minor
---

feat: populate `spans.pincite` on `ShortFormCaseCitation`, `IdCitation`, `SupraCitation`, and `NeutralCitation` (#210)

Previously `spans.pincite` was populated only on `FullCaseCitation`. The
four short-form / short-form-like citation types did not surface a
pincite offset, so downstream consumers had to either trust
`span.originalEnd` (which works for short-form/Id/supra by coincidence
but sits *before* the pincite on `NeutralCitation`) or fall back to a
brittle `indexOf(pinciteInfo.raw, ...)` search.

**Added:**

- `IdComponentSpans`, `SupraComponentSpans`, `ShortFormCaseComponentSpans`
  types (currently carrying just `pincite?: Span`, extensible)
- `pincite?: Span` on the existing `NeutralComponentSpans`
- `spans?: <Type>ComponentSpans` on `IdCitation`, `SupraCitation`,
  `ShortFormCaseCitation`
- Populated `spans.pincite` in `extractId`, `extractSupra`,
  `extractShortFormCase`, and `extractNeutral`, using the existing
  `spanFromGroupIndex` helper and the same pattern used by
  `FullCaseCitation`

**Behavior:**

- `spans.pincite` is set when (and only when) the extractor captures a
  pincite via its regex. Absent pincite → `spans.pincite` undefined.
- The `spans.pincite.originalStart` / `originalEnd` point to the pincite
  substring in the original (pre-clean) text — e.g. `462-65`,
  `462 n.14`, `*3-*5`.

Seven new tests covering all four types, footnote-carrying pincite,
star-page range pincite, and the no-pincite case.

No breaking changes — all additions are optional fields on types that
already permitted `spans` on their full-case counterpart.
