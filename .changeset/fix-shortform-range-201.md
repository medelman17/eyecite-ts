---
"eyecite-ts": patch
---

fix: capture range end page on `ShortFormCaseCitation` pincites (#201)

`ShortFormCaseCitation` dropped the end page of range pincites. Input
`Smith, 100 F.3d at 462-65.` produced `pinciteInfo = { page: 462,
isRange: false, raw: '462' }` instead of the expected `{ page: 462,
endPage: 465, isRange: true, raw: '462-65' }`. The same range shape works
correctly on `FullCaseCitation`.

**Root cause.** `SHORT_FORM_CASE_PATTERN` (tokenizer) and `shortFormRegex`
(extractor) captured only `(\*?\d+)` for the pincite — no range. When
`parsePincite` finally ran, the text had already been truncated to the
starting page.

**Fix.** Extended both regexes to capture an optional range tail
`(?:[-–—]\*?\d+)?` after the starting page. Also permits mixed star
prefixes on range ends (`462-*65`) for neutral-cite compatibility.

**Collateral fix — journal false-positive.** Growing the short-form span
by `-NN` broke an identical-span dedup that had been silently absorbing a
latent law-review false-positive: the pattern
`\b(\d+)\s+([A-Z][A-Za-z.\s]+)\s+(\d+)\b` matched `554 U.S. at 621`
inside a short-form cite, treating `U.S. at` as a journal name. Before
`#201`, the short-form token covered the exact same span and won dedup;
after `#201`, the short-form token ends at `-22` and the phantom journal
slips through. Tightened the law-review pattern with an extra negative
lookahead `(?!\s+at\s+\d)` so a run of capitalised words can't span an
`at <digit>` token. No real journal name contains `" at <digit>"`.

Four new regression tests for short-form ranges (plain, full digits,
range + footnote, single-page regression guard). Full suite 1818/1818.
