---
"eyecite-ts": patch
---

fix(extract): capture subsection range endpoints (`(a)-(b)`,
`(9)—(16)`) (#591)

Range subsections like `35 U.S.C. §§ 311(a)-(b)`, `37 C.F.R. §
42.107(a)-(b)`, and `77 P.S. § 513(9) — (16)` previously dropped the
second endpoint. `subsection` captured only `(a)` / `(9)`; the
`-(b)` / `— (16)` tail was sliced off and the `matchedText` did not
include the range — downstream consumers had no signal that a range
was even cited.

Adds structured `subsectionRange: { start, end }` on `StatuteCitation`:

- `src/types/citation.ts` — new optional field, mirrors the existing
  `sectionRange` pattern (#564). `subsection` continues to carry the
  start endpoint for backward compatibility.
- `src/extract/statutes/parseBody.ts` — new `SUBSECTION_RANGE_TRAILER_RE`
  detects a trailing `-(X)` / `—(X)` after the paren chain and slices
  it off the body. The dash class accepts multi-hyphen `---` (which
  `normalizeDashes` produces from a standalone em-dash like `(9) —
  (16)` → `(9) --- (16)`) so the cleaned form still matches. Returns
  the captured endpoint as `subsectionRangeEnd` in `ParsedBody`.
- `src/patterns/statutePatterns.ts` (`usc`, `cfr`) and
  `src/data/stateStatutes.ts` (`buildAbbreviatedCodeRegex`) —
  tokenizer body groups now consume the optional dash + paren trailer
  so the token's matched text includes the full range.
- `src/extract/statutes/extractAbbreviated.ts` and
  `src/extract/statutes/extractFederal.ts` — propagate
  `subsectionRangeEnd` into the new `subsectionRange` field when a
  subsection start is present.

Plain `(a)(1)` chains (no trailing dash) continue to leave
`subsectionRange` undefined.
