---
"eyecite-ts": patch
---

fix: California Style Manual `at p.` / `at pp.` pincites (#236)

`LOOKAHEAD_PINCITE_REGEX`, `PINCITE_SKIP_REGEX`, all five short-form tokenizer
patterns (`ID_PATTERN`, `IBID_PATTERN`, `SUPRA_PATTERN`,
`STANDALONE_SUPRA_PATTERN`, `SHORT_FORM_CASE_PATTERN`), and the four local
regexes in `extractShortForms.ts` (`idRegex`, `partySupraRegex`,
`standaloneRegex`, `shortFormRegex`) now accept an optional `p.` / `pp.`
prefix between `at` and the page number, plus page-range support on supra
matches. This is the California Style Manual standard form
(`Smith, supra, at p. 115`, `Id. at pp. 125-130`, `18 Cal.4th at p. 717`,
`50 Cal.3d 100, at p. 115`).

### Why

CSM rule 1:1 requires `at p.` / `at pp.` for pincites, not Bluebook bare
`at <N>`. Every CA `supra at p.`, `Id. at p.`, and short-form `at p.` reference
previously produced a partial match with the pincite silently dropped, and
the bare full-case form `50 Cal.3d 100, at p. 115` lost the trailing pincite
entirely.

### State-reporter pattern tightened

The state-reporter pattern in `casePatterns.ts` previously absorbed
`18 Cal.4th at p. 717` as `reporter: "Cal.4th at p."` because the broad
multi-word reporter character class accepts `[A-Za-z.\d\s&']` and the
non-greedy quantifier extended through the literal "at" word. A negative
lookahead `(?!\s+at\s)` now rejects that boundary, letting the short-form
case pattern correctly handle CSM mid-paragraph short-form references.

### Tests

11 new tests (8 fixtures + 3 regression controls) cover supra, Id., short-form
case, and full case with `at p.` / `at pp.`, plus page-range forms.
