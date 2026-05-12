---
"eyecite-ts": patch
---

fix: tolerate `Id.` / `Ibid.` punctuation variants — `Id .`, `Ibid .`, `Id, at N` (#305)

OCR'd PDFs and older typesetting routinely produce `Id .` (with a
space before the period) and the analogous `Ibid .`; some opinions
also write `Id, at p. 1483` as a typo for `Id., at p. 1483`. All three
variants were silently dropped by the tokenizer. Surfaced as 30+
misses in the 200-opinion modern-era sweep.

### Fix

Updated both the tokenizer patterns (`src/patterns/shortForm.ts`) and
the parser regex in `extractShortForms.ts`:

- `[Ii]d\.` → `[Ii]d\s*\.` — optional whitespace before the period
  (`Id .`, `Ibid .`).
- Comma-instead-of-period typo: `[Ii]d\s*,(?=\s+at\s)` — guarded by a
  lookahead so bare `Id,` in prose (`"She showed her Id, but..."`) is
  not misread as a citation.
- Same `\s*\.` allowance for `[Ii]bid`.

The parser regex group layout shifted to expose both punctuation forms
separately for confidence scoring:

- Group 2 = `.` (canonical form)
- Group 3 = `,` (typo form)
- Group 4 = optional post-period comma (canonical-only)
- Group 5 = pincite

Typo-comma form gets a `0.7` confidence cap (down from `0.9` for the
post-period comma variant), reflecting that `Id, at N` is almost
always a typo rather than a stylistic choice.

### Scope notes

- **`Id. sec. 185b`** (section-instead-of-page pincite) tokenizes as
  bare `Id.` with no pincite, matching previous behavior. The issue
  suggested adding a structured `pinciteKind: "section"` field —
  that's a public-type addition rather than a tokenization fix and is
  out of scope for this PR.

### Tests

7 new tests under `Id./Ibid. punctuation tolerance (#305)` in
`tests/extract/extractShortForms.test.ts`:

- `Id . at 326` → `pincite: 326`
- `Ibid .` tokenizes
- `Id, at p. 1483` → `pincite: 1483`, confidence < 0.95
- `Id . at p. 1192` → `pincite: 1192`
- `She showed her Id, but ...` → no match (prose guard works)
- Regression: canonical `Id. at 326` → `pincite: 326`, `confidence: 1.0`
- Regression: canonical `Ibid.` tokenizes

Full 2439-test suite passes; no regressions.
