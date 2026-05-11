---
"eyecite-ts": minor
---

feat: paragraph-marker pincites — `¶ N`, `¶¶ N-M`, `para. N`, `paras. N-M` (#204)

Paragraph-marker pincites are the standard form for NY Slip Op, Canadian
neutrals, and other paragraph-numbered opinion sources. `Doe v. Roe, 45 NY2d
101, ¶¶ 12-14 (1978)` previously produced a citation with `pinciteInfo`
undefined; it now yields `{ paragraph: 12, endParagraph: 14, isRange: true,
raw: "¶¶ 12-14" }`.

### Schema changes (`PinciteInfo`)

- `page` is now `number | undefined` (was required `number`). Paragraph-only
  pincites leave `page` undefined.
- New: `paragraph?: number`, `endParagraph?: number`.

The top-level convenience `pincite` field on the citation continues to mirror
`page` only, so it stays undefined for paragraph-only pincites. Consumers
that need paragraph data read `pinciteInfo.paragraph` / `pinciteInfo.endParagraph`.

### Coverage

- Full case (lookahead from citation core): `45 NY2d 101, ¶ 12`,
  `45 NY2d 101, ¶¶ 12-14`, `45 NY2d 101, para. 12`,
  `45 NY2d 101, paras. 12-14`
- Id.: `Id. ¶ 12`, `Id. at ¶ 12`, `Id. ¶¶ 12-14`
- Supra: `Smith, supra, ¶ 12`, `Smith, supra, at ¶ 12`,
  `Smith, supra, paras. 12-14`
- `parsePincite` recognizes raw input directly.

Regex zoo updated across `LOOKAHEAD_PINCITE_REGEX`, `PINCITE_SKIP_REGEX`,
`ID_PATTERN`, `IBID_PATTERN`, `SUPRA_PATTERN`, `STANDALONE_SUPRA_PATTERN`,
`SHORT_FORM_CASE_PATTERN`, and the four local copies in
`extractShortForms.ts`. Paragraph forms allow `at` to be optional (lookahead-
only on the marker); page forms still require `at` or the existing comma form.
