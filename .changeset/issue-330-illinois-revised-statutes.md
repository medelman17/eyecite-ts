---
"eyecite-ts": patch
---

feat: extract pre-1993 Illinois Revised Statutes (`Ill. Rev. Stat. YYYY, ch. N, par. N`) (#330)

Illinois used a distinct statutory citation format before adopting
Illinois Compiled Statutes (ILCS) in 1993. Pre-1993 forms continue
to appear in modern Illinois opinions when referencing the historical
version of a statute: `Ill. Rev. Stat. 1985, ch. 40, par. 504(a)`.
None of these tokenized — surfaced as the dominant statute miss
pattern in a 16-opinion Illinois sample (20+ misses).

### Fix

New `ill-rev-stat` pattern in `src/patterns/statutePatterns.ts` and
dedicated `extractIllRevStat` extractor at
`src/extract/statutes/extractIllRevStat.ts`.

Tokenizer regex:

```
\bIll\.?\s*Rev\.?\s*Stat\.?,?\s+(\d{4}),?\s+[Cc]h\.\s+(\d+[A-Z]?),?\s+pars?\.\s+(\d+(?:[A-Za-z0-9:-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*(?:\s*et\s+seq\.?)?)
```

Tolerance:
- Spaced or no-space (`Ill. Rev. Stat.` / `Ill.Rev.Stat.`)
- Capitalized or lowercase `[Cc]h.`
- Singular or plural `pars?.`
- Optional commas after `Stat.` and after the chapter number
- Letter-suffix chapter (`110A`)
- Section-body uses the period-followed-by-alphanumeric guard from #283

Captures:
- Group 1 → `year` (e.g., 1985 — the embedded year-of-edition)
- Group 2 → `title` (chapter, e.g., 40)
- Group 3 → paragraph body, parsed into `section` / `subsection` via
  the shared `parseBody` helper

Jurisdiction is hardcoded `"IL"`; `code` is normalized to `"Ill. Rev. Stat."`
regardless of source spacing/punctuation.

### Scope notes

- **Multi-paragraph lists** (`pars. 8-102, 8-103`) match the first
  paragraph only; the trailing `, 8-103` is left for downstream. Same
  shape as the existing single-paragraph match on canonical ILCS.

### Tests

6 new tests under `Illinois Revised Statutes (pre-1993) (#330)` in
`tests/extract/extractStatute.test.ts`:

- Canonical `Ill. Rev. Stat. 1985, ch. 40, par. 504(a)`
- No-space + capitalized `Ill.Rev.Stat. 1985, Ch. 127, par. 780.04`
- Plural `pars.` (matches first only)
- Letter-suffix chapter `110A`
- Stray comma + `et seq.`
- Regression: modern `735 ILCS 5/2-1001` still routes through `chapter-act`

Full 2479-test suite passes; no regressions.
