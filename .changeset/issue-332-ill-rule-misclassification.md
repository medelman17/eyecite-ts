---
"eyecite-ts": patch
---

fix: suppress phantom case citation for `vol Ill. 2d R. ruleNum` (#332)

Illinois Supreme Court Rules are cited as `177 Ill. 2d R. 234`
(volume + reporter + `R.` + rule number). The state-reporter
tokenizer pattern's lazy reporter capture was absorbing ` R.` into
the reporter (yielding `reporter: "Ill.2d R."`, `page: 234`) and
emitting a phantom case citation for a non-existent case.

### Fix

Add a negative lookahead `(?! R\.\s+\d)` to the inner loop of the
`state-reporter` pattern in `src/patterns/casePatterns.ts`. When the
lazy reporter expansion would consume ` R.` followed by a digit, the
lookahead fires, the whole match fails, and the input is left
untokenized.

Resulting behavior on `177 Ill. 2d R. 234`:

```
before: { type: "case", volume: 177, reporter: "Ill.2d R.", page: 234 }
after:  (no citation emitted)
```

### Scope

This is the minimum fix that removes the wrong output. Producing a
typed rule citation (`type: "rule"` with `ruleSet` / `rule` fields) is
a larger feature — it requires a new citation type in the discriminated
union and isn't done here. Suppressing the false positive is strictly
better than emitting a wrong one downstream.

Other Illinois rule forms outside the canonical `vol Ill. (2d )?R. num`
shape (`Ill. R. Evid. 403`, `Ill. R. App. P. 5`, `Sup. Ct. R. 137`) are
left for a follow-up — they either don't tokenize as cases today or
need their own pattern.

### Tests

7 new tests under `Illinois rule-marker boundary in state-reporter
pattern (#332)` in `tests/extract/extractCase.test.ts`:

- `177 Ill. 2d R. 234` → 0 case citations
- Normalized `177 Ill.2d R. 234` → 0
- Trailing year-paren `177 Ill. 2d R. 431 (1997)` → 0
- Older `100 Ill. R. 5` → 0
- Mixed text: rule suppressed, real `234 Ill. 2d 5` case preserved
- Regression: real `177 Ill. 2d 1` still emits a case citation
- Regression: `123 Ill. App. 3d 456` reporter unaffected

Full 2492-test suite passes; no regressions.
