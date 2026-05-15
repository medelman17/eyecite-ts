---
"eyecite-ts": patch
---

fix: docket-number pattern accepts space-separated parts (e.g. `18 C 7039`)

Northern District of Illinois (and some other federal district
courts) use space-separated docket numbers like `18 C 7039`
(year + court code + sequence). The pattern only allowed
hyphen-separated parts, so:

```
Carter v. Illinois Gaming Board, No. 18 C 7039 (N.D. Ill. Nov. 25, 2019)
```

was silently dropped.

### Fix

Extended the docket-number character class in both
`docketPatterns.ts` and `extractDocket.ts` to allow space
separators alongside hyphens:

```
[A-Za-z\d]+(?:[-\s][A-Za-z\d]+)*
```

The outer pattern's mandatory `\s+\(` before the court+year
parenthetical preserves the natural bound — the docket-number
stops where the court+year paren begins.

### Tests

3 new tests in `tests/extract/extractDocket.test.ts`:
- N.D. Ill. `No. 18 C 7039 (N.D. Ill. Nov. 25, 2019)` (user-reported)
- N.D. Ill. shorter form `No. 18 CV 1234`
- hyphen-separated `No. 18-cv-7039` regression sentinel

Full 2939-test suite passes.
