---
"eyecite-ts": patch
---

fix(extract): accept comma between `Title NN` and `U.S.C.` (#586)

Documented examples:
- `Title 18, U.S.C. § 3742`
- `Title 8, U.S.C. § 1326`
- `Title 15, U.S.C. § 78`
- `Title 42, U.S.C. § 1983(a)`

The USC tokenizer regex required `\b(\d+)\s+U\.S\.C\.` — only a bare
whitespace separator between the title digits and the code
abbreviation. The comma-free prose form `Title 18 U.S.C. § 3742`
worked by accident: the embedded `18 U.S.C. § 3742` substring matched
with the leading `Title` word left outside the match. The comma form
`Title 18, U.S.C. § 3742` (equally common in federal appellate
opinions) broke that accident because `18, U.S.C.` could not satisfy
`\d+\s+U\.S\.C\.`, so every comma-after-title citation silently
disappeared.

Allow an optional comma between the title digits and the code
abbreviation by changing the separator from `\s+` to `\s*,?\s+` in:
- `src/patterns/statutePatterns.ts` (the `usc` tokenizer)
- `src/extract/statutes/extractFederal.ts` (`FEDERAL_SECTION_RE`
  and `FEDERAL_PART_RE`)

The `\s*,?\s+` shape requires at least one space after the optional
comma, so the malformed `18,U.S.C.` (no space) still does not
tokenize. CFR was left unchanged in this commit (the issue scope is
USC); a follow-up could mirror the change for `Title NN, C.F.R.`
if real-world coverage demands it.
