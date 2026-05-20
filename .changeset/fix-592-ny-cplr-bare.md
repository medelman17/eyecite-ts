---
"eyecite-ts": patch
---

fix(extract): recognize bare NY CPLR citations (`CPLR 3025 (b)`,
`C.P.L.R. § 3211`) (#592)

NY courts dominantly cite the Civil Practice Law and Rules as bare `CPLR
NNNN` with no `N.Y.` prefix and no `§` connector — `CPLR 3025 (b)`,
`CPLR 3211 (a) (4)`, `CPLR 3108`, `CPLR 4518 [a]`. Documented as ~42
hits across a 600-opinion sample; every NY case using the CPLR was
losing the citation entirely. Dotted (`C.P.L.R.`) and §-prefixed
(`CPLR § 3211`) variants were also missing because no abbreviated-code
or named-code alternation owned the `CPLR` token.

Adds a dedicated `ny-cplr-bare` tokenizer pattern and an
`extractNyCplrBare` extractor:

- `src/patterns/statutePatterns.ts` — new pattern recognizing
  `(?:N\.Y\.\s*)?C\.?\s*P\.?\s*L\.?\s*R\.?\s*(?:§§?\s*)?<digits>...`
  with optional paren/bracket subsection chain. Placed BEFORE the
  generic `named-code` alternation so the longer optional-`N.Y.`
  prefix subsumes the named-code match for fully-qualified
  `N.Y. C.P.L.R. § 211` citations and the canonical `N.Y. C.P.L.R.`
  code string is emitted regardless of input form.
- `src/extract/statutes/extractNyCplrBare.ts` — new extractor that
  collapses interior whitespace between paren groups
  (`(a) (4)` → `(a)(4)`) before delegating to `parseBody`. Always
  emits `code: "N.Y. C.P.L.R."` and `jurisdiction: "NY"`.
- `src/extract/extractStatute.ts` — dispatch the new `ny-cplr-bare`
  patternId to the new extractor.

False-positive guard: bare `CPLR` without a trailing digit
("The CPLR governs procedure.") does not match because the mandatory
section-digit group has no acceptable backoff.
