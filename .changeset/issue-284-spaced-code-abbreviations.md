---
"eyecite-ts": patch
---

fix: spaced statute code abbreviations (`42 U. S. C.`, `29 C. F. R.`) now extract correctly (#284)

Historical and OCR'd legal text — pre-1990 Supreme Court opinions, scanned PACER
PDFs, Harvard CAP corpus — writes federal code abbreviations with spaces
between the letters: `42 U. S. C. § 1973`, `29 C. F. R. § 1604.11`. The
clean-pipeline normalization handled 2-letter case-cite abbreviations
(`U.S.`, `S.Ct.`, `L.Ed.`, `F.Supp.`) but had no rules for the 3-letter
code abbreviations, so spaced statute citations were silently dropped by
the tokenizer.

### Root cause

`normalizeReporterSpacing` in `src/clean/cleaners.ts` had only 2-letter
rules. For `42 U. S. C. § 1983` the existing `U. S. → U.S.` rule fired
but left a dangling `C.`: `42 U.S. C. § 1983`. The statute tokenizer
expects the literal `U.S.C.` shape and could not match the
partially-normalized form, so the citation was dropped entirely (no
fallback, no signal that a citation existed).

### Fix

Added two targeted rules placed *before* the existing 2-letter ones so
the full 3-letter shape collapses in one pass on every spacing variant:

```
\bU\.\s*S\.\s*C\.  →  U.S.C.
\bC\.\s*F\.\s*R\.  →  C.F.R.
```

`\s*` (zero or more, not `\s+`) so the rules also act as idempotent
canonicalizers on already-compact input and on partial forms like
`U.S. C.` and `U. S.C.`. The lookahead bound is implicit — the trailing
`C.` / `R.` literal prevents `U. S.` (case-cite) from being intercepted.

### Tests

- 7 new tests under `three-letter code abbreviations (#284)` in
  `tests/clean/reporterSpacing.test.ts`: fully-spaced, partially-spaced
  (both directions), canonical idempotency, and a non-interception check
  for `410 U. S. 113` case cites.
- 5 new tests under `spaced code abbreviations (#284)` in
  `tests/extract/extractStatute.test.ts`: end-to-end extraction through
  the full `extractCitations` pipeline, including subsection capture
  (`29 U. S. C. § 158(a)(3)`).

Full 2365-test suite passes; no regressions.
