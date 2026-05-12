---
"eyecite-ts": patch
---

fix: short-form case pincite accepts spelled-out `at page` / `at pages` (#344)

Short-form back-references using the full word `at page NNN` (rather
than the abbreviated `at NNN` or CSM `at p. NNN`) were tokenized as
`journal` citations instead of `shortFormCase`:

```
"281 Ala. at page 322" → type: "journal"     (was; should be shortFormCase)
"38 Ala.App. at page 186" → type: "journal"   (was; should be shortFormCase)
```

This is an Alabama-style writing convention but appears in other state
corpora as well. Downstream consumers filtering for `shortFormCase`
missed the citations entirely; the short-form resolver couldn't link
them to their full-cite antecedents.

### Fix

Extended the pincite-prefix alternation in both the tokenizer pattern
and the extractor's anchored re-match regex from `(?:pp?\.\s*)?` to
`(?:pp?\.\s*|pages?\s+)?`:

- `src/patterns/shortForm.ts` — `SHORT_FORM_CASE_PATTERN`
- `src/extract/extractShortForms.ts` — internal `shortFormRegex`

Both forms (`page`, `pages`) are now accepted before the digit pincite.

### Scope

Multi-pincite lists (`at pages 261 and 262`) capture the first pincite
only; the `and 262` is left for the surrounding text. Same as existing
behavior on hyphen-range pincites. A separate multi-pincite extension
(beyond `#247`) could pick up the second endpoint as a follow-up.

The same prefix tolerance for `Id. at page` / `Ibid. at page` is
explicitly out of scope — the issue points to a separate tracking
ticket for those.

### Tests

6 new tests under `spelled-out at page / at pages pincite prefix
(#344)` in `tests/extract/extractShortForms.test.ts`:

- `281 Ala. at page 322` → shortFormCase, `pincite: 322`, no journal
  misclassification
- `38 Ala.App. at page 186` → shortFormCase, `pincite: 186`
- `261 Ala. at pages 494` → shortFormCase, `pincite: 494`
- `252 Ala. at pages 261 and 262` → first pincite captured (list scope
  out of scope)
- Regression: abbreviated `at 322` still works
- Regression: CSM `at p. 717` still works

Full 2516-test suite passes; no regressions.
