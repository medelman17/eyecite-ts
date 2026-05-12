---
"eyecite-ts": patch
---

fix: in-word em-dashes normalize to a single hyphen (#333)

Illinois opinions (and OCR'd reporter text more generally) use the
em-dash character `—` (U+2014) where most jurisdictions use a hyphen.
The `normalizeDashes` cleaner was rewriting every em-dash to triple
hyphen (`---`), the blank-page placeholder form. As a result, citations
like `par. 13—214(a)`, `pars. 8—102, 8—103`, and `at 875—877` were
contaminated with `---` in the section/pincite body, blocking
extraction or polluting downstream output.

### Fix

Context-aware substitution in `src/clean/cleaners.ts:normalizeDashes`.
A new in-word rule runs first:

```
text.replace(/(?<=\w)[—―](?=\w)/g, "-")
```

- Between word characters → single hyphen (`13—214` → `13-214`,
  `84—C—4508` → `84-C-4508` — both em-dashes converted in one pass via
  zero-width lookbehind/lookahead).
- Standalone (whitespace on either side) → triple hyphen, preserving
  the `500 F.4th — (2024)` blank-page placeholder behavior.

Em-dash-to-hyphen is length-preserving (1 codepoint each), so the
existing transformation map continues to map `originalStart` /
`originalEnd` 1:1 to the em-dash position in the source text.

### Tests

11 new tests:

`tests/clean/cleanText.test.ts` (6):
- In-word em-dash between digits → single hyphen
- In-word em-dash in page range → single hyphen
- Adjacent em-dashes in docket separators handled in one pass
- Standalone em-dash → triple hyphen (regression for blank-page form)
- Mixed input (in-word vs standalone)
- In-word horizontal bar (U+2015) → hyphen

`tests/extract/extractStatute.test.ts` (5):
- End-to-end: `par. 13—214(a)` now extracts as `section: "13-214"`,
  `subsection: "(a)"`
- Em-dash and hyphen variants produce equivalent statute output
- Multi-paragraph em-dash form (first paragraph matched)
- Blank-page em-dash still tokenizes as case with `---`
- Span check: `originalStart`/`originalEnd` map back to the em-dash
  position in the source

Full 2503-test suite passes; no regressions.

### Related

Surfaced by a 16-opinion Illinois sample. Companion to #330 (the ILRS
pattern itself); fixing #330 alone wouldn't help inputs that used the
canonical Illinois em-dash subdivision form. Page-range pincite capture
(`at 875—877` extracting both endpoints as a range, not just the first)
is a separate issue.
