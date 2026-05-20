---
"eyecite-ts": patch
---

fix(extract): attach California `, subd.` / `paragraph` / `par.` subsection
keywords to the `subsection` field (#589)

California opinions write subsections with an explicit keyword between the
section number and the paren chain — `Pen. Code, § 1238, subd. (a)(8)`,
`Welf. & Inst. Code, § 111, subd. (c)`, `Code Civ. Proc., § 430.10, subd.
(e)`. The previous tokenizer body regex stopped at the section number; the
`, subd. (X)` tail was sliced off the match entirely, leaving every CA
`subd.` citation with `subsection: undefined`. Documented as 100% of CA
`subd.` citations affected — every California opinion citing Penal /
Probate / Vehicle / Welfare-and-Institutions / Civil-Procedure codes loses
the subsection.

Three coordinated changes:

- `src/data/caBareCodes.ts` (`buildCaBareCodeRegex`) — tokenizer body group
  now optionally consumes `,?\s+(?:subd\.|subdivision|paragraph(s)?|par(s)?\.)\s+
  \((X)\)(\((Y)\))*` so the matched token includes the keyword tail.
- `src/patterns/statutePatterns.ts` (`named-code`) — same keyword tail
  appended to the section group so fully-qualified `Cal. Penal Code §
  1238, subd. (a)` is captured in full.
- `src/extract/statutes/parseBody.ts` — new `normalizeSubdKeyword`
  helper rewrites `1238, subd. (a)(8)` to `1238(a)(8)` (and collapses
  `(a) (8)` → `(a)(8)`) before the SUBSECTION_RE split, so the existing
  section/subsection routing works unchanged.

The keyword alternation accepts singular/plural (`paragraph(s)`, `par(s)`),
abbreviated/spelled-out (`subd.` / `subdivision`), and tolerates the
optional leading comma. Bracket subscripts (`[a]`) are also accepted to
match the NY `[3-a]` convention.
