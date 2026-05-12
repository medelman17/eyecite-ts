---
"eyecite-ts": patch
---

fix: statute `section` field no longer absorbs the sentence-ending period (#283)

When a statute citation was the last token of a sentence — `17 P.S. § 91.`,
`Ariz. Rev. Stat. Ann. § 16-141.`, `N.Y. Election Law § 131.`, `M.G.L. c. 93A, § 2.`
— the section-body regex greedily consumed the trailing period, producing
`section: "91."` / `"16-141."` / `"131."` / `"2."`. The contamination also
extended into `matchedText`, breaking exact-match equality, deduplication
against canonical statute references, and offset-based annotation.

### Root cause

Three tokenizer regexes used a section-body character class that included
`.` directly (`[A-Za-z0-9.:/-]*` and `[\w./-]+`):

- `abbreviated-code` in `src/data/stateStatutes.ts` (most states)
- `named-code` in `src/patterns/statutePatterns.ts` (NY/CA/TX/MD/VA/AL)
- `mass-chapter` in `src/patterns/statutePatterns.ts` (MA)

USC and CFR patterns were unaffected because their classes already
excluded `.` (CFR uses the safer `\d+(?:\.\d+)?[A-Za-z0-9-]*` shape).

### Fix

Replaced the period-permissive class with a guarded alternation:

```
(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*
```

A period is only consumed when followed by an alphanumeric character
(positive lookahead). Internal decimals (`226.5`, `17.46`, `1.5(a)`) and
hyphenated sections (`16-141`, `39-13-101`) are preserved unchanged;
a terminal period followed by end-of-string or whitespace is left for the
sentence to keep. Same fix applied to `ABBREVIATED_RE` in
`extractAbbreviated.ts` as defense in depth at the secondary parser.

### Tests

7 new tests under `sentence-ending period boundary (#283)` in
`tests/extract/extractStatute.test.ts` covering the four pattern families,
internal-decimal preservation, and mid-sentence regression baselines. Full
2353-test suite passes with no regressions.
