---
"eyecite-ts": patch
---

fix: `Id.` without explicit pincite inherits antecedent's pincite (Bluebook 4.1)

When a full citation carries a pincite — `Smith v. Jones, 100
F.2d 50, 55 (1990)` — and is followed by a bare `Id.` (no
`at NNN`), Bluebook Rule 4.1 says the `Id.` refers to the same
page cited in the antecedent. Previously, the resolver left
`Id.pincite` as `undefined` in that case, losing the page
reference.

### Fix

In `DocumentResolver.resolve()`, after `Id.` resolution attaches
`resolvedTo`, propagate the antecedent's `pincite` and
`pinciteInfo` onto the `Id.` citation when the `Id.` does not
already carry an explicit `at NNN`. Behavior unchanged for:
- `Id. at 62` (explicit pincite wins)
- Antecedent with no pincite (nothing to inherit)
- `resolve: false` (no resolver pass, no inheritance)

### Tests

12 new tests in `tests/resolve/idInheritsPincite.test.ts`:
basic inheritance, range pinciteInfo propagation, `Ibid.`
support, explicit-override paths, no-antecedent and
no-resolve no-op paths, chained-`Id.` semantics, and
statute-antecedent edge case. Full 2867-test suite passes.
