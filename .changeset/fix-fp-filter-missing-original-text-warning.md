---
"eyecite-ts": patch
---

fix(filter): warn when applyFalsePositiveFilters called without originalText (#606)

Resolves #606. `applyFalsePositiveFilters` silently skipped the
line-crossing check (#547) when the `originalText` parameter was
omitted, letting line-crossing false positives slip through.

Now emits a one-time `console.warn` (per process, idempotent across
repeated calls) when called without `originalText` AND the input
contains at least one case/shortFormCase citation (the only types
the line-crossing check applies to). Pure statute / journal / neutral
inputs do not trigger the warning.

The signature is unchanged so this is a non-breaking patch. JSDoc
updated to mark `originalText` as **strongly recommended**.

Internal export `_resetMissingOriginalTextWarning()` added for test
fixtures.

5 regression tests in
`tests/extract/issueFpFilterMissingOriginalTextWarning.test.ts`.
