---
"eyecite-ts": patch
---

fix: populate `PinciteInfo.footnote` from `n.N` / `nn.N-N` pincite suffixes (#202)

`PinciteInfo.footnote` was declared on the public type but never populated at
runtime. A pincite like `460 n.14` produced `{ page: 460, isRange: false, raw: '460' }`
instead of the expected `{ page: 460, footnote: 14, isRange: false, raw: '460 n.14' }`.
The footnote suffix was dropped entirely, and `raw` was truncated so callers
couldn't even recover the footnote text themselves.

**Root cause.** `parsePincite` already supported `n.N` / `note N` in its
regex, but every upstream capture regex that fed it stopped at
`\*?\d+(?:-\d+)?` — page digits and an optional range, nothing more. So
`parsePincite` never saw the footnote text. This affected all citation types
with a `pinciteInfo` field: full-case, short-form case, `Id.`, `Ibid.`,
`supra`, and neutral.

**Fix.** Extended every pincite-capture regex (both tokenizer patterns in
`shortForm.ts` and extractor regexes in `extractCase`, `extractShortForms`,
`extractNeutral`) to include an optional trailing
`(?:\s+(?:nn?|note)\s*\.?\s*\d+(?:[-–—]\d+)?)?` suffix. Extended
`parsePincite` to accept Bluebook's `nn.` multi-note prefix and to capture a
range end into a new `footnoteEnd?: number` field: `460 nn.14-15` now parses
as `{ page: 460, footnote: 14, footnoteEnd: 15, ... }`.

Seven new regression tests across full-case, short-form, `Id.`, neutral, and
`parsePincite` unit tests.
