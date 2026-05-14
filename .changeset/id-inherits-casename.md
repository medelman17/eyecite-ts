---
"eyecite-ts": minor
---

feat: `Id.` inherits caseName / plaintiff / defendant from antecedent

Previously, `Id.` citations carried only pincite metadata (with
pincite-inheritance added in v0.16.1). The caption fields
(`caseName`, `plaintiff`, `defendant`, `proceduralPrefix`) had
to be retrieved via `resolution.resolvedTo` walking, which is
inconvenient for consumers that just want each citation to
describe its case.

### Fix

`IdCitation` now exposes optional `caseName`, `plaintiff`,
`defendant`, `plaintiffNormalized`, `defendantNormalized`, and
`proceduralPrefix` fields. The resolver populates them from the
antecedent when `resolve: true` and the antecedent is a `case`
citation. Behavior unchanged for:
- statute / non-case antecedents (no caption to inherit)
- `resolve: false` (no resolver pass)
- `Id.` with no antecedent

### Tests

9 new tests in `tests/resolve/idInheritsCaseName.test.ts`:
basic case inheritance, `In re` proceduralPrefix propagation,
plaintiff/defendant inheritance, chained `Id.`, no-antecedent
no-op, statute-antecedent no-op, `resolve: false` no-op, and
short-form chain transitive inheritance. Full 2901-test suite
passes.
